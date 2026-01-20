<#
.SYNOPSIS
    AgentSwarm v8.2 - The Complete Saga
#>

# --- Agent Configuration ---
$script:AgentModels = @{
    "Geralt"   = "llama3.2:3b"; "Yennefer" = "qwen2.5-coder:1.5b"; "Triss"    = "qwen2.5-coder:1.5b";
    "Jaskier"  = "llama3.2:3b"; "Vesemir"  = "llama3.2:3b"; "Ciri"     = "llama3.2:1b";
    "Eskel"    = "llama3.2:3b"; "Lambert"  = "qwen2.5-coder:1.5b"; "Zoltan"   = "llama3.2:3b";
    "Regis"    = "phi3:mini"; "Dijkstra" = "gemini:dynamic"; "Philippa" = "qwen2.5-coder:1.5b";
}
$script:AgentPersonas = @{
    "Geralt"   = "Oversee security. Analyze code changes for vulnerabilities. VETO unsafe changes."
    "Yennefer" = "Focus on design patterns and code purity. Propose elegant, scalable solutions."
    "Triss"    = "QA role. Create test scenarios and actively try to break implemented features."
    "Jaskier"  = "Do not code. Translate final technical reports into user-friendly summaries."
    "Vesemir"  = "Mentor. Review Dijkstra's plan for logic and efficiency. Approve or reject."
    "Ciri"     = "Speed role. Execute simple, atomic tasks: find file, read snippet, list directory."
    "Eskel"    = "DevOps specialist. Ensure the application builds and deploys correctly (`npm run build`)."
    "Lambert"  = "Debugger. Analyze and fix errors when any agent's task fails."
    "Zoltan"   = "Data master. Analyze and modify `.json`, `.csv`, `.yml` files."
    "Regis"    = "Synthesizer/Researcher. Create technical summaries and search web if swarm is stuck."
    "Dijkstra" = "Master strategist. Create JSON plans with dependencies, assign agents and grimoires."
    "Philippa" = "API specialist. Handle all interactions with external APIs."
}
$script:PromptPrefix = "**META-INSTRUCTION:** Think Step-by-Step. Analyze persona, mission, and context. Formulate a plan. Execute concisely."

# --- Core Memory Architecture ---
$baseMemPath = Join-Path $PSScriptRoot ".serena" | Join-Path -ChildPath "memories"
$script:VectorDbPath = Join-Path $baseMemPath "vectordb"
$script:CachePath = Join-Path $baseMemPath "cache"
$script:KnowledgeGraphPath = Join-Path $baseMemPath "knowledge_graph.json"
New-Item -ItemType Directory -Path $script:VectorDbPath -Force -ErrorAction SilentlyContinue | Out-Null
New-Item -ItemType Directory -Path $script:CachePath -Force -ErrorAction SilentlyContinue | Out-Null

function Set-SessionCache {
    param([string]$Key, [object]$Value)
    $cacheFile = Join-Path $script:CachePath "session_cache.json"
    $cache = if (Test-Path $cacheFile) { Get-Content $cacheFile | ConvertFrom-Json -ErrorAction SilentlyContinue } else { @{} }
    $cache[$Key] = $Value
    $cache | ConvertTo-Json -Depth 5 | Set-Content $cacheFile
}

function Get-SessionCache {
    param([string]$Key)
    $cacheFile = Join-Path $script:CachePath "session_cache.json"
    if (Test-Path $cacheFile) {
        $cache = Get-Content $cacheFile | ConvertFrom-Json -ErrorAction SilentlyContinue
        return $cache[$Key]
    }
    return $null
}

function Clear-SessionCache {
    $cacheFile = Join-Path $script:CachePath "session_cache.json"
    if (Test-Path $cacheFile) { Remove-Item $cacheFile }
}

function Add-VectorMemory {
    param([string]$AgentName, [string]$Type, [string]$Content, [string]$Tags = "")
    $memFile = Join-Path $script:VectorDbPath "$($AgentName).jsonl"
    $entry = @{ id = [Guid]::NewGuid().ToString(); timestamp = Get-Date -Format 'u'; agent = $AgentName; type = $Type; content = $Content; tags = $Tags }
    $entry | ConvertTo-Json -Depth 5 -Compress | Add-Content -Path $memFile
}

