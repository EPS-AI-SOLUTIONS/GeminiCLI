/**
 * EncodingUtils - File encoding detection and conversion utilities
 *
 * Supports:
 * - UTF-8, UTF-16LE, UTF-16BE (with BOM detection)
 * - Windows-1250 (Central European: Polish, Czech, Hungarian)
 * - Windows-1252 (Western European)
 * - ISO-8859-1 (Latin-1)
 * - ISO-8859-2 (Latin-2, Central European)
 * - ASCII
 */

// ============================================================
// Types
// ============================================================

/**
 * Supported file encodings
 */
export type SupportedEncoding =
  | 'utf-8'
  | 'utf-16le'
  | 'utf-16be'
  | 'windows-1250'
  | 'windows-1252'
  | 'iso-8859-1'
  | 'iso-8859-2'
  | 'ascii'
  | 'latin1';

/**
 * Encoding detection result
 */
export interface EncodingInfo {
  encoding: SupportedEncoding;
  confidence: number; // 0-1, where 1 is certain
  hasBOM: boolean;
  bomBytes?: number[];
}

/**
 * Read options with encoding support
 */
export interface ReadFileWithEncodingOptions {
  /** Specific encoding to use (overrides auto-detection) */
  encoding?: BufferEncoding | SupportedEncoding;
  /** Auto-detect encoding (default: false) */
  autoDetect?: boolean;
  /** Strip BOM from content (default: true) */
  stripBOM?: boolean;
}

/**
 * Write options with encoding support
 */
export interface WriteFileWithEncodingOptions {
  /** Encoding for the output file */
  encoding?: BufferEncoding | SupportedEncoding;
  /** File mode (permissions) */
  mode?: number;
  /** Create parent directories if needed (default: true) */
  createDirs?: boolean;
  /** Write BOM at the beginning of the file */
  writeBOM?: boolean;
}

// ============================================================
// BOM Signatures
// ============================================================

/**
 * BOM (Byte Order Mark) signatures for UTF encodings
 */
export const BOM_SIGNATURES: Record<string, { bytes: number[]; encoding: SupportedEncoding }> = {
  'utf-8': { bytes: [0xEF, 0xBB, 0xBF], encoding: 'utf-8' },
  'utf-16le': { bytes: [0xFF, 0xFE], encoding: 'utf-16le' },
  'utf-16be': { bytes: [0xFE, 0xFF], encoding: 'utf-16be' },
};

// ============================================================
// Encoding Conversion Maps
// ============================================================

/**
 * Windows-1250 (Central European) to Unicode mapping
 * Used for Polish, Czech, Hungarian, Slovak, Romanian, etc.
 */
