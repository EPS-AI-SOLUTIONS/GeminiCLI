// GeminiHydra Tauri Backend
// llama.cpp integration via llama-cpp-2 bindings

use futures_util::StreamExt;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader};
use std::path::Path;
use std::process::{Command, Stdio};
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, Window};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

mod llama_backend;
mod model_downloader;
mod model_manager;

use llama_backend::{ChatMessage, GenerateParams, ModelConfig};
use model_downloader::{DownloadProgress, ModelDownloader};
use model_manager::{get_recommended_models, GGUFModelInfo, ModelManager, RecommendedModel};

// ============================================================================
// GLOBAL STATE
// ============================================================================

/// Global model manager instance
static MODEL_MANAGER: Lazy<RwLock<Option<ModelManager>>> = Lazy::new(|| RwLock::new(None));

/// Global model downloader instance
static MODEL_DOWNLOADER: Lazy<RwLock<Option<ModelDownloader>>> = Lazy::new(|| RwLock::new(None));

/// Get the base directory for GeminiHydra (portable support)
fn get_base_dir() -> std::path::PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default())
}

/// Get the models directory path
fn get_models_dir() -> std::path::PathBuf {
    get_base_dir().join("data").join("models")
}

fn get_bridge_path() -> std::path::PathBuf {
    get_base_dir().join("bridge.json")
}

/// Initialize the model manager and downloader
fn initialize_model_system() {
    let models_dir = get_models_dir();

    // Initialize model manager
    {
        let mut manager_guard = MODEL_MANAGER.write();
        if manager_guard.is_none() {
            let mut manager = ModelManager::new(models_dir.clone());
            let _ = manager.ensure_models_dir();
            *manager_guard = Some(manager);
        }
    }

    // Initialize model downloader
    {
        let mut downloader_guard = MODEL_DOWNLOADER.write();
        if downloader_guard.is_none() {
            *downloader_guard = Some(ModelDownloader::new(models_dir));
        }
    }
}

// ============================================================================
// SECURITY: Configuration
// ============================================================================

/// SECURITY: Allowlist of safe commands
const ALLOWED_COMMANDS: &[&str] = &[
    "dir",
    "ls",
    "pwd",
    "cd",
    "echo",
    "type",
    "cat",
    "head",
    "tail",
    "Get-Date",
    "Get-Location",
    "Get-ChildItem",
    "Get-Content",
    "whoami",
    "hostname",
    "systeminfo",
    "git status",
    "git log",
    "git branch",
    "git diff",
    "git remote -v",
    "node --version",
    "npm --version",
    "npm list",
    "python --version",
    "pip list",
];