function Get-VectorMemory {
    param([string]$AgentName,[string]$Query,[int]$TopK=3,[string]$TypeFilter="",[string]$ExcludeType="")
    $memFile = Join-Path $script:VectorDbPath "$($AgentName).jsonl"
    if (-not (Test-Path $memFile)) { return @() }
    $allMemories = Get-Content $memFile | ForEach-Object { $_ | ConvertFrom-Json }
    if ($TypeFilter) { $allMemories = $allMemories | Where-Object { $_.type -eq $TypeFilter } }
    if ($ExcludeType) { $allMemories = $allMemories | Where-Object { $_.type -ne $ExcludeType } }
    $keywords = $Query.Split(' ') | Select-Object -Unique
    $scoredMemories = foreach ($memory in $allMemories) {
        $score = 0
        foreach ($keyword in $keywords) { if ($memory.content -like "*$keyword*") { $score++ } }
        if ($memory.type -eq 'error' -and $score -gt 0) { $score += 10 }
        if ($score -gt 0) { $memory | Add-Member -NotePropertyName "Score" -NotePropertyValue $score -PassThru }
    }
    if ($scoredMemories) { return ($scoredMemories | Sort-Object Score -Descending | Select-Object -First $TopK) }
    else { return ($allMemories | Select-Object -Last $TopK) }
}

function Get-ContextualMemories {
    param([string]$AgentName, [string]$Query, [int]$TokenLimit = 2048)
    $finalMemories = @()
    $currentTokenCount = 0
    $sessionCache = Get-SessionCache -Key "chronicle"
    if ($sessionCache) {
        $finalMemories += [PSCustomObject]@{ type = "L1_Cache"; content = $sessionCache }
        $currentTokenCount += ($sessionCache.Length / 4)
    }
    $errorMemories = Get-VectorMemory -AgentName $AgentName -Query $Query -TypeFilter "error"
    foreach ($mem in $errorMemories) {
        $memTokenCount = ($mem.content.Length / 4)
        if (($currentTokenCount + $memTokenCount) -lt $TokenLimit) { $finalMemories += $mem; $currentTokenCount += $memTokenCount } else { break }
    }
    if ($currentTokenCount -lt $TokenLimit) {
        $otherMemories = Get-VectorMemory -AgentName $AgentName -Query $Query -ExcludeType "error"
        foreach ($mem in $otherMemories) {
            $memTokenCount = ($mem.content.Length / 4)
            if (($currentTokenCount + $memTokenCount) -lt $TokenLimit) { $finalMemories += $mem; $currentTokenCount += $memTokenCount } else { break }
        }
    }
    return $finalMemories | ConvertTo-Json -Depth 5
}

function Get-GrimoireContent {
    param([array]$GrimoireNames)
    $fullContent = ""
    foreach ($name in $GrimoireNames) {
        $path = Join-Path $PSScriptRoot "grimoires" "$($name)_tools.md"
        if (Test-Path $path) {
            $fullContent += (Get-Content $path -Raw) + "`n`n"
        }
    }
    return $fullContent
}

# --- Knowledge Graph ---
function Get-KnowledgeGraph {
    if (Test-Path $script:KnowledgeGraphPath) { return Get-Content $script:KnowledgeGraphPath | ConvertFrom-Json }
    return @{ nodes = @(); edges = @() }
}
function Update-KnowledgeGraph {
    param([string]$SourceNode, [string]$EdgeLabel, [string]$TargetNode)
    $graph = Get-KnowledgeGraph
    if (-not ($graph.nodes | Where-Object { $_.id -eq $SourceNode })) { $graph.nodes += @{ id = $SourceNode; type = "Agent" } }
    if (-not ($graph.nodes | Where-Object { $_.id -eq $TargetNode })) { $graph.nodes += @{ id = $TargetNode; type = "File" } }
    $graph.edges += @{ source = $SourceNode; target = $TargetNode; label = $EdgeLabel }
    $graph | ConvertTo-Json -Depth 5 | Set-Content $script:KnowledgeGraphPath
}

