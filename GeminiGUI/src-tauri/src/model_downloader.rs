//! Model Downloader
//!
//! Downloads GGUF models from HuggingFace Hub with progress tracking.

use futures_util::StreamExt;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use thiserror::Error;
use tracing::{info, warn};

#[derive(Error, Debug)]
pub enum DownloadError {
    #[error("HTTP error: {0}")]
    HttpError(#[from] reqwest::Error),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
    #[error("Download cancelled")]
    Cancelled,
    #[error("File not found on HuggingFace: {0}")]
    FileNotFound(String),
    #[error("Rate limited, please try again later")]
    RateLimited,
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}

impl From<DownloadError> for String {
    fn from(e: DownloadError) -> Self {
        e.to_string()
    }
}

/// Download progress information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    /// Filename being downloaded
    pub filename: String,
    /// Bytes downloaded so far
    pub downloaded: u64,
    /// Total file size in bytes
    pub total: u64,
    /// Download speed in bytes per second
    pub speed_bps: u64,
    /// Percentage complete (0-100)
    pub percentage: f32,
    /// Whether download is complete
    pub complete: bool,
    /// Error message if any
    pub error: Option<String>,
}

/// Model downloader with progress tracking
#[derive(Clone)]
pub struct ModelDownloader {
    client: Client,
    models_dir: PathBuf,
    cancel_flag: Arc<AtomicBool>,
    downloaded_bytes: Arc<AtomicU64>,
    total_bytes: Arc<AtomicU64>,
}

