/**
 * @fileoverview Custom error classes for tools
 * @module tools/errors
 */

/**
 * Base application error
 */
export class AppError extends Error {
  constructor(message, code = 'APP_ERROR', statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
    };
  }
}

/**
 * Validation error - thrown when input validation fails
 */
export class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.field = field;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field,
    };
  }
}

/**
 * Tool execution error - thrown when a tool fails to execute
 */
export class ToolExecutionError extends AppError {
  constructor(message, toolName = null, details = null) {
    super(message, 'TOOL_EXECUTION_ERROR', 500);
    this.toolName = toolName;
    this.details = details;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      toolName: this.toolName,
      details: this.details,
    };
  }
}

/**
 * Timeout error - thrown when operation exceeds time limit
 */
export class TimeoutError extends AppError {
  constructor(message, timeoutMs = null) {
    super(message, 'TIMEOUT_ERROR', 408);
    this.timeoutMs = timeoutMs;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs,
    };
  }
}

/**
 * Not found error
 */
export class NotFoundError extends AppError {
  constructor(message, resource = null) {
    super(message, 'NOT_FOUND', 404);
    this.resource = resource;
  }
}

/**
 * Permission error
 */
export class PermissionError extends AppError {
  constructor(message, permission = null) {
    super(message, 'PERMISSION_DENIED', 403);
    this.permission = permission;
  }
}

export default {
  AppError,
  ValidationError,
  ToolExecutionError,
  TimeoutError,
  NotFoundError,
  PermissionError,
};