/// Check if a command is in the allowlist
fn is_command_allowed(command: &str) -> bool {
    let cmd_lower = command.to_lowercase();
    ALLOWED_COMMANDS.iter().any(|allowed| {
        let allowed_lower = allowed.to_lowercase();
        cmd_lower.starts_with(&allowed_lower) || cmd_lower == allowed_lower
    })
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

#[derive(Serialize, Deserialize, Debug, Clone)]
struct BridgeRequest {
    id: String,
    message: String,
    status: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct BridgeData {
    requests: Vec<BridgeRequest>,
    auto_approve: bool,
}

impl Default for BridgeData {
    fn default() -> Self {
        Self {
            requests: vec![],
            auto_approve: true,
        }
    }
}

fn read_bridge_data() -> BridgeData {
    let bridge_path = get_bridge_path();
    if !bridge_path.exists() {
        return BridgeData::default();
    }
    match fs::read_to_string(&bridge_path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or(BridgeData::default()),
        Err(_) => BridgeData::default(),
    }
}

fn write_bridge_data(data: &BridgeData) -> Result<(), String> {
    let bridge_path = get_bridge_path();
    let content = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(&bridge_path, content).map_err(|e| e.to_string())
}

// Gemini Structures (keeping for Gemini API compatibility)
#[derive(Serialize, Deserialize, Debug)]
struct GeminiPart {
    text: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
struct GeminiContent {
    role: String,
    parts: Vec<GeminiPart>,
}

#[derive(Serialize, Deserialize, Debug)]
struct GeminiRequest {
    contents: Vec<GeminiContent>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct GeminiMessage {
    role: String,
    content: String,
}

#[derive(Clone, Serialize)]
struct StreamPayload {
    chunk: String,
    done: bool,
}

#[derive(Clone, Serialize)]
struct DownloadProgressPayload {
    filename: String,
    downloaded: u64,
    total: u64,
    speed_bps: u64,
    percentage: f32,
    complete: bool,
    error: Option<String>,
}

// ============================================================================
// LLAMA.CPP COMMANDS
// ============================================================================

/// Initialize llama.cpp backend
#[tauri::command]
async fn llama_initialize() -> Result<String, String> {
    llama_backend::initialize_backend().map_err(|e| e.to_string())?;
    Ok("llama.cpp backend initialized".to_string())
}

/// Load a model into memory
#[tauri::command]
async fn llama_load_model(model_path: String, gpu_layers: Option<i32>) -> Result<String, String> {
    let config = ModelConfig {
        gpu_layers: gpu_layers.unwrap_or(99),
        ..Default::default()
    };

    // Resolve path - could be just filename or full path
    let full_path = if Path::new(&model_path).is_absolute() {
        model_path.clone()
    } else {
        get_models_dir()
            .join(&model_path)
            .to_string_lossy()
            .to_string()
    };

    llama_backend::load_model(&full_path, Some(config)).map_err(|e| e.to_string())?;
    Ok(format!("Model loaded: {}", model_path))
}

/// Unload the current model
#[tauri::command]
async fn llama_unload_model() -> Result<String, String> {
    llama_backend::unload_model().map_err(|e| e.to_string())?;
    Ok("Model unloaded".to_string())
}

/// Check if a model is loaded
#[tauri::command]
async fn llama_is_model_loaded() -> Result<bool, String> {
    Ok(llama_backend::is_model_loaded())
}

/// Get the current model path
#[tauri::command]
async fn llama_get_current_model() -> Result<Option<String>, String> {
    Ok(llama_backend::get_current_model_path().map(|p| p.to_string_lossy().to_string()))
}

/// Generate text from a prompt
#[tauri::command]
async fn llama_generate(
    prompt: String,
    system: Option<String>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<String, String> {
    let params = GenerateParams {
        temperature: temperature.unwrap_or(0.7),
        max_tokens: max_tokens.unwrap_or(2048),
        ..Default::default()
    };

    llama_backend::generate(&prompt, system.as_deref(), params).map_err(|e| e.to_string())
}

/// Generate text with streaming
#[tauri::command]
async fn llama_generate_stream(
    window: Window,
    prompt: String,
    system: Option<String>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<(), String> {
    let params = GenerateParams {
        temperature: temperature.unwrap_or(0.7),
        max_tokens: max_tokens.unwrap_or(2048),
        ..Default::default()
    };

    let window_clone = window.clone();
    let result = tokio::task::spawn_blocking(move || {
        llama_backend::generate_stream(&prompt, system.as_deref(), params, move |chunk| {
            let _ = window_clone.emit(
                "llama-stream",
                StreamPayload {
                    chunk: chunk.to_string(),
                    done: false,
                },
            );
        })
    })
    .await
    .map_err(|e| e.to_string())?;

    result.map_err(|e| e.to_string())?;

    // Send completion signal
    window
        .emit(
            "llama-stream",
            StreamPayload {
                chunk: "".to_string(),
                done: true,
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Chat with the model
#[tauri::command]
async fn llama_chat(
    messages: Vec<ChatMessage>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<String, String> {
    let params = GenerateParams {
        temperature: temperature.unwrap_or(0.7),
        max_tokens: max_tokens.unwrap_or(2048),
        ..Default::default()
    };

    llama_backend::chat(messages, params).map_err(|e| e.to_string())
}

/// Chat with streaming
#[tauri::command]
async fn llama_chat_stream(
    window: Window,
    messages: Vec<ChatMessage>,
    temperature: Option<f32>,
    max_tokens: Option<u32>,
) -> Result<(), String> {
    let params = GenerateParams {
        temperature: temperature.unwrap_or(0.7),
        max_tokens: max_tokens.unwrap_or(2048),
        ..Default::default()
    };

    let window_clone = window.clone();
    let result = tokio::task::spawn_blocking(move || {
        llama_backend::chat_stream(messages, params, move |chunk| {
            let _ = window_clone.emit(
                "llama-stream",
                StreamPayload {
                    chunk: chunk.to_string(),
                    done: false,
                },
            );
        })
    })
    .await
    .map_err(|e| e.to_string())?;

    result.map_err(|e| e.to_string())?;

    window
        .emit(
            "llama-stream",
            StreamPayload {
                chunk: "".to_string(),
                done: true,
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get embeddings for text
#[tauri::command]
async fn llama_get_embeddings(text: String) -> Result<Vec<f32>, String> {
    llama_backend::get_embeddings(&text).map_err(|e| e.to_string())
}

// ============================================================================
// MODEL MANAGEMENT COMMANDS
// ============================================================================

/// List available GGUF models
#[tauri::command]
async fn llama_list_models() -> Result<Vec<GGUFModelInfo>, String> {
    let mut manager_guard = MODEL_MANAGER.write();
    let manager = manager_guard
        .as_mut()
        .ok_or("Model manager not initialized")?;

    manager.scan_models().map_err(|e| e.to_string())
}

/// Get model information
#[tauri::command]
async fn llama_get_model_info(model_path: String) -> Result<GGUFModelInfo, String> {
    let manager_guard = MODEL_MANAGER.read();
    let manager = manager_guard
        .as_ref()
        .ok_or("Model manager not initialized")?;

    manager.get_model_info(&model_path).map_err(|e| e.to_string())
}

/// Delete a model
#[tauri::command]
async fn llama_delete_model(model_path: String) -> Result<(), String> {
    // First unload if this is the current model
    if let Some(current) = llama_backend::get_current_model_path() {
        if current.to_string_lossy().contains(&model_path) {
            llama_backend::unload_model().map_err(|e| e.to_string())?;
        }
    }

    let manager_guard = MODEL_MANAGER.read();
    let manager = manager_guard
        .as_ref()
        .ok_or("Model manager not initialized")?;

    manager.delete_model(&model_path).map_err(|e| e.to_string())
}

/// Get recommended models for download
#[tauri::command]
async fn llama_get_recommended_models() -> Result<Vec<RecommendedModel>, String> {
    Ok(get_recommended_models())
}

/// Download a model from HuggingFace
#[tauri::command]
async fn llama_download_model(
    window: Window,
    repo_id: String,
    filename: String,
) -> Result<String, String> {
    let downloader_guard = MODEL_DOWNLOADER.read();
    let downloader = downloader_guard
        .as_ref()
        .ok_or("Model downloader not initialized")?;

    let window_clone = window.clone();
    let filename_clone = filename.clone();

    let result = downloader
        .download(&repo_id, &filename, Some(move |progress: DownloadProgress| {
            let _ = window_clone.emit(
                "llama-download-progress",
                DownloadProgressPayload {
                    filename: filename_clone.clone(),
                    downloaded: progress.downloaded,
                    total: progress.total,
                    speed_bps: progress.speed_bps,
                    percentage: progress.percentage,
                    complete: progress.complete,
                    error: progress.error,
                },
            );
        }))
        .await
        .map_err(|e| e.to_string())?;

    Ok(result.to_string_lossy().to_string())
}

/// Cancel ongoing download
#[tauri::command]
async fn llama_cancel_download() -> Result<(), String> {
    let downloader_guard = MODEL_DOWNLOADER.read();
    if let Some(downloader) = downloader_guard.as_ref() {
        downloader.cancel();
    }
    Ok(())
}

// ============================================================================
// BRIDGE COMMANDS
// ============================================================================

#[tauri::command]
fn get_bridge_state() -> Result<BridgeData, String> {
    Ok(read_bridge_data())
}

#[tauri::command]
fn set_auto_approve(enabled: bool) -> Result<BridgeData, String> {
    let mut data = read_bridge_data();
    data.auto_approve = enabled;
    write_bridge_data(&data)?;
    Ok(data)
}

#[tauri::command]
fn approve_request(id: String) -> Result<BridgeData, String> {
    let mut data = read_bridge_data();
    if let Some(req) = data.requests.iter_mut().find(|r| r.id == id) {
        req.status = "approved".to_string();
    }
    write_bridge_data(&data)?;
    Ok(data)
}

#[tauri::command]
fn reject_request(id: String) -> Result<BridgeData, String> {
    let mut data = read_bridge_data();
    if let Some(req) = data.requests.iter_mut().find(|r| r.id == id) {
        req.status = "rejected".to_string();
    }
    write_bridge_data(&data)?;
    Ok(data)
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ============================================================================
// GEMINI API COMMANDS (kept for compatibility)
// ============================================================================

#[tauri::command]
async fn prompt_gemini_stream(
    window: Window,
    messages: Vec<GeminiMessage>,
    model: String,
    api_key: String,
) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let contents: Vec<GeminiContent> = messages
        .iter()
        .map(|m| GeminiContent {
            role: if m.role == "assistant" {
                "model".to_string()
            } else {
                "user".to_string()
            },
            parts: vec![GeminiPart {
                text: Some(m.content.clone()),
            }],
        })
        .collect();

    let req = GeminiRequest { contents };
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent",
        model
    );

    let mut stream = client
        .post(&url)
        .header("x-goog-api-key", &api_key)
        .json(&req)
        .send()
        .await
        .map_err(|e| format!("Gemini stream request failed: {}", e))?
        .bytes_stream();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        if let Ok(text) = String::from_utf8(chunk.to_vec()) {
            if let Some(start) = text.find("\"text\": \"") {
                let rest = &text[start + 9..];
                if let Some(end) = rest.find("\"") {
                    let content = &rest[..end];
                    let unescaped = content.replace("\\n", "\n").replace("\\\"", "\"");
                    window
                        .emit(
                            "llama-stream",
                            StreamPayload {
                                chunk: unescaped,
                                done: false,
                            },
                        )
                        .map_err(|e| e.to_string())?;
                }
            }
        }
    }

    window
        .emit(
            "llama-stream",
            StreamPayload {
                chunk: "".to_string(),
                done: true,
            },
        )
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_gemini_models(api_key: String) -> Result<Vec<String>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let url = "https://generativelanguage.googleapis.com/v1beta/models";
    let res = client
        .get(url)
        .header("x-goog-api-key", &api_key)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch Gemini models: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("Gemini API Error: {}", res.status()));
    }

    let body: serde_json::Value = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse models response: {}", e))?;

    let mut models = Vec::new();
    if let Some(models_array) = body.get("models").and_then(|v| v.as_array()) {
        for model in models_array {
            if let Some(name) = model.get("name").and_then(|v| v.as_str()) {
                models.push(name.replace("models/", ""));
            }
        }
    }
    Ok(models)
}

#[tauri::command]
async fn get_env_vars() -> Result<std::collections::HashMap<String, String>, String> {
    let base_dir = get_base_dir();
    let env_path = base_dir.join(".env");

    if !env_path.exists() {
        return Err(format!("Plik .env nie istnieje w: {:?}", env_path));
    }

    if !env_path.starts_with(&base_dir) {
        return Err("SECURITY: Path traversal detected".to_string());
    }

    let content =
        fs::read_to_string(&env_path).map_err(|e| format!("Failed to read .env: {}", e))?;

    let mut vars = std::collections::HashMap::new();
    for line in content.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = line.split_once('=') {
            let key = key.trim().to_string();
            let value = value
                .trim()
                .trim_matches('"')
                .trim_matches('\'')
                .to_string();
            vars.insert(key, value);
        }
    }
    Ok(vars)
}

// ============================================================================
// SYSTEM COMMANDS
// ============================================================================

#[tauri::command]
async fn run_system_command(command: String) -> Result<String, String> {
    if !is_command_allowed(&command) {
        return Err(format!(
            "SECURITY: Command '{}' is not in the allowlist",
            command.chars().take(50).collect::<String>()
        ));
    }

    let dangerous_patterns = [
        "rm ", "del ", "rmdir", "format", "mkfs", ">", ">>", "|", "||", "&&", "&", ";", "`", "$(",
        "Remove-Item", "Clear-Content", "Set-Content", "Invoke-Expression", "iex",
        "Start-Process", "curl", "wget", "Invoke-WebRequest",
    ];

    for pattern in dangerous_patterns {
        if command.to_lowercase().contains(&pattern.to_lowercase()) {
            return Err(format!(
                "SECURITY: Command contains dangerous pattern '{}'",
                pattern
            ));
        }
    }

    #[cfg(target_os = "windows")]
    let output = std::process::Command::new("powershell")
        .args([
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &command,
        ])
        .creation_flags(0x08000000)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    #[cfg(not(target_os = "windows"))]
    let output = std::process::Command::new("sh")
        .arg("-c")
        .arg(&command)
        .output()
        .map_err(|e| format!("Failed to execute command: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !stderr.is_empty() && !stdout.is_empty() {
        Ok(format!("{}\n[STDERR]: {}", stdout, stderr))
    } else if !stderr.is_empty() {
        Ok(format!("[STDERR]: {}", stderr))
    } else {
        Ok(stdout)
    }
}

#[tauri::command]
async fn spawn_swarm_agent_v2(
    app: AppHandle,
    window: Window,
    objective: String,
) -> Result<(), String> {
    let dangerous_chars = ['`', '$', '|', '&', ';', '>', '<', '\n', '\r'];
    for c in dangerous_chars {
        if objective.contains(c) {
            return Err(format!(
                "SECURITY: Objective contains dangerous character '{}'",
                c
            ));
        }
    }

    if objective.len() > 1000 {
        return Err("SECURITY: Objective too long (max 1000 characters)".to_string());
    }

    let base_dir = app.path().executable_dir().map_err(|e| e.to_string())?;

    let possible_paths = vec![
        base_dir.join("bin").join("run-swarm.ps1"),
        base_dir.join("release").join("bin").join("run-swarm.ps1"),
        base_dir
            .join("target")
            .join("release")
            .join("bin")
            .join("run-swarm.ps1"),
        base_dir.join("../../bin/run-swarm.ps1"),
        base_dir.join("../bin/run-swarm.ps1"),
    ];

    let mut script_path = None;
    for path in &possible_paths {
        if path.exists() {
            script_path = Some(path.clone());
            break;
        }
    }

    let script_path = script_path.ok_or_else(|| {
        format!(
            "CRITICAL: run-swarm.ps1 NOT FOUND. Checked: {:?}",
            possible_paths
        )
    })?;

    let script_path = std::fs::canonicalize(&script_path).unwrap_or(script_path);
    let mut script_path_str = script_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    if script_path_str.starts_with(r"\\?\") {
        script_path_str = script_path_str[4..].to_string();
    }

    #[cfg(target_os = "windows")]
    let mut child = Command::new("powershell")
        .args([
            "-NoProfile",
            "-WindowStyle",
            "Hidden",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            &script_path_str,
            &objective,
        ])
        .current_dir(&base_dir)
        .creation_flags(0x08000000)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn swarm: {}", e))?;

    #[cfg(not(target_os = "windows"))]
    let mut child = Command::new("pwsh")
        .args(["-NoProfile", "-File", &script_path_str, &objective])
        .current_dir(&base_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn swarm: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to open stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to open stderr")?;

    let window_clone = window.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines().flatten() {
            let _ = window_clone.emit(
                "swarm-data",
                StreamPayload {
                    chunk: line + "\n",
                    done: false,
                },
            );
        }
    });

    let window_clone2 = window.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines().flatten() {
            let _ = window_clone2.emit(
                "swarm-data",
                StreamPayload {
                    chunk: format!("[ERR] {}\n", line),
                    done: false,
                },
            );
        }
    });

    std::thread::spawn(move || {
        let status = child.wait();
        let msg = match status {
            Ok(s) if s.success() => "\n[SWARM COMPLETED SUCCESSFULLY]\n".to_string(),
            Ok(s) => format!("\n[SWARM EXITED WITH CODE: {:?}]\n", s.code()),
            Err(e) => format!("\n[SWARM ERROR: {}]\n", e),
        };
        let _ = window.emit(
            "swarm-data",
            StreamPayload {
                chunk: msg,
                done: true,
            },
        );
    });

    Ok(())
}

#[tauri::command]
fn save_file_content(path: String, content: String) -> Result<(), String> {
    let file_path = Path::new(&path);

    let dangerous_extensions = [".exe", ".dll", ".bat", ".cmd", ".ps1", ".sh", ".msi"];
    if let Some(ext) = file_path.extension() {
        let ext_str = format!(".{}", ext.to_string_lossy().to_lowercase());
        if dangerous_extensions.contains(&ext_str.as_str()) {
            return Err(format!(
                "SECURITY: Cannot write executable files ({})",
                ext_str
            ));
        }
    }

    fs::write(&path, content).map_err(|e| format!("Failed to save file: {}", e))
}

// ============================================================================
// MEMORY SYSTEM
// ============================================================================

#[derive(Serialize, Deserialize, Debug, Clone)]
struct MemoryEntry {
    id: String,
    agent: String,
    content: String,
    timestamp: i64,
    importance: f32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct KnowledgeNode {
    id: String,
    #[serde(rename = "type")]
    node_type: String,
    label: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct KnowledgeEdge {
    source: String,
    target: String,
    label: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
struct KnowledgeGraph {
    nodes: Vec<KnowledgeNode>,
    edges: Vec<KnowledgeEdge>,
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
struct MemoryStore {
    memories: Vec<MemoryEntry>,
    graph: KnowledgeGraph,
}

fn get_memory_path() -> std::path::PathBuf {
    get_base_dir().join("agent_memory.json")
}

fn read_memory_store() -> MemoryStore {
    let path = get_memory_path();
    if !path.exists() {
        return MemoryStore::default();
    }
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or(MemoryStore::default()),
        Err(_) => MemoryStore::default(),
    }
}

fn write_memory_store(store: &MemoryStore) -> Result<(), String> {
    let path = get_memory_path();
    let content = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_agent_memories(agent_name: String, top_k: usize) -> Result<Vec<MemoryEntry>, String> {
    let store = read_memory_store();
    let mut memories: Vec<MemoryEntry> = store
        .memories
        .into_iter()
        .filter(|m| m.agent.to_lowercase() == agent_name.to_lowercase())
        .collect();

    memories.sort_by(|a, b| {
        b.importance
            .partial_cmp(&a.importance)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| b.timestamp.cmp(&a.timestamp))
    });

    memories.truncate(top_k);
    Ok(memories)
}

#[tauri::command]
fn add_agent_memory(agent: String, content: String, importance: f32) -> Result<MemoryEntry, String> {
    if agent.is_empty() || content.is_empty() {
        return Err("Agent and content cannot be empty".to_string());
    }
    if content.len() > 10000 {
        return Err("Content too long (max 10000 chars)".to_string());
    }

    let mut store = read_memory_store();
    let entry = MemoryEntry {
        id: format!(
            "mem_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ),
        agent,
        content,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64,
        importance: importance.clamp(0.0, 1.0),
    };

    store.memories.push(entry.clone());

    if store.memories.len() > 1000 {
        store.memories.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        store.memories.truncate(1000);
    }

    write_memory_store(&store)?;
    Ok(entry)
}

#[tauri::command]
fn get_knowledge_graph() -> Result<KnowledgeGraph, String> {
    let store = read_memory_store();
    Ok(store.graph)
}

#[tauri::command]
fn add_knowledge_node(
    node_id: String,
    node_type: String,
    label: String,
) -> Result<KnowledgeNode, String> {
    if node_id.is_empty() || label.is_empty() {
        return Err("Node ID and label cannot be empty".to_string());
    }

    let mut store = read_memory_store();

    if store.graph.nodes.iter().any(|n| n.id == node_id) {
        return Err("Node with this ID already exists".to_string());
    }

    let node = KnowledgeNode {
        id: node_id,
        node_type,
        label,
    };

    store.graph.nodes.push(node.clone());

    if store.graph.nodes.len() > 500 {
        store.graph.nodes = store.graph.nodes.into_iter().take(500).collect();
    }

    write_memory_store(&store)?;
    Ok(node)
}

#[tauri::command]
fn add_knowledge_edge(
    source: String,
    target: String,
    label: String,
) -> Result<KnowledgeEdge, String> {
    if source.is_empty() || target.is_empty() || label.is_empty() {
        return Err("Source, target, and label cannot be empty".to_string());
    }

    let mut store = read_memory_store();

    let source_exists = store.graph.nodes.iter().any(|n| n.id == source);
    let target_exists = store.graph.nodes.iter().any(|n| n.id == target);

    if !source_exists || !target_exists {
        return Err("Source or target node does not exist".to_string());
    }

    let edge = KnowledgeEdge {
        source,
        target,
        label,
    };

    store.graph.edges.push(edge.clone());

    if store.graph.edges.len() > 1000 {
        store.graph.edges = store.graph.edges.into_iter().take(1000).collect();
    }

    write_memory_store(&store)?;
    Ok(edge)
}

#[tauri::command]
fn clear_agent_memories(agent_name: String) -> Result<usize, String> {
    let mut store = read_memory_store();
    let original_len = store.memories.len();
    store
        .memories
        .retain(|m| m.agent.to_lowercase() != agent_name.to_lowercase());
    let removed = original_len - store.memories.len();
    write_memory_store(&store)?;
    Ok(removed)
}

// ============================================================================
// APPLICATION ENTRY POINT
// ============================================================================

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // Initialize llama.cpp and model system on startup
            tauri::async_runtime::spawn(async {
                initialize_model_system();
                let _ = llama_backend::initialize_backend();
            });

            let quit_i = MenuItem::with_id(app, "quit", "Zakoncz", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Pokaz Okno", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app: &AppHandle, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray: &tauri::tray::TrayIcon, event| {
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                window.hide().unwrap();
                api.prevent_close();
            }
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Basic
            greet,
            get_env_vars,
            // Bridge
            get_bridge_state,
            set_auto_approve,
            approve_request,
            reject_request,
            // llama.cpp
            llama_initialize,
            llama_load_model,
            llama_unload_model,
            llama_is_model_loaded,
            llama_get_current_model,
            llama_generate,
            llama_generate_stream,
            llama_chat,
            llama_chat_stream,
            llama_get_embeddings,
            // Model management
            llama_list_models,
            llama_get_model_info,
            llama_delete_model,
            llama_get_recommended_models,
            llama_download_model,
            llama_cancel_download,
            // Gemini (kept for compatibility)
            prompt_gemini_stream,
            get_gemini_models,
            // System
            run_system_command,
            save_file_content,
            spawn_swarm_agent_v2,
            // Memory system
            get_agent_memories,
            add_agent_memory,
            get_knowledge_graph,
            add_knowledge_node,
            add_knowledge_edge,
            clear_agent_memories
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            _ => {}
        });
}