impl ModelDownloader {
    /// Create a new model downloader
    pub fn new(models_dir: PathBuf) -> Self {
        let client = Client::builder()
            .user_agent("GeminiHydra/1.0")
            .timeout(std::time::Duration::from_secs(3600)) // 1 hour timeout
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            client,
            models_dir,
            cancel_flag: Arc::new(AtomicBool::new(false)),
            downloaded_bytes: Arc::new(AtomicU64::new(0)),
            total_bytes: Arc::new(AtomicU64::new(0)),
        }
    }

    /// Get the models directory
    #[allow(dead_code)]
    pub fn models_dir(&self) -> &Path {
        &self.models_dir
    }

    /// Cancel any ongoing download
    pub fn cancel(&self) {
        self.cancel_flag.store(true, Ordering::SeqCst);
    }

    /// Reset cancel flag for new download
    fn reset_cancel(&self) {
        self.cancel_flag.store(false, Ordering::SeqCst);
    }

    /// Check if download was cancelled
    fn is_cancelled(&self) -> bool {
        self.cancel_flag.load(Ordering::SeqCst)
    }

    /// Get current download progress
    #[allow(dead_code)]
    pub fn get_progress(&self) -> (u64, u64) {
        (
            self.downloaded_bytes.load(Ordering::Relaxed),
            self.total_bytes.load(Ordering::Relaxed),
        )
    }

    /// Download a model from HuggingFace Hub
    ///
    /// # Arguments
    /// * `repo_id` - HuggingFace repository ID (e.g., "bartowski/Llama-3.2-3B-Instruct-GGUF")
    /// * `filename` - Filename to download (e.g., "Llama-3.2-3B-Instruct-Q4_K_M.gguf")
    /// * `progress_callback` - Optional callback for progress updates
    pub async fn download<F>(
        &self,
        repo_id: &str,
        filename: &str,
        progress_callback: Option<F>,
    ) -> Result<PathBuf, DownloadError>
    where
        F: Fn(DownloadProgress) + Send + 'static,
    {
        self.reset_cancel();
        self.downloaded_bytes.store(0, Ordering::Relaxed);
        self.total_bytes.store(0, Ordering::Relaxed);

        // Ensure models directory exists
        fs::create_dir_all(&self.models_dir)?;

        let dest_path = self.models_dir.join(filename);

        // Check if file already exists
        if dest_path.exists() {
            info!("Model already exists: {:?}", dest_path);
            if let Some(ref cb) = progress_callback {
                let metadata = fs::metadata(&dest_path)?;
                cb(DownloadProgress {
                    filename: filename.to_string(),
                    downloaded: metadata.len(),
                    total: metadata.len(),
                    speed_bps: 0,
                    percentage: 100.0,
                    complete: true,
                    error: None,
                });
            }
            return Ok(dest_path);
        }

        // Construct HuggingFace URL
        let url = format!(
            "https://huggingface.co/{}/resolve/main/{}",
            repo_id, filename
        );

        info!("Downloading model from: {}", url);

        // Start download
        let response = self.client.get(&url).send().await?;

        // Check response status
        match response.status() {
            status if status.is_success() => {}
            reqwest::StatusCode::NOT_FOUND => {
                return Err(DownloadError::FileNotFound(format!(
                    "{}/{}",
                    repo_id, filename
                )));
            }
            reqwest::StatusCode::TOO_MANY_REQUESTS => {
                return Err(DownloadError::RateLimited);
            }
            status => {
                return Err(DownloadError::InvalidResponse(format!(
                    "HTTP {} {}",
                    status.as_u16(),
                    status.canonical_reason().unwrap_or("Unknown")
                )));
            }
        }

        // Get content length
        let total_size = response.content_length().unwrap_or(0);
        self.total_bytes.store(total_size, Ordering::Relaxed);

        info!(
            "Downloading {} ({} bytes)",
            filename, total_size
        );

        // Create temporary file
        let temp_path = dest_path.with_extension("gguf.download");
        let mut file = File::create(&temp_path)?;

        // Download with progress
        let mut stream = response.bytes_stream();
        let mut downloaded: u64 = 0;
        let start_time = std::time::Instant::now();
        let mut last_progress_time = start_time;

        while let Some(chunk_result) = stream.next().await {
            // Check for cancellation
            if self.is_cancelled() {
                warn!("Download cancelled by user");
                drop(file);
                let _ = fs::remove_file(&temp_path);
                return Err(DownloadError::Cancelled);
            }

            let chunk = chunk_result?;
            file.write_all(&chunk)?;

            downloaded += chunk.len() as u64;
            self.downloaded_bytes.store(downloaded, Ordering::Relaxed);

            // Update progress callback (throttled to every 100ms)
            let now = std::time::Instant::now();
            if now.duration_since(last_progress_time).as_millis() >= 100 {
                if let Some(ref cb) = progress_callback {
                    let elapsed = now.duration_since(start_time).as_secs_f64();
                    let speed = if elapsed > 0.0 {
                        (downloaded as f64 / elapsed) as u64
                    } else {
                        0
                    };
                    let percentage = if total_size > 0 {
                        (downloaded as f32 / total_size as f32) * 100.0
                    } else {
                        0.0
                    };

                    cb(DownloadProgress {
                        filename: filename.to_string(),
                        downloaded,
                        total: total_size,
                        speed_bps: speed,
                        percentage,
                        complete: false,
                        error: None,
                    });
                }
                last_progress_time = now;
            }
        }

        // Ensure all data is written
        file.flush()?;
        drop(file);

        // Rename temp file to final destination
        fs::rename(&temp_path, &dest_path)?;

        info!("Download complete: {:?}", dest_path);

        // Final progress callback
        if let Some(cb) = progress_callback {
            cb(DownloadProgress {
                filename: filename.to_string(),
                downloaded,
                total: total_size,
                speed_bps: 0,
                percentage: 100.0,
                complete: true,
                error: None,
            });
        }

        Ok(dest_path)
    }

    /// Download with resume support (for interrupted downloads)
    #[allow(dead_code)]
    pub async fn download_with_resume<F>(
        &self,
        repo_id: &str,
        filename: &str,
        progress_callback: Option<F>,
    ) -> Result<PathBuf, DownloadError>
    where
        F: Fn(DownloadProgress) + Send + 'static,
    {
        self.reset_cancel();

        // Ensure models directory exists
        fs::create_dir_all(&self.models_dir)?;

        let dest_path = self.models_dir.join(filename);
        let temp_path = dest_path.with_extension("gguf.download");

        // Check if complete file already exists
        if dest_path.exists() {
            info!("Model already exists: {:?}", dest_path);
            return Ok(dest_path);
        }

        // Check for partial download
        let existing_size = if temp_path.exists() {
            fs::metadata(&temp_path)?.len()
        } else {
            0
        };

        // Construct HuggingFace URL
        let url = format!(
            "https://huggingface.co/{}/resolve/main/{}",
            repo_id, filename
        );

        info!(
            "Downloading model from: {} (resuming from {} bytes)",
            url, existing_size
        );

        // Build request with Range header for resume
        let mut request = self.client.get(&url);
        if existing_size > 0 {
            request = request.header("Range", format!("bytes={}-", existing_size));
        }

        let response = request.send().await?;

        // Check response status
        let (total_size, is_partial) = match response.status() {
            reqwest::StatusCode::OK => {
                // Full response, start from beginning
                (response.content_length().unwrap_or(0), false)
            }
            reqwest::StatusCode::PARTIAL_CONTENT => {
                // Partial response, resume
                let content_range = response
                    .headers()
                    .get("content-range")
                    .and_then(|v| v.to_str().ok())
                    .and_then(|s| {
                        // Parse "bytes start-end/total"
                        s.split('/').last().and_then(|t| t.parse::<u64>().ok())
                    })
                    .unwrap_or(0);
                (content_range, true)
            }
            reqwest::StatusCode::NOT_FOUND => {
                return Err(DownloadError::FileNotFound(format!(
                    "{}/{}",
                    repo_id, filename
                )));
            }
            status => {
                return Err(DownloadError::InvalidResponse(format!(
                    "HTTP {}",
                    status.as_u16()
                )));
            }
        };

        self.total_bytes.store(total_size, Ordering::Relaxed);
        self.downloaded_bytes.store(
            if is_partial { existing_size } else { 0 },
            Ordering::Relaxed,
        );

        // Open file (append if resuming, create if new)
        let mut file = if is_partial && existing_size > 0 {
            fs::OpenOptions::new()
                .append(true)
                .open(&temp_path)?
        } else {
            // Delete any existing partial file and start fresh
            if temp_path.exists() {
                fs::remove_file(&temp_path)?;
            }
            File::create(&temp_path)?
        };

        // Download with progress
        let mut stream = response.bytes_stream();
        let mut downloaded = if is_partial { existing_size } else { 0 };
        let start_time = std::time::Instant::now();
        let mut last_progress_time = start_time;

        while let Some(chunk_result) = stream.next().await {
            if self.is_cancelled() {
                warn!("Download cancelled by user");
                file.flush()?;
                return Err(DownloadError::Cancelled);
            }

            let chunk = chunk_result?;
            file.write_all(&chunk)?;

            downloaded += chunk.len() as u64;
            self.downloaded_bytes.store(downloaded, Ordering::Relaxed);

            // Throttled progress updates
            let now = std::time::Instant::now();
            if now.duration_since(last_progress_time).as_millis() >= 100 {
                if let Some(ref cb) = progress_callback {
                    let elapsed = now.duration_since(start_time).as_secs_f64();
                    let speed = if elapsed > 0.0 {
                        ((downloaded - if is_partial { existing_size } else { 0 }) as f64 / elapsed)
                            as u64
                    } else {
                        0
                    };
                    let percentage = if total_size > 0 {
                        (downloaded as f32 / total_size as f32) * 100.0
                    } else {
                        0.0
                    };

                    cb(DownloadProgress {
                        filename: filename.to_string(),
                        downloaded,
                        total: total_size,
                        speed_bps: speed,
                        percentage,
                        complete: false,
                        error: None,
                    });
                }
                last_progress_time = now;
            }
        }

        file.flush()?;
        drop(file);

        // Rename to final destination
        fs::rename(&temp_path, &dest_path)?;

        info!("Download complete: {:?}", dest_path);

        if let Some(cb) = progress_callback {
            cb(DownloadProgress {
                filename: filename.to_string(),
                downloaded,
                total: total_size,
                speed_bps: 0,
                percentage: 100.0,
                complete: true,
                error: None,
            });
        }

        Ok(dest_path)
    }
}

