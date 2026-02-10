@echo off
:: GeminiHydra - Build Release & Launch (with sccache)
title GeminiHydra - Building Release...

echo ========================================
echo   GeminiHydra - Build ^& Launch
echo ========================================
echo.

cd /d "%~dp0GeminiGUI"

REM Enable sccache for faster Rust compilation
set RUSTC_WRAPPER=C:\Users\BIURODOM\Desktop\ClaudeHydra\bin\sccache\sccache.exe
"%RUSTC_WRAPPER%" --start-server 2>nul

echo [1/2] Budowanie release (sccache enabled)...
echo.
call pnpm run tauri:build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build nie powiodl sie! Kod: %errorlevel%
    pause
    exit /b %errorlevel%
)

echo.
echo [2/2] Uruchamianie aplikacji...
set "EXE=%~dp0GeminiGUI\src-tauri\target\release\geminigui.exe"
if not exist "%EXE%" (
    echo [ERROR] Nie znaleziono: %EXE%
    pause
    exit /b 1
)

"%RUSTC_WRAPPER%" --show-stats 2>nul | findstr "Cache hits rate"
start "" "%EXE%"
