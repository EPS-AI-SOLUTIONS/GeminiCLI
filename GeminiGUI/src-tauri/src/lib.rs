// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Window};
use futures_util::StreamExt;
use std::process::{Command, Stdio};
use std::io::{BufRead, BufReader};

const BRIDGE_FILE_PATH: &str = "C:\\Users\\BIURODOM\\Desktop\\GeminiCLI\\bridge.json";
// ... (rest of struct definitions remains the same)

#[derive(Serialize, Deserialize, Debug, Clone)]
struct BridgeRequest {
    id: String,
    message: String,
    status: String, // "pending", "approved", "rejected"
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
    if !Path::new(BRIDGE_FILE_PATH).exists() {
        return BridgeData::default();
    }
    match fs::read_to_string(BRIDGE_FILE_PATH) {
        Ok(content) => serde_json::from_str(&content).unwrap_or(BridgeData::default()),
        Err(_) => BridgeData::default(),
    }
}

fn write_bridge_data(data: &BridgeData) -> Result<(), String> {
    let content = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(BRIDGE_FILE_PATH, content).map_err(|e| e.to_string())
}

#[derive(Serialize, Deserialize, Debug)]
struct OllamaMessage {
    role: String,
    content: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    images: Option<Vec<String>>,
}

// Gemini Structures
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

#[derive(Serialize, Deserialize)]
struct OllamaChatRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
}

#[derive(Serialize, Deserialize)]
struct OllamaChatResponse {
    message: OllamaMessage,
    done: bool,
}

#[derive(Serialize, Deserialize, Debug)]
struct OllamaModel {
    name: String,
}

#[derive(Serialize, Deserialize, Debug)]
struct OllamaTagsResponse {
    models: Vec<OllamaModel>,
}

#[derive(Serialize, Deserialize, Debug)]
struct OllamaTagsResponseInternal {
    models: Vec<OllamaModel>,
}


#[derive(Clone, Serialize)]
struct StreamPayload {
    chunk: String,
    done: bool,
}


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

#[tauri::command]
async fn fetch_external_data(url: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let res = client.get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json::<serde_json::Value>()
        .await
        .map_err(|e| e.to_string())?;
    Ok(res)
}

#[tauri::command]
async fn prompt_ollama(messages: Vec<OllamaMessage>, model: String, endpoint: String) -> Result<String, String> {
    let client = reqwest::Client::new();
    let req = OllamaChatRequest {
        model,
        messages,
        stream: false,
    };
    
    let url = format!("{}/api/chat", endpoint.trim_end_matches('/'));
    let res = client.post(&url)
        .json(&req)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
         return Err(format!("Ollama API Error: {}", res.status()));
    }

    let body: OllamaChatResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(body.message.content)
}

#[tauri::command]
async fn prompt_ollama_stream(
    window: Window, 
    messages: Vec<OllamaMessage>, 
    model: String, 
    endpoint: String
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let req = OllamaChatRequest {
        model,
        messages,
        stream: true,
    };

    let url = format!("{}/api/chat", endpoint.trim_end_matches('/'));
    let mut stream = client.post(&url)
        .json(&req)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes_stream();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        if let Ok(text) = String::from_utf8(chunk.to_vec()) {
            for line in text.lines() {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(line) {
                    if let Some(content) = json.get("message").and_then(|m| m.get("content")).and_then(|v| v.as_str()) {
                         let done = json.get("done").and_then(|v| v.as_bool()).unwrap_or(false);
                         window.emit("ollama-event", StreamPayload {
                             chunk: content.to_string(),
                             done
                         }).map_err(|e| e.to_string())?;
                    }
                }
            }
        }
    }

    Ok(())
}


#[tauri::command]
async fn get_ollama_models(endpoint: String) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let url = format!("{}/api/tags", endpoint.trim_end_matches('/'));
    let res = client.get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
         return Err(format!("Ollama API Error: {}", res.status()));
    }

    let body: OllamaTagsResponse = res.json().await.map_err(|e| e.to_string())?;
    Ok(body.models.into_iter().map(|m| m.name).collect())
}

