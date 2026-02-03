/**
 * OutputFormatValidator - Validates agent outputs conform to expected formats
 * Solution #47: Output Format Validator
 *
 * Validates and auto-corrects agent outputs for JSON, Markdown, Code, List, and Freeform formats.
 */

import chalk from 'chalk';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported output format types
 */
export type FormatType = 'json' | 'markdown' | 'code' | 'list' | 'freeform';

/**
 * Format specification for validation
 */
export interface FormatSpec {
  type: FormatType;
  schema?: JsonSchema;                    // JSON schema for 'json' type
  requiredSections?: string[];            // Required headers for 'markdown'
  codeLanguage?: string;                  // Expected language for 'code'
  listStyle?: 'bullet' | 'numbered' | 'both';  // List style for 'list'
  minItems?: number;                      // Minimum items for 'list'
  maxLength?: number;                     // Maximum output length
  allowEmpty?: boolean;                   // Allow empty output
  customValidator?: (output: string) => FormatError[];  // Custom validation
}

/**
 * JSON Schema subset for validation
 */
export interface JsonSchema {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  additionalProperties?: boolean | JsonSchema;
}

/**
 * Format validation error
 */
export interface FormatError {
  type: 'parse' | 'schema' | 'structure' | 'missing' | 'invalid' | 'length' | 'custom';
  message: string;
  position?: number;
  line?: number;
  column?: number;
  expected?: string;
  actual?: string;
  path?: string;                          // JSON path or section name
}

/**
 * Format validation result
 */
export interface FormatValidation {
  valid: boolean;
  errors: FormatError[];
  suggestions: string[];
  correctedOutput?: string;
  metadata?: {
    format: FormatType;
    detectedFormat?: FormatType;
    parseTime?: number;
    corrections?: string[];
  };
}

// ============================================================================
// OutputFormatValidator Class
// ============================================================================

/**
 * Validates and corrects agent output formats
 */
export class OutputFormatValidator {
  private debug: boolean;

  constructor(options: { debug?: boolean } = {}) {
    this.debug = options.debug ?? false;
  }

  /**
   * Validate output against expected format specification
   */
  validateFormat(output: string, expectedFormat: FormatSpec): FormatValidation {
    const startTime = Date.now();
    const errors: FormatError[] = [];
    const suggestions: string[] = [];
    let correctedOutput: string | undefined;

    // Check for empty output
    if (!output || output.trim().length === 0) {
      if (!expectedFormat.allowEmpty) {
        errors.push({
          type: 'invalid',
          message: 'Output is empty',
          expected: 'Non-empty output',
          actual: 'Empty string'
        });
        suggestions.push('Provide meaningful content in the output');
      }
      return {
        valid: expectedFormat.allowEmpty ?? false,
        errors,
        suggestions,
        metadata: { format: expectedFormat.type, parseTime: Date.now() - startTime }
      };
    }

    // Check max length
    if (expectedFormat.maxLength && output.length > expectedFormat.maxLength) {
      errors.push({
        type: 'length',
        message: `Output exceeds maximum length of ${expectedFormat.maxLength}`,
        expected: `<= ${expectedFormat.maxLength} characters`,
        actual: `${output.length} characters`
      });
      suggestions.push(`Truncate or summarize output to fit within ${expectedFormat.maxLength} characters`);
    }

    // Validate based on format type
    switch (expectedFormat.type) {
      case 'json':
        this.validateJson(output, expectedFormat, errors, suggestions);
        break;
      case 'markdown':
        this.validateMarkdown(output, expectedFormat, errors, suggestions);
        break;
      case 'code':
        this.validateCode(output, expectedFormat, errors, suggestions);
        break;
      case 'list':
        this.validateList(output, expectedFormat, errors, suggestions);
        break;
      case 'freeform':
        // Freeform accepts anything, but we can still run custom validators
        break;
    }

    // Run custom validator if provided
    if (expectedFormat.customValidator) {
      const customErrors = expectedFormat.customValidator(output);
      errors.push(...customErrors);
    }

    // Attempt auto-correction if there are errors
    if (errors.length > 0) {
      correctedOutput = this.autoCorrect(output, expectedFormat);
    }

    const valid = errors.length === 0;

    if (this.debug) {
      console.log(chalk.gray(`[OutputFormatValidator] Validated ${expectedFormat.type}: ${valid ? chalk.green('VALID') : chalk.red('INVALID')}`));
      if (errors.length > 0) {
        errors.forEach(e => console.log(chalk.yellow(`  - ${e.type}: ${e.message}`)));
      }
    }

    return {
      valid,
      errors,
      suggestions,
      correctedOutput,
      metadata: {
        format: expectedFormat.type,
        detectedFormat: this.detectFormat(output),
        parseTime: Date.now() - startTime,
        corrections: correctedOutput ? this.getCorrections(output, correctedOutput) : undefined
      }
    };
  }

