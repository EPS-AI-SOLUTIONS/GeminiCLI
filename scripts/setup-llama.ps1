# setup-llama.ps1 - Pobieranie llama.cpp i modeli GGUF
# Autor: GeminiHydra Team

param(
    [switch]$SkipBinaries,
    [switch]$SkipModels,
    [string]$CudaVersion = "12.4"
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
$BIN_DIR = Join-Path $PROJECT_ROOT "bin"
$MODELS_DIR = Join-Path $PROJECT_ROOT "data\models"

# llama.cpp release info
$LLAMA_VERSION = "b7898"
$LLAMA_BASE_URL = "https://github.com/ggml-org/llama.cpp/releases/download/$LLAMA_VERSION"

# Model definitions (small, efficient models for local inference)
$MODELS = @(
    @{
        Name = "qwen2.5-coder-1.5b-q4_k_m"
        Url = "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"
        Size = "1.0 GB"
        Description = "Qwen2.5 Coder 1.5B - fast coding assistant"
    },
    @{
        Name = "llama-3.2-3b-q4_k_m"
        Url = "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf"
        Size = "2.0 GB"
        Description = "Llama 3.2 3B - general purpose"
    },
    @{
        Name = "nomic-embed-text-v1.5"
        Url = "https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.Q8_0.gguf"
        Size = "140 MB"
        Description = "Nomic Embed - text embeddings"
    }
)

function Write-Status {
    param([string]$Message, [string]$Color = "Cyan")
    Write-Host "[llama-setup] " -ForegroundColor Gray -NoNewline
    Write-Host $Message -ForegroundColor $Color
}

function Download-File {
    param([string]$Url, [string]$Output)

    $fileName = Split-Path -Leaf $Output
    Write-Status "Downloading $fileName..."

    try {
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($Url, $Output)
        Write-Status "Downloaded: $fileName" -Color Green
        return $true
    }
    catch {
        Write-Status "Failed to download $fileName : $_" -Color Red
        return $false
    }
}

function Setup-Directories {
    Write-Status "Creating directories..."

    if (-not (Test-Path $BIN_DIR)) {
        New-Item -ItemType Directory -Path $BIN_DIR -Force | Out-Null
    }

    if (-not (Test-Path $MODELS_DIR)) {
        New-Item -ItemType Directory -Path $MODELS_DIR -Force | Out-Null
    }

    Write-Status "Directories ready" -Color Green
}

function Install-LlamaCpp {
    Write-Status "Installing llama.cpp $LLAMA_VERSION with CUDA $CudaVersion..."

    $tempDir = Join-Path $env:TEMP "llama-setup"
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir
    }
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

    # Download main binaries
    $binZip = Join-Path $tempDir "llama-bin.zip"
    $binUrl = "$LLAMA_BASE_URL/llama-$LLAMA_VERSION-bin-win-cuda-$CudaVersion-x64.zip"

    if (-not (Download-File -Url $binUrl -Output $binZip)) {
        Write-Status "Falling back to CUDA 12.4..." -Color Yellow
        $CudaVersion = "12.4"
        $binUrl = "$LLAMA_BASE_URL/llama-$LLAMA_VERSION-bin-win-cuda-$CudaVersion-x64.zip"
        if (-not (Download-File -Url $binUrl -Output $binZip)) {
            throw "Failed to download llama.cpp binaries"
        }
    }

    # Download CUDA runtime
    $cudaZip = Join-Path $tempDir "cudart.zip"
    $cudaUrl = "$LLAMA_BASE_URL/cudart-llama-bin-win-cuda-$CudaVersion-x64.zip"

    if (-not (Download-File -Url $cudaUrl -Output $cudaZip)) {
        Write-Status "Warning: CUDA runtime download failed. You may need CUDA installed." -Color Yellow
    }

    # Extract binaries
    Write-Status "Extracting binaries..."
    Expand-Archive -Path $binZip -DestinationPath $tempDir -Force

    if (Test-Path $cudaZip) {
        Expand-Archive -Path $cudaZip -DestinationPath $tempDir -Force
    }

    # Find and copy executables
    $exeFiles = Get-ChildItem -Path $tempDir -Recurse -Filter "*.exe" | Where-Object {
        $_.Name -match "llama-server|llama-cli|llama-embedding"
    }

    foreach ($exe in $exeFiles) {
        $dest = Join-Path $BIN_DIR $exe.Name
        Copy-Item -Path $exe.FullName -Destination $dest -Force
        Write-Status "Installed: $($exe.Name)" -Color Green
    }

    # Copy DLLs
    $dllFiles = Get-ChildItem -Path $tempDir -Recurse -Filter "*.dll"
    foreach ($dll in $dllFiles) {
        $dest = Join-Path $BIN_DIR $dll.Name
        Copy-Item -Path $dll.FullName -Destination $dest -Force
    }

    # Cleanup
    Remove-Item -Recurse -Force $tempDir

    Write-Status "llama.cpp installed successfully!" -Color Green
}

function Download-Models {
    Write-Status "Downloading GGUF models..."

    foreach ($model in $MODELS) {
        $fileName = Split-Path -Leaf $model.Url
        $outputPath = Join-Path $MODELS_DIR $fileName

        if (Test-Path $outputPath) {
            Write-Status "Model already exists: $($model.Name)" -Color Yellow
            continue
        }

        Write-Status "$($model.Name) ($($model.Size)) - $($model.Description)"

        if (Download-File -Url $model.Url -Output $outputPath) {
            Write-Status "Model ready: $($model.Name)" -Color Green
        }
    }
}

function Show-Summary {
    Write-Host ""
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Status "Setup Complete!" -Color Green
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""

    Write-Host "Binaries installed in: " -NoNewline
    Write-Host $BIN_DIR -ForegroundColor Yellow

    Write-Host "Models directory: " -NoNewline
    Write-Host $MODELS_DIR -ForegroundColor Yellow

    Write-Host ""
    Write-Host "Available executables:" -ForegroundColor Cyan
    Get-ChildItem -Path $BIN_DIR -Filter "*.exe" | ForEach-Object {
        Write-Host "  - $($_.Name)" -ForegroundColor White
    }

    Write-Host ""
    Write-Host "Available models:" -ForegroundColor Cyan
    Get-ChildItem -Path $MODELS_DIR -Filter "*.gguf" | ForEach-Object {
        $sizeMB = [math]::Round($_.Length / 1MB, 1)
        Write-Host "  - $($_.Name) ($sizeMB MB)" -ForegroundColor White
    }

    Write-Host ""
    Write-Host "To start llama-server:" -ForegroundColor Cyan
    Write-Host "  .\bin\llama-server.exe -m data\models\<model>.gguf --port 8080 -ngl 99" -ForegroundColor White
}

# Main execution
Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "  llama.cpp Setup for GeminiHydra" -ForegroundColor White
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

Setup-Directories

if (-not $SkipBinaries) {
    Install-LlamaCpp
}

if (-not $SkipModels) {
    Download-Models
}

Show-Summary