#[tauri::command]
async fn run_system_command(command: String) -> Result<String, String> {
    // SECURITY WARNING: In a real production app, you MUST sanitize this input
    // or use an allowlist of commands. For this demo, we allow free execution.
    
    #[cfg(target_os = "windows")]
    let output = std::process::Command::new("powershell")
        .args(["-Command", &command])
        .output()
        .map_err(|e| e.to_string())?;

    #[cfg(not(target_os = "windows"))]
    let output = std::process::Command::new("sh")
        .arg("-c")
        .arg(&command)
        .output()
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    if !stderr.is_empty() {
        Ok(format!("STDOUT:\n{}\nSTDERR:\n{}", stdout, stderr))
    } else {
        Ok(stdout)
    }
}

#[tauri::command]
async fn spawn_swarm_agent(window: Window, objective: String) -> Result<(), String> {
    // Construct command to import module and run invoke
    // We assume the CWD is correct or absolute paths are used. 
    // For Tauri dev, CWD might be different, so best to use relative to executable or fixed.
    // Here we try absolute path based on known structure or relative.
    
    let script_block = format!(
        "Import-Module ./AgentSwarm.psm1; Invoke-AgentSwarm -Objective '{}' -Yolo", 
        objective.replace("'", "''")
    );

    let mut child = Command::new("powershell")
        .args(["-Command", &script_block])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().ok_or("Failed to open stdout")?;
    let stderr = child.stderr.take().ok_or("Failed to open stderr")?;

    // We need to spawn threads to read output so we don't block the async runtime
    let window_clone = window.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            if let Ok(l) = line {
                let _ = window_clone.emit("swarm-data", StreamPayload { chunk: l + "\n", done: false });
            }
        }
    });

    let window_clone2 = window.clone();
    std::thread::spawn(move || {
        let reader = BufReader::new(stderr);
        for line in reader.lines() {
            if let Ok(l) = line {
                // Emit stderr as logs too, maybe prefixed
                let _ = window_clone2.emit("swarm-data", StreamPayload { chunk: format!("[ERR] {}\n", l), done: false });
            }
        }
    });

    // Wait for child in a blocking way on a thread, or just let it finish.
    // If we want to know when it's done:
    std::thread::spawn(move || {
        let _ = child.wait();
        let _ = window.emit("swarm-data", StreamPayload { chunk: "\n[SWARM PROCEDURE COMPLETE]\n".to_string(), done: true });
    });

    Ok(())
}

#[tauri::command]
fn save_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn prompt_gemini_stream(
    window: Window,
    messages: Vec<OllamaMessage>,
    model: String,
    api_key: String
) -> Result<(), String> {
    let client = reqwest::Client::new();
    
    // Convert internal message format to Gemini format
    let contents: Vec<GeminiContent> = messages.iter().map(|m| {
        GeminiContent {
            role: if m.role == "assistant" { "model".to_string() } else { "user".to_string() },
            parts: vec![GeminiPart { text: Some(m.content.clone()) }]
        }
    }).collect();

    let req = GeminiRequest { contents };
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?key={}", model, api_key);

    let mut stream = client.post(&url)
        .json(&req)
        .send()
        .await
        .map_err(|e| e.to_string())?
        .bytes_stream();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        if let Ok(text) = String::from_utf8(chunk.to_vec()) {
            if let Some(start) = text.find("\"text\": \"") {
                let rest = &text[start + 9..];
                if let Some(end) = rest.find("\"") {
                    let content = &rest[..end];
                    let unescaped = content.replace("\\n", "\n").replace("\\\"", "\"");
                    window.emit("ollama-event", StreamPayload {
                        chunk: unescaped,
                        done: false
                    }).map_err(|e| e.to_string())?;
                }
            }
        }
    }
    
    window.emit("ollama-event", StreamPayload {
        chunk: "".to_string(),
        done: true
    }).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_env_vars() -> Result<std::collections::HashMap<String, String>, String> {
    let env_path = Path::new("..").join(".env");
    if !env_path.exists() {
        return Err("Plik .env nie istnieje w katalogu nadrzędnym".to_string());
    }
    
    let content = fs::read_to_string(env_path).map_err(|e| e.to_string())?;
    let mut vars = std::collections::HashMap::new();
    for line in content.lines() {
        if let Some((key, value)) = line.split_once('=') {
            vars.insert(key.trim().to_string(), value.trim().to_string());
        }
    }
    Ok(vars)
}

