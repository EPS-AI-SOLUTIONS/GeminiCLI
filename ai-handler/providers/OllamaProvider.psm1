#Requires -Version 5.1
<#
.SYNOPSIS
    Ollama Local AI Provider for AI Model Handler

.DESCRIPTION
    This module provides functions to interact with local Ollama instances.
    It includes automatic service detection, auto-installation, model listing,
    and API calls with streaming support.

.NOTES
    File Name      : OllamaProvider.psm1
    Author         : HYDRA System
    Prerequisite   : PowerShell 5.1+
    Dependency     : Ollama (auto-installable)

.EXAMPLE
    Import-Module .\OllamaProvider.psm1

    # Check if Ollama is running
    if (Test-OllamaAvailable) {
        # List models
        Get-OllamaModels | Format-Table

        # Make a request
        $response = Invoke-OllamaAPI -Model "llama3.2:3b" -Messages @(
            @{ role = "user"; content = "Hello!" }
        )
        Write-Host $response.content
    }
#>

#region Configuration

$script:OllamaBaseUri = "http://localhost:11434"
$script:OllamaExePath = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
$script:DefaultTimeout = 3000

#endregion

#region Helper Functions

function Invoke-StreamingRequest {
    <#
    .SYNOPSIS
        Handles HTTP streaming requests for Ollama API

    .DESCRIPTION
        Creates an HTTP client that processes streaming responses line by line,
        calling the OnData scriptblock for each received chunk.

    .PARAMETER Uri
        The API endpoint URI

    .PARAMETER Body
        JSON body to send with the request

    .PARAMETER Headers
        HTTP headers to include in the request

    .PARAMETER OnData
        Scriptblock to call for each line of data received
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Uri,

        [Parameter(Mandatory)]
        [string]$Body,

        [hashtable]$Headers = @{},

        [Parameter(Mandatory)]
        [scriptblock]$OnData
    )

    $client = New-Object System.Net.Http.HttpClient
    $request = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Post, $Uri)

    foreach ($header in $Headers.Keys) {
        $request.Headers.TryAddWithoutValidation($header, $Headers[$header]) | Out-Null
    }

    $request.Content = New-Object System.Net.Http.StringContent(
        $Body,
        [System.Text.Encoding]::UTF8,
        "application/json"
    )

    try {
        $response = $client.SendAsync(
            $request,
            [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead
        ).Result

        $stream = $response.Content.ReadAsStreamAsync().Result
        $reader = New-Object System.IO.StreamReader($stream)

        while (-not $reader.EndOfStream) {
            $line = $reader.ReadLine()
            if (-not $line) { continue }
            & $OnData $line
        }
    }
    finally {
        if ($reader) { $reader.Dispose() }
        if ($client) { $client.Dispose() }
    }
}

#endregion

#region Public Functions

function Test-OllamaAvailable {
    <#
    .SYNOPSIS
        Tests if Ollama service is running and accessible

    .DESCRIPTION
        Performs a TCP connection test to localhost:11434 to check if the
        Ollama service is running and responding to requests.

    .OUTPUTS
        Boolean indicating whether Ollama is available

    .EXAMPLE
        if (Test-OllamaAvailable) {
            Write-Host "Ollama is running on port 11434"
        } else {
            Write-Host "Ollama is not available"
        }
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param()

    try {
        $request = [System.Net.WebRequest]::Create("$script:OllamaBaseUri/api/tags")
        $request.Method = "GET"
        $request.Timeout = $script:DefaultTimeout
        $response = $request.GetResponse()
        $response.Close()
        return $true
    }
    catch {
        Write-Verbose "Ollama not available: $($_.Exception.Message)"
        return $false
    }
}

