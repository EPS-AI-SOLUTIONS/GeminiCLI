# AIConstants.psm1
# Centralized configuration constants for AI Handler
# Part of HYDRA 10.1 - GeminiCLI Refactored Architecture

<#
.SYNOPSIS
    Centralized constants and configuration for the AI Handler system in GeminiCLI.

.DESCRIPTION
    This module provides all shared constants, paths, thresholds, and mappings
    used across the AI Handler modules. Centralizing these values ensures
    consistency and makes configuration changes easier to manage.

.NOTES
    Version: 2.0.0
    Author: HYDRA System
    Module: ai-handler/core
#>

# ============================================================================
# PATHS - File system locations for AI Handler components
# ============================================================================

$script:AIHandlerRoot = Split-Path $PSScriptRoot -Parent

$script:Paths = @{
    # Main configuration file
    Config = Join-Path $script:AIHandlerRoot "ai-config.json"

    # Runtime state (auto-generated, tracks usage and rate limits)
    State = Join-Path $script:AIHandlerRoot "ai-state.json"

    # Cache directory for few-shot learning and responses
    Cache = Join-Path $script:AIHandlerRoot "cache"

    # Module directories
    Modules = Join-Path $script:AIHandlerRoot "modules"
    Core = Join-Path $script:AIHandlerRoot "core"
    Utils = Join-Path $script:AIHandlerRoot "utils"
    Providers = Join-Path $script:AIHandlerRoot "providers"
    RateLimiting = Join-Path $script:AIHandlerRoot "rate-limiting"
    ModelSelection = Join-Path $script:AIHandlerRoot "model-selection"
    Fallback = Join-Path $script:AIHandlerRoot "fallback"
}

# ============================================================================
# THRESHOLDS - Operational limits and timing configurations
# ============================================================================

$script:Thresholds = @{
    # Rate limit warning threshold (85% of limit)
    # Triggers proactive fallback consideration
    RateLimitWarning = 0.85

    # Rate limit critical threshold (95% of limit)
    # Forces immediate fallback to alternative provider
    RateLimitCritical = 0.95

    # Maximum retry attempts before giving up
    MaxRetries = 3

    # Delay between retry attempts (milliseconds)
    RetryDelayMs = 1000

    # Default request timeout (milliseconds)
    TimeoutMs = 30000

    # Batch processing concurrency limit
    MaxConcurrent = 4

    # CPU load thresholds for load balancing
    CpuLocalThreshold = 70      # Below this: prefer local
    CpuHybridThreshold = 90     # Below this: hybrid mode
    # Above CpuHybridThreshold: prefer cloud

    # Token estimation multiplier (chars to tokens)
    TokenEstimateMultiplier = 0.25

    # Minimum similarity for consensus (0-1)
    ConsensusThreshold = 0.7

    # Swarm settings
    SwarmMaxAgents = 5
    SwarmPlannerModel = 'gemini-3-pro-preview'
    SwarmExecutorModel = 'ollama' # Use fallback chain for execution
}

# ============================================================================
# PROVIDER PRIORITY - Order of provider preference for fallback
# ============================================================================

# Default priority order when selecting providers
# Anthropic first (highest quality), Ollama last (local fallback)
$script:ProviderPriority = @(
    'anthropic'    # Claude models - highest quality
    'openai'       # GPT models - strong alternative
    'google'       # Gemini models
    'mistral'      # Mistral models
    'groq'         # Fast inference
    'ollama'       # Local models - cost $0, always available
)

# ============================================================================
# TIER SCORES - Quality tier ranking for model selection
# ============================================================================

# Numerical scores for model tiers (used in optimization algorithms)
$script:TierScores = @{
    pro = 3        # Highest quality (Opus, GPT-4o, etc.)
    standard = 2   # Balanced quality/cost (Sonnet, GPT-4o-mini)
    lite = 1       # Fast/cheap (Haiku, small local models)
}

# ============================================================================
# TASK-TIER MAPPING - Recommended tier for different task types
# ============================================================================

# Maps task types to their preferred model tier
# Used by Get-OptimalModel to select appropriate models
$script:TaskTierMap = @{
    # Complex reasoning tasks
    complex = 'pro'
    reasoning = 'pro'
    analysis = 'pro'

    # Code generation and review
    code = 'standard'
    refactor = 'standard'
    debug = 'standard'

    # Creative tasks
    creative = 'standard'
    writing = 'standard'

    # Simple tasks - prefer fast/cheap
    simple = 'lite'
    chat = 'lite'
    translation = 'lite'
    summarization = 'lite'

    # Vision tasks (require specific model capabilities)
    vision = 'standard'

    # Default fallback
    general = 'standard'
}

# ============================================================================
# MODEL CAPABILITY FLAGS - Feature support mapping
# ============================================================================

$script:ModelCapabilities = @{
    # Models supporting vision/image input
    VisionModels = @(
        'claude-opus-4-5-20251101'
        'claude-sonnet-4-5-20250929'
        'gpt-4o'
        'gpt-4o-mini'
        'gemini-2.0-flash'
        'llava'
    )

    # Models optimized for code generation
    CodeModels = @(
        'qwen2.5-coder:1.5b'
        'qwen2.5-coder:7b'
        'codellama'
        'deepseek-coder'
    )

    # Models with extended context windows (>32K)
    LongContextModels = @(
        'claude-opus-4-5-20251101'       # 200K
        'claude-sonnet-4-5-20250929'     # 200K
        'gpt-4o'                          # 128K
        'gemini-2.0-flash'               # 1M
    )
}

# ============================================================================
# ERROR CODES - Standardized error identification
# ============================================================================

$script:ErrorCodes = @{
    RateLimitExceeded = 'RATE_LIMIT'
    AuthenticationFailed = 'AUTH_FAILED'
    ModelNotFound = 'MODEL_NOT_FOUND'
    ProviderUnavailable = 'PROVIDER_DOWN'
    Timeout = 'TIMEOUT'
    InvalidRequest = 'INVALID_REQUEST'
    InternalError = 'INTERNAL_ERROR'
    NoFallbackAvailable = 'NO_FALLBACK'
}

# ============================================================================
# EXPORT MODULE MEMBERS
# ============================================================================

Export-ModuleMember -Variable @(
    'Paths'
    'Thresholds'
    'ProviderPriority'
    'TierScores'
    'TaskTierMap'
    'ModelCapabilities'
    'ErrorCodes'
)
