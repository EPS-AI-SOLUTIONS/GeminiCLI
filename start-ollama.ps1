$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$OllamaExe = Join-Path $ScriptDir "bin\ollama.exe"
$ModelsDir = Join-Path $ScriptDir "data\ollama\models"

$env:OLLAMA_MODELS = $ModelsDir
Write-Host "Starting Portable Ollama..." -ForegroundColor Green
Write-Host "Models Dir: $ModelsDir" -ForegroundColor Gray

& $OllamaExe serve