const WINDOWS_1250_TO_UNICODE: Record<number, number> = {
  0x80: 0x20AC, // Euro sign
  0x82: 0x201A, // Single low-9 quotation mark
  0x84: 0x201E, // Double low-9 quotation mark
  0x85: 0x2026, // Horizontal ellipsis
  0x86: 0x2020, // Dagger
  0x87: 0x2021, // Double dagger
  0x89: 0x2030, // Per mille sign
  0x8A: 0x0160, // S with caron (S)
  0x8B: 0x2039, // Single left-pointing angle quotation mark
  0x8C: 0x015A, // S with acute (S)
  0x8D: 0x0164, // T with caron
  0x8E: 0x017D, // Z with caron (Z)
  0x8F: 0x0179, // Z with acute (Z)
  0x91: 0x2018, // Left single quotation mark
  0x92: 0x2019, // Right single quotation mark
  0x93: 0x201C, // Left double quotation mark
  0x94: 0x201D, // Right double quotation mark
  0x95: 0x2022, // Bullet
  0x96: 0x2013, // En dash
  0x97: 0x2014, // Em dash
  0x99: 0x2122, // Trade mark sign
  0x9A: 0x0161, // s with caron
  0x9B: 0x203A, // Single right-pointing angle quotation mark
  0x9C: 0x015B, // s with acute
  0x9D: 0x0165, // t with caron
  0x9E: 0x017E, // z with caron
  0x9F: 0x017A, // z with acute
  0xA1: 0x02C7, // Caron
  0xA2: 0x02D8, // Breve
  0xA3: 0x0141, // L with stroke (L)
  0xA5: 0x0104, // A with ogonek (A)
  0xAA: 0x015E, // S with cedilla
  0xAF: 0x017B, // Z with dot above (Z)
  0xB2: 0x02DB, // Ogonek
  0xB3: 0x0142, // l with stroke (l)
  0xB9: 0x0105, // a with ogonek (a)
  0xBA: 0x015F, // s with cedilla
  0xBC: 0x013D, // L with caron
  0xBD: 0x02DD, // Double acute accent
  0xBE: 0x013E, // l with caron
  0xBF: 0x017C, // z with dot above (z)
  0xC0: 0x0154, // R with acute
  0xC3: 0x0102, // A with breve
  0xC5: 0x0139, // L with acute
  0xC6: 0x0106, // C with acute (C)
  0xC8: 0x010C, // C with caron
  0xCA: 0x0118, // E with ogonek (E)
  0xCC: 0x011A, // E with caron
  0xCF: 0x010E, // D with caron
  0xD0: 0x0110, // D with stroke
  0xD1: 0x0143, // N with acute (N)
  0xD2: 0x0147, // N with caron
  0xD5: 0x0150, // O with double acute (O)
  0xD8: 0x0158, // R with caron
  0xD9: 0x016E, // U with ring above
  0xDB: 0x0170, // U with double acute
  0xDE: 0x0162, // T with cedilla
  0xE0: 0x0155, // r with acute
  0xE3: 0x0103, // a with breve
  0xE5: 0x013A, // l with acute
  0xE6: 0x0107, // c with acute (c)
  0xE8: 0x010D, // c with caron
  0xEA: 0x0119, // e with ogonek (e)
  0xEC: 0x011B, // e with caron
  0xEF: 0x010F, // d with caron
  0xF0: 0x0111, // d with stroke
  0xF1: 0x0144, // n with acute (n)
  0xF2: 0x0148, // n with caron
  0xF5: 0x0151, // o with double acute (o)
  0xF8: 0x0159, // r with caron
  0xF9: 0x016F, // u with ring above
  0xFB: 0x0171, // u with double acute
  0xFE: 0x0163, // t with cedilla
  0xFF: 0x02D9, // Dot above
};

/**
 * ISO-8859-2 (Latin-2) to Unicode mapping
 * Central/Eastern European languages
 */
const ISO_8859_2_TO_UNICODE: Record<number, number> = {
  0xA1: 0x0104, // A with ogonek
  0xA2: 0x02D8, // Breve
  0xA3: 0x0141, // L with stroke
  0xA5: 0x013D, // L with caron
  0xA6: 0x015A, // S with acute
  0xA9: 0x0160, // S with caron
  0xAA: 0x015E, // S with cedilla
  0xAB: 0x0164, // T with caron
  0xAC: 0x0179, // Z with acute
  0xAE: 0x017D, // Z with caron
  0xAF: 0x017B, // Z with dot above
  0xB1: 0x0105, // a with ogonek
  0xB2: 0x02DB, // Ogonek
  0xB3: 0x0142, // l with stroke
  0xB5: 0x013E, // l with caron
  0xB6: 0x015B, // s with acute
  0xB7: 0x02C7, // Caron
  0xB9: 0x0161, // s with caron
  0xBA: 0x015F, // s with cedilla
  0xBB: 0x0165, // t with caron
  0xBC: 0x017A, // z with acute
  0xBD: 0x02DD, // Double acute accent
  0xBE: 0x017E, // z with caron
  0xBF: 0x017C, // z with dot above
  0xC0: 0x0154, // R with acute
  0xC3: 0x0102, // A with breve
  0xC5: 0x0139, // L with acute
  0xC6: 0x0106, // C with acute
  0xC8: 0x010C, // C with caron
  0xCA: 0x0118, // E with ogonek
  0xCC: 0x011A, // E with caron
  0xCF: 0x010E, // D with caron
  0xD0: 0x0110, // D with stroke
  0xD1: 0x0143, // N with acute
  0xD2: 0x0147, // N with caron
  0xD5: 0x0150, // O with double acute
  0xD8: 0x0158, // R with caron
  0xD9: 0x016E, // U with ring above
  0xDB: 0x0170, // U with double acute
  0xDE: 0x0162, // T with cedilla
  0xE0: 0x0155, // r with acute
  0xE3: 0x0103, // a with breve
  0xE5: 0x013A, // l with acute
  0xE6: 0x0107, // c with acute
  0xE8: 0x010D, // c with caron
  0xEA: 0x0119, // e with ogonek
  0xEC: 0x011B, // e with caron
  0xEF: 0x010F, // d with caron
  0xF0: 0x0111, // d with stroke
  0xF1: 0x0144, // n with acute
  0xF2: 0x0148, // n with caron
  0xF5: 0x0151, // o with double acute
  0xF8: 0x0159, // r with caron
  0xF9: 0x016F, // u with ring above
  0xFB: 0x0171, // u with double acute
  0xFE: 0x0163, // t with cedilla
  0xFF: 0x02D9, // Dot above
};

