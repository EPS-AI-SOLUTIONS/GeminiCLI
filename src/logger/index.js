/**
 * @fileoverview Enhanced Logger with async writing, rotation, colors, and performance optimizations
 * ES Module - Singleton Pattern
 * Correlation ID Support via AsyncLocalStorage
 *
 * Ported from ClaudeCli to GeminiCLI
 * @module logger
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { COLORS } from './colors.js';

// Re-export colors for convenience
export { COLORS } from './colors.js';

// ==================== Correlation ID Support ====================

const correlationStorage = new AsyncLocalStorage();

/**
 * Generates a unique correlation ID for request tracing
 * Format: gemini-{timestamp}-{random}
 */
export function generateCorrelationId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString('hex');
  return `gemini-${timestamp}-${random}`;
}

function getCurrentCorrelationId() {
  const store = correlationStorage.getStore();
  return store?.correlationId || null;
}

/**
 * Executes a function within a correlation ID context
 */
export function withCorrelationId(correlationId, fn) {
  return correlationStorage.run({ correlationId }, fn);
}

/**
 * Express middleware for correlation ID tracking
 */
export function correlationMiddleware(req, res, next) {
  const existingId =
    req.headers['x-correlation-id'] || req.headers['x-request-id'] || req.headers.traceparent;
  const correlationId = existingId || generateCorrelationId();
  res.setHeader('X-Correlation-ID', correlationId);
  correlationStorage.run({ correlationId }, () => {
    req.correlationId = correlationId;
    next();
  });
}

// Log level configuration
const LOG_LEVELS = {
  error: { priority: 0, color: COLORS.red, bgColor: COLORS.bgRed, label: 'ERROR' },
  warn: { priority: 1, color: COLORS.yellow, bgColor: COLORS.bgYellow, label: 'WARN' },
  info: { priority: 2, color: COLORS.cyan, label: 'INFO' },
  http: { priority: 3, color: COLORS.magenta, label: 'HTTP' },
  debug: { priority: 4, color: COLORS.gray, label: 'DEBUG' },
  trace: { priority: 5, color: COLORS.dim + COLORS.gray, label: 'TRACE' },
};

// Default configuration
const DEFAULT_CONFIG = {
  level: 'info',
  rotation: {
    enabled: true,
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    compress: false,
  },
  console: {
    enabled: true,
    colors: true,
    timestamps: true,
    level: 'info',
  },
  file: {
    enabled: true,
    prettyPrint: false,
    timestamps: true,
  },
  performance: {
    batchSize: 100,
    flushInterval: 1000,
    asyncWrite: true,
  },
};

/**
 * High-performance Logger with async file writing, rotation, and colored output
 */
class Logger {
  static #instance = null;

  #config;
  #logDir;
  #currentLogFile;
  #currentFileSize = 0;
  #writeBuffer = [];
  #flushTimer = null;
  #currentDate = null;

  constructor(config = {}) {
    if (Logger.#instance) {
      throw new Error('Logger is a singleton. Use Logger.getInstance() instead.');
    }
    this.#config = this.#mergeConfig(DEFAULT_CONFIG, config);
    this.#logDir = path.join(process.cwd(), '.gemini-data/logs');
    this.#currentDate = this.#getDateString();
    this.#ensureLogDirSync();
    this.#currentLogFile = this.#getLogFileName();
    this.#getCurrentFileSize();
    this.#startFlushTimer();
    this.#setupExitHandlers();
    Logger.#instance = this;
  }

  static getInstance(config = {}) {
    if (!Logger.#instance) {
      new Logger(config);
    }
    return Logger.#instance;
  }

  static resetInstance() {
    if (Logger.#instance) {
      Logger.#instance.#stopFlushTimer();
      Logger.#instance.flush();
    }
    Logger.#instance = null;
  }

  configure(config) {
    this.#config = this.#mergeConfig(this.#config, config);
    return this;
  }