  // ============================================================================
  // JSON Validation
  // ============================================================================

  private validateJson(
    output: string,
    spec: FormatSpec,
    errors: FormatError[],
    suggestions: string[]
  ): void {
    // Try to extract JSON from output (might be wrapped in markdown code blocks)
    const jsonContent = this.extractJson(output);

    if (!jsonContent) {
      errors.push({
        type: 'parse',
        message: 'No valid JSON found in output',
        expected: 'Valid JSON object or array',
        actual: output.substring(0, 100) + (output.length > 100 ? '...' : '')
      });
      suggestions.push('Ensure output is valid JSON format');
      suggestions.push('Remove any text before or after the JSON');
      return;
    }

    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(jsonContent);
    } catch (e) {
      const parseError = e as SyntaxError;
      const position = this.findJsonErrorPosition(jsonContent, parseError.message);
      errors.push({
        type: 'parse',
        message: `JSON parse error: ${parseError.message}`,
        position: position.offset,
        line: position.line,
        column: position.column,
        expected: 'Valid JSON syntax',
        actual: this.getContextAround(jsonContent, position.offset)
      });
      suggestions.push('Check for missing quotes, commas, or brackets');
      suggestions.push('Ensure all strings are properly escaped');
      return;
    }

    // Validate against schema if provided
    if (spec.schema) {
      this.validateJsonSchema(parsed, spec.schema, '', errors, suggestions);
    }
  }

  private extractJson(output: string): string | null {
    // Try direct parse first
    const trimmed = output.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return trimmed;
    }

    // Try to extract from markdown code block
    const codeBlockMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }

    // Try to find JSON object/array in text
    const jsonMatch = output.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      return jsonMatch[1];
    }

    return null;
  }

  private validateJsonSchema(
    value: any,
    schema: JsonSchema,
    path: string,
    errors: FormatError[],
    suggestions: string[]
  ): void {
    // Type validation
    if (schema.type) {
      const actualType = this.getJsonType(value);
      if (actualType !== schema.type) {
        errors.push({
          type: 'schema',
          message: `Type mismatch at ${path || 'root'}`,
          path,
          expected: schema.type,
          actual: actualType
        });
        return;
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        type: 'schema',
        message: `Value not in enum at ${path || 'root'}`,
        path,
        expected: schema.enum.join(' | '),
        actual: String(value)
      });
    }

    // Object validation
    if (schema.type === 'object' && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Required properties
      if (schema.required) {
        for (const req of schema.required) {
          if (!(req in value)) {
            errors.push({
              type: 'missing',
              message: `Missing required property: ${req}`,
              path: path ? `${path}.${req}` : req,
              expected: `Property "${req}"`,
              actual: 'undefined'
            });
            suggestions.push(`Add required property "${req}" to the JSON object`);
          }
        }
      }

      // Property validation
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in value) {
            this.validateJsonSchema(value[key], propSchema, path ? `${path}.${key}` : key, errors, suggestions);
          }
        }
      }

      // Additional properties
      if (schema.additionalProperties === false) {
        const allowed = new Set(Object.keys(schema.properties || {}));
        for (const key of Object.keys(value)) {
          if (!allowed.has(key)) {
            errors.push({
              type: 'schema',
              message: `Unexpected property: ${key}`,
              path: path ? `${path}.${key}` : key,
              expected: 'No additional properties',
              actual: key
            });
          }
        }
      }
    }

    // Array validation
    if (schema.type === 'array' && Array.isArray(value)) {
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        errors.push({
          type: 'schema',
          message: `Array too short at ${path || 'root'}`,
          path,
          expected: `>= ${schema.minItems} items`,
          actual: `${value.length} items`
        });
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        errors.push({
          type: 'schema',
          message: `Array too long at ${path || 'root'}`,
          path,
          expected: `<= ${schema.maxItems} items`,
          actual: `${value.length} items`
        });
      }
      if (schema.items) {
        value.forEach((item, idx) => {
          this.validateJsonSchema(item, schema.items!, `${path}[${idx}]`, errors, suggestions);
        });
      }
    }

    // String validation
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        errors.push({
          type: 'schema',
          message: `String too short at ${path || 'root'}`,
          path,
          expected: `>= ${schema.minLength} characters`,
          actual: `${value.length} characters`
        });
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        errors.push({
          type: 'schema',
          message: `String too long at ${path || 'root'}`,
          path,
          expected: `<= ${schema.maxLength} characters`,
          actual: `${value.length} characters`
        });
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        errors.push({
          type: 'schema',
          message: `String doesn't match pattern at ${path || 'root'}`,
          path,
          expected: schema.pattern,
          actual: value
        });
      }
    }

    // Number validation
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        errors.push({
          type: 'schema',
          message: `Number too small at ${path || 'root'}`,
          path,
          expected: `>= ${schema.minimum}`,
          actual: String(value)
        });
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        errors.push({
          type: 'schema',
          message: `Number too large at ${path || 'root'}`,
          path,
          expected: `<= ${schema.maximum}`,
          actual: String(value)
        });
      }
    }
  }

  private getJsonType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  private findJsonErrorPosition(json: string, errorMessage: string): { offset: number; line: number; column: number } {
    // Try to extract position from error message
    const posMatch = errorMessage.match(/position\s+(\d+)/i);
    if (posMatch) {
      const offset = parseInt(posMatch[1], 10);
      return this.offsetToLineColumn(json, offset);
    }

    const lineMatch = errorMessage.match(/line\s+(\d+)/i);
    const colMatch = errorMessage.match(/column\s+(\d+)/i);
    if (lineMatch) {
      const line = parseInt(lineMatch[1], 10);
      const column = colMatch ? parseInt(colMatch[1], 10) : 1;
      return { offset: this.lineColumnToOffset(json, line, column), line, column };
    }

    return { offset: 0, line: 1, column: 1 };
  }

  private offsetToLineColumn(text: string, offset: number): { offset: number; line: number; column: number } {
    let line = 1;
    let column = 1;
    for (let i = 0; i < offset && i < text.length; i++) {
      if (text[i] === '\n') {
        line++;
        column = 1;
      } else {
        column++;
      }
    }
    return { offset, line, column };
  }

  private lineColumnToOffset(text: string, line: number, column: number): number {
    let currentLine = 1;
    let offset = 0;
    for (let i = 0; i < text.length; i++) {
      if (currentLine === line) {
        return offset + column - 1;
      }
      if (text[i] === '\n') {
        currentLine++;
      }
      offset++;
    }
    return offset;
  }

  private getContextAround(text: string, position: number, radius: number = 20): string {
    const start = Math.max(0, position - radius);
    const end = Math.min(text.length, position + radius);
    let context = text.substring(start, end);
    if (start > 0) context = '...' + context;
    if (end < text.length) context = context + '...';
    return context;
  }

  // ============================================================================
  // Markdown Validation
  // ============================================================================

  private validateMarkdown(
    output: string,
    spec: FormatSpec,
    errors: FormatError[],
    suggestions: string[]
  ): void {
    // Check for required sections/headers
    if (spec.requiredSections && spec.requiredSections.length > 0) {
      const headers = this.extractMarkdownHeaders(output);
      const headerTexts = new Set(headers.map(h => h.text.toLowerCase()));

      for (const required of spec.requiredSections) {
        const found = headers.some(h =>
          h.text.toLowerCase() === required.toLowerCase() ||
          h.text.toLowerCase().includes(required.toLowerCase())
        );
        if (!found) {
          errors.push({
            type: 'missing',
            message: `Missing required section: ${required}`,
            expected: `Header containing "${required}"`,
            actual: 'Not found'
          });
          suggestions.push(`Add a section with header "## ${required}"`);
        }
      }
    }

    // Check for basic markdown structure
    const hasHeaders = /^#{1,6}\s+.+$/m.test(output);
    const hasContent = output.trim().split('\n').filter(line =>
      line.trim().length > 0 && !line.trim().startsWith('#')
    ).length > 0;

    if (!hasHeaders && !hasContent) {
      errors.push({
        type: 'structure',
        message: 'Output lacks markdown structure',
        expected: 'Headers and content',
        actual: 'No structure detected'
      });
      suggestions.push('Add markdown headers (## Header) to organize content');
    }

    // Check for common markdown issues
    this.checkMarkdownIssues(output, errors, suggestions);
  }

  private extractMarkdownHeaders(markdown: string): Array<{ level: number; text: string; line: number }> {
    const headers: Array<{ level: number; text: string; line: number }> = [];
    const lines = markdown.split('\n');

    lines.forEach((line, idx) => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        headers.push({
          level: match[1].length,
          text: match[2].trim(),
          line: idx + 1
        });
      }
    });

    return headers;
  }

  private checkMarkdownIssues(markdown: string, errors: FormatError[], suggestions: string[]): void {
    const lines = markdown.split('\n');

    lines.forEach((line, idx) => {
      // Check for broken links
      const linkMatches = line.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g);
      for (const match of linkMatches) {
        if (!match[2] || match[2].trim() === '') {
          errors.push({
            type: 'invalid',
            message: `Empty link URL at line ${idx + 1}`,
            line: idx + 1,
            expected: 'Valid URL',
            actual: 'Empty URL'
          });
        }
      }

      // Check for unclosed code blocks
      if (line.trim() === '```' || line.trim().startsWith('```')) {
        // Count occurrences
        const beforeText = lines.slice(0, idx + 1).join('\n');
        const codeBlockCount = (beforeText.match(/```/g) || []).length;
        // Odd count means unclosed (will check at end)
      }
    });

    // Check for unclosed code blocks
    const codeBlockCount = (markdown.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      errors.push({
        type: 'structure',
        message: 'Unclosed code block detected',
        expected: 'Matching ``` pairs',
        actual: `${codeBlockCount} backtick sequences`
      });
      suggestions.push('Ensure all code blocks have closing ```');
    }
  }

  // ============================================================================
  // Code Validation
  // ============================================================================

  private validateCode(
    output: string,
    spec: FormatSpec,
    errors: FormatError[],
    suggestions: string[]
  ): void {
    // Check for code block presence
    const codeBlocks = this.extractCodeBlocks(output);

    if (codeBlocks.length === 0) {
      // Check if entire output looks like code
      const looksLikeCode = this.looksLikeCode(output);
      if (!looksLikeCode) {
        errors.push({
          type: 'structure',
          message: 'No code blocks found in output',
          expected: 'Code wrapped in ``` blocks',
          actual: 'Plain text'
        });
        suggestions.push('Wrap code in markdown code blocks: ```language\\ncode\\n```');
      }
    }

    // Check language if specified
    if (spec.codeLanguage && codeBlocks.length > 0) {
      const hasCorrectLanguage = codeBlocks.some(block =>
        block.language?.toLowerCase() === spec.codeLanguage?.toLowerCase()
      );
      if (!hasCorrectLanguage) {
        errors.push({
          type: 'invalid',
          message: `Expected ${spec.codeLanguage} code block`,
          expected: spec.codeLanguage,
          actual: codeBlocks.map(b => b.language || 'unspecified').join(', ')
        });
        suggestions.push(`Specify language in code block: \`\`\`${spec.codeLanguage}`);
      }
    }

    // Basic syntax checks for common languages
    codeBlocks.forEach((block, idx) => {
      const syntaxErrors = this.checkCodeSyntax(block.code, block.language);
      syntaxErrors.forEach(err => {
        errors.push({
          ...err,
          message: `Code block ${idx + 1}: ${err.message}`
        });
      });
    });
  }

  private extractCodeBlocks(text: string): Array<{ language?: string; code: string }> {
    const blocks: Array<{ language?: string; code: string }> = [];
    const regex = /```(\w*)\n?([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || undefined,
        code: match[2]
      });
    }

    return blocks;
  }

  private looksLikeCode(text: string): boolean {
    // Heuristics to detect code
    const codeIndicators = [
      /^(import|export|const|let|var|function|class|interface|type)\s/m,
      /[{}\[\]();]/,
      /=>/,
      /\bdef\s+\w+\s*\(/,
      /\bpublic\s+(static\s+)?(void|int|string)/i,
      /<\w+(\s+\w+="[^"]*")*\s*\/?>/,
      /^\s*#\s*(include|define|ifdef|ifndef)/m
    ];

    return codeIndicators.some(pattern => pattern.test(text));
  }

  private checkCodeSyntax(code: string, language?: string): FormatError[] {
    const errors: FormatError[] = [];

    // Common bracket/parenthesis matching
    const brackets = this.checkBracketMatching(code);
    if (brackets.length > 0) {
      errors.push(...brackets);
    }

    // Language-specific checks
    if (language) {
      switch (language.toLowerCase()) {
        case 'json':
          try {
            JSON.parse(code);
          } catch (e) {
            errors.push({
              type: 'parse',
              message: `Invalid JSON syntax: ${(e as Error).message}`,
              expected: 'Valid JSON',
              actual: 'Parse error'
            });
          }
          break;
        case 'javascript':
        case 'typescript':
        case 'js':
        case 'ts':
          // Check for common JS/TS issues
          if (/;\s*;/.test(code)) {
            errors.push({
              type: 'invalid',
              message: 'Double semicolon detected',
              expected: 'Single semicolon',
              actual: ';;'
            });
          }
          break;
      }
    }

    return errors;
  }

  private checkBracketMatching(code: string): FormatError[] {
    const errors: FormatError[] = [];
    const stack: Array<{ char: string; pos: number }> = [];
    const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
    const closing: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

    let inString = false;
    let stringChar = '';
    let escaped = false;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];

      // Handle escape sequences
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }

      // Handle strings
      if ((char === '"' || char === "'" || char === '`') && !inString) {
        inString = true;
        stringChar = char;
        continue;
      }
      if (char === stringChar && inString) {
        inString = false;
        stringChar = '';
        continue;
      }
      if (inString) continue;

      // Check brackets
      if (pairs[char]) {
        stack.push({ char, pos: i });
      } else if (closing[char]) {
        if (stack.length === 0) {
          errors.push({
            type: 'structure',
            message: `Unmatched closing bracket '${char}'`,
            position: i,
            expected: 'Matching opening bracket',
            actual: char
          });
        } else {
          const last = stack.pop()!;
          if (pairs[last.char] !== char) {
            errors.push({
              type: 'structure',
              message: `Mismatched brackets: '${last.char}' at position ${last.pos} closed with '${char}'`,
              position: i,
              expected: pairs[last.char],
              actual: char
            });
          }
        }
      }
    }

    // Check for unclosed brackets
    while (stack.length > 0) {
      const unclosed = stack.pop()!;
      errors.push({
        type: 'structure',
        message: `Unclosed bracket '${unclosed.char}'`,
        position: unclosed.pos,
        expected: pairs[unclosed.char],
        actual: 'End of code'
      });
    }

    return errors;
  }

  // ============================================================================
  // List Validation
  // ============================================================================

  private validateList(
    output: string,
    spec: FormatSpec,
    errors: FormatError[],
    suggestions: string[]
  ): void {
    const listItems = this.extractListItems(output);

    if (listItems.length === 0) {
      errors.push({
        type: 'structure',
        message: 'No list items found',
        expected: 'Bullet points (-) or numbered items (1.)',
        actual: 'No list structure detected'
      });
      suggestions.push('Format output as a list using - or 1. prefixes');
      return;
    }

    // Check minimum items
    if (spec.minItems && listItems.length < spec.minItems) {
      errors.push({
        type: 'invalid',
        message: `Too few list items`,
        expected: `>= ${spec.minItems} items`,
        actual: `${listItems.length} items`
      });
      suggestions.push(`Add at least ${spec.minItems - listItems.length} more items`);
    }

    // Check list style
    if (spec.listStyle) {
      const hasBullets = listItems.some(item => item.type === 'bullet');
      const hasNumbered = listItems.some(item => item.type === 'numbered');

      if (spec.listStyle === 'bullet' && hasNumbered && !hasBullets) {
        errors.push({
          type: 'structure',
          message: 'Expected bullet list, found numbered list',
          expected: 'Bullet points (-, *, +)',
          actual: 'Numbered items'
        });
        suggestions.push('Convert numbered list to bullet points');
      } else if (spec.listStyle === 'numbered' && hasBullets && !hasNumbered) {
        errors.push({
          type: 'structure',
          message: 'Expected numbered list, found bullet list',
          expected: 'Numbered items (1., 2., etc.)',
          actual: 'Bullet points'
        });
        suggestions.push('Convert bullet points to numbered list');
      }
    }

    // Check for empty items
    const emptyItems = listItems.filter(item => !item.content.trim());
    if (emptyItems.length > 0) {
      errors.push({
        type: 'invalid',
        message: `${emptyItems.length} empty list item(s) found`,
        expected: 'Non-empty content',
        actual: 'Empty items'
      });
    }
  }

  private extractListItems(text: string): Array<{ type: 'bullet' | 'numbered'; content: string; line: number }> {
    const items: Array<{ type: 'bullet' | 'numbered'; content: string; line: number }> = [];
    const lines = text.split('\n');

    lines.forEach((line, idx) => {
      // Bullet points: -, *, +
      const bulletMatch = line.match(/^\s*[-*+]\s+(.*)$/);
      if (bulletMatch) {
        items.push({ type: 'bullet', content: bulletMatch[1], line: idx + 1 });
        return;
      }

      // Numbered: 1., 2., etc.
      const numberedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (numberedMatch) {
        items.push({ type: 'numbered', content: numberedMatch[1], line: idx + 1 });
      }
    });

    return items;
  }

  // ============================================================================
  // Auto-Correction
  // ============================================================================

  /**
   * Attempt to auto-correct output to match expected format
   */
  autoCorrect(output: string, format: FormatSpec): string {
    let corrected = output;

    switch (format.type) {
      case 'json':
        corrected = this.autoCorrectJson(output, format);
        break;
      case 'markdown':
        corrected = this.autoCorrectMarkdown(output, format);
        break;
      case 'code':
        corrected = this.autoCorrectCode(output, format);
        break;
      case 'list':
        corrected = this.autoCorrectList(output, format);
        break;
    }

    // Trim to max length if needed
    if (format.maxLength && corrected.length > format.maxLength) {
      corrected = corrected.substring(0, format.maxLength - 3) + '...';
    }

    return corrected;
  }

  private autoCorrectJson(output: string, spec: FormatSpec): string {
    // Try to extract and fix JSON
    let json = this.extractJson(output);

    if (!json) {
      // Try to wrap content in JSON
      const trimmed = output.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        return JSON.stringify({ content: trimmed });
      }
      return output;
    }

    // Common JSON fixes
    json = json
      // Fix trailing commas
      .replace(/,(\s*[}\]])/g, '$1')
      // Fix single quotes to double quotes
      .replace(/'/g, '"')
      // Fix unquoted keys
      .replace(/(\{|,)\s*(\w+)\s*:/g, '$1"$2":');

    try {
      // Validate and re-stringify for proper formatting
      const parsed = JSON.parse(json);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return json;
    }
  }

  private autoCorrectMarkdown(output: string, spec: FormatSpec): string {
    let corrected = output;

    // Fix unclosed code blocks
    const codeBlockCount = (corrected.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      corrected += '\n```';
    }

    // Add missing required sections
    if (spec.requiredSections) {
      const headers = this.extractMarkdownHeaders(corrected);
      const existingHeaders = new Set(headers.map(h => h.text.toLowerCase()));

      for (const required of spec.requiredSections) {
        if (!existingHeaders.has(required.toLowerCase())) {
          corrected += `\n\n## ${required}\n\n[Content needed]`;
        }
      }
    }

    return corrected;
  }

  private autoCorrectCode(output: string, spec: FormatSpec): string {
    const codeBlocks = this.extractCodeBlocks(output);

    if (codeBlocks.length === 0 && this.looksLikeCode(output)) {
      // Wrap in code block
      const language = spec.codeLanguage || '';
      return '```' + language + '\n' + output.trim() + '\n```';
    }

    // Add language tag if missing
    if (spec.codeLanguage && codeBlocks.length > 0) {
      return output.replace(/```\n/g, '```' + spec.codeLanguage + '\n');
    }

    return output;
  }

  private autoCorrectList(output: string, spec: FormatSpec): string {
    const lines = output.split('\n');
    const correctedLines: string[] = [];
    let itemNumber = 1;

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        correctedLines.push('');
        continue;
      }

      // Check if already a list item
      if (/^[-*+]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
        if (spec.listStyle === 'numbered') {
          // Convert to numbered
          const content = trimmed.replace(/^[-*+\d.)\s]+/, '');
          correctedLines.push(`${itemNumber}. ${content}`);
          itemNumber++;
        } else if (spec.listStyle === 'bullet') {
          // Convert to bullet
          const content = trimmed.replace(/^[-*+\d.)\s]+/, '');
          correctedLines.push(`- ${content}`);
        } else {
          correctedLines.push(line);
          if (/^\d+[.)]\s+/.test(trimmed)) itemNumber++;
        }
      } else {
        // Convert to list item
        if (spec.listStyle === 'numbered') {
          correctedLines.push(`${itemNumber}. ${trimmed}`);
          itemNumber++;
        } else {
          correctedLines.push(`- ${trimmed}`);
        }
      }
    }

    return correctedLines.join('\n');
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Detect the format of output
   */
  detectFormat(output: string): FormatType {
    const trimmed = output.trim();

    // Check for JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch { /* Not valid JSON */ }
    }

    // Check for code blocks
    if (/```[\s\S]*```/.test(output)) {
      return 'code';
    }

    // Check for list
    const listItems = this.extractListItems(output);
    if (listItems.length >= 2) {
      return 'list';
    }

    // Check for markdown
    if (/^#{1,6}\s+.+$/m.test(output) || /\*\*[^*]+\*\*/.test(output) || /\[[^\]]+\]\([^)]+\)/.test(output)) {
      return 'markdown';
    }

    return 'freeform';
  }

  /**
   * Get list of corrections made
   */
  private getCorrections(original: string, corrected: string): string[] {
    const corrections: string[] = [];

    if (original.length !== corrected.length) {
      corrections.push(`Length changed from ${original.length} to ${corrected.length}`);
    }

    if (original !== corrected) {
      // Basic diff
      const originalLines = original.split('\n');
      const correctedLines = corrected.split('\n');

      if (originalLines.length !== correctedLines.length) {
        corrections.push(`Line count changed from ${originalLines.length} to ${correctedLines.length}`);
      }

      // Count changed lines
      let changedCount = 0;
      const minLines = Math.min(originalLines.length, correctedLines.length);
      for (let i = 0; i < minLines; i++) {
        if (originalLines[i] !== correctedLines[i]) {
          changedCount++;
        }
      }
      if (changedCount > 0) {
        corrections.push(`${changedCount} line(s) modified`);
      }
    }

    return corrections;
  }

  /**
   * Create a format spec for common use cases
   */
  static createSpec(type: FormatType, options?: Partial<FormatSpec>): FormatSpec {
    const baseSpec: FormatSpec = { type };

    switch (type) {
      case 'json':
        return {
          ...baseSpec,
          schema: options?.schema,
          ...options
        };
      case 'markdown':
        return {
          ...baseSpec,
          requiredSections: options?.requiredSections || [],
          ...options
        };
      case 'code':
        return {
          ...baseSpec,
          codeLanguage: options?.codeLanguage,
          ...options
        };
      case 'list':
        return {
          ...baseSpec,
          listStyle: options?.listStyle || 'both',
          minItems: options?.minItems,
          ...options
        };
      default:
        return { ...baseSpec, ...options };
    }
  }
}

