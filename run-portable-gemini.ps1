
$ScriptDir = "C:\Users\BIURODOM\Desktop\GeminiCLI"
Set-Location $ScriptDir

Write-Host "--- Initiating Witcher Protocol: Portable Integration ---" -ForegroundColor Cyan

# Step 1: Fix paths
Write-Host "[1/3] Refreshing MCP configurations..." -ForegroundColor Yellow
.\setup-mcp.ps1 | Out-Null

# Step 2: Start Ollama in background if not running
Write-Host "[2/3] Checking Ollama status..." -ForegroundColor Yellow
$OllamaProcess = Get-Process ollama -ErrorAction SilentlyContinue
if (-not $OllamaProcess) {
    Write-Host "Starting Portable Ollama in a new window..." -ForegroundColor Gray
    Start-Process powershell -ArgumentList "-NoProfile -Command & { Set-Location \"$ScriptDir\"; .\start-ollama.ps1 }" -WindowStyle Minimized
    Start-Sleep -Seconds 3
}

# Step 3: Launch Gemini CLI
Write-Host "[3/3] Launching Gemini CLI... Ready for orders!" -ForegroundColor Green
.\gemini.ps1