  getConfig() {
    return { ...this.#config };
  }

  // ==================== Core Logging Methods ====================

  error(message, meta = {}) {
    this.#log('error', message, meta);
  }
  warn(message, meta = {}) {
    this.#log('warn', message, meta);
  }
  info(message, meta = {}) {
    this.#log('info', message, meta);
  }
  http(message, meta = {}) {
    this.#log('http', message, meta);
  }
  debug(message, meta = {}) {
    this.#log('debug', message, meta);
  }
  trace(message, meta = {}) {
    this.#log('trace', message, meta);
  }
  log(level, message, meta = {}) {
    this.#log(level, message, meta);
  }

  // ==================== Internal Methods ====================

  #log(level, message, meta = {}) {
    const levelConfig = LOG_LEVELS[level];
    if (!levelConfig) {
      console.error(`Unknown log level: ${level}`);
      return;
    }
    const configLevel = LOG_LEVELS[this.#config.level];
    if (levelConfig.priority > configLevel.priority) return;

    const timestamp = new Date().toISOString();
    const correlationId = meta.correlationId || getCurrentCorrelationId();
    const logEntry = {
      timestamp,
      level: levelConfig.label,
      ...(correlationId && { correlationId }),
      message,
      ...meta,
    };

    if (meta.correlationId) {
      delete logEntry.correlationId;
      logEntry.correlationId = meta.correlationId;
    }

    if (this.#config.console.enabled) {
      const consoleLevel = LOG_LEVELS[this.#config.console.level];
      if (levelConfig.priority <= consoleLevel.priority) {
        this.#writeToConsole(level, timestamp, message, meta, correlationId);
      }
    }

    if (this.#config.file.enabled) {
      this.#addToBuffer(logEntry);
    }
  }

  #writeToConsole(level, timestamp, message, meta, correlationId = null) {
    const levelConfig = LOG_LEVELS[level];
    const useColors = this.#config.console.colors && process.stdout.isTTY;
    const isProd = process.env.NODE_ENV === 'production';

    let output = '';

    if (isProd) {
      const logObj = {
        timestamp,
        level: levelConfig.label,
        ...(correlationId && { correlationId }),
        ...(meta.module && { module: meta.module }),
        message,
        ...meta,
      };
      if (meta.module) delete logObj.module;
      output = JSON.stringify(logObj);
    } else if (useColors) {
      const timeStr = this.#config.console.timestamps
        ? `${COLORS.gray}[${timestamp}]${COLORS.reset} `
        : '';
      const levelStr = `${levelConfig.color}${COLORS.bright}${levelConfig.label.padEnd(5)}${COLORS.reset}`;
      const moduleStr =
        meta.module || meta.context
          ? `${COLORS.cyan}[${meta.module || meta.context}]${COLORS.reset} `
          : '';
      const corrStr = correlationId
        ? `${COLORS.dim}(${correlationId.slice(-8)})${COLORS.reset} `
        : '';
      const messageStr = level === 'error' ? `${COLORS.red}${message}${COLORS.reset}` : message;
      output = `${timeStr}${levelStr} ${moduleStr}${corrStr}${messageStr}`;

      const displayMeta = { ...meta };
      delete displayMeta.module;
      delete displayMeta.context;
      delete displayMeta.correlationId;

      if (Object.keys(displayMeta).length > 0) {
        const metaStr = JSON.stringify(displayMeta, null, 0);
        output += ` ${COLORS.dim}${metaStr}${COLORS.reset}`;
      }
    } else {
      const timeStr = this.#config.console.timestamps ? `[${timestamp}] ` : '';
      const moduleStr = meta.module || meta.context ? `[${meta.module || meta.context}] ` : '';
      const corrStr = correlationId ? `(${correlationId.slice(-8)}) ` : '';
      output = `${timeStr}[${levelConfig.label}] ${moduleStr}${corrStr}${message}`;

      const displayMeta = { ...meta };
      delete displayMeta.module;
      delete displayMeta.context;
      delete displayMeta.correlationId;

      if (Object.keys(displayMeta).length > 0) {
        output += ` ${JSON.stringify(displayMeta)}`;
      }
    }

    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  #addToBuffer(logEntry) {
    const logLine = this.#config.file.prettyPrint
      ? `${JSON.stringify(logEntry, null, 2)}\n`
      : `${JSON.stringify(logEntry)}\n`;
    this.#writeBuffer.push(logLine);
    if (this.#writeBuffer.length >= this.#config.performance.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.#writeBuffer.length === 0) return;

    const currentDate = this.#getDateString();
    if (currentDate !== this.#currentDate) {
      this.#currentDate = currentDate;
      this.#currentLogFile = this.#getLogFileName();
      this.#currentFileSize = 0;
    }

    const content = this.#writeBuffer.join('');
    this.#writeBuffer = [];

    if (this.#config.rotation.enabled) {
      await this.#checkRotation(content.length);
    }

    if (this.#config.performance.asyncWrite) {
      await this.#writeAsync(content);
    } else {
      this.#writeSync(content);
    }
  }

  flushSync() {
    if (this.#writeBuffer.length === 0) return;
    const content = this.#writeBuffer.join('');
    this.#writeBuffer = [];
    this.#writeSync(content);
  }

  async #writeAsync(content) {
    try {
      await fsPromises.appendFile(this.#currentLogFile, content, { encoding: 'utf8' });
      this.#currentFileSize += Buffer.byteLength(content, 'utf8');
    } catch (err) {
      console.error('Async write failed, falling back to sync:', err.message);
      this.#writeSync(content);
    }
  }

  #writeSync(content) {
    try {
      fs.appendFileSync(this.#currentLogFile, content, { encoding: 'utf8' });
      this.#currentFileSize += Buffer.byteLength(content, 'utf8');
    } catch (err) {
      console.error('CRITICAL: Failed to write to log file:', err.message);
    }
  }

  // ==================== Log Rotation ====================

  async #checkRotation(incomingSize) {
    const { maxSize } = this.#config.rotation;
    if (this.#currentFileSize + incomingSize > maxSize) {
      await this.#rotateLog();
    }
  }

  async #rotateLog() {
    const { maxFiles } = this.#config.rotation;
    const baseName = this.#currentLogFile;

    try {
      for (let i = maxFiles - 1; i >= 1; i--) {
        const oldFile = `${baseName}.${i}`;
        const newFile = `${baseName}.${i + 1}`;
        try {
          await fsPromises.access(oldFile);
          if (i === maxFiles - 1) {
            await fsPromises.unlink(oldFile);
          } else {
            await fsPromises.rename(oldFile, newFile);
          }
        } catch {
          /* File doesn't exist */
        }
      }
      try {
        await fsPromises.access(baseName);
        await fsPromises.rename(baseName, `${baseName}.1`);
      } catch {
        /* Current file doesn't exist */
      }
      this.#currentFileSize = 0;
    } catch (err) {
      console.error('Log rotation failed:', err.message);
    }
    await this.#cleanOldLogs();
  }

  async #cleanOldLogs() {
    const { maxAge } = this.#config.rotation;
    const now = Date.now();
    try {
      const files = await fsPromises.readdir(this.#logDir);
      for (const file of files) {
        if (!file.startsWith('gemini-') || !file.includes('.log')) continue;
        const filePath = path.join(this.#logDir, file);
        const stats = await fsPromises.stat(filePath);
        if (now - stats.mtimeMs > maxAge) {
          await fsPromises.unlink(filePath);
          this.debug(`Deleted old log file: ${file}`);
        }
      }
    } catch {
      /* Ignore cleanup errors */
    }
  }

  // ==================== Utility Methods ====================

  #mergeConfig(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.#mergeConfig(target[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }
    return result;
  }

  #getDateString() {
    return new Date().toISOString().split('T')[0];
  }