function Install-OllamaAuto {
    <#
    .SYNOPSIS
        Automatically installs Ollama in silent mode

    .DESCRIPTION
        Downloads and installs Ollama silently without user interaction.
        Starts the Ollama service after installation and verifies it's running.

    .PARAMETER Force
        If specified, reinstalls even if Ollama is already installed

    .PARAMETER DefaultModel
        The default model to pull after installation (not pulled by default)

    .OUTPUTS
        Boolean indicating whether installation was successful

    .EXAMPLE
        if (Install-OllamaAuto) {
            Write-Host "Ollama installed successfully"
        }

    .EXAMPLE
        # Force reinstall
        Install-OllamaAuto -Force
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [switch]$Force,

        [string]$DefaultModel = "llama3.2:3b"
    )

    $installerScript = Join-Path $PSScriptRoot "..\Install-Ollama.ps1"

    if (Test-Path $installerScript) {
        Write-Host "[AI] Auto-installing Ollama via installer script..." -ForegroundColor Yellow
        & $installerScript -SkipModelPull
        return Test-OllamaAvailable
    }

    # Inline minimal installer
    Write-Host "[AI] Downloading and installing Ollama (silent)..." -ForegroundColor Yellow

    $tempInstaller = Join-Path $env:TEMP "OllamaSetup.exe"
    $downloadUrl = "https://ollama.com/download/OllamaSetup.exe"

    try {
        $ProgressPreference = "SilentlyContinue"
        Invoke-WebRequest -Uri $downloadUrl -OutFile $tempInstaller -UseBasicParsing

        $process = Start-Process -FilePath $tempInstaller `
            -ArgumentList "/SP- /VERYSILENT /NORESTART /SUPPRESSMSGBOXES" `
            -Wait -PassThru

        if ($process.ExitCode -eq 0) {
            Write-Host "[AI] Ollama installed successfully" -ForegroundColor Green

            # Start service
            if (Test-Path $script:OllamaExePath) {
                Start-Process -FilePath $script:OllamaExePath -ArgumentList "serve" -WindowStyle Hidden
                Start-Sleep -Seconds 5
            }

            Remove-Item $tempInstaller -Force -ErrorAction SilentlyContinue
            return Test-OllamaAvailable
        }
        else {
            Write-Warning "[AI] Ollama installer exited with code: $($process.ExitCode)"
        }
    }
    catch {
        Write-Warning "[AI] Ollama auto-install failed: $($_.Exception.Message)"
    }

    return $false
}

function Get-OllamaModels {
    <#
    .SYNOPSIS
        Gets list of installed Ollama models

    .DESCRIPTION
        Queries the local Ollama API to retrieve information about all
        installed models including name, size, and modification date.

    .OUTPUTS
        Array of model objects with Name, Size (GB), and Modified properties

    .EXAMPLE
        Get-OllamaModels | Format-Table

        Name              Size Modified
        ----              ---- --------
        llama3.2:3b       1.87 2024-01-15T10:30:00Z
        qwen2.5-coder:1.5b 0.98 2024-01-14T08:15:00Z

    .EXAMPLE
        # Get just model names
        (Get-OllamaModels).Name
    #>
    [CmdletBinding()]
    [OutputType([array])]
    param()

    if (-not (Test-OllamaAvailable)) {
        Write-Warning "Ollama is not running"
        return @()
    }

    try {
        $response = Invoke-RestMethod -Uri "$script:OllamaBaseUri/api/tags" -Method Get

        return $response.models | ForEach-Object {
            @{
                Name = $_.name
                Size = [math]::Round($_.size / 1GB, 2)
                Modified = $_.modified_at
                Digest = $_.digest
                Details = $_.details
            }
        }
    }
    catch {
        Write-Warning "Failed to get Ollama models: $($_.Exception.Message)"
        return @()
    }
}

function Restart-OllamaService {
    <#
    .SYNOPSIS
        Restarts the Ollama service
    #>
    [CmdletBinding()]
    param()

    Write-Host "[AI] Restarting Ollama service..." -ForegroundColor Yellow
    
    # Kill process
    $process = Get-Process -Name "ollama" -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -InputObject $process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }

    # Start service
    if (Test-Path $script:OllamaExePath) {
        Start-Process -FilePath $script:OllamaExePath -ArgumentList "serve" -WindowStyle Hidden
        
        # Wait for health check
        $retries = 10
        while ($retries -gt 0) {
            Start-Sleep -Seconds 1
            if (Test-OllamaAvailable) {
                Write-Host "[AI] Ollama restarted successfully." -ForegroundColor Green
                return $true
            }
            $retries--
        }
    }
    
    Write-Warning "[AI] Failed to restart Ollama."
    return $false
}

