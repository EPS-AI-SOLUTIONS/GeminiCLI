Import-Module "$PSScriptRoot\AgentSwarm.psm1" -Force

function Run-Test {
    param([string]$Name, [string]$Objective)
    Write-Host "`n`n==========================================" -ForegroundColor Magenta
    Write-Host "TEST: $Name" -ForegroundColor Yellow
    Write-Host "OBJECTIVE: $Objective" -ForegroundColor Gray
    Write-Host "==========================================" -ForegroundColor Magenta
    
    $start = Get-Date
    try {
        Invoke-AgentSwarm -Objective $Objective
    } catch {
        Write-Error "CRITICAL TEST FAILURE: $_"
    }
    $duration = (Get-Date) - $start
    Write-Host "`n[TIME] Test took $($duration.TotalSeconds) seconds." -ForegroundColor DarkGray
}

# 1. Test logiczny/kreatywny (Małe obciążenie narzędzi)
Run-Test "Creative Logic" "Write a haiku about fixing bugs in code."

# 2. Test narzędziowy - Odczyt (Sprawdza patch Ollama + Filesystem)
Run-Test "Read Capability" "Check GEMINI.md and extract the Architecture name."

# 3. Test narzędziowy - Zapis (Sprawdza skutecznosć działania)
Run-Test "Write Capability" "Create a file named 'SYSTEM_STATUS.txt' containing the text: 'GeminiHydra is fully operational'."
