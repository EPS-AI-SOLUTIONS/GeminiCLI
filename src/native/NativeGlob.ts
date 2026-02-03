/**
 * NativeGlob - Advanced glob pattern matching for GeminiHydra
 *
 * Provides fast file pattern matching with:
 * - Full glob pattern support
 * - Negation patterns
 * - Sorting by modification time
 * - File stats collection
 * - Caching for repeated queries
 */

import { glob, GlobOptions as NodeGlobOptions } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';

// ============================================================
// Types
// ============================================================

export interface GlobOptions {
  /** Glob pattern(s) to match */
  pattern: string | string[];
  /** Base directory (default: rootDir) */
  path?: string;
  /** Patterns to ignore */
  ignore?: string[];
  /** Maximum recursion depth */
  maxDepth?: number;
  /** Include hidden files (default: false) */
  includeHidden?: boolean;
  /** Only return files (default: true) */
  onlyFiles?: boolean;
  /** Only return directories (default: false) */
  onlyDirectories?: boolean;
  /** Sort by modification time (default: true) */
  sortByMtime?: boolean;
  /** Return absolute paths (default: false) */
  absolute?: boolean;
  /** Follow symlinks (default: false) */
  followSymlinks?: boolean;
  /** Case sensitive matching (default: platform-dependent) */
  caseSensitive?: boolean;
  /** Maximum results (default: unlimited) */
  limit?: number;
  /** Include file stats (default: false) */
  stats?: boolean;
}

export interface GlobResult {
  /** File/directory path */
  path: string;
  /** Always relative to root */
  relativePath: string;
  /** Modification time (if sortByMtime or stats) */
  mtime?: Date;
  /** File size in bytes (if stats) */
  size?: number;
  /** Is directory (if stats) */
  isDirectory?: boolean;
  /** Is file (if stats) */
  isFile?: boolean;
}

export interface GlobStats {
  totalFiles: number;
  totalDirs: number;
  elapsedMs: number;
  patternsUsed: string[];
  cacheHit: boolean;
}

export interface NativeGlobConfig {
  rootDir: string;
  defaultIgnore?: string[];
  enableCache?: boolean;
  cacheTTL?: number;
}

// ============================================================
// Cache Entry
// ============================================================

interface CacheEntry {
  results: GlobResult[];
  timestamp: number;
  stats: GlobStats;
}

// ============================================================
// NativeGlob Class
// ============================================================

export class NativeGlob {
  private rootDir: string;
  private defaultIgnore: string[];
  private cache: Map<string, CacheEntry> = new Map();
  private enableCache: boolean;
  private cacheTTL: number;
  private lastStats: GlobStats | null = null;

