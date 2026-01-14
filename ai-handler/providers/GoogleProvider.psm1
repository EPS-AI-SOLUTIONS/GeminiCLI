#Requires -Version 5.1
<#
.SYNOPSIS
    Google Gemini Provider for AI Model Handler

.DESCRIPTION
    Provides functions to interact with Google's Gemini API.
    Supports Gemini 1.5, 2.0, 3.0 models.

.NOTES
    File Name      : GoogleProvider.psm1
    Author         : HYDRA System
#>

#region Configuration

$script:GoogleBaseUri = "https://generativelanguage.googleapis.com/v1beta"
$script:DefaultTimeout = 30000

#endregion

#region Public Functions

function Invoke-GoogleAPI {
    <#
    .SYNOPSIS
        Calls the Google Gemini API
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Model,

        [Parameter(Mandatory)]
        [array]$Messages,

        [int]$MaxTokens = 8192,

        [float]$Temperature = 0.7,

        [switch]$Stream,
        
        [array]$Tools
    )

    $apiKey = [Environment]::GetEnvironmentVariable("GOOGLE_API_KEY")
    if ([string]::IsNullOrWhiteSpace($apiKey)) {
        throw "GOOGLE_API_KEY environment variable is not set."
    }

    # Convert Messages to Gemini format
    # Gemini uses "user" and "model" roles, and "parts" array
    $geminiMessages = @()
    foreach ($msg in $Messages) {
        $role = if ($msg.role -eq "user" -or $msg.role -eq "system") { "user" } else { "model" }
        
        # Merge system prompt into first user message if needed, or handle separately if API supports system_instruction
        # v1beta supports system_instruction, but for simplicity/compatibility we might merge.
        # Let's try to use proper contents.
        
        $geminiMessages += @{
            role = $role
            parts = @(@{ text = $msg.content })
        }
    }

    # Handle system instruction separately if possible, otherwise prepend
    # For this implementation, we'll keep it simple: content generation
    
    $body = @{
        contents = $geminiMessages
        generationConfig = @{
            maxOutputTokens = $MaxTokens
            temperature = $Temperature
            topP = 0.95
        }
    }

    # Add Tools if provided (e.g. Google Search)
    if ($Tools) {
        $body["tools"] = $Tools
    }

    # "Deep Thinking" simulation via prompt injection if requested by specific model flags
    # (This is handled by the caller/PromptOptimizer, but the provider just passes parameters)

    $uri = "$script:GoogleBaseUri/models/$($Model):generateContent?key=$apiKey"
    if ($Stream) {
        $uri = "$script:GoogleBaseUri/models/$($Model):streamGenerateContent?key=$apiKey"
    }

    try {
        if ($Stream) {
            # Streaming implementation
            # Note: PowerShell 5.1 streaming is tricky with Invoke-RestMethod. 
            # We'll use a helper or simple wait for now to ensure reliability unless we need real-time UI.
            # For HYDRA CLI, we usually want real-time.
            
            $webRequest = [System.Net.WebRequest]::Create($uri)
            $webRequest.Method = "POST"
            $webRequest.ContentType = "application/json"
            
            $jsonBody = $body | ConvertTo-Json -Depth 10
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
            $webRequest.ContentLength = $bytes.Length
            $stream = $webRequest.GetRequestStream()
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Close()

            $response = $webRequest.GetResponse()
            $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
            
            $fullText = ""
            
            while (-not $reader.EndOfStream) {
                $line = $reader.ReadLine()
                # Parse server-sent events or json array stream
                # Google returns a JSON array of objects usually in stream
                if ($line -match '"text":') {
                    # Simple regex extraction for speed/simplicity in PS
                    if ($line -match '"text": "(.*)"') {
                        $chunk = $matches[1] -replace '\n', "`n" -replace '\"', '"'
                        $fullText += $chunk
                        Write-Host $chunk -NoNewline
                    }
                }
            }
            Write-Host ""
            
            return @{
                content = $fullText
                usage = @{ input_tokens = 0; output_tokens = 0 } # Usage often comes at end
                model = $Model
                stop_reason = "stop"
            }
        }
        else {
            $response = Invoke-RestMethod -Uri $uri -Method Post -Body ($body | ConvertTo-Json -Depth 10) -ContentType "application/json"
            
            $text = $response.candidates[0].content.parts[0].text
            $usage = $response.usageMetadata
            
            return @{
                content = $text
                usage = @{
                    input_tokens = if ($usage) { $usage.promptTokenCount } else { 0 }
                    output_tokens = if ($usage) { $usage.candidatesTokenCount } else { 0 }
                }
                model = $Model
                stop_reason = "stop"
            }
        }
    }
    catch {
        # Extract detailed error if possible
        $errBody = $_.ErrorDetails
        throw "Google API Error: $($_.Exception.Message) | Details: $errBody"
    }
}

#endregion

Export-ModuleMember -Function Invoke-GoogleAPI