#[tauri::command]
async fn get_gemini_models(api_key: String) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", api_key);
    let res = client.get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
         return Err(format!("Gemini API Error: {}", res.status()));
    }

    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let mut models = Vec::new();
    if let Some(models_array) = body.get("models").and_then(|v| v.as_array()) {
        for model in models_array {
            if let Some(name) = model.get("name").and_then(|v| v.as_str()) {
                // Remove 'models/' prefix
                models.push(name.replace("models/", ""));
            }
        }
    }
    Ok(models)
}

// Function to assign a score to a model name for sorting
fn get_model_score(name: &str) -> i32 {
    let mut score = 0;
    if name.contains("pro") { score += 100; }
    if name.contains("ultra") { score += 200; }
    if name.contains("flash") { score -= 50; }
    if name.contains("1.5") { score += 50; }
    if name.contains("latest") { score += 10; }
    score
}

#[tauri::command]
async fn get_gemini_models_sorted(api_key: String) -> Result<Vec<String>, String> {
    let client = reqwest::Client::new();
    let url = format!("https://generativelanguage.googleapis.com/v1beta/models?key={}", api_key);
    let res = client.get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !res.status().is_success() {
         return Err(format!("Gemini API Error: {}", res.status()));
    }

    let body: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let mut models = Vec::new();
    if let Some(models_array) = body.get("models").and_then(|v| v.as_array()) {
        for model in models_array {
            if let Some(name) = model.get("name").and_then(|v| v.as_str()) {
                // We only want generative models, and remove the 'models/' prefix
                if name.contains("generateContent") {
                    models.push(name.replace("models/", ""));
                }
            }
        }
    }
    
    // Sort models by score, descending
    models.sort_by(|a, b| get_model_score(b).cmp(&get_model_score(a)));

    Ok(models)
}

#[tauri::command]
fn start_ollama_server() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // On Windows, we want to run this in a new, hidden window so it doesn't block
        // and doesn't show a flickering console.
        Command::new("powershell")
            .args(&["-WindowStyle", "Hidden", "-Command", "Start-Process", "powershell", "-ArgumentList '-NoExit -Command .\\start-ollama.ps1'"])
            .spawn()
            .map_err(|e| format!("Failed to spawn Ollama process: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        // On other systems, run it in the background
        Command::new("sh")
            .arg("-c")
            .arg("./start-ollama.ps1 &")
            .spawn()
            .map_err(|e| format!("Failed to spawn Ollama process: {}", e))?;
    }

    Ok("Ollama server started in background.".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            // -- Start Ollama on App Boot --
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let _ = handle.invoke("start_ollama_server", ());
            });

            let quit_i = MenuItem::with_id(app, "quit", "Zakończ", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Pokaż Okno", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
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
                .on_tray_icon_event(|tray, event| {
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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_bridge_state,
            set_auto_approve,
            approve_request,
            reject_request,
            fetch_external_data,
            prompt_ollama,
            prompt_ollama_stream,
            prompt_gemini_stream,
            get_ollama_models,
            get_gemini_models,
            get_gemini_models_sorted,
            get_env_vars,
            run_system_command,
            save_file_content,
            spawn_swarm_agent,
            start_ollama_server
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}