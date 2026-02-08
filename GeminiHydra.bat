@echo off
chcp 65001 >nul
REM ══════════════════════════════════════════════════════════════
REM  GeminiHydra v16.0 - Portable Edition
REM ══════════════════════════════════════════════════════════════

title GeminiHydra v16.0 - Portable Edition
color 0D

REM Set working directory to script location (portable)
cd /d "%~dp0"

echo.
echo   ╔══════════════════════════════════════════════════════════╗
echo   ║         GeminiHydra v16.0 - Portable Edition             ║
echo   ╠══════════════════════════════════════════════════════════╣
echo   ║  All components self-contained in this directory         ║
echo   ╚══════════════════════════════════════════════════════════╝
echo.

REM Check if dependencies are installed
if not exist "node_modules" (
    echo   [!] Installing dependencies...
    call npm install --silent
)

echo.
echo [INFO] Jesli prompt nie reaguje, uzyj: gemini-wt.bat (Windows Terminal)
echo        lub wylacz Quick Edit Mode w CMD (PPM na pasek tytulowy -^> Wlasciwosci)
echo.

echo   Starting GeminiHydra...
echo.

REM Build if dist doesn't exist or is outdated
if not exist "dist\bin\gemini.js" (
    echo   [!] Building TypeScript...
    call npx tsc
)

REM Run with tsx for better TypeScript support
npx tsx bin/gemini.ts --interactive

pause
