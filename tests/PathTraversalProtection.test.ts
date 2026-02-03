/**
 * Tests for PathTraversalProtection module
 * Verifies detection of all path traversal attack variants
 */

import {
  detectPathTraversal,
  sanitizePath,
  validateSecurePath,
  PathTraversalError,
  securityAuditLogger,
  hasTraversalPatterns,
  isPathSafe
} from '../src/native/PathTraversalProtection.js';

// Disable logging during tests
securityAuditLogger.setEnabled(false);

describe('PathTraversalProtection', () => {
  beforeEach(() => {
    securityAuditLogger.clear();
  });

  describe('detectPathTraversal', () => {
    // ===== BASIC TRAVERSAL =====
    describe('basic traversal sequences', () => {
      test('detects Unix ../  traversal', () => {
        const result = detectPathTraversal('../etc/passwd');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('HIGH');
        expect(result.categories).toContain('basic');
      });

      test('detects Windows ..\\ traversal', () => {
        const result = detectPathTraversal('..\\Windows\\System32');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('HIGH');
      });

      test('detects multiple level traversal', () => {
        const result = detectPathTraversal('../../../../../../etc/passwd');
        expect(result.detected).toBe(true);
      });
    });

    // ===== URL ENCODED =====
    describe('URL encoded variants', () => {
      test('detects %2e%2e%2f (../)', () => {
        const result = detectPathTraversal('%2e%2e%2fetc/passwd');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('CRITICAL');
        expect(result.categories).toContain('encoded');
      });

      test('detects %2e%2e%5c (..\\)', () => {
        const result = detectPathTraversal('%2e%2e%5cWindows');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('CRITICAL');
      });

      test('detects mixed encoding .%2e/', () => {
        const result = detectPathTraversal('.%2e/etc/passwd');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('CRITICAL');
      });

      test('detects double URL encoding %252e%252e%252f', () => {
        const result = detectPathTraversal('%252e%252e%252fetc/passwd');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('CRITICAL');
      });
    });

    // ===== NULL BYTES =====
    describe('null byte injection', () => {
      test('detects %00 null byte', () => {
        const result = detectPathTraversal('file.txt%00.jpg');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('CRITICAL');
        expect(result.categories).toContain('null_byte');
      });

      test('detects \\x00 null byte', () => {
        const result = detectPathTraversal('file.txt\x00.jpg');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('CRITICAL');
      });

      test('detects %u0000 Unicode null byte', () => {
        const result = detectPathTraversal('file.txt%u0000.jpg');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('CRITICAL');
      });
    });

    // ===== BYPASS ATTEMPTS =====
    describe('bypass attempts', () => {
      test('detects ....// double traversal', () => {
        const result = detectPathTraversal('....//etc/passwd');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('CRITICAL');
        expect(result.categories).toContain('bypass');
      });

      test('detects ...; semicolon bypass', () => {
        const result = detectPathTraversal('..;/etc/passwd');
        expect(result.detected).toBe(true);
      });

      test('detects nested traversal ./..', () => {
        const result = detectPathTraversal('./../../etc/passwd');
        expect(result.detected).toBe(true);
      });
    });

    // ===== UNICODE VARIANTS =====
    describe('Unicode encoded variants', () => {
      test('detects UTF-8 overlong %c0%ae (dot)', () => {
        const result = detectPathTraversal('%c0%ae%c0%aeetc/passwd');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('CRITICAL');
        expect(result.categories).toContain('unicode');
      });

      test('detects fullwidth Unicode traversal', () => {
        const result = detectPathTraversal('\uff0e\uff0e\uff0fetc/passwd');
        expect(result.detected).toBe(true);
        expect(result.severity).toBe('CRITICAL');
      });
    });

    // ===== CLEAN PATHS =====
    describe('clean paths (no traversal)', () => {
      test('allows normal relative path', () => {
        const result = detectPathTraversal('src/components/file.ts');
        expect(result.detected).toBe(false);
        expect(result.patterns).toHaveLength(0);
      });

      test('allows path with dots in filename', () => {
        const result = detectPathTraversal('src/file.config.ts');
        expect(result.detected).toBe(false);
      });

      test('allows single dot in path', () => {
        const result = detectPathTraversal('./src/file.ts');
        expect(result.detected).toBe(false);
      });
    });
  });

  describe('sanitizePath', () => {
    test('removes ../ sequences', () => {
      const sanitized = sanitizePath('../../../etc/passwd');
      expect(sanitized).not.toContain('..');
    });

    test('removes null bytes', () => {
      const sanitized = sanitizePath('file.txt%00.jpg');
      expect(sanitized).not.toContain('%00');
      expect(sanitized).not.toContain('\x00');
    });

    test('decodes URL encoding and removes traversal', () => {
      const sanitized = sanitizePath('%2e%2e%2fetc/passwd');
      expect(sanitized).not.toContain('..');
    });

    test('normalizes path separators', () => {
      const sanitized = sanitizePath('path\\to\\file');
      expect(sanitized).toBe('path/to/file');
    });

    test('removes duplicate slashes', () => {
      const sanitized = sanitizePath('path//to///file');
      expect(sanitized).toBe('path/to/file');
    });

    test('removes leading slashes', () => {
      const sanitized = sanitizePath('///etc/passwd');
      expect(sanitized).toBe('etc/passwd');
    });
  });

  describe('validateSecurePath', () => {
    // Use platform-appropriate root directory for testing
    const isWindows = process.platform === 'win32';
    const rootDir = isWindows ? 'C:\\Users\\testuser\\project' : '/home/user/project';
    const etcPath = isWindows ? 'C:\\Windows\\System32\\config' : '/etc/passwd';

    test('throws PathTraversalError on traversal attack', () => {
      expect(() => {
        validateSecurePath('../../../etc/passwd', rootDir);
      }).toThrow(PathTraversalError);
    });

    test('throws error when path escapes root', () => {
      expect(() => {
        validateSecurePath(etcPath, rootDir);
      }).toThrow();
    });

    test('allows valid path within root', () => {
      const result = validateSecurePath('src/file.ts', rootDir);
      // On Windows, path separators may differ
      expect(result.toLowerCase()).toContain(rootDir.toLowerCase().replace(/\\/g, '\\'));
    });

    test('allows sanitization when option enabled', () => {
      const result = validateSecurePath('../../../etc/passwd', rootDir, {
        throwOnDetection: false,
        allowSanitization: true
      });
      expect(result).not.toContain('..');
    });

    test('PathTraversalError contains detected patterns', () => {
      try {
        validateSecurePath('%2e%2e%2fetc/passwd', rootDir);
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PathTraversalError);
        expect((error as PathTraversalError).detectedPatterns.length).toBeGreaterThan(0);
        expect((error as PathTraversalError).severity).toBe('CRITICAL');
      }
    });
  });

  describe('helper functions', () => {
    test('hasTraversalPatterns returns true for malicious paths', () => {
      expect(hasTraversalPatterns('../etc/passwd')).toBe(true);
      expect(hasTraversalPatterns('%2e%2e%2f')).toBe(true);
    });

    test('hasTraversalPatterns returns false for clean paths', () => {
      expect(hasTraversalPatterns('src/file.ts')).toBe(false);
      expect(hasTraversalPatterns('./file.ts')).toBe(false);
    });

    test('isPathSafe checks both traversal and root boundary', () => {
      // Use platform-appropriate root directory
      const isWindows = process.platform === 'win32';
      const rootDir = isWindows ? 'C:\\Users\\testuser\\project' : '/home/user/project';
      expect(isPathSafe('src/file.ts', rootDir)).toBe(true);
      expect(isPathSafe('../etc/passwd', rootDir)).toBe(false);
    });
  });

  describe('securityAuditLogger', () => {
    beforeEach(() => {
      securityAuditLogger.setEnabled(true);
      securityAuditLogger.clear();
    });

    afterEach(() => {
      securityAuditLogger.setEnabled(false);
    });

    test('logs security events', () => {
      try {
        validateSecurePath('../etc/passwd', '/home/user');
      } catch {
        // Expected
      }
      const entries = securityAuditLogger.getRecentEntries();
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].type).toBe('PATH_TRAVERSAL_ATTEMPT');
    });

    test('provides statistics', () => {
      try {
        validateSecurePath('../etc/passwd', '/home/user');
      } catch {}
      try {
        validateSecurePath('%2e%2e%2f', '/home/user');
      } catch {}

      const stats = securityAuditLogger.getStatistics();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.bySeverity.HIGH + stats.bySeverity.CRITICAL).toBeGreaterThan(0);
    });

    test('exports log as JSON', () => {
      try {
        validateSecurePath('../etc/passwd', '/home/user');
      } catch {}

      const json = securityAuditLogger.exportLog();
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed)).toBe(true);
    });

    test('exports log as CSV', () => {
      try {
        validateSecurePath('../etc/passwd', '/home/user');
      } catch {}

      const csv = securityAuditLogger.exportLogAsCSV();
      expect(csv).toContain('timestamp,type,severity');
    });
  });
});
