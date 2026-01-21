use tauri::{command, State, Window};
use tokio::sync::RwLock;
use std::sync::Arc;

use crate::ollama::client::OllamaClient;
use crate::ollama::types::{ChatMessage, GenerateOptions, OllamaModel};

pub struct OllamaState {
    pub client: Arc<RwLock<OllamaClient>>,
}

impl OllamaState {
    pub fn new() -> Self {
        Self {
            client: Arc::new(RwLock::new(OllamaClient::default())),
        }
    }
}

impl Default for OllamaState {
    fn default() -> Self {
        Self::new()
    }
}

/// List available Ollama models
#[command]
pub async fn ollama_list_models(state: State<'_, OllamaState>) -> Result<Vec<OllamaModel>, String> {
    let client = state.client.read().await;
    client.list_models().await
}

/// Check if Ollama is running
#[command]
pub async fn ollama_health_check(state: State<'_, OllamaState>) -> Result<bool, String> {
    let client = state.client.read().await;
    client.health_check().await
}

/// Generate completion with streaming
#[command]
pub async fn ollama_generate(
    state: State<'_, OllamaState>,
    window: Window,
    model: String,
    prompt: String,
    system: Option<String>,
) -> Result<String, String> {
    let request_id = uuid::Uuid::new_v4().to_string();
    let client = state.client.read().await;

    client
        .generate_stream(&window, &request_id, &model, &prompt, system)
        .await
}

/// Chat completion with streaming
#[command]
pub async fn ollama_chat(
    state: State<'_, OllamaState>,
    window: Window,
    model: String,
    messages: Vec<ChatMessage>,
) -> Result<String, String> {
    let request_id = uuid::Uuid::new_v4().to_string();
    let client = state.client.read().await;

    client.chat_stream(&window, &request_id, &model, messages).await
}

/// Generate completion synchronously (no streaming, for AI metadata tasks)
#[command]
pub async fn ollama_generate_sync(
    state: State<'_, OllamaState>,
    model: String,
    prompt: String,
    options: Option<GenerateOptions>,
) -> Result<String, String> {
    let client = state.client.read().await;
    client.generate_sync(&model, &prompt, options).await
}

/// Batch generate completions - wykorzystaj wszystkie rdzenie!
/// Przetwarza wiele promptów równolegle dla maksymalnej wydajności.
#[command]
pub async fn ollama_batch_generate(
    state: State<'_, OllamaState>,
    model: String,
    prompts: Vec<String>,
    options: Option<GenerateOptions>,
) -> Result<Vec<BatchResult>, String> {
    use futures_util::future::join_all;

    let client = state.client.read().await;
    let opts = options.clone();

    // Uruchom wszystkie requesty równolegle
    let futures: Vec<_> = prompts
        .iter()
        .enumerate()
        .map(|(idx, prompt)| {
            let model = model.clone();
            let prompt = prompt.clone();
            let opts = opts.clone();
            let client_ref = &client;

            async move {
                let start = std::time::Instant::now();
                let result = client_ref.generate_sync(&model, &prompt, opts).await;
                let duration_ms = start.elapsed().as_millis() as u64;

                let (response, error) = match result {
                    Ok(resp) => (Some(resp), None),
                    Err(err) => (None, Some(err)),
                };

                BatchResult {
                    index: idx,
                    prompt: prompt.clone(),
                    response,
                    error,
                    duration_ms,
                }
            }
        })
        .collect();

    let results = join_all(futures).await;
    Ok(results)
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct BatchResult {
    pub index: usize,
    pub prompt: String,
    pub response: Option<String>,
    pub error: Option<String>,
    pub duration_ms: u64,
}

/// Get CPU info for performance monitoring
#[command]
pub fn get_cpu_info() -> CpuInfo {
    CpuInfo {
        logical_cores: num_cpus::get(),
        physical_cores: num_cpus::get_physical(),
        rayon_threads: rayon::current_num_threads(),
    }
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct CpuInfo {
    pub logical_cores: usize,
    pub physical_cores: usize,
    pub rayon_threads: usize,
}