/**
 * Windows-1252 (Western European) to Unicode mapping
 * Extends ISO-8859-1 with additional characters in 0x80-0x9F range
 */
const WINDOWS_1252_TO_UNICODE: Record<number, number> = {
  0x80: 0x20AC, // Euro sign
  0x82: 0x201A, // Single low-9 quotation mark
  0x83: 0x0192, // Latin small letter f with hook
  0x84: 0x201E, // Double low-9 quotation mark
  0x85: 0x2026, // Horizontal ellipsis
  0x86: 0x2020, // Dagger
  0x87: 0x2021, // Double dagger
  0x88: 0x02C6, // Modifier letter circumflex accent
  0x89: 0x2030, // Per mille sign
  0x8A: 0x0160, // S with caron
  0x8B: 0x2039, // Single left-pointing angle quotation mark
  0x8C: 0x0152, // Latin capital ligature OE
  0x8E: 0x017D, // Z with caron
  0x91: 0x2018, // Left single quotation mark
  0x92: 0x2019, // Right single quotation mark
  0x93: 0x201C, // Left double quotation mark
  0x94: 0x201D, // Right double quotation mark
  0x95: 0x2022, // Bullet
  0x96: 0x2013, // En dash
  0x97: 0x2014, // Em dash
  0x98: 0x02DC, // Small tilde
  0x99: 0x2122, // Trade mark sign
  0x9A: 0x0161, // s with caron
  0x9B: 0x203A, // Single right-pointing angle quotation mark
  0x9C: 0x0153, // Latin small ligature oe
  0x9E: 0x017E, // z with caron
  0x9F: 0x0178, // Y with diaeresis
};

// Build reverse maps for encoding TO single-byte
const UNICODE_TO_WINDOWS_1250 = Object.fromEntries(
  Object.entries(WINDOWS_1250_TO_UNICODE).map(([k, v]) => [v, parseInt(k)])
);
const UNICODE_TO_ISO_8859_2 = Object.fromEntries(
  Object.entries(ISO_8859_2_TO_UNICODE).map(([k, v]) => [v, parseInt(k)])
);
const UNICODE_TO_WINDOWS_1252 = Object.fromEntries(
  Object.entries(WINDOWS_1252_TO_UNICODE).map(([k, v]) => [v, parseInt(k)])
);

// ============================================================
// BOM Detection
// ============================================================

/**
 * Detect BOM in buffer and return encoding info
 */
export function detectBOM(buffer: Buffer): { encoding: SupportedEncoding; bomLength: number } | null {
  for (const [, signature] of Object.entries(BOM_SIGNATURES)) {
    if (buffer.length >= signature.bytes.length) {
      let match = true;
      for (let i = 0; i < signature.bytes.length; i++) {
        if (buffer[i] !== signature.bytes[i]) {
          match = false;
          break;
        }
      }
      if (match) {
        return { encoding: signature.encoding, bomLength: signature.bytes.length };
      }
    }
  }
  return null;
}

/**
 * Get BOM bytes for encoding
 */
export function getBOMBytes(encoding: SupportedEncoding): Buffer | null {
  const signature = BOM_SIGNATURES[encoding];
  return signature ? Buffer.from(signature.bytes) : null;
}

// ============================================================
// Single-byte Encoding Functions
// ============================================================

/**
 * Decode buffer from single-byte encoding to string
 */