/// Format bytes per second as human-readable speed
#[allow(dead_code)]
pub fn format_speed(bps: u64) -> String {
    if bps >= 1_000_000_000 {
        format!("{:.1} GB/s", bps as f64 / 1_000_000_000.0)
    } else if bps >= 1_000_000 {
        format!("{:.1} MB/s", bps as f64 / 1_000_000.0)
    } else if bps >= 1_000 {
        format!("{:.1} KB/s", bps as f64 / 1_000.0)
    } else {
        format!("{} B/s", bps)
    }
}

/// Format remaining time
#[allow(dead_code)]
pub fn format_eta(downloaded: u64, total: u64, speed_bps: u64) -> String {
    if speed_bps == 0 || downloaded >= total {
        return "Unknown".to_string();
    }

    let remaining_bytes = total - downloaded;
    let remaining_secs = remaining_bytes / speed_bps;

    if remaining_secs >= 3600 {
        let hours = remaining_secs / 3600;
        let mins = (remaining_secs % 3600) / 60;
        format!("{}h {}m", hours, mins)
    } else if remaining_secs >= 60 {
        let mins = remaining_secs / 60;
        let secs = remaining_secs % 60;
        format!("{}m {}s", mins, secs)
    } else {
        format!("{}s", remaining_secs)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_speed() {
        assert_eq!(format_speed(500), "500 B/s");
        assert_eq!(format_speed(1_500), "1.5 KB/s");
        assert_eq!(format_speed(1_500_000), "1.5 MB/s");
        assert_eq!(format_speed(1_500_000_000), "1.5 GB/s");
    }

    #[test]
    fn test_format_eta() {
        assert_eq!(format_eta(0, 100, 10), "10s");
        assert_eq!(format_eta(0, 6000, 100), "1m 0s");
        assert_eq!(format_eta(0, 3600 * 100, 100), "1h 0m");
        assert_eq!(format_eta(100, 100, 10), "Unknown");
        assert_eq!(format_eta(0, 100, 0), "Unknown");
    }
}
