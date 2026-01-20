# Gemini CLI - Portable Ollama Launcher
# "Because sometimes the cloud is just too far away." - Jaskier

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BinDir = Join-Path $ScriptDir "bin"
$OllamaExe = Join-Path $BinDir "ollama.exe"
$DataDir = Join-Path $ScriptDir "data\ollama\models"

# 1. Configure the Environment (The Magic Circle)
Write-Host "[Jaskier] Configuring portable environment..." -ForegroundColor Cyan
$env:OLLAMA_MODELS = $DataDir
Write-Host "   -> Models path set to: $DataDir" -ForegroundColor DarkGray

# 2. Check for the Beast (Ollama Binary)
if (-not (Test-Path $OllamaExe)) {
    Write-Host "[!] Ollama executable not found in $BinDir" -ForegroundColor Red
    Write-Host "    To make this truly portable:" -ForegroundColor Yellow
    Write-Host "    1. Download Ollama for Windows."
    Write-Host "    2. Copy 'ollama.exe' (from AppData\Local\Programs\Ollama or the setup) into '$BinDir'."
    Write-Host "    3. Run this script again."
    
    # Fallback to global if available
    if (Get-Command "ollama" -ErrorAction SilentlyContinue) {
        Write-Host "[!] Found global installation. Using that instead (but with LOCAL models)." -ForegroundColor Yellow
        $OllamaExe = "ollama"
    } else {
        Write-Host "[X] No global Ollama found either. I cannot work under these conditions!" -ForegroundColor Red
        exit
    }
}

# 3. Serve the Feast (Start Server)
Write-Host "[Jaskier] Starting Ollama Server..." -ForegroundColor Green
Write-Host "   (Close this window to stop the server)" -ForegroundColor DarkGray

# Start process
try {
    # Check if server is already running
    $running = Get-Process ollama -ErrorAction SilentlyContinue
    if ($running) {
        Write-Host "[!] Ollama is already singing in the background." -ForegroundColor Yellow
    } else {
        Start-Process -FilePath $OllamaExe -ArgumentList "serve" -NoNewWindow
        Write-Host "[Jaskier] Server started. Listening for tales..." -ForegroundColor Cyan
    }
} catch {
    Write-Host "[!] Error starting Ollama: $_" -ForegroundColor Red
}