function Get-OllamaLiveStatus {
    <#
    .SYNOPSIS
        Gets live health status
    #>
    [CmdletBinding()]
    param()
    
    $status = @{
        Available = $false
        ResponseTimeMs = 0
        Models = 0
    }
    
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $request = [System.Net.WebRequest]::Create("$script:OllamaBaseUri/api/tags")
        $request.Timeout = 1000 # Fast check
        $response = $request.GetResponse()
        $content = [System.IO.StreamReader]::new($response.GetResponseStream()).ReadToEnd() | ConvertFrom-Json
        $response.Close()
        
        $sw.Stop()
        $status.Available = $true
        $status.ResponseTimeMs = $sw.ElapsedMilliseconds
        $status.Models = $content.models.Count
    } catch {
        $status.Available = $false
    }
    
    return $status
}

function Invoke-OllamaAPI {
    <#
    .SYNOPSIS
        Calls the local Ollama Chat API with Auto-Restart and Retry
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Model,

        [Parameter(Mandatory)]
        [array]$Messages,

        [int]$MaxTokens = 1024,

        [ValidateRange(0.0, 2.0)]
        [float]$Temperature = 0.7,

        [switch]$Stream,

        [bool]$AutoStart = $true,

        [switch]$AutoInstall
    )

    $retryCount = 0
    $maxRetries = 2
    $lastError = $null

    while ($retryCount -le $maxRetries) {
        # Check if Ollama is running, try to start/restart
        if (-not (Test-OllamaAvailable)) {
            Write-Host "[AI] Ollama not available. Attempting recovery (Attempt $($retryCount + 1))..." -ForegroundColor Yellow
            Restart-OllamaService | Out-Null
        }

        $body = @{
            model = $Model
            messages = @($Messages | ForEach-Object {
                @{ role = $_.role; content = $_.content }
            })
            options = @{
                num_predict = $MaxTokens
                temperature = $Temperature
            }
            stream = $Stream.IsPresent
        }

        $uri = "$script:OllamaBaseUri/api/chat"

        try {
            if ($Stream) {
                $contentBuffer = ""

                Invoke-StreamingRequest -Uri $uri `
                    -Headers @{ "Content-Type" = "application/json" } `
                    -Body ($body | ConvertTo-Json -Depth 10) `
                    -OnData {
                        param($line)
                        try {
                            $json = $line | ConvertFrom-Json
                            if ($json.message -and $json.message.content) {
                                $contentBuffer += $json.message.content
                                Write-Host $json.message.content -NoNewline
                            }
                        }
                        catch { }
                    }

                Write-Host ""
                return @{
                    content = $contentBuffer
                    usage = @{ input_tokens = 0; output_tokens = 0 }
                    model = $Model
                    stop_reason = "stream"
                }
            }

            $response = Invoke-RestMethod -Uri $uri `
                -Method Post -Body ($body | ConvertTo-Json -Depth 10) -ContentType "application/json"

            return @{
                content = $response.message.content
                usage = @{
                    input_tokens = $response.prompt_eval_count
                    output_tokens = $response.eval_count
                }
                model = $response.model
                stop_reason = "stop"
            }
        }
        catch {
            $lastError = $_
            Write-Warning "Ollama API Error: $($_.Exception.Message)"
            
            # If connection error, force restart next loop
            if ($_.Exception.Message -match "Unable to connect|No connection") {
                Restart-OllamaService | Out-Null
            }
            
            $retryCount++
            Start-Sleep -Seconds 1
        }
    }
    
    throw "Ollama failed after $maxRetries retries. Last error: $($lastError.Exception.Message)"
}

#endregion

#region Module Exports

Export-ModuleMember -Function @(
    'Test-OllamaAvailable',
    'Install-OllamaAuto',
    'Get-OllamaModels',
    'Invoke-OllamaAPI',
    'Invoke-StreamingRequest'
)

#endregion
