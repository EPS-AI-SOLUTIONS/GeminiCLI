@echo off
REM GeminiHydra v14.0 - School of the Wolf Edition
REM Interactive Chat Launcher with STDIN fixes

cd /d "%~dp0"

REM Hint about Windows Terminal
echo.
echo [INFO] Jesli prompt nie reaguje, uzyj: gemini-wt.bat (Windows Terminal)
echo        lub wylacz Quick Edit Mode w CMD (PPM na pasek tytulowy -^> Wlasciwosci)
echo.

REM If no arguments, start interactive mode with tsx
if "%~1"=="" (
    npx tsx "%~dp0bin\gemini.ts" --interactive
) else (
    npx tsx "%~dp0bin\gemini.ts" %*
)
