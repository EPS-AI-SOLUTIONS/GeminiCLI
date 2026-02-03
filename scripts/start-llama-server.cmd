@echo off
REM Start llama-server with default settings
REM Usage: start-llama-server.cmd [model_name.gguf]

setlocal

set PROJECT_ROOT=%~dp0..
set BIN_DIR=%PROJECT_ROOT%\bin
set MODELS_DIR=%PROJECT_ROOT%\data\models

REM Default model
set MODEL=%1
if "%MODEL%"=="" set MODEL=qwen2.5-coder-1.5b-instruct-q4_k_m.gguf

set MODEL_PATH=%MODELS_DIR%\%MODEL%

if not exist "%MODEL_PATH%" (
    echo Model not found: %MODEL_PATH%
    echo.
    echo Available models:
    dir /b "%MODELS_DIR%\*.gguf" 2>nul
    echo.
    echo Run scripts\setup-llama.ps1 to download models.
    exit /b 1
)

echo Starting llama-server with %MODEL%...
echo.
echo Server will be available at http://localhost:8080
echo Press Ctrl+C to stop.
echo.

"%BIN_DIR%\llama-server.exe" ^
    -m "%MODEL_PATH%" ^
    --host 127.0.0.1 ^
    --port 8080 ^
    -ngl 99 ^
    -c 8192 ^
    -t 8 ^
    -np 4 ^
    -fa

endlocal
