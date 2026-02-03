/**
 * InteractivePromptHandler - Handles interactive prompts in shell output
 *
 * Features:
 * - Detects yes/no, password, confirmation prompts
 * - Auto-responds based on configured patterns
 * - Supports custom callback for prompt handling
 * - Timeout for waiting on responses
 * - Logging for detected prompts
 */

import chalk from 'chalk';
import { ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

// ============================================================
// Types
// ============================================================

/**
 * Types of interactive prompts that can be detected
 */
export type InteractivePromptType =
  | 'yes_no'
  | 'password'
  | 'confirmation'
  | 'input'
  | 'choice'
  | 'unknown';

/**
 * Detected interactive prompt information
 */
export interface InteractivePrompt {
  /** The type of prompt detected */
  type: InteractivePromptType;
  /** The raw prompt text */
  text: string;
  /** The pattern that matched */
  pattern: RegExp;
  /** Timestamp when detected */
  timestamp: Date;
  /** Whether it was auto-responded */
  autoResponded: boolean;
  /** The response that was sent (if any) */
  response?: string;
}

/**
 * Log entry for interactive prompts
 */
export interface InteractivePromptLog {
  prompt: InteractivePrompt;
  responded: boolean;
  responseTime?: number;
}

/**
 * Callback for handling interactive prompts
 * Return a string to respond, null to skip, or undefined to use auto-respond
 */
export type InteractivePromptCallback = (
  prompt: InteractivePrompt
) => string | null | undefined | Promise<string | null | undefined>;

/**
 * Configuration for interactive prompt handling
 */
export interface InteractivePromptConfig {
  /** Enable interactive prompt detection */
  enabled: boolean;
  /** Auto-respond map: pattern -> response */
  autoRespond: Map<RegExp, string>;
  /** Callback for handling prompts */
  onPrompt?: InteractivePromptCallback;
  /** Timeout for waiting on response (ms) */
  responseTimeout: number;
  /** Log detected prompts */
  logPrompts: boolean;
  /** Predefined response mode */
  defaultResponse?: 'yes' | 'no' | 'skip' | 'none';
}

// ============================================================
// Predefined Patterns
// ============================================================

/**
 * Predefined interactive prompt patterns
 */
export const INTERACTIVE_PROMPT_PATTERNS: Record<InteractivePromptType, RegExp[]> = {
  yes_no: [
    /\[y\/n\]/i,
    /\[Y\/n\]/,
    /\[y\/N\]/,
    /\[yes\/no\]/i,
    /\(y\/n\)/i,
    /\(Y\/n\)/,
    /\(y\/N\)/,
    /\(yes\/no\)/i,
    /\by\/n\b/i,
    /\byes or no\b/i,
    /\benter y or n\b/i,
  ],
  password: [
    /password:/i,
    /password for/i,
    /enter password/i,
    /passphrase:/i,
    /enter passphrase/i,
    /secret:/i,
    /token:/i,
    /api[- ]?key:/i,
  ],
  confirmation: [
    /continue\?/i,
    /proceed\?/i,
    /are you sure\?/i,
    /do you want to continue\?/i,
    /press enter to continue/i,
    /press any key/i,
    /confirm\?/i,
    /overwrite\?/i,
    /replace\?/i,
    /delete\?/i,
    /remove\?/i,
  ],
  input: [
    /enter [\w\s]+:/i,
    /input [\w\s]+:/i,
    /type [\w\s]+:/i,
    /provide [\w\s]+:/i,
    /[\w\s]+\s*:\s*$/,
  ],
  choice: [
    /\[\d+\]/,
    /select (?:one|an option)/i,
    /choose (?:one|an option)/i,
    /option \d+/i,
    /\(\d+\)/,
  ],
  unknown: []
};

// ============================================================
// Predefined Auto-Respond Presets
// ============================================================

/**
 * Predefined auto-respond configurations
 */
export const AUTO_RESPOND_PRESETS = {
  /** Auto-respond "yes" to yes/no and confirmation prompts */
  autoYes: new Map<RegExp, string>([
    [/\[y\/n\]/i, 'y'],
    [/\[Y\/n\]/, 'y'],
    [/\[y\/N\]/, 'y'],
    [/\[yes\/no\]/i, 'yes'],
    [/\(y\/n\)/i, 'y'],
    [/continue\?/i, 'y'],
    [/proceed\?/i, 'y'],
    [/are you sure\?/i, 'y'],
    [/confirm\?/i, 'y'],
    [/overwrite\?/i, 'y'],
  ]),
  /** Auto-respond "no" to yes/no and confirmation prompts */
  autoNo: new Map<RegExp, string>([
    [/\[y\/n\]/i, 'n'],
    [/\[Y\/n\]/, 'n'],
    [/\[y\/N\]/, 'n'],
    [/\[yes\/no\]/i, 'no'],
    [/\(y\/n\)/i, 'n'],
    [/continue\?/i, 'n'],
    [/proceed\?/i, 'n'],
    [/are you sure\?/i, 'n'],
    [/confirm\?/i, 'n'],
    [/overwrite\?/i, 'n'],
  ]),
  /** Auto-skip (press Enter) for confirmation prompts */
  autoSkip: new Map<RegExp, string>([
    [/press enter to continue/i, ''],
    [/press any key/i, ''],
    [/continue\?/i, ''],
    [/proceed\?/i, ''],
  ]),
};

// ============================================================
// Default Configuration
// ============================================================

/**
 * Create default interactive prompt configuration
 */
export function createDefaultInteractiveConfig(): InteractivePromptConfig {
  return {
    enabled: false,
    autoRespond: new Map(),
    responseTimeout: 30000, // 30 seconds
    logPrompts: true,
    defaultResponse: 'none'
  };
}

// ============================================================
// Interactive Prompt Detector
// ============================================================

/**
 * Detects interactive prompts in shell output
 */
export class InteractivePromptDetector {
  private patterns: Map<InteractivePromptType, RegExp[]>;
  private recentOutput: string = '';
  private readonly maxOutputBuffer = 4096;

  constructor(customPatterns?: Partial<Record<InteractivePromptType, RegExp[]>>) {
    this.patterns = new Map();

    // Initialize with default patterns
    for (const [type, regexes] of Object.entries(INTERACTIVE_PROMPT_PATTERNS)) {
      this.patterns.set(type as InteractivePromptType, [...regexes]);
    }

    // Add custom patterns
    if (customPatterns) {
      for (const [type, regexes] of Object.entries(customPatterns)) {
        const existing = this.patterns.get(type as InteractivePromptType) || [];
        this.patterns.set(type as InteractivePromptType, [...existing, ...regexes]);
      }
    }
  }

  /**
   * Add output to the buffer for analysis
   */
  addOutput(text: string): void {
    this.recentOutput += text;
    // Keep buffer manageable
    if (this.recentOutput.length > this.maxOutputBuffer) {
      this.recentOutput = this.recentOutput.slice(-this.maxOutputBuffer);
    }
  }

  /**
   * Clear the output buffer
   */
  clearBuffer(): void {
    this.recentOutput = '';
  }

  /**
   * Get the current buffer content
   */
  getBuffer(): string {
    return this.recentOutput;
  }

  /**
   * Detect if the current output contains an interactive prompt
   */
  detect(text?: string): InteractivePrompt | null {
    const textToCheck = text || this.recentOutput;

    // Check the last portion of text (prompts are usually at the end)
    const checkText = textToCheck.slice(-500);

    for (const [type, regexes] of this.patterns.entries()) {
      for (const pattern of regexes) {
        if (pattern.test(checkText)) {
          // Find the line containing the prompt
          const lines = checkText.split('\n');
          const promptLine = lines.reverse().find(line => pattern.test(line)) || checkText;

          return {
            type,
            text: promptLine.trim(),
            pattern,
            timestamp: new Date(),
            autoResponded: false
          };
        }
      }
    }

    return null;
  }

  /**
   * Add a custom pattern
   */
  addPattern(type: InteractivePromptType, pattern: RegExp): void {
    const existing = this.patterns.get(type) || [];
    existing.push(pattern);
    this.patterns.set(type, existing);
  }

  /**
   * Remove a pattern
   */
  removePattern(type: InteractivePromptType, pattern: RegExp): boolean {
    const existing = this.patterns.get(type) || [];
    const index = existing.findIndex(p => p.source === pattern.source && p.flags === pattern.flags);
    if (index !== -1) {
      existing.splice(index, 1);
      this.patterns.set(type, existing);
      return true;
    }
    return false;
  }

  /**
   * Get all patterns for a type
   */
  getPatterns(type: InteractivePromptType): RegExp[] {
    return this.patterns.get(type) || [];
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): Map<InteractivePromptType, RegExp[]> {
    return new Map(this.patterns);
  }
}

// ============================================================
// Interactive Prompt Handler
// ============================================================

/**
 * Handles interactive prompts for shell processes
 */
export class InteractivePromptHandler extends EventEmitter {
  private config: InteractivePromptConfig;
  private detector: InteractivePromptDetector;
  private promptLogs: InteractivePromptLog[] = [];

  constructor(config?: Partial<InteractivePromptConfig>) {
    super();

    const defaultConfig = createDefaultInteractiveConfig();
    this.config = {
      ...defaultConfig,
      ...config,
      autoRespond: config?.autoRespond || defaultConfig.autoRespond
    };

    this.detector = new InteractivePromptDetector();
  }

  /**
   * Enable interactive prompt detection
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable interactive prompt detection
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Use a preset for auto-responses
   */
  usePreset(preset: 'autoYes' | 'autoNo' | 'autoSkip'): void {
    if (AUTO_RESPOND_PRESETS[preset]) {
      this.config.autoRespond = new Map(AUTO_RESPOND_PRESETS[preset]);
      this.config.defaultResponse = preset === 'autoYes' ? 'yes' :
                                     preset === 'autoNo' ? 'no' : 'skip';
    }
  }

  /**
   * Set the callback for interactive prompts
   */
  setCallback(callback: InteractivePromptCallback): void {
    this.config.onPrompt = callback;
  }

  /**
   * Clear the callback
   */
  clearCallback(): void {
    this.config.onPrompt = undefined;
  }

  /**
   * Add an auto-respond rule
   */
  addAutoResponse(pattern: RegExp, response: string): void {
    this.config.autoRespond.set(pattern, response);
  }

  /**
   * Remove an auto-respond rule
   */
  removeAutoResponse(pattern: RegExp): boolean {
    return this.config.autoRespond.delete(pattern);
  }

  /**
   * Clear all auto-respond rules
   */
  clearAutoResponses(): void {
    this.config.autoRespond.clear();
  }

  /**
   * Set response timeout
   */
  setResponseTimeout(timeout: number): void {
    this.config.responseTimeout = timeout;
  }

  /**
   * Enable/disable logging
   */
  setLogging(enabled: boolean): void {
    this.config.logPrompts = enabled;
  }

  /**
   * Get the current configuration
   */
  getConfig(): InteractivePromptConfig {
    return { ...this.config };
  }

  /**
   * Get the detector instance
   */
  getDetector(): InteractivePromptDetector {
    return this.detector;
  }

  /**
   * Get all prompt logs
   */
  getPromptLogs(): InteractivePromptLog[] {
    return [...this.promptLogs];
  }

  /**
   * Clear prompt logs
   */
  clearPromptLogs(): void {
    this.promptLogs = [];
  }

  /**
   * Process output and check for interactive prompts
   * Returns the detected prompt if found
   */
  processOutput(text: string): InteractivePrompt | null {
    if (!this.config.enabled) {
      return null;
    }

    this.detector.addOutput(text);
    return this.detector.detect();
  }

  /**
   * Find auto-response for a prompt
   */
  findAutoResponse(prompt: InteractivePrompt): string | null {
    for (const [pattern, response] of this.config.autoRespond) {
      if (pattern.test(prompt.text)) {
        return response;
      }
    }
    return null;
  }

  /**
   * Handle an interactive prompt
   * Returns the response to send, or null if no response
   */
  async handlePrompt(
    prompt: InteractivePrompt,
    sendInput: (input: string) => Promise<void>
  ): Promise<string | null> {
    const startTime = Date.now();

    // Log the detected prompt
    if (this.config.logPrompts) {
      console.log(chalk.yellow(`[Interactive Prompt Detected] Type: ${prompt.type}`));
      console.log(chalk.yellow(`  Text: ${prompt.text}`));
    }

    // Emit event for external handling
    this.emit('prompt', prompt);

    // Check for callback response first
    if (this.config.onPrompt) {
      try {
        const callbackResponse = await Promise.race([
          Promise.resolve(this.config.onPrompt(prompt)),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), this.config.responseTimeout)
          )
        ]);

        if (callbackResponse !== undefined && callbackResponse !== null) {
          await sendInput(callbackResponse);
          prompt.response = callbackResponse;
          prompt.autoResponded = false;

          const promptLog: InteractivePromptLog = {
            prompt,
            responded: true,
            responseTime: Date.now() - startTime
          };
          this.promptLogs.push(promptLog);

          if (this.config.logPrompts) {
            console.log(chalk.green(`  Response (callback): "${callbackResponse}" (${promptLog.responseTime}ms)`));
          }

          this.emit('response', { prompt, response: callbackResponse, source: 'callback' });
          return callbackResponse;
        }
      } catch (error) {
        console.error(chalk.red(`  Callback error: ${error}`));
        this.emit('error', { prompt, error });
      }
    }

    // Check for auto-response
    const autoResponse = this.findAutoResponse(prompt);
    if (autoResponse !== null) {
      await sendInput(autoResponse);
      prompt.response = autoResponse;
      prompt.autoResponded = true;

      const promptLog: InteractivePromptLog = {
        prompt,
        responded: true,
        responseTime: Date.now() - startTime
      };
      this.promptLogs.push(promptLog);

      if (this.config.logPrompts) {
        console.log(chalk.green(`  Response (auto): "${autoResponse}" (${promptLog.responseTime}ms)`));
      }

      this.emit('response', { prompt, response: autoResponse, source: 'auto' });
      return autoResponse;
    }

    // No response available
    const promptLog: InteractivePromptLog = {
      prompt,
      responded: false
    };
    this.promptLogs.push(promptLog);

    if (this.config.logPrompts) {
      console.log(chalk.gray(`  No auto-response configured`));
    }

    this.emit('noResponse', { prompt });
    return null;
  }

  /**
   * Reset the handler state (clear buffer and logs)
   */
  reset(): void {
    this.detector.clearBuffer();
    this.promptLogs = [];
  }

  /**
   * Create a handler attached to a process
   */
  attachToProcess(proc: ChildProcess): {
    sendInput: (input: string) => Promise<void>;
    detach: () => void;
  } {
    const sendInput = async (input: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!proc.stdin) {
          reject(new Error('Process stdin is not available'));
          return;
        }

        proc.stdin.write(input + '\n', (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    };

    const handleStdout = async (data: Buffer) => {
      const text = data.toString();
      const prompt = this.processOutput(text);

      if (prompt) {
        await this.handlePrompt(prompt, sendInput);
        this.detector.clearBuffer();
      }
    };

    const handleStderr = async (data: Buffer) => {
      const text = data.toString();
      const prompt = this.processOutput(text);

      if (prompt) {
        await this.handlePrompt(prompt, sendInput);
        this.detector.clearBuffer();
      }
    };

    proc.stdout?.on('data', handleStdout);
    proc.stderr?.on('data', handleStderr);

    const detach = () => {
      proc.stdout?.off('data', handleStdout);
      proc.stderr?.off('data', handleStderr);
    };

    return { sendInput, detach };
  }
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * Create a new InteractivePromptHandler
 */
export function createInteractiveHandler(
  config?: Partial<InteractivePromptConfig>
): InteractivePromptHandler {
  return new InteractivePromptHandler(config);
}

/**
 * Create a handler with a preset
 */
export function createInteractiveHandlerWithPreset(
  preset: 'autoYes' | 'autoNo' | 'autoSkip'
): InteractivePromptHandler {
  const handler = new InteractivePromptHandler({
    enabled: true,
    autoRespond: AUTO_RESPOND_PRESETS[preset],
    logPrompts: true
  });
  return handler;
}

/**
 * Create a detector only (for manual detection)
 */
export function createPromptDetector(
  customPatterns?: Partial<Record<InteractivePromptType, RegExp[]>>
): InteractivePromptDetector {
  return new InteractivePromptDetector(customPatterns);
}

// ============================================================
// Exports
// ============================================================

export default InteractivePromptHandler;
