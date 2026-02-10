/**
 * CodebaseMemory - Intelligent codebase analysis and persistent memory
 *
 * Automatycznie analizuje strukturę projektu, zapisuje do pamięci trwałej
 * i wykorzystuje wiedzę w kolejnych sesjach/promptach.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import { GEMINIHYDRA_DIR } from '../config/paths.config.js';
import { loadFromFile, saveToFile } from '../native/persistence.js';
import type { FileInfo } from '../native/types.js';

// Re-export FileInfo for backward compatibility
export type { FileInfo } from '../native/types.js';

// Storage paths
const DB_DIR = GEMINIHYDRA_DIR;
const CODEBASE_DB_PATH = path.join(DB_DIR, 'codebase-memory.json');

// File extensions to analyze
const CODE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rb',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.scala',
  '.cs',
  '.cpp',
  '.c',
  '.h',
  '.hpp',
  '.php',
  '.swift',
  '.m',
  '.mm',
  '.vue',
  '.svelte',
  '.astro',
  '.sql',
  '.graphql',
  '.prisma',
  '.yaml',
  '.yml',
  '.json',
  '.toml',
  '.md',
  '.mdx',
  '.txt',
  '.sh',
  '.bash',
  '.ps1',
  '.bat',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.html',
  '.xml',
  '.svg',
]);

const CONFIG_FILES = new Set([
  'package.json',
  'tsconfig.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'build.gradle',
  'pom.xml',
  'Gemfile',
  'requirements.txt',
  '.env.example',
  'docker-compose.yml',
  'Dockerfile',
  'Makefile',
  'vite.config.ts',
  'webpack.config.js',
  'next.config.js',
  'nuxt.config.ts',
]);

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'target',
  '__pycache__',
  '.next',
  '.nuxt',
  '.svelte-kit',
  'coverage',
  '.pytest_cache',
  'vendor',
  'bin',
  'obj',
  '.idea',
  '.vscode',
  '.vs',
]);

// ============================================================
// Types
// ============================================================

export interface ProjectStructure {
  name: string;
  rootPath: string;
  type: string; // 'node', 'python', 'rust', 'go', 'mixed'
  framework?: string;
  entryPoints: string[];
  configFiles: string[];
  directories: string[];
  totalFiles: number;
  totalLines: number;
  languages: Record<string, number>; // extension -> file count
}

export interface CodebaseAnalysis {
  id: string;
  projectPath: string;
  projectName: string;
  structure: ProjectStructure;
  files: FileInfo[];
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  summary: string;
  analyzedAt: string;
  lastAccessed: string;
  accessCount: number;
}

export interface CodebaseStore {
  version: number;
  analyses: CodebaseAnalysis[];
}

export interface ContextEnrichment {
  projectContext: string;
  relevantFiles: FileInfo[];
  suggestedActions: string[];
}

// ============================================================
// CodebaseMemory Class
// ============================================================

export class CodebaseMemory {
  private store: CodebaseStore = { version: 1, analyses: [] };
  private initialized = false;
  private saveDebounce: NodeJS.Timeout | null = null;
  private currentProject: CodebaseAnalysis | null = null;

  /**
   * Initialize storage
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(DB_DIR, { recursive: true });

    const data = await loadFromFile<CodebaseStore>(CODEBASE_DB_PATH);
    if (data) {
      this.store = data;
    } else {
      this.store = { version: 1, analyses: [] };
    }

    this.initialized = true;
    console.log(
      chalk.gray(`[CodebaseMemory] Loaded ${this.store.analyses.length} project analyses`),
    );
  }

  /**
   * Save to file (debounced)
   */
  private scheduleSave(): void {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    this.saveDebounce = setTimeout(() => {
      this.saveNow().catch(console.error);
    }, 2000);
  }

  private async saveNow(): Promise<void> {
    await saveToFile(CODEBASE_DB_PATH, this.store);
  }

  /**
   * Generate unique project ID
   */
  private generateId(projectPath: string): string {
    const normalized = projectPath.replace(/\\/g, '/').toLowerCase();
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      hash = (hash << 5) - hash + normalized.charCodeAt(i);
      hash = hash & hash;
    }
    return `proj_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Analyze a project/codebase
   */
  async analyzeProject(
    projectPath: string,
    options: {
      maxFiles?: number;
      maxDepth?: number;
      includeContent?: boolean;
    } = {},
  ): Promise<CodebaseAnalysis> {
    const { maxFiles = 500, maxDepth = 10, includeContent = false } = options;

    console.log(chalk.cyan(`[CodebaseMemory] Analyzing project: ${projectPath}`));
    const startTime = Date.now();

    const resolvedPath = path.resolve(projectPath);
    const projectName = path.basename(resolvedPath);
    const id = this.generateId(resolvedPath);

    // Check if we have existing analysis
    const existing = this.store.analyses.find((a) => a.id === id);

    // Collect files
    const files: FileInfo[] = [];
    const directories: string[] = [];
    const languages: Record<string, number> = {};

    await this.walkDirectory(resolvedPath, resolvedPath, files, directories, {
      maxFiles,
      maxDepth,
      currentDepth: 0,
      languages,
      includeContent,
    });

    // Detect project type and framework
    const { type, framework, configFiles, dependencies, devDependencies, scripts } =
      await this.detectProjectType(resolvedPath, files);

    // Find entry points
    const entryPoints = this.findEntryPoints(files, type);

    // Calculate totals
    const totalLines = files.reduce((sum, f) => sum + (f.lines ?? 0), 0);

    // Build structure
    const structure: ProjectStructure = {
      name: projectName,
      rootPath: resolvedPath,
      type,
      framework,
      entryPoints,
      configFiles,
      directories: directories.slice(0, 50), // Limit
      totalFiles: files.length,
      totalLines,
      languages,
    };

    // Generate summary
    const summary = this.generateProjectSummary(structure, files);

    const analysis: CodebaseAnalysis = {
      id,
      projectPath: resolvedPath,
      projectName,
      structure,
      files: files.slice(0, 200), // Store limited files
      dependencies,
      devDependencies,
      scripts,
      summary,
      analyzedAt: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      accessCount: existing ? existing.accessCount + 1 : 1,
    };

    // Update or add
    const idx = this.store.analyses.findIndex((a) => a.id === id);
    if (idx !== -1) {
      this.store.analyses[idx] = analysis;
    } else {
      this.store.analyses.push(analysis);
    }

    this.currentProject = analysis;
    this.scheduleSave();

    const elapsed = Date.now() - startTime;
    console.log(chalk.green(`[CodebaseMemory] Analysis complete in ${elapsed}ms`));
    console.log(
      chalk.gray(
        `  Files: ${files.length}, Lines: ${totalLines}, Type: ${type}${framework ? ` (${framework})` : ''}`,
      ),
    );

    return analysis;
  }

  /**
   * Walk directory recursively - prioritize src/ directories
   */
  private async walkDirectory(
    dirPath: string,
    rootPath: string,
    files: FileInfo[],
    directories: string[],
    opts: {
      maxFiles: number;
      maxDepth: number;
      currentDepth: number;
      languages: Record<string, number>;
      includeContent: boolean;
    },
  ): Promise<void> {
    if (opts.currentDepth > opts.maxDepth || files.length >= opts.maxFiles) return;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      // Sort entries: prioritize src, lib, app directories first
      const priorityDirs = new Set([
        'src',
        'lib',
        'app',
        'core',
        'components',
        'services',
        'utils',
        'bin',
      ]);
      entries.sort((a, b) => {
        const aIsPriority = priorityDirs.has(a.name.toLowerCase());
        const bIsPriority = priorityDirs.has(b.name.toLowerCase());
        if (aIsPriority && !bIsPriority) return -1;
        if (!aIsPriority && bIsPriority) return 1;
        // Prioritize directories over files
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of entries) {
        if (files.length >= opts.maxFiles) break;

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);

        if (entry.isDirectory()) {
          if (!IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
            directories.push(relativePath);
            await this.walkDirectory(fullPath, rootPath, files, directories, {
              ...opts,
              currentDepth: opts.currentDepth + 1,
            });
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          const isConfig = CONFIG_FILES.has(entry.name);

          if (CODE_EXTENSIONS.has(ext) || isConfig) {
            const fileInfo = await this.analyzeFile(fullPath, relativePath, opts.includeContent);
            files.push(fileInfo);
            opts.languages[ext] = (opts.languages[ext] || 0) + 1;
          }
        }
      }
    } catch (_err) {
      // Skip inaccessible directories
    }
  }

  /**
   * Analyze a single file
   */
  private async analyzeFile(
    filePath: string,
    relativePath: string,
    _includeContent: boolean,
  ): Promise<FileInfo> {
    const stats = await fs.stat(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let content = '';
    let lines = 0;
    const exports: string[] = [];
    const imports: string[] = [];
    const classes: string[] = [];
    const functions: string[] = [];

    try {
      // Only read files under 500KB
      if (stats.size < 500 * 1024) {
        content = await fs.readFile(filePath, 'utf-8');
        lines = content.split('\n').length;

        // Extract code structure for JS/TS files
        if (['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(ext)) {
          // Exports
          const exportMatches = content.matchAll(
            /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/g,
          );
          for (const match of exportMatches) {
            exports.push(match[1]);
          }

          // Imports
          const importMatches = content.matchAll(/import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g);
          for (const match of importMatches) {
            imports.push(match[1]);
          }

          // Classes
          const classMatches = content.matchAll(/class\s+(\w+)/g);
          for (const match of classMatches) {
            classes.push(match[1]);
          }

          // Functions (top-level)
          const funcMatches = content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g);
          for (const match of funcMatches) {
            functions.push(match[1]);
          }
        }

        // Python
        if (ext === '.py') {
          const classMatches = content.matchAll(/class\s+(\w+)/g);
          for (const match of classMatches) {
            classes.push(match[1]);
          }

          const funcMatches = content.matchAll(/def\s+(\w+)/g);
          for (const match of funcMatches) {
            functions.push(match[1]);
          }

          const importMatches = content.matchAll(/(?:from\s+(\S+)\s+)?import\s+(\S+)/g);
          for (const match of importMatches) {
            imports.push(match[1] || match[2]);
          }
        }
      }
    } catch {
      // Skip unreadable files
    }

    return {
      path: filePath,
      name: path.basename(filePath),
      type: 'code',
      relativePath,
      extension: ext,
      size: stats.size,
      lines,
      exports: exports.slice(0, 20),
      imports: imports.slice(0, 30),
      classes: classes.slice(0, 10),
      functions: functions.slice(0, 20),
      lastModified: stats.mtime.toISOString(),
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Detect project type and framework
   */
  private async detectProjectType(
    rootPath: string,
    files: FileInfo[],
  ): Promise<{
    type: string;
    framework?: string;
    configFiles: string[];
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  }> {
    const configFiles: string[] = [];
    let dependencies: string[] = [];
    let devDependencies: string[] = [];
    let scripts: Record<string, string> = {};
    let type = 'unknown';
    let framework: string | undefined;

    // Check for package.json (Node.js)
    try {
      const pkgPath = path.join(rootPath, 'package.json');
      const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
      configFiles.push('package.json');
      type = 'node';

      dependencies = Object.keys(pkg.dependencies || {});
      devDependencies = Object.keys(pkg.devDependencies || {});
      scripts = pkg.scripts || {};

      // Detect framework
      const allDeps = [...dependencies, ...devDependencies];
      if (allDeps.includes('next')) framework = 'Next.js';
      else if (allDeps.includes('nuxt')) framework = 'Nuxt';
      else if (allDeps.includes('@angular/core')) framework = 'Angular';
      else if (allDeps.includes('vue')) framework = 'Vue';
      else if (allDeps.includes('svelte')) framework = 'Svelte';
      else if (allDeps.includes('react')) framework = 'React';
      else if (allDeps.includes('express')) framework = 'Express';
      else if (allDeps.includes('fastify')) framework = 'Fastify';
      else if (allDeps.includes('nest')) framework = 'NestJS';
      else if (allDeps.includes('electron')) framework = 'Electron';
      else if (allDeps.includes('@tauri-apps/api')) framework = 'Tauri';
    } catch {}

    // Check for Python
    if (files.some((f) => f.relativePath === 'pyproject.toml' || f.relativePath === 'setup.py')) {
      configFiles.push('pyproject.toml');
      type = type === 'node' ? 'mixed' : 'python';

      try {
        const reqPath = path.join(rootPath, 'requirements.txt');
        const reqs = await fs.readFile(reqPath, 'utf-8');
        dependencies = reqs.split('\n').filter((l) => l.trim() && !l.startsWith('#'));

        if (dependencies.some((d) => d.includes('django'))) framework = 'Django';
        else if (dependencies.some((d) => d.includes('flask'))) framework = 'Flask';
        else if (dependencies.some((d) => d.includes('fastapi'))) framework = 'FastAPI';
      } catch {}
    }

    // Check for Rust
    if (files.some((f) => f.relativePath === 'Cargo.toml')) {
      configFiles.push('Cargo.toml');
      type = type === 'unknown' ? 'rust' : 'mixed';
    }

    // Check for Go
    if (files.some((f) => f.relativePath === 'go.mod')) {
      configFiles.push('go.mod');
      type = type === 'unknown' ? 'go' : 'mixed';
    }

    // Add other config files found
    for (const file of files) {
      const relativePath = file.relativePath ?? file.name ?? '';
      if (
        relativePath &&
        CONFIG_FILES.has(path.basename(relativePath)) &&
        !configFiles.includes(relativePath)
      ) {
        configFiles.push(relativePath);
      }
    }

    return { type, framework, configFiles, dependencies, devDependencies, scripts };
  }

  /**
   * Find entry points
   */
  private findEntryPoints(files: FileInfo[], _projectType: string): string[] {
    const entryPoints: string[] = [];

    const commonEntries = [
      'src/index.ts',
      'src/index.js',
      'src/main.ts',
      'src/main.js',
      'index.ts',
      'index.js',
      'main.ts',
      'main.js',
      'src/app.ts',
      'src/app.js',
      'app.ts',
      'app.js',
      'src/server.ts',
      'src/server.js',
      'server.ts',
      'server.js',
      'src/cli.ts',
      'bin/cli.ts',
      'cli.ts',
      'main.py',
      'app.py',
      'src/main.py',
      'main.go',
      'cmd/main.go',
      'src/main.rs',
      'src/lib.rs',
    ];

    for (const entry of commonEntries) {
      if (files.some((f) => (f.relativePath ?? '').replace(/\\/g, '/') === entry)) {
        entryPoints.push(entry);
      }
    }

    return entryPoints.slice(0, 5);
  }

  /**
   * Generate project summary
   */
  private generateProjectSummary(structure: ProjectStructure, files: FileInfo[]): string {
    const lines: string[] = [];

    lines.push(`# ${structure.name}`);
    lines.push(`Type: ${structure.type}${structure.framework ? ` (${structure.framework})` : ''}`);
    lines.push(`Files: ${structure.totalFiles}, Lines: ${structure.totalLines}`);

    // Top languages
    const langEntries = Object.entries(structure.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    if (langEntries.length > 0) {
      lines.push(`Languages: ${langEntries.map(([ext, count]) => `${ext}(${count})`).join(', ')}`);
    }

    // Entry points
    if (structure.entryPoints.length > 0) {
      lines.push(`Entry points: ${structure.entryPoints.join(', ')}`);
    }

    // Key directories
    const keyDirs = structure.directories
      .filter((d) => !d.includes('/') || d.split('/').length <= 2)
      .slice(0, 10);
    if (keyDirs.length > 0) {
      lines.push(`Directories: ${keyDirs.join(', ')}`);
    }

    // Main exports/classes
    const allExports = files.flatMap((f) => f.exports || []).slice(0, 20);
    const allClasses = files.flatMap((f) => f.classes || []).slice(0, 15);

    if (allClasses.length > 0) {
      lines.push(`Key classes: ${allClasses.join(', ')}`);
    }
    if (allExports.length > 0 && allExports.length !== allClasses.length) {
      lines.push(`Key exports: ${allExports.slice(0, 15).join(', ')}`);
    }

    return lines.join('\n');
  }

  /**
   * Get existing analysis for a project
   */
  getAnalysis(projectPath: string): CodebaseAnalysis | undefined {
    const id = this.generateId(path.resolve(projectPath));
    const analysis = this.store.analyses.find((a) => a.id === id);

    if (analysis) {
      analysis.lastAccessed = new Date().toISOString();
      analysis.accessCount++;
      this.scheduleSave();
    }

    return analysis;
  }

  /**
   * Set current working project
   */
  setCurrentProject(projectPath: string): CodebaseAnalysis | undefined {
    this.currentProject = this.getAnalysis(projectPath) || null;
    return this.currentProject || undefined;
  }

  /**
   * Get current project
   */
  getCurrentProject(): CodebaseAnalysis | null {
    return this.currentProject;
  }

  /**
   * Enrich a prompt with project context
   */
  enrichPrompt(
    userPrompt: string,
    options: {
      maxContextLength?: number;
      includeStructure?: boolean;
      includeRelevantFiles?: boolean;
    } = {},
  ): { enrichedPrompt: string; context: ContextEnrichment } {
    const {
      maxContextLength = 4000,
      includeStructure = true,
      includeRelevantFiles = true,
    } = options;

    if (!this.currentProject) {
      return {
        enrichedPrompt: userPrompt,
        context: { projectContext: '', relevantFiles: [], suggestedActions: [] },
      };
    }

    const project = this.currentProject;
    const contextParts: string[] = [];

    // Project structure context
    if (includeStructure) {
      contextParts.push(`## Project Context: ${project.projectName}`);
      contextParts.push(project.summary);

      if (project.scripts && Object.keys(project.scripts).length > 0) {
        contextParts.push(
          `\nAvailable scripts: ${Object.keys(project.scripts).slice(0, 10).join(', ')}`,
        );
      }
    }

    // Find relevant files based on prompt keywords
    const relevantFiles: FileInfo[] = [];
    if (includeRelevantFiles) {
      const keywords = this.extractKeywords(userPrompt);

      for (const file of project.files) {
        const fileText = [
          file.relativePath,
          ...(file.exports || []),
          ...(file.classes || []),
          ...(file.functions || []),
        ]
          .join(' ')
          .toLowerCase();

        const matches = keywords.filter((kw) => fileText.includes(kw));
        if (matches.length > 0) {
          relevantFiles.push(file);
        }
      }

      // Sort by relevance and take top 5
      relevantFiles.sort((a, b) => {
        const aExports = (a.exports?.length || 0) + (a.classes?.length || 0);
        const bExports = (b.exports?.length || 0) + (b.classes?.length || 0);
        return bExports - aExports;
      });

      const topFiles = relevantFiles.slice(0, 5);
      if (topFiles.length > 0) {
        contextParts.push(`\n## Relevant Files`);
        for (const f of topFiles) {
          let desc = `- ${f.relativePath}`;
          if (f.classes?.length) desc += ` (classes: ${f.classes.join(', ')})`;
          else if (f.exports?.length) desc += ` (exports: ${f.exports.slice(0, 5).join(', ')})`;
          contextParts.push(desc);
        }
      }
    }

    // Suggest actions based on prompt
    const suggestedActions = this.suggestActions(userPrompt, project);

    // Build enriched prompt
    let projectContext = contextParts.join('\n');

    // Truncate if too long
    if (projectContext.length > maxContextLength) {
      projectContext = `${projectContext.slice(0, maxContextLength)}\n...[truncated]`;
    }

    const enrichedPrompt = projectContext
      ? `${projectContext}\n\n---\n\n## User Request\n${userPrompt}`
      : userPrompt;

    return {
      enrichedPrompt,
      context: {
        projectContext,
        relevantFiles: relevantFiles.slice(0, 5),
        suggestedActions,
      },
    };
  }

  /**
   * Extract keywords from text - handles both English and Polish
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      // English
      'the',
      'a',
      'an',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'can',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'up',
      'about',
      'into',
      'over',
      'after',
      'how',
      'what',
      'when',
      'where',
      'why',
      'all',
      'each',
      'every',
      'both',
      'few',
      'more',
      'most',
      'other',
      'some',
      'such',
      'no',
      'nor',
      'not',
      'only',
      'own',
      'same',
      'so',
      'than',
      'too',
      'very',
      'just',
      'and',
      'but',
      'if',
      'or',
      'this',
      'that',
      'these',
      'those',
      'i',
      'me',
      'my',
      'you',
      'your',
      'we',
      'want',
      'need',
      'please',
      'help',
      'make',
      'create',
      'add',
      'fix',
      'update',
      'change',
      'modify',
      'implement',
      'write',
      'code',
      'file',
      // Polish
      'jak',
      'jest',
      'są',
      'był',
      'była',
      'były',
      'być',
      'mieć',
      'ma',
      'mają',
      'do',
      'na',
      'w',
      'z',
      'od',
      'po',
      'za',
      'przed',
      'przez',
      'oraz',
      'ale',
      'lub',
      'czy',
      'ten',
      'ta',
      'to',
      'te',
      'tym',
      'tego',
      'tej',
      'co',
      'gdzie',
      'kiedy',
      'dlaczego',
      'który',
      'która',
      'które',
      'którzy',
      'wszystko',
      'każdy',
      'żaden',
      'inny',
      'sam',
      'chcę',
      'potrzebuję',
      'proszę',
      'pomóż',
      'zrób',
      'stwórz',
      'dodaj',
      'napraw',
      'zmień',
      'pokaż',
      'znajdź',
      'projekcie',
      'projekt',
      'pliku',
    ]);

    // Technical terms to always include (preserve even if short)
    const techTerms = new Set([
      'api',
      'cli',
      'gui',
      'mcp',
      'sql',
      'css',
      'tsx',
      'jsx',
      'ui',
      'ux',
      'git',
      'npm',
      'db',
      'io',
      'fs',
      'os',
      'ws',
    ]);

    // Extract CamelCase words
    const camelCaseWords: string[] = [];
    const camelMatches = text.match(/[A-Z][a-z]+(?=[A-Z])|[A-Z][a-z]+/g);
    if (camelMatches) {
      camelCaseWords.push(...camelMatches.map((w) => w.toLowerCase()));
    }

    const basicKeywords = text
      .toLowerCase()
      .replace(/[^\w\sąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ' ')
      .split(/\s+/)
      .filter((word) => {
        if (techTerms.has(word)) return true;
        return word.length > 2 && !stopWords.has(word);
      });

    // Combine and dedupe
    const allKeywords = [...new Set([...basicKeywords, ...camelCaseWords])];
    return allKeywords.slice(0, 20);
  }

  /**
   * Suggest actions based on prompt and project
   */
  private suggestActions(prompt: string, project: CodebaseAnalysis): string[] {
    const suggestions: string[] = [];
    const lower = prompt.toLowerCase();

    // Test-related
    if (lower.includes('test') || lower.includes('spec')) {
      if (project.scripts?.test) {
        suggestions.push(`Run tests: npm test`);
      }
      const testFiles = project.files.filter(
        (f) => (f.relativePath ?? '').includes('test') || (f.relativePath ?? '').includes('spec'),
      );
      if (testFiles.length > 0) {
        suggestions.push(
          `Test files found: ${testFiles
            .slice(0, 3)
            .map((f) => f.relativePath ?? f.name)
            .join(', ')}`,
        );
      }
    }

    // Build-related
    if (lower.includes('build') || lower.includes('compile')) {
      if (project.scripts?.build) {
        suggestions.push(`Build command: npm run build`);
      }
    }

    // API/route-related
    if (lower.includes('api') || lower.includes('route') || lower.includes('endpoint')) {
      const apiFiles = project.files.filter(
        (f) => (f.relativePath ?? '').includes('api') || (f.relativePath ?? '').includes('route'),
      );
      if (apiFiles.length > 0) {
        suggestions.push(
          `API files: ${apiFiles
            .slice(0, 3)
            .map((f) => f.relativePath ?? f.name)
            .join(', ')}`,
        );
      }
    }

    // Component-related (React/Vue/etc)
    if (lower.includes('component') || lower.includes('komponent')) {
      const componentFiles = project.files.filter(
        (f) =>
          (f.relativePath ?? '').includes('component') ||
          f.extension === '.tsx' ||
          f.extension === '.vue' ||
          f.extension === '.svelte',
      );
      if (componentFiles.length > 0) {
        suggestions.push(
          `Component files: ${componentFiles
            .slice(0, 5)
            .map((f) => f.relativePath ?? f.name)
            .join(', ')}`,
        );
      }
    }

    return suggestions;
  }

  /**
   * Search across all analyzed projects
   */
  searchProjects(query: string): CodebaseAnalysis[] {
    const keywords = this.extractKeywords(query);

    return this.store.analyses.filter((analysis) => {
      const text = [
        analysis.projectName,
        analysis.structure.type,
        analysis.structure.framework || '',
        ...analysis.dependencies,
        analysis.summary,
      ]
        .join(' ')
        .toLowerCase();

      return keywords.some((kw) => text.includes(kw));
    });
  }

  /**
   * List all analyzed projects
   */
  listProjects(): Array<{
    name: string;
    path: string;
    type: string;
    framework?: string;
    analyzedAt: string;
  }> {
    return this.store.analyses.map((a) => ({
      name: a.projectName,
      path: a.projectPath,
      type: a.structure.type,
      framework: a.structure.framework,
      analyzedAt: a.analyzedAt,
    }));
  }

  /**
   * Delete project analysis
   */
  deleteProject(projectPath: string): boolean {
    const id = this.generateId(path.resolve(projectPath));
    const idx = this.store.analyses.findIndex((a) => a.id === id);

    if (idx !== -1) {
      this.store.analyses.splice(idx, 1);
      if (this.currentProject?.id === id) {
        this.currentProject = null;
      }
      this.scheduleSave();
      return true;
    }
    return false;
  }

  /**
   * Get storage stats
   */
  getStats(): { totalProjects: number; totalFiles: number; totalLines: number } {
    return {
      totalProjects: this.store.analyses.length,
      totalFiles: this.store.analyses.reduce((sum, a) => sum + a.files.length, 0),
      totalLines: this.store.analyses.reduce((sum, a) => sum + a.structure.totalLines, 0),
    };
  }

  /**
   * Close/flush
   */
  async close(): Promise<void> {
    if (this.saveDebounce) clearTimeout(this.saveDebounce);
    await this.saveNow();
  }
}

// Global instance
export const codebaseMemory = new CodebaseMemory();

export default codebaseMemory;
