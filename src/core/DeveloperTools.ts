/**
 * DeveloperTools.ts - Advanced Developer Automation Tools
 *
 * Features #31-40 from the 50 improvements list:
 * #31 - Code Review Agent (./developer/CodeReview.ts)
 * #32 - Test Generation (./developer/TestGeneration.ts)
 * #33 - Documentation Generation (./developer/DocumentationGen.ts)
 * #34 - Refactoring Suggestions (./developer/RefactoringAnalysis.ts)
 * #35 - Performance Profiling (./developer/PerformanceProfiling.ts)
 * #36 - Security Scanning
 * #37 - Dependency Analysis
 * #38 - API Mocking
 * #39 - Environment Management
 * #40 - Multi-Project Support
 *
 * NOTE: Features #31-35 have been refactored to separate modules in ./developer/
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import chalk from 'chalk';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';
import { GEMINI_MODELS } from '../config/models.config.js';

// ============================================================
// Re-export refactored modules (Features #31-35)
// ============================================================

// Feature #31: Code Review
export {
  reviewCode,
  formatCodeReview,
  detectLanguage as detectFileLanguage,  // Renamed to avoid conflict with SemanticChunking.detectLanguage
  type CodeReviewIssue,
  type CodeReviewResult
} from './developer/CodeReview.js';

// Feature #32: Test Generation
export {
  generateTests,
  formatGeneratedTests,
  generateTestFileContent,
  getDefaultTestFramework,
  getTestFileName,
  type GeneratedTest,
  type TestGenerationResult,
  type TestGenerationOptions
} from './developer/TestGeneration.js';

// Feature #33: Documentation Generation
export {
  generateDocumentation,
  formatDocumentation,
  generateJSDoc,
  generateTableOfContents,
  type DocEntry,
  type DocParam,
  type DocReturn,
  type DocumentationResult,
  type DocumentationFormat
} from './developer/DocumentationGen.js';

// Feature #34: Refactoring Analysis
export {
  analyzeRefactoring,
  formatRefactoringAnalysis,
  getSuggestionDetails,
  filterSuggestionsByType,
  calculateTotalEffort,
  type RefactoringSuggestion,
  type RefactoringAnalysis,
  type RefactoringType,
  type RefactoringPriority,
  type RefactoringEffort,
  type CodeMetrics
} from './developer/RefactoringAnalysis.js';

// Feature #35: Performance Profiling
export {
  profilePerformance,
  formatPerformanceProfile,
  filterIssuesByCategory,
  getIssueSummaryByCategory,
  calculateSeverityScore,
  hasCriticalIssues,
  type PerformanceIssue,
  type PerformanceProfile,
  type PerformanceHotspot,
  type PerformanceOptimization,
  type PerformanceSeverity,
  type PerformanceCategory
} from './developer/PerformanceProfiling.js';

// ============================================================
// Configuration
// ============================================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const QUALITY_MODEL = GEMINI_MODELS.FLASH;

// ============================================================
// #36: SECURITY SCANNING
// Scans code for security vulnerabilities
// ============================================================

export interface SecurityVulnerability {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;  // OWASP category or CWE
  title: string;
  description: string;
  location: string;
  cwe?: string;
  remediation: string;
  references?: string[];
}

export interface SecurityScanResult {
  file: string;
  riskLevel: 'safe' | 'low' | 'medium' | 'high' | 'critical';
  vulnerabilities: SecurityVulnerability[];
  securePatterns: string[];
  recommendations: string[];
}

const SECURITY_SCAN_PROMPT = `You are a security expert. Scan the following code for security vulnerabilities.

FILE: {filename}

CODE:
\`\`\`
{code}
\`\`\`

Provide security analysis in JSON format:
{
  "riskLevel": "safe|low|medium|high|critical",
  "vulnerabilities": [
    {
      "severity": "low|medium|high|critical",
      "type": "OWASP category (e.g., Injection, XSS, CSRF)",
      "title": "Short vulnerability title",
      "description": "What the vulnerability is",
      "location": "file:line or function",
      "cwe": "CWE-XXX if applicable",
      "remediation": "How to fix it",
      "references": ["link to more info"]
    }
  ],
  "securePatterns": ["Good security practices found in the code"],
  "recommendations": ["General security recommendations"]
}

Focus on real security issues. Check for:
- Injection vulnerabilities (SQL, Command, XSS)
- Authentication/Authorization issues
- Sensitive data exposure
- Insecure configurations
- Known vulnerable patterns`;

export async function scanSecurity(
  code: string,
  filename: string
): Promise<SecurityScanResult> {
  console.log(chalk.cyan(`[Security] Scanning ${filename}...`));

  const prompt = SECURITY_SCAN_PROMPT
    .replace('{filename}', filename)
    .replace('{code}', code);

  try {
    const model = genAI.getGenerativeModel({
      model: QUALITY_MODEL,
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    const jsonStr = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(jsonStr);

    // Add IDs
    const vulnerabilities = (parsed.vulnerabilities || []).map((v: any, i: number) => ({
      ...v,
      id: `vuln-${i + 1}`
    }));

    const criticalCount = vulnerabilities.filter((v: any) => v.severity === 'critical').length;
    const highCount = vulnerabilities.filter((v: any) => v.severity === 'high').length;

    if (criticalCount > 0) {
      console.log(chalk.red(`[Security] CRITICAL: ${criticalCount} critical vulnerabilities found!`));
    } else if (highCount > 0) {
      console.log(chalk.yellow(`[Security] WARNING: ${highCount} high severity issues found`));
    } else {
      console.log(chalk.green(`[Security] Risk level: ${parsed.riskLevel}`));
    }

    return {
      file: filename,
      riskLevel: parsed.riskLevel || 'low',
      vulnerabilities,
      securePatterns: parsed.securePatterns || [],
      recommendations: parsed.recommendations || []
    };
  } catch (error: any) {
    console.log(chalk.yellow(`[Security] Scan failed: ${error.message}`));
    return {
      file: filename,
      riskLevel: 'low',
      vulnerabilities: [],
      securePatterns: [],
      recommendations: []
    };
  }
}

// ============================================================
// #37: DEPENDENCY ANALYSIS
// Analyzes project dependencies
// ============================================================

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development';
  isOutdated: boolean;
  latestVersion?: string;
  hasVulnerabilities: boolean;
  vulnerabilities?: { severity: string; description: string }[];
  license?: string;
  size?: string;
}

export interface DependencyAnalysis {
  projectPath: string;
  totalDependencies: number;
  outdatedCount: number;
  vulnerableCount: number;
  dependencies: DependencyInfo[];
  recommendations: string[];
  unusedDependencies?: string[];
}

export async function analyzeDependencies(
  packageJsonPath: string
): Promise<DependencyAnalysis> {
  console.log(chalk.cyan(`[Dependencies] Analyzing ${packageJsonPath}...`));

  try {
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(content);

    const dependencies: DependencyInfo[] = [];
    const recommendations: string[] = [];

    // Process dependencies
    const processDeps = (deps: Record<string, string>, type: 'production' | 'development') => {
      for (const [name, version] of Object.entries(deps || {})) {
        dependencies.push({
          name,
          version: version as string,
          type,
          isOutdated: false,  // Would need npm registry API
          hasVulnerabilities: false  // Would need npm audit
        });
      }
    };

    processDeps(pkg.dependencies, 'production');
    processDeps(pkg.devDependencies, 'development');

    // Basic recommendations
    if (dependencies.length > 50) {
      recommendations.push('Consider reducing dependencies to minimize attack surface');
    }

    const prodCount = dependencies.filter(d => d.type === 'production').length;
    const devCount = dependencies.filter(d => d.type === 'development').length;

    console.log(chalk.green(`[Dependencies] Found ${prodCount} prod, ${devCount} dev dependencies`));

    return {
      projectPath: packageJsonPath,
      totalDependencies: dependencies.length,
      outdatedCount: 0,
      vulnerableCount: 0,
      dependencies,
      recommendations
    };
  } catch (error: any) {
    console.log(chalk.yellow(`[Dependencies] Analysis failed: ${error.message}`));
    return {
      projectPath: packageJsonPath,
      totalDependencies: 0,
      outdatedCount: 0,
      vulnerableCount: 0,
      dependencies: [],
      recommendations: []
    };
  }
}

// ============================================================
// #38: API MOCKING
// Re-exported from ./developer/ApiMocking.ts
// ============================================================

export {
  generateMockEndpoints,
  generateMockData,
  generateMockList,
  generateMockServer,
  generateMockHandler,
  formatMockApiConfig,
  type MockEndpoint,
  type MockApiConfig,
  type ApiEndpointSpec,
  type MockServerOptions
} from './developer/ApiMocking.js';

// ============================================================
// #39: ENVIRONMENT MANAGEMENT
// Manages different environment configurations
// ============================================================

export interface EnvironmentConfig {
  name: string;
  variables: Record<string, string>;
  secrets: string[];  // Variable names that are secrets
  inherit?: string;   // Parent environment to inherit from
}

export interface EnvironmentManager {
  environments: Map<string, EnvironmentConfig>;
  current: string;
}

export class EnvManager {
  private environments: Map<string, EnvironmentConfig> = new Map();
  private current: string = 'development';
  private persistPath: string;

  constructor(persistPath?: string) {
    this.persistPath = persistPath || path.join(process.cwd(), '.gemini', 'environments.json');
  }

  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.persistPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.environments = new Map(Object.entries(parsed.environments || {}));
      this.current = parsed.current || 'development';
      console.log(chalk.gray(`[EnvManager] Loaded ${this.environments.size} environments`));
    } catch {
      // Create default environments
      this.createDefaultEnvironments();
    }
  }

  private createDefaultEnvironments(): void {
    this.environments.set('development', {
      name: 'development',
      variables: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        API_URL: 'http://localhost:3000'
      },
      secrets: ['API_KEY', 'DATABASE_URL']
    });

    this.environments.set('staging', {
      name: 'staging',
      variables: {
        NODE_ENV: 'staging',
        LOG_LEVEL: 'info',
        API_URL: 'https://staging.example.com'
      },
      secrets: ['API_KEY', 'DATABASE_URL'],
      inherit: 'development'
    });

    this.environments.set('production', {
      name: 'production',
      variables: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn',
        API_URL: 'https://api.example.com'
      },
      secrets: ['API_KEY', 'DATABASE_URL', 'ENCRYPTION_KEY']
    });
  }

  createEnvironment(name: string, config: Partial<EnvironmentConfig>): EnvironmentConfig {
    const env: EnvironmentConfig = {
      name,
      variables: config.variables || {},
      secrets: config.secrets || [],
      inherit: config.inherit
    };
    this.environments.set(name, env);
    console.log(chalk.cyan(`[EnvManager] Created environment: ${name}`));
    return env;
  }

  switchEnvironment(name: string): boolean {
    if (!this.environments.has(name)) {
      console.log(chalk.red(`[EnvManager] Environment not found: ${name}`));
      return false;
    }
    this.current = name;
    console.log(chalk.green(`[EnvManager] Switched to: ${name}`));
    return true;
  }

  getVariables(envName?: string): Record<string, string> {
    const name = envName || this.current;
    const env = this.environments.get(name);
    if (!env) return {};

    let variables = { ...env.variables };

    // Inherit from parent
    if (env.inherit) {
      const parent = this.getVariables(env.inherit);
      variables = { ...parent, ...variables };
    }

    return variables;
  }

  generateEnvFile(envName?: string): string {
    const variables = this.getVariables(envName);
    const env = this.environments.get(envName || this.current);

    const lines: string[] = [];
    lines.push(`# Environment: ${envName || this.current}`);
    lines.push(`# Generated: ${new Date().toISOString()}\n`);

    for (const [key, value] of Object.entries(variables)) {
      if (env?.secrets.includes(key)) {
        lines.push(`${key}=<REDACTED>`);
      } else {
        lines.push(`${key}=${value}`);
      }
    }

    return lines.join('\n');
  }

  async persist(): Promise<void> {
    try {
      const dir = path.dirname(this.persistPath);
      await fs.mkdir(dir, { recursive: true });

      const data = {
        environments: Object.fromEntries(this.environments),
        current: this.current,
        lastSaved: Date.now()
      };
      await fs.writeFile(this.persistPath, JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.log(chalk.yellow(`[EnvManager] Persist failed: ${error.message}`));
    }
  }

  listEnvironments(): string[] {
    return Array.from(this.environments.keys());
  }
}

export const envManager = new EnvManager();

// ============================================================
// #40: MULTI-PROJECT SUPPORT
// Manages multiple projects simultaneously
// ============================================================

export interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  type: 'node' | 'python' | 'rust' | 'go' | 'java' | 'unknown';
  lastAccessed: number;
  config?: Record<string, any>;
  tags?: string[];
}

export interface ProjectWorkspace {
  activeProject: string | null;
  projects: Map<string, ProjectInfo>;
  recentProjects: string[];  // IDs
}

export class MultiProjectManager {
  private workspace: ProjectWorkspace = {
    activeProject: null,
    projects: new Map(),
    recentProjects: []
  };
  private persistPath: string;
  private maxRecent: number = 10;

  constructor(persistPath?: string) {
    this.persistPath = persistPath || path.join(process.cwd(), '.gemini', 'workspace.json');
  }

  async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.persistPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.workspace.projects = new Map(Object.entries(parsed.projects || {}));
      this.workspace.activeProject = parsed.activeProject;
      this.workspace.recentProjects = parsed.recentProjects || [];
      console.log(chalk.gray(`[ProjectManager] Loaded ${this.workspace.projects.size} projects`));
    } catch {
      // Fresh start
    }
  }

  async addProject(projectPath: string, name?: string): Promise<ProjectInfo> {
    const resolvedPath = path.resolve(projectPath);
    const type = await this.detectProjectType(resolvedPath);

    const project: ProjectInfo = {
      id: crypto.randomUUID(),
      name: name || path.basename(resolvedPath),
      path: resolvedPath,
      type,
      lastAccessed: Date.now()
    };

    this.workspace.projects.set(project.id, project);
    this.workspace.activeProject = project.id;
    this.addToRecent(project.id);

    console.log(chalk.cyan(`[ProjectManager] Added project: ${project.name} (${type})`));
    return project;
  }

  private async detectProjectType(projectPath: string): Promise<ProjectInfo['type']> {
    const checks = [
      { file: 'package.json', type: 'node' as const },
      { file: 'requirements.txt', type: 'python' as const },
      { file: 'pyproject.toml', type: 'python' as const },
      { file: 'Cargo.toml', type: 'rust' as const },
      { file: 'go.mod', type: 'go' as const },
      { file: 'pom.xml', type: 'java' as const },
      { file: 'build.gradle', type: 'java' as const }
    ];

    for (const check of checks) {
      try {
        await fs.access(path.join(projectPath, check.file));
        return check.type;
      } catch {
        // File doesn't exist
      }
    }

    return 'unknown';
  }

  switchProject(projectId: string): boolean {
    if (!this.workspace.projects.has(projectId)) {
      console.log(chalk.red(`[ProjectManager] Project not found: ${projectId}`));
      return false;
    }

    const project = this.workspace.projects.get(projectId)!;
    project.lastAccessed = Date.now();
    this.workspace.activeProject = projectId;
    this.addToRecent(projectId);

    console.log(chalk.green(`[ProjectManager] Switched to: ${project.name}`));
    return true;
  }

  private addToRecent(projectId: string): void {
    this.workspace.recentProjects = this.workspace.recentProjects.filter(id => id !== projectId);
    this.workspace.recentProjects.unshift(projectId);
    if (this.workspace.recentProjects.length > this.maxRecent) {
      this.workspace.recentProjects.pop();
    }
  }

  getActiveProject(): ProjectInfo | null {
    if (!this.workspace.activeProject) return null;
    return this.workspace.projects.get(this.workspace.activeProject) || null;
  }

  listProjects(): ProjectInfo[] {
    return Array.from(this.workspace.projects.values())
      .sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  getRecentProjects(): ProjectInfo[] {
    return this.workspace.recentProjects
      .map(id => this.workspace.projects.get(id))
      .filter(Boolean) as ProjectInfo[];
  }

  removeProject(projectId: string): boolean {
    if (!this.workspace.projects.has(projectId)) return false;

    this.workspace.projects.delete(projectId);
    this.workspace.recentProjects = this.workspace.recentProjects.filter(id => id !== projectId);

    if (this.workspace.activeProject === projectId) {
      this.workspace.activeProject = this.workspace.recentProjects[0] || null;
    }

    console.log(chalk.yellow(`[ProjectManager] Removed project: ${projectId}`));
    return true;
  }

  async persist(): Promise<void> {
    try {
      const dir = path.dirname(this.persistPath);
      await fs.mkdir(dir, { recursive: true });

      const data = {
        projects: Object.fromEntries(this.workspace.projects),
        activeProject: this.workspace.activeProject,
        recentProjects: this.workspace.recentProjects,
        lastSaved: Date.now()
      };
      await fs.writeFile(this.persistPath, JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.log(chalk.yellow(`[ProjectManager] Persist failed: ${error.message}`));
    }
  }
}

export const projectManager = new MultiProjectManager();

// ============================================================
// Initialization
// ============================================================

export async function initDeveloperTools(): Promise<void> {
  console.log(chalk.cyan('[DeveloperTools] Initializing...'));

  await Promise.all([
    envManager.initialize(),
    projectManager.initialize()
  ]);

  console.log(chalk.green('[DeveloperTools] Ready'));
}

// ============================================================
// Default Export
// ============================================================

// Import from refactored modules
import { reviewCode, formatCodeReview } from './developer/CodeReview.js';
import { generateTests, formatGeneratedTests } from './developer/TestGeneration.js';
import { generateDocumentation, formatDocumentation } from './developer/DocumentationGen.js';
import { analyzeRefactoring } from './developer/RefactoringAnalysis.js';
import { profilePerformance } from './developer/PerformanceProfiling.js';
import { generateMockEndpoints, generateMockServer } from './developer/ApiMocking.js';

export default {
  // #31 Code Review
  reviewCode,
  formatCodeReview,

  // #32 Test Generation
  generateTests,
  formatGeneratedTests,

  // #33 Documentation Generation
  generateDocumentation,
  formatDocumentation,

  // #34 Refactoring Suggestions
  analyzeRefactoring,

  // #35 Performance Profiling
  profilePerformance,

  // #36 Security Scanning
  scanSecurity,

  // #37 Dependency Analysis
  analyzeDependencies,

  // #38 API Mocking
  generateMockEndpoints,
  generateMockServer,

  // #39 Environment Management
  EnvManager,
  envManager,

  // #40 Multi-Project Support
  MultiProjectManager,
  projectManager,

  // Init
  initDeveloperTools
};