# --- LLM Invocation ---
function Invoke-Llm {
    param([Parameter(Mandatory=$true)][string]$AgentName, [Parameter(Mandatory=$true)][string]$FullPrompt, [array]$ModelOverride)
    $modelIdString = $script:AgentModels[$AgentName]
    $modelChain = @()
    if ($ModelOverride.Count -gt 0) { $modelChain = $ModelOverride } 
    elseif ($modelIdString.StartsWith("gemini:")) {
        if ($modelIdString -eq "gemini:dynamic") { $modelChain = @("gemini-1.5-pro-latest", "gemini-1.0-pro") } 
        else { $modelChain = $modelIdString.Substring(7).Split(',') }
    }
    if ($modelChain.Count -gt 0) {
        foreach ($modelName in $modelChain) {
            try {
                $geminiCliPath = Join-Path $PSScriptRoot "gemini.ps1"
                $result = & powershell -File $geminiCliPath -p $FullPrompt -m $modelName.Trim()
                return $result
            } catch { Write-Host "[LLM Fallback] Gemini model '$modelName' failed." -ForegroundColor Yellow }
        }
        return "ERROR: All Gemini models failed."
    } else {
        try {
            $exe = if (Test-Path (Join-Path $PSScriptRoot "bin\ollama.exe")) { Join-Path $PSScriptRoot "bin\ollama.exe" } else { "ollama" }
            $env:OLLAMA_MODELS = Join-Path $PSScriptRoot "data\ollama\models"
            return (& $exe run $modelIdString $FullPrompt 2>&1)
        } catch { return "ERROR: Failed to invoke Ollama." }
    }
}

# --- Graph Processor ---
function Start-GraphProcessor {
    param([Parameter(Mandatory=$true)][array]$Plan, [switch]$Yolo)
    $threadCount = if ($Yolo) { 12 } else { 6 }
    $RunspacePool = [runspacefactory]::CreateRunspacePool(1, $threadCount)
    $RunspacePool.Open()
    $completedTasks = [System.Collections.Concurrent.ConcurrentDictionary[int, bool]]::new()
    $remainingTasks = [System.Collections.Generic.List[object]]::new(); $Plan.ForEach({ $remainingTasks.Add($_) })
    while ($remainingTasks.Count -gt 0) {
        $tasksToRun = @(); $tasksToRemove = @()
        foreach ($task in $remainingTasks) {
            $dependenciesMet = $true
            foreach ($depId in $task.dependencies) { if (-not $completedTasks.ContainsKey($depId)) { $dependenciesMet = $false; break } }
            if ($dependenciesMet) { $tasksToRun += $task; $tasksToRemove += $task }
        }
        if ($tasksToRun.Count -eq 0) { Write-Host "[SWARM] Deadlock!"; break }
        $tasksToRemove.ForEach({ $remainingTasks.Remove($_) })
        $jobs = @()
        foreach($task in $tasksToRun) {
            $scriptBlock = {
                param($t, $PSScriptRoot)
                . "$PSScriptRoot\AgentSwarm.psm1"
                try {
                    $context = Get-ContextualMemories -AgentName $t.agent -Query $t.task
                    $grimoire = Get-GrimoireContent -GrimoireNames $t.grimoires
                    $prompt = "$($script:PromptPrefix)`nCONTEXTUAL MEMORIES:`n$context`n---`nGRIMOIRES:`n$grimoire`n---`nPERSONA & MISSION:`n$($script:AgentPersonas[$t.agent])`nTask: $($t.task)"
                    $result = Invoke-Llm -AgentName $t.agent -FullPrompt $prompt
                    $tags = (Invoke-Llm -AgentName "Ciri" -FullPrompt "Extract 5 keywords from: $result").Trim()
                    Add-VectorMemory -AgentName $t.agent -Type "action" -Content "Task: $($t.task)`nResult: $result" -Tags $tags
                    $chronicle = Get-SessionCache -Key "chronicle"
                    Set-SessionCache -Key "chronicle" -Value "$chronicle`n### Agent: $($t.agent)`n$result`nTags: $tags`n---`n"
                    return [PSCustomObject]@{ Id = $t.id; Status = "Success" }
                } catch {
                    $err = "ERROR: $($_.Exception.Message)"
                    Add-VectorMemory -AgentName $t.agent -Type "error" -Content "Task: $($t.task)`nResult: $err"
                    $chronicle = Get-SessionCache -Key "chronicle"
                    Set-SessionCache -Key "chronicle" -Value "$chronicle`n### Agent: $($t.agent) (ERROR)`n$err`n---`n"
                    return [PSCustomObject]@{ Id = $t.id; Status = "Failed" }
                }
            }
            $job = [powershell]::Create().AddScript($scriptBlock).AddArgument($task).AddArgument($PSScriptRoot)
            $job.RunspacePool = $RunspacePool
            $jobs += [PSCustomObject]@{ Pipe = $job; Handle = $job.BeginInvoke(); Task = $task }
        }
        foreach ($j in $jobs) {
            $result = $j.Pipe.EndInvoke($j.Handle); $j.Pipe.Dispose()
            if ($result.Status -eq "Success") {
                $completedTasks[$result.Id] = $true
                Write-Host "[SWARM] Task $($j.Task.id) ($($j.Task.agent)) completed." -ForegroundColor Green
            } else { Write-Host "[SWARM] Task $($j.Task.id) ($($j.Task.agent)) failed." -ForegroundColor Red }
        }
    }
    $RunspacePool.Close(); $RunspacePool.Dispose()
}