// ============================================================================
// Pre-built Format Specifications
// ============================================================================

export const CommonFormats = {
  /**
   * JSON response format
   */
  json: (schema?: JsonSchema): FormatSpec => ({
    type: 'json',
    schema
  }),

  /**
   * Markdown with required sections
   */
  markdown: (requiredSections?: string[]): FormatSpec => ({
    type: 'markdown',
    requiredSections
  }),

  /**
   * Code output with language
   */
  code: (language?: string): FormatSpec => ({
    type: 'code',
    codeLanguage: language
  }),

  /**
   * Bullet list
   */
  bulletList: (minItems?: number): FormatSpec => ({
    type: 'list',
    listStyle: 'bullet',
    minItems
  }),

  /**
   * Numbered list
   */
  numberedList: (minItems?: number): FormatSpec => ({
    type: 'list',
    listStyle: 'numbered',
    minItems
  }),

  /**
   * Task list JSON schema
   */
  taskList: (): FormatSpec => ({
    type: 'json',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'task'],
        properties: {
          id: { type: 'number' },
          task: { type: 'string', minLength: 1 },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] }
        }
      }
    }
  }),

  /**
   * API response format
   */
  apiResponse: (): FormatSpec => ({
    type: 'json',
    schema: {
      type: 'object',
      required: ['success'],
      properties: {
        success: { type: 'boolean' },
        data: {},
        error: { type: 'string' },
        message: { type: 'string' }
      }
    }
  }),

  /**
   * Code review format
   */
  codeReview: (): FormatSpec => ({
    type: 'markdown',
    requiredSections: ['Summary', 'Issues', 'Suggestions']
  }),

  /**
   * Analysis report
   */
  analysisReport: (): FormatSpec => ({
    type: 'markdown',
    requiredSections: ['Overview', 'Findings', 'Recommendations']
  })
};

// ============================================================================
// Singleton Instance & Export
// ============================================================================

export const outputFormatValidator = new OutputFormatValidator();

/**
 * Convenience function for validation
 */
export function validateOutputFormat(output: string, format: FormatSpec): FormatValidation {
  return outputFormatValidator.validateFormat(output, format);
}

/**
 * Convenience function for auto-correction
 */
export function autoCorrectOutput(output: string, format: FormatSpec): string {
  return outputFormatValidator.autoCorrect(output, format);
}

export default OutputFormatValidator;