function decodeSingleByte(buffer: Buffer, conversionMap: Record<number, number>): string {
  const chars: string[] = [];
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    if (byte < 0x80) {
      chars.push(String.fromCharCode(byte));
    } else {
      const unicode = conversionMap[byte];
      if (unicode !== undefined) {
        chars.push(String.fromCharCode(unicode));
      } else if (byte >= 0xA0 && byte <= 0xFF) {
        // ISO-8859-1 compatible range
        chars.push(String.fromCharCode(byte));
      } else {
        // Replacement character for unmapped bytes
        chars.push('\uFFFD');
      }
    }
  }
  return chars.join('');
}

/**
 * Encode string to single-byte encoding buffer
 */
function encodeSingleByte(str: string, reverseMap: Record<number, number>): Buffer {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const codePoint = str.charCodeAt(i);
    if (codePoint < 0x80) {
      bytes.push(codePoint);
    } else {
      const byte = reverseMap[codePoint];
      if (byte !== undefined) {
        bytes.push(byte);
      } else if (codePoint >= 0xA0 && codePoint <= 0xFF) {
        // ISO-8859-1 compatible range
        bytes.push(codePoint);
      } else {
        // Replacement character '?'
        bytes.push(0x3F);
      }
    }
  }
  return Buffer.from(bytes);
}

// ============================================================
// Encoding Detection
// ============================================================

/**
 * Detect encoding from buffer using heuristics
 *
 * Detection order:
 * 1. BOM detection (100% confidence)
 * 2. UTF-16 detection (null byte patterns)
 * 3. ASCII detection (no high bytes)
 * 4. UTF-8 validation
 * 5. Single-byte encoding heuristics
 */
export function detectEncoding(buffer: Buffer): EncodingInfo {
  // Default result
  let result: EncodingInfo = {
    encoding: 'utf-8',
    confidence: 0.5,
    hasBOM: false
  };

  // Check for BOM first (100% confidence)
  const bomResult = detectBOM(buffer);
  if (bomResult) {
    return {
      encoding: bomResult.encoding,
      confidence: 1.0,
      hasBOM: true,
      bomBytes: BOM_SIGNATURES[bomResult.encoding]?.bytes
    };
  }

  // Count byte patterns for heuristic detection
  let hasHighBytes = false;
  let invalidUtf8Sequences = 0;
  let validUtf8Sequences = 0;
  let centralEuropeanChars = 0;
  let westernEuropeanChars = 0;
  let nullBytes = 0;
  let oddNullBytes = 0;
  let evenNullBytes = 0;

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];

    // Count null bytes for UTF-16 detection
    if (byte === 0) {
      nullBytes++;
      if (i % 2 === 0) evenNullBytes++;
      else oddNullBytes++;
    }

    if (byte >= 0x80) {
      hasHighBytes = true;

      // Check UTF-8 validity
      if ((byte & 0xE0) === 0xC0 && i + 1 < buffer.length) {
        // 2-byte UTF-8 sequence
        if ((buffer[i + 1] & 0xC0) === 0x80) {
          validUtf8Sequences++;
          i++;
        } else {
          invalidUtf8Sequences++;
        }
      } else if ((byte & 0xF0) === 0xE0 && i + 2 < buffer.length) {
        // 3-byte UTF-8 sequence
        if ((buffer[i + 1] & 0xC0) === 0x80 && (buffer[i + 2] & 0xC0) === 0x80) {
          validUtf8Sequences++;
          i += 2;
        } else {
          invalidUtf8Sequences++;
        }
      } else if ((byte & 0xF8) === 0xF0 && i + 3 < buffer.length) {
        // 4-byte UTF-8 sequence
        if ((buffer[i + 1] & 0xC0) === 0x80 && (buffer[i + 2] & 0xC0) === 0x80 && (buffer[i + 3] & 0xC0) === 0x80) {
          validUtf8Sequences++;
          i += 3;
        } else {
          invalidUtf8Sequences++;
        }
      } else if ((byte & 0xC0) !== 0x80) {
        // Not a valid UTF-8 continuation byte
        invalidUtf8Sequences++;

        // Check for Central European characters (Windows-1250/ISO-8859-2)
        if (WINDOWS_1250_TO_UNICODE[byte] || ISO_8859_2_TO_UNICODE[byte]) {
          centralEuropeanChars++;
        }
        // Check for Western European characters (Windows-1252)
        if (WINDOWS_1252_TO_UNICODE[byte]) {
          westernEuropeanChars++;
        }
      }
    }
  }

  // UTF-16 detection based on null byte patterns
  if (nullBytes > buffer.length * 0.1) {
    if (evenNullBytes > oddNullBytes * 2) {
      return { encoding: 'utf-16be', confidence: 0.8, hasBOM: false };
    } else if (oddNullBytes > evenNullBytes * 2) {
      return { encoding: 'utf-16le', confidence: 0.8, hasBOM: false };
    }
  }

  // Pure ASCII detection
  if (!hasHighBytes) {
    return { encoding: 'ascii', confidence: 1.0, hasBOM: false };
  }

  // UTF-8 vs single-byte encoding
  if (validUtf8Sequences > 0 && invalidUtf8Sequences === 0) {
    return { encoding: 'utf-8', confidence: 0.9, hasBOM: false };
  }

  // More invalid than valid UTF-8 sequences suggests single-byte encoding
  if (invalidUtf8Sequences > validUtf8Sequences) {
    if (centralEuropeanChars > westernEuropeanChars) {
      return { encoding: 'windows-1250', confidence: 0.7, hasBOM: false };
    } else if (westernEuropeanChars > 0) {
      return { encoding: 'windows-1252', confidence: 0.7, hasBOM: false };
    }
    return { encoding: 'iso-8859-1', confidence: 0.5, hasBOM: false };
  }

  return result;
}

