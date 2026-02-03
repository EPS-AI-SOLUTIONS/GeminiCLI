@echo off
REM Universal MCP Server Launcher
REM Usage: mcp-server.cmd [server-name] [args...]
REM Available servers: git, fetch, brave-search, postgres, filesystem

if "%~1"=="" (
    echo Usage: mcp-server.cmd [server-name] [args...]
    echo.
    echo Available servers:
    echo   git          - Git operations server
    echo   fetch        - HTTP fetch server
    echo   brave-search - Brave search server
    echo   postgres     - PostgreSQL server
    echo   filesystem   - Filesystem operations server
    echo.
    echo Example: mcp-server.cmd git
    exit /b 1
)

set SERVER_NAME=%~1
shift

if "%SERVER_NAME%"=="filesystem" (
    npx -y @anthropic/mcp-server-filesystem %1 %2 %3 %4 %5 %6 %7 %8 %9
) else (
    npx -y @modelcontextprotocol/server-%SERVER_NAME% %1 %2 %3 %4 %5 %6 %7 %8 %9
)
