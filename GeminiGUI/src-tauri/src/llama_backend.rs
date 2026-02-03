//! llama.cpp Backend Integration
//!
//! Core module for llama.cpp integration using llama-cpp-2 bindings.
//! Provides model loading, text generation, chat, and embeddings.

use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::context::LlamaContext;
use llama_cpp_2::llama_backend::LlamaBackend as LlamaCppBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaModel, Special};
use llama_cpp_2::sampling::params::LlamaSamplerChainParams;
use llama_cpp_2::sampling::LlamaSampler;
use llama_cpp_2::token::LlamaToken;
use once_cell::sync::Lazy;
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use std::num::NonZeroU32;
use std::path::PathBuf;
use std::sync::Arc;
use thiserror::Error;
use tracing::{debug, error, info, warn};

/// Global llama.cpp backend instance
static LLAMA_BACKEND_INSTANCE: Lazy<RwLock<Option<LlamaCppBackend>>> =
    Lazy::new(|| RwLock::new(None));

/// Global model state
static MODEL_STATE: Lazy<RwLock<ModelState>> = Lazy::new(|| RwLock::new(ModelState::default()));

#[derive(Error, Debug)]
pub enum LlamaError {
    #[error("Backend not initialized")]
    BackendNotInitialized,
    #[error("Model not loaded")]
    ModelNotLoaded,
    #[error("Failed to load model: {0}")]
    ModelLoadError(String),
    #[error("Generation error: {0}")]
    GenerationError(String),
    #[error("Tokenization error: {0}")]
    TokenizationError(String),
    #[error("Context error: {0}")]
    ContextError(String),
    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),
}

impl From<LlamaError> for String {
    fn from(e: LlamaError) -> Self {
        e.to_string()
    }
}

/// Model state container
#[derive(Default)]
pub struct ModelState {
    model: Option<Arc<LlamaModel>>,
    current_model_path: Option<PathBuf>,
    config: ModelConfig,
}

/// Configuration for model loading
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub gpu_layers: i32,
    pub context_size: u32,
    pub batch_size: u32,
    pub threads: u32,
    pub flash_attention: bool,
}

impl Default for ModelConfig {
    fn default() -> Self {
        Self {
            gpu_layers: 99,
            context_size: 8192,
            batch_size: 512,
            threads: 8,
            flash_attention: true,
        }
    }
}

/// Parameters for text generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateParams {
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
    #[serde(default = "default_top_p")]
    pub top_p: f32,
    #[serde(default = "default_top_k")]
    pub top_k: i32,
    #[serde(default)]
    pub repeat_penalty: f32,
    #[serde(default)]
    pub stop_sequences: Vec<String>,
}

fn default_temperature() -> f32 {
    0.7
}
fn default_max_tokens() -> u32 {
    2048
}
fn default_top_p() -> f32 {
    0.9
}
fn default_top_k() -> i32 {
    40
}

impl Default for GenerateParams {
    fn default() -> Self {
        Self {
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 0.9,
            top_k: 40,
            repeat_penalty: 1.1,
            stop_sequences: vec![],
        }
    }
}

/// Chat message structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

/// Initialize the llama.cpp backend
pub fn initialize_backend() -> Result<(), LlamaError> {
    let mut backend_guard = LLAMA_BACKEND_INSTANCE.write();
    if backend_guard.is_some() {
        info!("llama.cpp backend already initialized");
        return Ok(());
    }

    info!("Initializing llama.cpp backend...");
    let backend = LlamaCppBackend::init().map_err(|e| {
        error!("Failed to initialize llama.cpp backend: {:?}", e);
        LlamaError::BackendNotInitialized
    })?;

    *backend_guard = Some(backend);
    info!("llama.cpp backend initialized successfully");
    Ok(())
}

/// Load a model from the given path
pub fn load_model(model_path: &str, config: Option<ModelConfig>) -> Result<(), LlamaError> {
    let config = config.unwrap_or_default();
    let path = PathBuf::from(model_path);

    if !path.exists() {
        return Err(LlamaError::ModelLoadError(format!(
            "Model file not found: {}",
            model_path
        )));
    }

    info!(
        "Loading model from: {} with {} GPU layers",
        model_path, config.gpu_layers
    );

    // Ensure backend is initialized
    initialize_backend()?;

    // Create model params
    let model_params = LlamaModelParams::default().with_n_gpu_layers(config.gpu_layers);

    // Load the model
    let model = LlamaModel::load_from_file(&LLAMA_BACKEND_INSTANCE.read().as_ref().unwrap(), &path, &model_params)
        .map_err(|e| {
            error!("Failed to load model: {:?}", e);
            LlamaError::ModelLoadError(format!("{:?}", e))
        })?;

    // Store model state
    let mut state = MODEL_STATE.write();
    state.model = Some(Arc::new(model));
    state.current_model_path = Some(path);
    state.config = config;

    info!("Model loaded successfully");
    Ok(())
}

