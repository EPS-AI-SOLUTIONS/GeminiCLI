/**
 * Developer Tools - Index
 *
 * Re-exports all developer tool modules for convenient importing.
 *
 * Features:
 * - #31: Code Review Agent (CodeReview.ts)
 * - #32: Test Generation (TestGeneration.ts)
 * - #33: Documentation Generation (DocumentationGen.ts)
 * - #34: Refactoring Suggestions (RefactoringAnalysis.ts)
 * - #35: Performance Profiling (PerformanceProfiling.ts)
 * - #36: Security Scanning (SecurityScanning.ts)
 * - #37: Dependency Analysis (DependencyAnalysis.ts)
 * - #38: API Mocking (ApiMocking.ts)
 * - #39: Environment Management (EnvironmentManager.ts)
 * - #40: Multi-Project Support (MultiProjectManager.ts)
 */

// ============================================================
// Feature #38: API Mocking
// ============================================================
export {
  type ApiEndpointSpec,
  formatMockApiConfig,
  generateMockData,
  generateMockEndpoints,
  generateMockHandler,
  generateMockList,
  generateMockServer,
  type MockApiConfig,
  type MockEndpoint,
  type MockServerOptions,
} from './ApiMocking.js';
// ============================================================
// Feature #31: Code Review
// ============================================================
export {
  type CodeReviewIssue,
  type CodeReviewResult,
  detectLanguage,
  formatCodeReview,
  reviewCode,
} from './CodeReview.js';
// ============================================================
// Feature #37: Dependency Analysis
// ============================================================
export {
  analyzeDependencies,
  type DependencyAnalysis,
  type DependencyInfo,
  findDependencies,
  formatDependencyAnalysis,
  generateDependencyReport,
  groupDependenciesByType,
} from './DependencyAnalysis.js';
// ============================================================
// Feature #33: Documentation Generation
// ============================================================
export {
  type DocEntry,
  type DocParam,
  type DocReturn,
  type DocumentationFormat,
  type DocumentationResult,
  formatDocumentation,
  generateDocumentation,
  generateJSDoc,
  generateTableOfContents,
} from './DocumentationGen.js';
// ============================================================
// Feature #39: Environment Management
// ============================================================
export {
  type EnvironmentConfig,
  type EnvironmentManagerState,
  type EnvironmentValidationResult,
  EnvManager,
  envManager,
  formatEnvironments,
} from './EnvironmentManager.js';
// ============================================================
// Feature #40: Multi-Project Support
// ============================================================
export {
  formatProjectList,
  formatRecentProjects,
  MultiProjectManager,
  type ProjectFilter,
  type ProjectInfo,
  type ProjectType,
  type ProjectWorkspace,
  projectManager,
} from './MultiProjectManager.js';
// ============================================================
// Feature #35: Performance Profiling
// ============================================================
export {
  calculateSeverityScore,
  filterIssuesByCategory,
  formatPerformanceProfile,
  getIssueSummaryByCategory,
  hasCriticalIssues,
  type PerformanceCategory,
  type PerformanceHotspot,
  type PerformanceIssue,
  type PerformanceOptimization,
  type PerformanceProfile,
  type PerformanceSeverity,
  profilePerformance,
} from './PerformanceProfiling.js';
// ============================================================
// Feature #34: Refactoring Analysis
// ============================================================
export {
  analyzeRefactoring,
  type CodeMetrics,
  calculateTotalEffort,
  filterSuggestionsByType,
  formatRefactoringAnalysis,
  getSuggestionDetails,
  type RefactoringAnalysis,
  type RefactoringEffort,
  type RefactoringPriority,
  type RefactoringSuggestion,
  type RefactoringType,
} from './RefactoringAnalysis.js';
// ============================================================
// Feature #36: Security Scanning
// ============================================================
export {
  formatSecurityScan,
  type SecurityScanResult,
  type SecurityVulnerability,
  scanSecurity,
} from './SecurityScanning.js';
// ============================================================
// Feature #32: Test Generation
// ============================================================
export {
  formatGeneratedTests,
  type GeneratedTest,
  generateTestFileContent,
  generateTests,
  getDefaultTestFramework,
  getTestFileName,
  type TestGenerationOptions,
  type TestGenerationResult,
} from './TestGeneration.js';

import ApiMocking from './ApiMocking.js';
// ============================================================
// Default export with all modules
// ============================================================
import CodeReview from './CodeReview.js';
import DependencyAnalysisModule from './DependencyAnalysis.js';
import DocumentationGen from './DocumentationGen.js';
import EnvironmentManagerModule from './EnvironmentManager.js';
import MultiProjectManagerModule from './MultiProjectManager.js';
import PerformanceProfiling from './PerformanceProfiling.js';
import RefactoringAnalysis from './RefactoringAnalysis.js';
import SecurityScanning from './SecurityScanning.js';
import TestGeneration from './TestGeneration.js';

export default {
  // Features #31-35 (original)
  CodeReview,
  TestGeneration,
  DocumentationGen,
  RefactoringAnalysis,
  PerformanceProfiling,

  // Features #36-40 (new)
  SecurityScanning,
  DependencyAnalysis: DependencyAnalysisModule,
  ApiMocking,
  EnvironmentManager: EnvironmentManagerModule,
  MultiProjectManager: MultiProjectManagerModule,
};

// ============================================================
// Initialization Helper
// ============================================================
import { envManager } from './EnvironmentManager.js';
import { projectManager } from './MultiProjectManager.js';

/**
 * Initializes all developer tool managers that require persistence loading.
 * Call this at application startup to load saved state for:
 * - Environment configurations
 * - Project workspace
 */
export async function initDeveloperModules(): Promise<void> {
  await Promise.all([envManager.initialize(), projectManager.initialize()]);
}
