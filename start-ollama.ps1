$ErrorActionPreference = "Stop"

Write-Host "--- Debug: start-ollama.ps1 initialization ---"
Write-Host "PSScriptRoot: '$PSScriptRoot'"
Write-Host "MyCommand.Definition: '$($MyInvocation.MyCommand.Definition)'"
Write-Host "Current Location: '$(Get-Location)'"

# 1. Try PSScriptRoot
$ScriptDir = $PSScriptRoot

# 2. Try MyCommand definition
if ([string]::IsNullOrWhiteSpace($ScriptDir)) {
    $def = $MyInvocation.MyCommand.Definition
    if (-not [string]::IsNullOrWhiteSpace($def)) {
        $ScriptDir = Split-Path -Parent $def
    }
}

# 3. Fallback to current location (PWD)
if ([string]::IsNullOrWhiteSpace($ScriptDir)) {
    $ScriptDir = (Get-Location).Path
}

# Clean up long path prefix if present (\\?\)
if ($ScriptDir -like "\\?\*") {
    $ScriptDir = $ScriptDir.Substring(4)
}

Write-Host "Final ScriptDir: '$ScriptDir'"

if ([string]::IsNullOrWhiteSpace($ScriptDir)) {
    Write-Error "CRITICAL: Could not determine script directory."
    exit 1
}

$OllamaExe = Join-Path $ScriptDir "bin\ollama.exe"
$ModelsDir = Join-Path $ScriptDir "data\ollama\models"

Write-Host "Ollama Executable: $OllamaExe"
Write-Host "Models Directory: $ModelsDir"

if (-not (Test-Path $OllamaExe)) {
    Write-Warning "Ollama executable not found at expected path!"
}

$env:OLLAMA_MODELS = $ModelsDir

# --- SELF-HEALING: Port Conflict Resolution ---
$port = 11434
Write-Host "Checking port $port..." -NoNewline
$tcpConnection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($tcpConnection) {
    Write-Host " OCCUPIED." -ForegroundColor Yellow
    $pidToKill = $tcpConnection.OwningProcess
    Write-Host "  -> Killing blocking process (PID: $pidToKill)..." -ForegroundColor Red
    Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
} else {
    Write-Host " FREE." -ForegroundColor Green
}
# ----------------------------------------------

Write-Host "Starting Portable Ollama..." -ForegroundColor Green

& $OllamaExe serve