  #getLogFileName() {
    return path.join(this.#logDir, `gemini-${this.#currentDate}.log`);
  }

  #ensureLogDirSync() {
    if (!fs.existsSync(this.#logDir)) {
      fs.mkdirSync(this.#logDir, { recursive: true });
    }
  }

  #getCurrentFileSize() {
    try {
      const stats = fs.statSync(this.#currentLogFile);
      this.#currentFileSize = stats.size;
    } catch {
      this.#currentFileSize = 0;
    }
  }

  #startFlushTimer() {
    if (this.#flushTimer) return;
    this.#flushTimer = setInterval(() => {
      this.flush().catch((err) => console.error('Auto-flush failed:', err.message));
    }, this.#config.performance.flushInterval);
    this.#flushTimer.unref();
  }

  #stopFlushTimer() {
    if (this.#flushTimer) {
      clearInterval(this.#flushTimer);
      this.#flushTimer = null;
    }
  }

  #setupExitHandlers() {
    const exitHandler = () => {
      this.#stopFlushTimer();
      this.flushSync();
    };
    process.on('exit', exitHandler);
    process.on('SIGINT', () => {
      exitHandler();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      exitHandler();
      process.exit(0);
    });
    process.on('uncaughtException', (err) => {
      this.error('Uncaught exception', { error: err.message, stack: err.stack });
      exitHandler();
      process.exit(1);
    });
  }

  // ==================== Child Logger Factory ====================

  child(context, options = {}) {
    const fixedCorrelationId = options.correlationId || null;

    return {
      error: (msg, meta = {}) =>
        this.error(msg, {
          ...meta,
          context,
          ...(fixedCorrelationId && { correlationId: fixedCorrelationId }),
        }),
      warn: (msg, meta = {}) =>
        this.warn(msg, {
          ...meta,
          context,
          ...(fixedCorrelationId && { correlationId: fixedCorrelationId }),
        }),
      info: (msg, meta = {}) =>
        this.info(msg, {
          ...meta,
          context,
          ...(fixedCorrelationId && { correlationId: fixedCorrelationId }),
        }),
      http: (msg, meta = {}) =>
        this.http(msg, {
          ...meta,
          context,
          ...(fixedCorrelationId && { correlationId: fixedCorrelationId }),
        }),
      debug: (msg, meta = {}) =>
        this.debug(msg, {
          ...meta,
          context,
          ...(fixedCorrelationId && { correlationId: fixedCorrelationId }),
        }),
      trace: (msg, meta = {}) =>
        this.trace(msg, {
          ...meta,
          context,
          ...(fixedCorrelationId && { correlationId: fixedCorrelationId }),
        }),
      log: (level, msg, meta = {}) =>
        this.log(level, msg, {
          ...meta,
          context,
          ...(fixedCorrelationId && { correlationId: fixedCorrelationId }),
        }),
      child: (childContext) =>
        this.child(`${context}:${childContext}`, { correlationId: fixedCorrelationId }),
      withCorrelation: (correlationId) => this.child(context, { correlationId }),
      getContext: () => context,
      getCorrelationId: () => fixedCorrelationId,
    };
  }

  withCorrelation(correlationId) {
    return this.child('root', { correlationId });
  }
}

// ==================== Exports ====================

const logger = Logger.getInstance();

export const createLogger = (context, options = {}) => logger.child(context, options);
export const configureLogger = (config) => logger.configure(config);
export const getLoggerConfig = () => logger.getConfig();
export const LogLevels = Object.keys(LOG_LEVELS);

export { Logger };
export default logger;