// ============================================================
// Buffer Decoding
// ============================================================

/**
 * Decode buffer to string using specified encoding
 *
 * @param buffer - Buffer to decode
 * @param encoding - Target encoding
 * @param stripBOM - Whether to strip BOM from content (default: true)
 * @returns Decoded string
 */
export function decodeBuffer(buffer: Buffer, encoding: SupportedEncoding, stripBOM: boolean = true): string {
  let content: string;
  let offset = 0;

  // Check for BOM and get offset
  if (stripBOM) {
    const bomResult = detectBOM(buffer);
    if (bomResult) {
      offset = bomResult.bomLength;
    }
  }

  const dataBuffer = offset > 0 ? buffer.slice(offset) : buffer;

  switch (encoding) {
    case 'utf-8':
      content = dataBuffer.toString('utf-8');
      break;

    case 'utf-16le':
      content = dataBuffer.toString('utf16le');
      break;

    case 'utf-16be':
      // Node.js doesn't have native utf-16be, swap bytes
      const swapped = Buffer.alloc(dataBuffer.length);
      for (let i = 0; i < dataBuffer.length - 1; i += 2) {
        swapped[i] = dataBuffer[i + 1];
        swapped[i + 1] = dataBuffer[i];
      }
      content = swapped.toString('utf16le');
      break;

    case 'windows-1250':
      content = decodeSingleByte(dataBuffer, WINDOWS_1250_TO_UNICODE);
      break;

    case 'windows-1252':
      content = decodeSingleByte(dataBuffer, WINDOWS_1252_TO_UNICODE);
      break;

    case 'iso-8859-2':
      content = decodeSingleByte(dataBuffer, ISO_8859_2_TO_UNICODE);
      break;

    case 'iso-8859-1':
    case 'latin1':
      content = dataBuffer.toString('latin1');
      break;

    case 'ascii':
      content = dataBuffer.toString('ascii');
      break;

    default:
      content = dataBuffer.toString('utf-8');
  }

  return content;
}

// ============================================================
// Buffer Encoding
// ============================================================

/**
 * Encode string to buffer using specified encoding
 *
 * @param str - String to encode
 * @param encoding - Target encoding
 * @param writeBOM - Whether to write BOM at the beginning (default: false)
 * @returns Encoded buffer
 */
