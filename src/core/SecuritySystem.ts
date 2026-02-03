/**
 * SecuritySystem - Security features for GeminiHydra
 * Features #48: Input Sanitization, #50: Secure Config
 */

import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { GEMINIHYDRA_DIR } from '../config/paths.config.js';

const SECURE_CONFIG_FILE = path.join(GEMINIHYDRA_DIR, 'secure-config.enc');
const KEY_FILE = path.join(GEMINIHYDRA_DIR, '.key');

// ============================================================
// Feature #48: Input Sanitization
// ============================================================

export interface SanitizationResult {
  sanitized: string;
  warnings: string[];
  blocked: boolean;
  blockedReason?: string;
}

export interface SanitizationOptions {
  maxLength?: number;
  allowedPatterns?: RegExp[];
  blockedPatterns?: RegExp[];
  stripHtml?: boolean;
  stripControlChars?: boolean;
  normalizeWhitespace?: boolean;
}

/**
 * Consolidated dangerous patterns for security checks.
 * This is the canonical list - import from here for consistency.
 * Merged from: SecuritySystem.ts + validators.ts
 */
export const DEFAULT_BLOCKED_PATTERNS: RegExp[] = [
  // === Shell injection patterns ===
  /;\s*rm\s+-rf/i,
  /rm\s+-rf/i,                    // from validators.ts
  /;\s*dd\s+if=/i,
  /dd\s+if=/i,                    // from validators.ts
  /;\s*mkfs\./i,
  /mkfs/i,                        // from validators.ts
  />\s*\/dev\/(sda|hda|nvme)/i,
  />\s*\/dev\//i,                 // from validators.ts (broader)
  /\|\s*sh\s*$/i,
  /\|\s*bash\s*$/i,               // from validators.ts
  /\$\(.*\)/,
  /`[^`]+`/,

  // === File system destruction (Windows) ===
  /del\s+\/[sfq]/i,               // from validators.ts
  /format\s+[a-z]:/i,             // from validators.ts

  // === Remote code execution via pipe ===
  /curl.*\|\s*(ba)?sh/i,          // from validators.ts
  /wget.*\|\s*(ba)?sh/i,          // from validators.ts

  // === Path traversal ===
  /\.\.\/\.\.\/\.\.\//,
  /\.\.\\\.\.\\\.\.\\/,

  // === SQL injection (basic) ===
  /'\s*OR\s+'1'\s*=\s*'1/i,
  /'\s*;\s*DROP\s+TABLE/i,
  /UNION\s+SELECT/i,

  // === XSS patterns ===
  /<script[^>]*>/i,
  /javascript:/i,
  /on\w+\s*=/i,

  // === Credential patterns (prevent accidental logging) ===
  /password\s*[:=]\s*['"][^'"]+['"]/i,
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/i,
  /secret\s*[:=]\s*['"][^'"]+['"]/i,

  // === Dangerous PowerShell ===
  /Invoke-Expression/i,
  /IEX\s*\(/i,
  /-EncodedCommand/i,
  /powershell.*-enc/i,            // from validators.ts
  /Start-Process.*-Verb\s+RunAs/i,

  // === Code evaluation patterns ===
  /eval\s*\(/i,                   // from validators.ts
  /exec\s*\(/i,                   // from validators.ts

  // === Python-specific dangerous patterns ===
  /__import__\s*\(/i,             // from validators.ts
  /subprocess/i,                  // from validators.ts
  /os\.system/i,                  // from validators.ts

  // === Node.js dangerous patterns ===
  /child_process/i,               // from validators.ts
];

/**
 * Utility function to check if code contains dangerous patterns.
 * Use this for code validation before execution.
 */
export function containsDangerousPatterns(code: string): boolean {
  return DEFAULT_BLOCKED_PATTERNS.some(pattern => pattern.test(code));
}

const DANGEROUS_COMMANDS = [
  'rm -rf /',
  'format c:',
  'del /f /s /q',
  'shutdown',
  'reboot',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',  // Fork bomb
  'chmod -R 777 /',
  'chown -R',
];

export class InputSanitizer {
  private options: Required<SanitizationOptions>;

  constructor(options: SanitizationOptions = {}) {
    this.options = {
      maxLength: options.maxLength ?? 50000,
      allowedPatterns: options.allowedPatterns ?? [],
      blockedPatterns: options.blockedPatterns ?? DEFAULT_BLOCKED_PATTERNS,
      stripHtml: options.stripHtml ?? true,
      stripControlChars: options.stripControlChars ?? true,
      normalizeWhitespace: options.normalizeWhitespace ?? true
    };
  }

  /**
   * Sanitize input string
   */
  sanitize(input: string): SanitizationResult {
    const warnings: string[] = [];
    let sanitized = input;

    // Check length
    if (sanitized.length > this.options.maxLength) {
      sanitized = sanitized.substring(0, this.options.maxLength);
      warnings.push(`Input truncated to ${this.options.maxLength} characters`);
    }

    // Check for dangerous commands
    for (const dangerous of DANGEROUS_COMMANDS) {
      if (sanitized.toLowerCase().includes(dangerous.toLowerCase())) {
        return {
          sanitized: '',
          warnings,
          blocked: true,
          blockedReason: `Dangerous command detected: ${dangerous}`
        };
      }
    }

    // Check blocked patterns
    for (const pattern of this.options.blockedPatterns) {
      if (pattern.test(sanitized)) {
        return {
          sanitized: '',
          warnings,
          blocked: true,
          blockedReason: `Blocked pattern detected: ${pattern.source.substring(0, 30)}...`
        };
      }
    }

    // Strip HTML if enabled
    if (this.options.stripHtml) {
      const beforeHtml = sanitized;
      sanitized = sanitized.replace(/<[^>]+>/g, '');
      if (beforeHtml !== sanitized) {
        warnings.push('HTML tags stripped');
      }
    }

    // Strip control characters
    if (this.options.stripControlChars) {
      const beforeControl = sanitized;
      // Keep newlines and tabs
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      if (beforeControl !== sanitized) {
        warnings.push('Control characters stripped');
      }
    }

    // Normalize whitespace
    if (this.options.normalizeWhitespace) {
      sanitized = sanitized.replace(/[ \t]+/g, ' ');
      sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
    }

    return { sanitized, warnings, blocked: false };
  }

  /**
   * Sanitize file path
   */
  sanitizePath(inputPath: string): SanitizationResult {
    const warnings: string[] = [];
    let sanitized = inputPath.trim();

    // Normalize path separators
    sanitized = sanitized.replace(/\\/g, '/');

    // Check for path traversal
    if (sanitized.includes('../') || sanitized.includes('..\\')) {
      // Resolve to absolute and check if it escapes allowed directories
      const resolved = path.resolve(sanitized);
      warnings.push('Path traversal detected, resolved to absolute path');
      sanitized = resolved;
    }

    // Check for dangerous paths
    const dangerousPaths = ['/dev/', '/proc/', '/sys/', 'C:\\Windows\\System32'];
    for (const dangerous of dangerousPaths) {
      if (sanitized.toLowerCase().includes(dangerous.toLowerCase())) {
        return {
          sanitized: '',
          warnings,
          blocked: true,
          blockedReason: `Access to system path blocked: ${dangerous}`
        };
      }
    }

    // Prevent null byte injection
    if (sanitized.includes('\x00')) {
      sanitized = sanitized.replace(/\x00/g, '');
      warnings.push('Null bytes removed from path');
    }

    return { sanitized, warnings, blocked: false };
  }

  /**
   * Sanitize JSON input
   */
  sanitizeJSON(input: string): { data: any; warnings: string[] } | { error: string } {
    const warnings: string[] = [];

    try {
      // First sanitize as string
      const stringResult = this.sanitize(input);
      if (stringResult.blocked) {
        return { error: stringResult.blockedReason || 'Input blocked' };
      }

      // Try to parse
      const data = JSON.parse(stringResult.sanitized);

      // Deep sanitize object values
      const sanitizedData = this.deepSanitizeObject(data, warnings);

      return { data: sanitizedData, warnings };
    } catch (e: any) {
      return { error: `Invalid JSON: ${e.message}` };
    }
  }

  private deepSanitizeObject(obj: any, warnings: string[], depth = 0): any {
    if (depth > 10) {
      warnings.push('Object nesting too deep, truncated');
      return null;
    }

    if (typeof obj === 'string') {
      const result = this.sanitize(obj);
      if (result.blocked) {
        warnings.push(`Blocked content in string: ${result.blockedReason}`);
        return '[BLOCKED]';
      }
      return result.sanitized;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitizeObject(item, warnings, depth + 1));
    }

    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const sanitizedKey = this.sanitize(key);
        if (!sanitizedKey.blocked) {
          sanitized[sanitizedKey.sanitized] = this.deepSanitizeObject(value, warnings, depth + 1);
        }
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Validate and sanitize MCP tool call
   */
  sanitizeMCPToolCall(toolName: string, params: Record<string, any>): SanitizationResult & { params?: Record<string, any> } {
    const warnings: string[] = [];

    // Sanitize tool name
    const toolResult = this.sanitize(toolName);
    if (toolResult.blocked) {
      return { ...toolResult, params: undefined };
    }

    // Sanitize parameters
    const sanitizedParams: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Check if it's a path parameter
        if (key.toLowerCase().includes('path') || key.toLowerCase().includes('file')) {
          const pathResult = this.sanitizePath(value);
          if (pathResult.blocked) {
            return {
              sanitized: '',
              warnings: [...warnings, ...pathResult.warnings],
              blocked: true,
              blockedReason: pathResult.blockedReason,
              params: undefined
            };
          }
          sanitizedParams[key] = pathResult.sanitized;
          warnings.push(...pathResult.warnings);
        } else {
          const strResult = this.sanitize(value);
          if (strResult.blocked) {
            return {
              sanitized: '',
              warnings: [...warnings, ...strResult.warnings],
              blocked: true,
              blockedReason: strResult.blockedReason,
              params: undefined
            };
          }
          sanitizedParams[key] = strResult.sanitized;
          warnings.push(...strResult.warnings);
        }
      } else {
        sanitizedParams[key] = value;
      }
    }

    return {
      sanitized: toolResult.sanitized,
      warnings,
      blocked: false,
      params: sanitizedParams
    };
  }
}

export const sanitizer = new InputSanitizer();

// ============================================================
// Feature #50: Secure Configuration
// ============================================================

export interface SecureConfigData {
  apiKeys: Record<string, string>;
  credentials: Record<string, { username: string; password: string }>;
  tokens: Record<string, string>;
  custom: Record<string, any>;
}

export class SecureConfig {
  private key: Buffer | null = null;
  private data: SecureConfigData = {
    apiKeys: {},
    credentials: {},
    tokens: {},
    custom: {}
  };
  private initialized = false;

  /**
   * Initialize secure config (generate or load key)
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(GEMINIHYDRA_DIR, { recursive: true });

    // Try to load existing key
    try {
      const keyData = await fs.readFile(KEY_FILE);
      this.key = keyData;
    } catch {
      // Generate new key
      this.key = crypto.randomBytes(32);
      await fs.writeFile(KEY_FILE, this.key, { mode: 0o600 });
    }

    // Try to load existing config
    try {
      await this.load();
    } catch {
      // No existing config, start fresh
    }

    this.initialized = true;
  }

  /**
   * Encrypt data
   */
  private encrypt(data: string): string {
    if (!this.key) throw new Error('Config not initialized');

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      iv: iv.toString('hex'),
      encrypted,
      authTag: authTag.toString('hex')
    });
  }

  /**
   * Decrypt data
   */
  private decrypt(encryptedData: string): string {
    if (!this.key) throw new Error('Config not initialized');

    const { iv, encrypted, authTag } = JSON.parse(encryptedData);

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Save config to encrypted file
   */
  async save(): Promise<void> {
    const encrypted = this.encrypt(JSON.stringify(this.data));
    await fs.writeFile(SECURE_CONFIG_FILE, encrypted, { mode: 0o600 });
  }

  /**
   * Load config from encrypted file
   */
  async load(): Promise<void> {
    const encrypted = await fs.readFile(SECURE_CONFIG_FILE, 'utf-8');
    const decrypted = this.decrypt(encrypted);
    this.data = JSON.parse(decrypted);
  }

  /**
   * Set API key
   */
  async setApiKey(name: string, key: string): Promise<void> {
    this.data.apiKeys[name] = key;
    await this.save();
  }

  /**
   * Get API key
   */
  getApiKey(name: string): string | undefined {
    return this.data.apiKeys[name];
  }

  /**
   * Set credentials
   */
  async setCredentials(name: string, username: string, password: string): Promise<void> {
    this.data.credentials[name] = { username, password };
    await this.save();
  }

  /**
   * Get credentials
   */
  getCredentials(name: string): { username: string; password: string } | undefined {
    return this.data.credentials[name];
  }

  /**
   * Set token
   */
  async setToken(name: string, token: string): Promise<void> {
    this.data.tokens[name] = token;
    await this.save();
  }

  /**
   * Get token
   */
  getToken(name: string): string | undefined {
    return this.data.tokens[name];
  }

  /**
   * Set custom value
   */
  async setCustom(key: string, value: any): Promise<void> {
    this.data.custom[key] = value;
    await this.save();
  }

  /**
   * Get custom value
   */
  getCustom<T = any>(key: string): T | undefined {
    return this.data.custom[key] as T;
  }

  /**
   * Delete a key
   */
  async delete(category: keyof SecureConfigData, key: string): Promise<boolean> {
    if (this.data[category] && key in this.data[category]) {
      delete (this.data[category] as any)[key];
      await this.save();
      return true;
    }
    return false;
  }

  /**
   * List all keys (without values)
   */
  listKeys(): { apiKeys: string[]; credentials: string[]; tokens: string[]; custom: string[] } {
    return {
      apiKeys: Object.keys(this.data.apiKeys),
      credentials: Object.keys(this.data.credentials),
      tokens: Object.keys(this.data.tokens),
      custom: Object.keys(this.data.custom)
    };
  }

  /**
   * Rotate encryption key
   */
  async rotateKey(): Promise<void> {
    // Save current data
    const currentData = { ...this.data };

    // Generate new key
    const newKey = crypto.randomBytes(32);

    // Update key
    this.key = newKey;
    await fs.writeFile(KEY_FILE, newKey, { mode: 0o600 });

    // Re-save with new key
    this.data = currentData;
    await this.save();
  }

  /**
   * Export config (encrypted) for backup
   */
  async export(): Promise<string> {
    return await fs.readFile(SECURE_CONFIG_FILE, 'utf-8');
  }

  /**
   * Import config from backup
   */
  async import(encryptedData: string): Promise<void> {
    // Verify we can decrypt it first
    const decrypted = this.decrypt(encryptedData);
    const data = JSON.parse(decrypted);

    // Validate structure
    if (!data.apiKeys || !data.credentials || !data.tokens || !data.custom) {
      throw new Error('Invalid config structure');
    }

    // Save and reload
    await fs.writeFile(SECURE_CONFIG_FILE, encryptedData, { mode: 0o600 });
    this.data = data;
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.data = {
      apiKeys: {},
      credentials: {},
      tokens: {},
      custom: {}
    };
    await this.save();
  }
}

export const secureConfig = new SecureConfig();

// ============================================================
// Security Utilities
// ============================================================

/**
 * Mask sensitive data in logs
 */
export function maskSensitive(text: string): string {
  let masked = text;

  // Mask API keys
  masked = masked.replace(/(api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9_-]{20,})['"]?/gi,
    '$1=***MASKED***');

  // Mask passwords
  masked = masked.replace(/(password|passwd|pwd)\s*[:=]\s*['"]?([^'"\s]+)['"]?/gi,
    '$1=***MASKED***');

  // Mask tokens
  masked = masked.replace(/(token|bearer|auth)\s*[:=]\s*['"]?([a-zA-Z0-9_.-]{20,})['"]?/gi,
    '$1=***MASKED***');

  // Mask credit card numbers
  masked = masked.replace(/\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b/g,
    '$1-****-****-$4');

  // Mask email addresses partially
  masked = masked.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (match, local, domain) => `${local.substring(0, 2)}***@${domain}`);

  return masked;
}

/**
 * Generate secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Hash sensitive data for comparison
 */
export function hashSensitive(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Rate limiter for security
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests
    let requests = this.requests.get(key) || [];

    // Filter to current window
    requests = requests.filter(time => time > windowStart);

    // Check limit
    if (requests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    requests.push(now);
    this.requests.set(key, requests);

    return true;
  }

  /**
   * Get remaining requests
   */
  getRemaining(key: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const requests = (this.requests.get(key) || []).filter(time => time > windowStart);
    return Math.max(0, this.maxRequests - requests.length);
  }

  /**
   * Reset limit for key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all limits
   */
  clear(): void {
    this.requests.clear();
  }
}

export const rateLimiter = new RateLimiter();

// ============================================================
// Export all
// ============================================================

export default {
  InputSanitizer,
  sanitizer,
  SecureConfig,
  secureConfig,
  maskSensitive,
  generateSecureToken,
  hashSensitive,
  RateLimiter,
  rateLimiter
};