# --- Main Protocol ---
function Invoke-AgentSwarm {
    param([Parameter(Mandatory=$true)][string]$Objective, [switch]$Yolo)
    Write-Host "=== SCHOOL OF THE WOLF: COMPLETE PROTOCOL v8.2 ===" -ForegroundColor Cyan
    Clear-SessionCache
    Set-SessionCache -Key "objective" -Value $Objective
    $geminiApiKey = (Get-Content (Join-Path $PSScriptRoot ".env") -ErrorAction SilentlyContinue | Where-Object { $_.StartsWith("GEMINI_API_KEY=") }) -replace "GEMINI_API_KEY=",""
    $sortedModels = @("gemini-1.5-pro-latest", "gemini-1.0-pro")
    if ($geminiApiKey) { Write-Host "[INIT] Using dynamic Gemini model list." -ForegroundColor Green }

    $reconPlan = @( @{ id = 1; agent = "Ciri"; task = "List project structure."; grimoires = @("filesystem"); dependencies = @() } )
    Start-GraphProcessor -Plan $reconPlan -Yolo:$Yolo

    $chronicle1 = Get-SessionCache -Key "chronicle"
    $dijkstraPrompt2 = "Based on recon, create JSON plan for: $Objective. Chronicle: $chronicle1"
    $plan2Json = Invoke-Llm -AgentName "Dijkstra" -FullPrompt "$($script:PromptPrefix)`n$($script:AgentPersonas['Dijkstra'])`n$dijkstraPrompt2" -ModelOverride $sortedModels
    $plan2 = $plan2Json -replace '(?s).*```json\s*','' -replace '(?s)```.*','' | ConvertFrom-Json
    Start-GraphProcessor -Plan $plan2 -Yolo:$Yolo
    
    $maxLoops = 5
    for ($i = 1; $i -le $maxLoops; $i++) {
        $chronicle = Get-SessionCache -Key "chronicle"
        $verifyPrompt = "Verify if objective is met. Conclude 'VERIFICATION: SUCCESS' or 'VERIFICATION: FAILED - [reason]'. Chronicle: $chronicle"
        $verificationPlan = @( @{ id = 100 + $i; agent = "Triss"; task = $verifyPrompt; grimoires = @("browser", "filesystem"); dependencies = @() } )
        Start-GraphProcessor -Plan $verificationPlan -Yolo:$Yolo
        
        $chronicleAfterVerify = Get-SessionCache -Key "chronicle"
        $analysisPrompt = "Analyze Triss's report. If 'SUCCESS', respond ONLY 'SUKCES'. Else, create a JSON mini-plan to fix it. Chronicle: $chronicleAfterVerify"
        $dijkstraDecision = Invoke-Llm -AgentName "Dijkstra" -FullPrompt "$($script:PromptPrefix)`n$($script:AgentPersonas['Dijkstra'])`n$analysisPrompt" -ModelOverride $sortedModels
        if ($dijkstraDecision -like "*SUKCES*") { Write-Host "[ARENA] Objective achieved!"; break }

        $repairPlan = $dijkstraDecision -replace '(?s).*```json\s*','' -replace '(?s)```.*','' | ConvertFrom-Json
        Start-GraphProcessor -Plan $repairPlan -Yolo:$Yolo
        if ($i -eq $maxLoops) { Write-Host "[ARENA] Max loops reached." -ForegroundColor Red }
    }
    
    $finalChronicle = Get-SessionCache -Key "chronicle"
    # ... (Regis and Jaskier reporting)

    return "Mission finished."
}

Export-ModuleMember -Function Invoke-AgentSwarm