/// Unload the current model
pub fn unload_model() -> Result<(), LlamaError> {
    info!("Unloading model...");
    let mut state = MODEL_STATE.write();
    state.model = None;
    state.current_model_path = None;
    info!("Model unloaded");
    Ok(())
}

/// Check if a model is loaded
pub fn is_model_loaded() -> bool {
    MODEL_STATE.read().model.is_some()
}

/// Get the current model path
pub fn get_current_model_path() -> Option<PathBuf> {
    MODEL_STATE.read().current_model_path.clone()
}

/// Generate text from a prompt
pub fn generate(prompt: &str, system: Option<&str>, params: GenerateParams) -> Result<String, LlamaError> {
    let state = MODEL_STATE.read();
    let model = state
        .model
        .as_ref()
        .ok_or(LlamaError::ModelNotLoaded)?
        .clone();
    let config = state.config.clone();
    drop(state);

    // Build the full prompt with system message
    let full_prompt = if let Some(sys) = system {
        format!(
            "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
            sys, prompt
        )
    } else {
        format!(
            "<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n{}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
            prompt
        )
    };

    generate_internal(&model, &full_prompt, &params, &config)
}

/// Generate text with streaming callback
pub fn generate_stream<F>(
    prompt: &str,
    system: Option<&str>,
    params: GenerateParams,
    callback: F,
) -> Result<String, LlamaError>
where
    F: Fn(&str) + Send + 'static,
{
    let state = MODEL_STATE.read();
    let model = state
        .model
        .as_ref()
        .ok_or(LlamaError::ModelNotLoaded)?
        .clone();
    let config = state.config.clone();
    drop(state);

    // Build the full prompt with system message
    let full_prompt = if let Some(sys) = system {
        format!(
            "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
            sys, prompt
        )
    } else {
        format!(
            "<|begin_of_text|><|start_header_id|>user<|end_header_id|>\n\n{}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
            prompt
        )
    };

    generate_stream_internal(&model, &full_prompt, &params, &config, callback)
}

/// Chat with the model using a list of messages
pub fn chat(messages: Vec<ChatMessage>, params: GenerateParams) -> Result<String, LlamaError> {
    let state = MODEL_STATE.read();
    let model = state
        .model
        .as_ref()
        .ok_or(LlamaError::ModelNotLoaded)?
        .clone();
    let config = state.config.clone();
    drop(state);

    let prompt = format_chat_messages(&messages);
    generate_internal(&model, &prompt, &params, &config)
}

/// Chat with streaming callback
pub fn chat_stream<F>(
    messages: Vec<ChatMessage>,
    params: GenerateParams,
    callback: F,
) -> Result<String, LlamaError>
where
    F: Fn(&str) + Send + 'static,
{
    let state = MODEL_STATE.read();
    let model = state
        .model
        .as_ref()
        .ok_or(LlamaError::ModelNotLoaded)?
        .clone();
    let config = state.config.clone();
    drop(state);

    let prompt = format_chat_messages(&messages);
    generate_stream_internal(&model, &prompt, &params, &config, callback)
}