  constructor(config: NativeGlobConfig) {
    this.rootDir = path.resolve(config.rootDir);
    this.defaultIgnore = config.defaultIgnore || [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/__pycache__/**',
      '**/.venv/**',
      '**/venv/**'
    ];
    this.enableCache = config.enableCache ?? true;
    this.cacheTTL = config.cacheTTL ?? 30000; // 30 seconds
  }

  // ============================================================
  // Main Glob Method
  // ============================================================

  /**
   * Find files/directories matching glob pattern(s)
   */
  async glob(options: GlobOptions): Promise<GlobResult[]> {
    const startTime = Date.now();
    const patterns = Array.isArray(options.pattern) ? options.pattern : [options.pattern];

    // Check cache
    const cacheKey = this.getCacheKey(options);
    if (this.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
        this.lastStats = { ...cached.stats, cacheHit: true };
        return cached.results;
      }
    }

    const {
      path: basePath = '.',
      ignore = [],
      maxDepth,
      includeHidden = false,
      onlyFiles = true,
      onlyDirectories = false,
      sortByMtime = true,
      absolute = false,
      followSymlinks = false,
      caseSensitive,
      limit,
      stats: includeStats = false
    } = options;

    const cwd = path.isAbsolute(basePath)
      ? basePath
      : path.join(this.rootDir, basePath);

    // Build ignore list
    const ignorePatterns = [...this.defaultIgnore, ...ignore];

    // Configure glob options
    const globOptions: NodeGlobOptions = {
      cwd,
      ignore: ignorePatterns,
      dot: includeHidden,
      nodir: onlyFiles && !onlyDirectories,
      follow: followSymlinks,
      absolute: true, // Always get absolute for consistent processing
      maxDepth,
      nocase: caseSensitive === false
    };

    // Run glob for all patterns
    const allMatches = new Set<string>();

    for (const pattern of patterns) {
      try {
        const matches = await glob(pattern, globOptions);
        for (const match of matches) {
          // Ensure we have string paths (glob may return Path objects)
          allMatches.add(String(match));
        }
      } catch (error) {
        // Skip invalid patterns
        console.error(chalk.yellow(`[NativeGlob] Invalid pattern: ${pattern}`));
      }
    }

    // Filter directories if needed
    let matchesArray = Array.from(allMatches);

    if (onlyDirectories) {
      const filtered: string[] = [];
      for (const match of matchesArray) {
        try {
          const stat = await fs.stat(match);
          if (stat.isDirectory()) {
            filtered.push(match);
          }
        } catch {
          // Skip inaccessible paths
        }
      }
      matchesArray = filtered;
    }

    // Build results with optional stats
    const results: GlobResult[] = [];

    for (const absolutePath of matchesArray) {
      const relativePath = path.relative(this.rootDir, absolutePath);

      const result: GlobResult = {
        path: absolute ? absolutePath : relativePath,
        relativePath
      };

      if (sortByMtime || includeStats) {
        try {
          const stat = await fs.stat(absolutePath);
          result.mtime = stat.mtime;

          if (includeStats) {
            result.size = stat.size;
            result.isDirectory = stat.isDirectory();
            result.isFile = stat.isFile();
          }
        } catch {
          // Skip files we can't stat
          continue;
        }
      }

      results.push(result);
    }

    // Sort by mtime if requested (newest first)
    if (sortByMtime) {
      results.sort((a, b) => {
        const mtimeA = a.mtime?.getTime() ?? 0;
        const mtimeB = b.mtime?.getTime() ?? 0;
        return mtimeB - mtimeA;
      });
    }

    // Apply limit
    const finalResults = limit ? results.slice(0, limit) : results;

    // Build stats
    const elapsedMs = Date.now() - startTime;
    const stats: GlobStats = {
      totalFiles: finalResults.filter(r => r.isFile !== false && !r.isDirectory).length,
      totalDirs: finalResults.filter(r => r.isDirectory === true).length,
      elapsedMs,
      patternsUsed: patterns,
      cacheHit: false
    };

    this.lastStats = stats;

    // Update cache
    if (this.enableCache) {
      this.cache.set(cacheKey, {
        results: finalResults,
        timestamp: Date.now(),
        stats
      });
    }

    return finalResults;
  }

  // ============================================================
  // Convenience Methods
  // ============================================================

  /**
   * Find files matching pattern (simple API)
   */
  async findFiles(pattern: string, ignore?: string[]): Promise<string[]> {
    const results = await this.glob({
      pattern,
      ignore,
      onlyFiles: true,
      sortByMtime: true
    });
    return results.map(r => r.relativePath);
  }

  /**
   * Find directories matching pattern
   */
  async findDirectories(pattern: string): Promise<string[]> {
    const results = await this.glob({
      pattern,
      onlyDirectories: true,
      onlyFiles: false
    });
    return results.map(r => r.relativePath);
  }

  /**
   * Find files by extension
   */
  async findByExtension(ext: string | string[], basePath?: string): Promise<string[]> {
    const extensions = Array.isArray(ext) ? ext : [ext];
    const pattern = extensions.length === 1
      ? `**/*${extensions[0].startsWith('.') ? extensions[0] : '.' + extensions[0]}`
      : `**/*.{${extensions.map(e => e.replace(/^\./, '')).join(',')}}`;

    return this.findFiles(pattern);
  }

  /**
   * Check if any files match pattern
   */
  async hasMatches(pattern: string): Promise<boolean> {
    const results = await this.glob({
      pattern,
      limit: 1
    });
    return results.length > 0;
  }

  /**
   * Count files matching pattern
   */
  async countMatches(pattern: string): Promise<number> {
    const results = await this.glob({
      pattern,
      sortByMtime: false
    });
    return results.length;
  }

  // ============================================================
  // Stats and Cache Management
  // ============================================================

  /**
   * Get stats from last glob operation
   */
  getStats(): GlobStats | null {
    return this.lastStats;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }

  /**
   * Set cache TTL
   */
  setCacheTTL(ms: number): void {
    this.cacheTTL = ms;
  }

  /**
   * Enable/disable cache
   */
  setEnableCache(enabled: boolean): void {
    this.enableCache = enabled;
    if (!enabled) {
      this.cache.clear();
    }
  }

  // ============================================================
  // Utility Methods
  // ============================================================

  /**
   * Get root directory
   */
  getRootDir(): string {
    return this.rootDir;
  }

  /**
   * Set root directory
   */
  setRootDir(dir: string): void {
    this.rootDir = path.resolve(dir);
    this.clearCache();
  }

  /**
   * Get default ignore patterns
   */
  getDefaultIgnore(): string[] {
    return [...this.defaultIgnore];
  }

  /**
   * Add ignore pattern
   */
  addIgnorePattern(pattern: string): void {
    if (!this.defaultIgnore.includes(pattern)) {
      this.defaultIgnore.push(pattern);
      this.clearCache();
    }
  }

  /**
   * Remove ignore pattern
   */
  removeIgnorePattern(pattern: string): boolean {
    const index = this.defaultIgnore.indexOf(pattern);
    if (index !== -1) {
      this.defaultIgnore.splice(index, 1);
      this.clearCache();
      return true;
    }
    return false;
  }

  /**
   * Print status
   */
  printStatus(): void {
    console.log(chalk.cyan('\n=== Native Glob ===\n'));
    console.log(chalk.gray(`  Root: ${this.rootDir}`));
    console.log(chalk.gray(`  Cache: ${this.enableCache ? 'enabled' : 'disabled'}`));
    console.log(chalk.gray(`  Cache TTL: ${this.cacheTTL}ms`));
    console.log(chalk.gray(`  Cache Size: ${this.cache.size} entries`));
    console.log(chalk.gray(`  Default Ignore: ${this.defaultIgnore.length} patterns`));

    if (this.lastStats) {
      console.log(chalk.gray(`\n  Last Query:`));
      console.log(chalk.gray(`    Files: ${this.lastStats.totalFiles}`));
      console.log(chalk.gray(`    Dirs: ${this.lastStats.totalDirs}`));
      console.log(chalk.gray(`    Time: ${this.lastStats.elapsedMs}ms`));
      console.log(chalk.gray(`    Cache Hit: ${this.lastStats.cacheHit}`));
    }
  }

  // ============================================================
  // Private Methods
  // ============================================================

  private getCacheKey(options: GlobOptions): string {
    return JSON.stringify({
      pattern: options.pattern,
      path: options.path,
      ignore: options.ignore,
      maxDepth: options.maxDepth,
      includeHidden: options.includeHidden,
      onlyFiles: options.onlyFiles,
      onlyDirectories: options.onlyDirectories,
      caseSensitive: options.caseSensitive
    });
  }
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * Create a new NativeGlob instance
 */
export function createGlob(rootDir: string, options?: Partial<NativeGlobConfig>): NativeGlob {
  return new NativeGlob({ rootDir, ...options });
}

// ============================================================
// Singleton Instance
// ============================================================

let _nativeGlobInstance: NativeGlob | null = null;

/**
 * Get or create singleton instance
 */
export function getNativeGlob(rootDir?: string): NativeGlob {
  if (!_nativeGlobInstance) {
    _nativeGlobInstance = createGlob(rootDir || process.cwd());
  } else if (rootDir && rootDir !== _nativeGlobInstance.getRootDir()) {
    _nativeGlobInstance.setRootDir(rootDir);
  }
  return _nativeGlobInstance;
}

/**
 * Singleton export
 */
export const nativeGlob = getNativeGlob();

export default nativeGlob;
