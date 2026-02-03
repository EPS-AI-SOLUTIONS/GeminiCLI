/**
 * Quick test for encoding utilities
 */
import {
  detectEncoding,
  decodeBuffer,
  encodeBuffer,
  detectBOM,
  getBOMBytes,
  isSupportedEncoding,
  normalizeEncoding,
  getEncodingDisplayName
} from './src/native/EncodingUtils.js';

console.log('Testing EncodingUtils...\n');

// Test 1: ASCII detection
const asciiBuffer = Buffer.from('Hello World!');
const asciiResult = detectEncoding(asciiBuffer);
console.log('ASCII test:', asciiResult);

// Test 2: UTF-8 with BOM
const utf8WithBOM = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]); // BOM + "Hello"
const utf8BomResult = detectEncoding(utf8WithBOM);
console.log('\nUTF-8 BOM test:', utf8BomResult);

// Test 3: UTF-16LE with BOM
const utf16LEWithBOM = Buffer.from([0xFF, 0xFE, 0x48, 0x00, 0x65, 0x00]); // BOM + "He"
const utf16leResult = detectEncoding(utf16LEWithBOM);
console.log('\nUTF-16LE BOM test:', utf16leResult);

// Test 4: UTF-8 multibyte (Polish text)
const polishUtf8 = Buffer.from('Zażółć gęślą jaźń'); // Polish pangram
const polishResult = detectEncoding(polishUtf8);
console.log('\nPolish UTF-8 test:', polishResult);

// Test 5: Decode and encode roundtrip
const originalText = 'Hello, World! Zażółć gęślą jaźń';
const encoded = encodeBuffer(originalText, 'utf-8');
const decoded = decodeBuffer(encoded, 'utf-8');
console.log('\nRoundtrip test:');
console.log('  Original:', originalText);
console.log('  Decoded:', decoded);

// Test 6: Windows-1250 encoding
const w1250Text = 'ĄąĆćĘę';
const w1250Encoded = encodeBuffer(w1250Text, 'windows-1250');
const w1250Decoded = decodeBuffer(w1250Encoded, 'windows-1250');
console.log('\nWindows-1250 test:');
console.log('  Original:', w1250Text);
console.log('  Decoded:', w1250Decoded);

// Test 7: BOM utilities
console.log('\nBOM utilities:');
console.log('  UTF-8 BOM:', getBOMBytes('utf-8'));
console.log('  UTF-16LE BOM:', getBOMBytes('utf-16le'));
console.log('  UTF-16BE BOM:', getBOMBytes('utf-16be'));

// Test 8: Encoding validation
console.log('\nEncoding validation:');
console.log('  "utf-8" is supported:', isSupportedEncoding('utf-8'));
console.log('  "unknown" is supported:', isSupportedEncoding('unknown'));
console.log('  Normalize "UTF8":', normalizeEncoding('UTF8'));
console.log('  Normalize "cp1250":', normalizeEncoding('cp1250'));

// Test 9: Display names
console.log('\nDisplay names:');
console.log('  utf-8:', getEncodingDisplayName('utf-8'));
console.log('  windows-1250:', getEncodingDisplayName('windows-1250'));
console.log('  iso-8859-2:', getEncodingDisplayName('iso-8859-2'));

console.log('\n✓ All tests completed!');