/// Get embeddings for text
pub fn get_embeddings(text: &str) -> Result<Vec<f32>, LlamaError> {
    let state = MODEL_STATE.read();
    let model = state
        .model
        .as_ref()
        .ok_or(LlamaError::ModelNotLoaded)?
        .clone();
    let config = state.config.clone();
    drop(state);

    // Create context for embeddings
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(512).unwrap())
        .with_embeddings(true);

    let ctx = LlamaContext::new_with_model(model.as_ref(), ctx_params).map_err(|e| {
        error!("Failed to create context for embeddings: {:?}", e);
        LlamaError::ContextError(format!("{:?}", e))
    })?;

    // Tokenize the input
    let tokens = model
        .str_to_token(text, AddBos::Always)
        .map_err(|e| LlamaError::TokenizationError(format!("{:?}", e)))?;

    // Create batch and add tokens
    let mut batch = LlamaBatch::new(512, 1);
    for (i, token) in tokens.iter().enumerate() {
        batch.add(*token, i as i32, &[0], i == tokens.len() - 1).map_err(|e| {
            LlamaError::GenerationError(format!("Failed to add token to batch: {:?}", e))
        })?;
    }

    // Decode the batch
    ctx.decode(&mut batch).map_err(|e| {
        LlamaError::GenerationError(format!("Failed to decode batch for embeddings: {:?}", e))
    })?;

    // Get embeddings
    let embeddings = ctx
        .embeddings_seq_ith(0)
        .map_err(|e| LlamaError::GenerationError(format!("Failed to get embeddings: {:?}", e)))?;

    Ok(embeddings.to_vec())
}

// Internal generation function
fn generate_internal(
    model: &Arc<LlamaModel>,
    prompt: &str,
    params: &GenerateParams,
    config: &ModelConfig,
) -> Result<String, LlamaError> {
    // Create context
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(config.context_size).unwrap())
        .with_n_batch(config.batch_size)
        .with_flash_attn(config.flash_attention);

    let mut ctx = LlamaContext::new_with_model(model.as_ref(), ctx_params).map_err(|e| {
        error!("Failed to create context: {:?}", e);
        LlamaError::ContextError(format!("{:?}", e))
    })?;

    // Tokenize the prompt
    let tokens = model
        .str_to_token(prompt, AddBos::Always)
        .map_err(|e| LlamaError::TokenizationError(format!("{:?}", e)))?;

    debug!("Tokenized prompt into {} tokens", tokens.len());

    // Create batch
    let mut batch = LlamaBatch::new(config.context_size as usize, 1);
    for (i, token) in tokens.iter().enumerate() {
        batch.add(*token, i as i32, &[0], i == tokens.len() - 1).map_err(|e| {
            LlamaError::GenerationError(format!("Failed to add token to batch: {:?}", e))
        })?;
    }

    // Decode initial batch
    ctx.decode(&mut batch).map_err(|e| {
        LlamaError::GenerationError(format!("Failed to decode batch: {:?}", e))
    })?;

    // Create sampler
    let sampler_params = LlamaSamplerChainParams::default();
    let mut sampler = LlamaSampler::new(sampler_params)
        .map_err(|e| LlamaError::GenerationError(format!("Failed to create sampler: {:?}", e)))?;

    sampler
        .add_temp(params.temperature)
        .add_top_k(params.top_k)
        .add_top_p(params.top_p, 1)
        .add_dist(42); // seed

    // Generate tokens
    let mut output = String::new();
    let mut n_cur = tokens.len();

    for _ in 0..params.max_tokens {
        let new_token = sampler.sample(&ctx, -1);

        // Check for EOS
        if model.is_eog_token(new_token) {
            debug!("End of generation token encountered");
            break;
        }

        // Convert token to string
        let token_str = model
            .token_to_str(new_token, Special::Tokenize)
            .map_err(|e| LlamaError::GenerationError(format!("Failed to convert token: {:?}", e)))?;

        output.push_str(&token_str);

        // Check stop sequences
        for stop in &params.stop_sequences {
            if output.ends_with(stop) {
                output.truncate(output.len() - stop.len());
                return Ok(output);
            }
        }

        // Prepare next batch
        batch.clear();
        batch.add(new_token, n_cur as i32, &[0], true).map_err(|e| {
            LlamaError::GenerationError(format!("Failed to add token to batch: {:?}", e))
        })?;

        n_cur += 1;

        ctx.decode(&mut batch).map_err(|e| {
            LlamaError::GenerationError(format!("Failed to decode: {:?}", e))
        })?;

        sampler.accept(new_token);
    }

    Ok(output)
}

