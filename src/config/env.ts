/**
 * Environment Variable Validation (#46)
 *
 * Uses Zod schemas to validate all required environment variables at startup.
 * Prevents runtime crashes from missing/invalid configuration.
 *
 * @module config/env
 */

import { z } from 'zod';

// ============================================================================
// ENV SCHEMA
// ============================================================================

const envSchema = z.object({
  // === Required ===
  GEMINI_API_KEY: z
    .string()
    .min(1, 'GEMINI_API_KEY is required. Get one at https://aistudio.google.com/'),

  // === Optional with defaults ===
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen3:4b'),
  GEMINI_MODEL: z.string().default('gemini-3-flash-preview'),

  // === Feature flags ===
  DISABLE_PROMPT_INJECTION_DETECTION: z.enum(['true', 'false']).default('false'),
  DISABLE_ANTI_CREATIVITY: z.enum(['true', 'false']).default('false'),
  HYDRA_VERBOSE: z.enum(['true', 'false']).default('false'),
  HYDRA_YOLO_MODE: z.enum(['true', 'false']).default('false'),

  // === Limits ===
  MAX_CONCURRENT_AGENTS: z.coerce.number().int().min(1).max(24).default(6),
  AGENT_TIMEOUT_MS: z.coerce.number().int().min(5000).max(600000).default(180000),
  MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(32768).default(8192),

  // === Paths ===
  HYDRA_PROJECT_ROOT: z.string().optional(),
  HYDRA_ARCHIVE_PATH: z.string().default('./.swarm/sessions'),

  // === API Keys (optional providers) ===
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

// ============================================================================
// VALIDATION
// ============================================================================

let cachedEnv: EnvConfig | null = null;

/**
 * Validate and parse environment variables.
 * Returns typed, validated env config.
 * Throws on missing required vars with helpful messages.
 */
export function validateEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  ❌ ${issue.path.join('.')}: ${issue.message}`,
    );

    console.error('\n🔴 Environment Validation Failed:\n');
    console.error(errors.join('\n'));
    console.error('\nCreate a .env file or set these environment variables.\n');

    // Don't crash — return defaults with empty API key (will fail on first API call)
    // This allows the app to start and show helpful error messages
    cachedEnv = envSchema.parse({
      ...process.env,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'MISSING_API_KEY',
    });
    return cachedEnv;
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * Get a specific env variable with type safety.
 */
export function getEnv<K extends keyof EnvConfig>(key: K): EnvConfig[K] {
  return validateEnv()[key];
}

/**
 * Check if required API keys are present.
 */
export function hasRequiredKeys(): boolean {
  const env = validateEnv();
  return env.GEMINI_API_KEY !== 'MISSING_API_KEY' && env.GEMINI_API_KEY.length > 0;
}

/**
 * Reset cached env (for testing)
 */
export function resetEnvCache(): void {
  cachedEnv = null;
}
