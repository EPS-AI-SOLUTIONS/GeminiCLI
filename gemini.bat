@echo off
REM Gemini CLI - Portable Launcher
REM Uruchom ten skrypt, aby uruchomic Gemini CLI

cd /d "%~dp0"
node "node_modules\@google\gemini-cli\dist\index.js" %*