export function encodeBuffer(str: string, encoding: SupportedEncoding, writeBOM: boolean = false): Buffer {
  let dataBuffer: Buffer;

  switch (encoding) {
    case 'utf-8':
      dataBuffer = Buffer.from(str, 'utf-8');
      break;

    case 'utf-16le':
      dataBuffer = Buffer.from(str, 'utf16le');
      break;

    case 'utf-16be':
      // Convert to UTF-16LE then swap bytes
      const utf16le = Buffer.from(str, 'utf16le');
      dataBuffer = Buffer.alloc(utf16le.length);
      for (let i = 0; i < utf16le.length - 1; i += 2) {
        dataBuffer[i] = utf16le[i + 1];
        dataBuffer[i + 1] = utf16le[i];
      }
      break;

    case 'windows-1250':
      dataBuffer = encodeSingleByte(str, UNICODE_TO_WINDOWS_1250);
      break;

    case 'windows-1252':
      dataBuffer = encodeSingleByte(str, UNICODE_TO_WINDOWS_1252);
      break;

    case 'iso-8859-2':
      dataBuffer = encodeSingleByte(str, UNICODE_TO_ISO_8859_2);
      break;

    case 'iso-8859-1':
    case 'latin1':
      dataBuffer = Buffer.from(str, 'latin1');
      break;

    case 'ascii':
      dataBuffer = Buffer.from(str, 'ascii');
      break;

    default:
      dataBuffer = Buffer.from(str, 'utf-8');
  }

  // Add BOM if requested
  if (writeBOM) {
    const bomBytes = getBOMBytes(encoding);
    if (bomBytes) {
      dataBuffer = Buffer.concat([bomBytes, dataBuffer]);
    }
  }

  return dataBuffer;
}

// ============================================================
// Encoding Conversion
// ============================================================

/**
 * Convert string from one encoding to another
 *
 * @param content - String content to convert
 * @param fromEncoding - Source encoding
 * @param toEncoding - Target encoding
 * @param writeBOM - Whether to include BOM in output
 * @returns Converted buffer
 */
export function convertEncoding(
  content: string,
  fromEncoding: SupportedEncoding,
  toEncoding: SupportedEncoding,
  writeBOM: boolean = false
): Buffer {
  // Content is already a string (decoded), just encode to target
  return encodeBuffer(content, toEncoding, writeBOM);
}

/**
 * Convert buffer from one encoding to another
 *
 * @param buffer - Buffer to convert
 * @param fromEncoding - Source encoding
 * @param toEncoding - Target encoding
 * @param writeBOM - Whether to include BOM in output
 * @returns Converted buffer
 */
export function convertBufferEncoding(
  buffer: Buffer,
  fromEncoding: SupportedEncoding,
  toEncoding: SupportedEncoding,
  writeBOM: boolean = false
): Buffer {
  // Decode from source encoding
  const content = decodeBuffer(buffer, fromEncoding, true);
  // Encode to target encoding
  return encodeBuffer(content, toEncoding, writeBOM);
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if encoding is a valid SupportedEncoding
 */
export function isSupportedEncoding(encoding: string): encoding is SupportedEncoding {
  const supported: SupportedEncoding[] = [
    'utf-8', 'utf-16le', 'utf-16be',
    'windows-1250', 'windows-1252',
    'iso-8859-1', 'iso-8859-2',
    'ascii', 'latin1'
  ];
  return supported.includes(encoding as SupportedEncoding);
}

/**
 * Normalize encoding name to SupportedEncoding
 * Handles common aliases and variations
 */
export function normalizeEncoding(encoding: string): SupportedEncoding {
  const normalized = encoding.toLowerCase().replace(/[_-\s]/g, '');

  const aliases: Record<string, SupportedEncoding> = {
    'utf8': 'utf-8',
    'utf16le': 'utf-16le',
    'utf16': 'utf-16le',
    'utf16be': 'utf-16be',
    'windows1250': 'windows-1250',
    'cp1250': 'windows-1250',
    'win1250': 'windows-1250',
    'windows1252': 'windows-1252',
    'cp1252': 'windows-1252',
    'win1252': 'windows-1252',
    'iso88591': 'iso-8859-1',
    'latin1': 'latin1',
    'iso88592': 'iso-8859-2',
    'latin2': 'iso-8859-2',
    'ascii': 'ascii',
    'usascii': 'ascii',
  };

  return aliases[normalized] || 'utf-8';
}

/**
 * Get human-readable encoding name
 */
export function getEncodingDisplayName(encoding: SupportedEncoding): string {
  const names: Record<SupportedEncoding, string> = {
    'utf-8': 'UTF-8',
    'utf-16le': 'UTF-16 Little Endian',
    'utf-16be': 'UTF-16 Big Endian',
    'windows-1250': 'Windows-1250 (Central European)',
    'windows-1252': 'Windows-1252 (Western European)',
    'iso-8859-1': 'ISO-8859-1 (Latin-1)',
    'iso-8859-2': 'ISO-8859-2 (Latin-2)',
    'ascii': 'ASCII',
    'latin1': 'Latin-1',
  };
  return names[encoding] || encoding;
}