// Internal streaming generation function
fn generate_stream_internal<F>(
    model: &Arc<LlamaModel>,
    prompt: &str,
    params: &GenerateParams,
    config: &ModelConfig,
    callback: F,
) -> Result<String, LlamaError>
where
    F: Fn(&str) + Send + 'static,
{
    // Create context
    let ctx_params = LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(config.context_size).unwrap())
        .with_n_batch(config.batch_size)
        .with_flash_attn(config.flash_attention);

    let mut ctx = LlamaContext::new_with_model(model.as_ref(), ctx_params).map_err(|e| {
        error!("Failed to create context: {:?}", e);
        LlamaError::ContextError(format!("{:?}", e))
    })?;

    // Tokenize the prompt
    let tokens = model
        .str_to_token(prompt, AddBos::Always)
        .map_err(|e| LlamaError::TokenizationError(format!("{:?}", e)))?;

    debug!("Tokenized prompt into {} tokens", tokens.len());

    // Create batch
    let mut batch = LlamaBatch::new(config.context_size as usize, 1);
    for (i, token) in tokens.iter().enumerate() {
        batch.add(*token, i as i32, &[0], i == tokens.len() - 1).map_err(|e| {
            LlamaError::GenerationError(format!("Failed to add token to batch: {:?}", e))
        })?;
    }

    // Decode initial batch
    ctx.decode(&mut batch).map_err(|e| {
        LlamaError::GenerationError(format!("Failed to decode batch: {:?}", e))
    })?;

    // Create sampler
    let sampler_params = LlamaSamplerChainParams::default();
    let mut sampler = LlamaSampler::new(sampler_params)
        .map_err(|e| LlamaError::GenerationError(format!("Failed to create sampler: {:?}", e)))?;

    sampler
        .add_temp(params.temperature)
        .add_top_k(params.top_k)
        .add_top_p(params.top_p, 1)
        .add_dist(42);

    // Generate tokens with streaming
    let mut output = String::new();
    let mut n_cur = tokens.len();

    for _ in 0..params.max_tokens {
        let new_token = sampler.sample(&ctx, -1);

        // Check for EOS
        if model.is_eog_token(new_token) {
            debug!("End of generation token encountered");
            break;
        }

        // Convert token to string
        let token_str = model
            .token_to_str(new_token, Special::Tokenize)
            .map_err(|e| LlamaError::GenerationError(format!("Failed to convert token: {:?}", e)))?;

        // Stream the token
        callback(&token_str);
        output.push_str(&token_str);

        // Check stop sequences
        for stop in &params.stop_sequences {
            if output.ends_with(stop) {
                output.truncate(output.len() - stop.len());
                return Ok(output);
            }
        }

        // Prepare next batch
        batch.clear();
        batch.add(new_token, n_cur as i32, &[0], true).map_err(|e| {
            LlamaError::GenerationError(format!("Failed to add token to batch: {:?}", e))
        })?;

        n_cur += 1;

        ctx.decode(&mut batch).map_err(|e| {
            LlamaError::GenerationError(format!("Failed to decode: {:?}", e))
        })?;

        sampler.accept(new_token);
    }

    Ok(output)
}

/// Format chat messages into a prompt string
fn format_chat_messages(messages: &[ChatMessage]) -> String {
    let mut prompt = String::from("<|begin_of_text|>");

    for msg in messages {
        match msg.role.as_str() {
            "system" => {
                prompt.push_str(&format!(
                    "<|start_header_id|>system<|end_header_id|>\n\n{}<|eot_id|>",
                    msg.content
                ));
            }
            "user" => {
                prompt.push_str(&format!(
                    "<|start_header_id|>user<|end_header_id|>\n\n{}<|eot_id|>",
                    msg.content
                ));
            }
            "assistant" => {
                prompt.push_str(&format!(
                    "<|start_header_id|>assistant<|end_header_id|>\n\n{}<|eot_id|>",
                    msg.content
                ));
            }
            _ => {
                warn!("Unknown message role: {}", msg.role);
            }
        }
    }

    // Add assistant header for the response
    prompt.push_str("<|start_header_id|>assistant<|end_header_id|>\n\n");
    prompt
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format_chat_messages() {
        let messages = vec![
            ChatMessage {
                role: "system".to_string(),
                content: "You are a helpful assistant.".to_string(),
            },
            ChatMessage {
                role: "user".to_string(),
                content: "Hello!".to_string(),
            },
        ];

        let prompt = format_chat_messages(&messages);
        assert!(prompt.contains("system"));
        assert!(prompt.contains("user"));
        assert!(prompt.contains("You are a helpful assistant."));
        assert!(prompt.contains("Hello!"));
    }

    #[test]
    fn test_default_params() {
        let params = GenerateParams::default();
        assert_eq!(params.temperature, 0.7);
        assert_eq!(params.max_tokens, 2048);
        assert_eq!(params.top_p, 0.9);
        assert_eq!(params.top_k, 40);
    }
}
