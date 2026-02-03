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
// Feature #31: Code Review
// ============================================================
export {
  reviewCode,
  formatCodeReview,
  detectLanguage,
  type CodeReviewIssue,
  type CodeReviewResult
} from './CodeReview.js';

// ============================================================
// Feature #32: Test Generation
// ============================================================
export {
  generateTests,
  formatGeneratedTests,
  generateTestFileContent,
  getDefaultTestFramework,
  getTestFileName,
  type GeneratedTest,
  type TestGenerationResult,
  type TestGenerationOptions
} from './TestGeneration.js';

// ============================================================
// Feature #33: Documentation Generation
// ============================================================
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
} from './DocumentationGen.js';

// ============================================================
// Feature #34: Refactoring Analysis
// ============================================================
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
} from './RefactoringAnalysis.js';

// ============================================================
// Feature #35: Performance Profiling
// ============================================================
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
} from './PerformanceProfiling.js';

// ============================================================
// Feature #36: Security Scanning
// ============================================================
export {
  scanSecurity,
  formatSecurityScan,
  type SecurityVulnerability,
  type SecurityScanResult
} from './SecurityScanning.js';

// ============================================================
// Feature #37: Dependency Analysis
// ============================================================
export {
  analyzeDependencies,
  groupDependenciesByType,
  findDependencies,
  formatDependencyAnalysis,
  generateDependencyReport,
  type DependencyInfo,
  type DependencyAnalysis
} from './DependencyAnalysis.js';

// ============================================================
// Feature #38: API Mocking
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
} from './ApiMocking.js';

// ============================================================
// Feature #39: Environment Management
// ============================================================
export {
  EnvManager,
  envManager,
  formatEnvironments,
  type EnvironmentConfig,
  type EnvironmentManagerState,
  type EnvironmentValidationResult
} from './EnvironmentManager.js';

// ============================================================
// Feature #40: Multi-Project Support
// ============================================================
export {
  MultiProjectManager,
  projectManager,
  formatProjectList,
  formatRecentProjects,
  type ProjectType,
  type ProjectInfo,
  type ProjectWorkspace,
  type ProjectFilter
} from './MultiProjectManager.js';

// ============================================================
// Default export with all modules
// ============================================================
import CodeReview from './CodeReview.js';
import TestGeneration from './TestGeneration.js';
import DocumentationGen from './DocumentationGen.js';
import RefactoringAnalysis from './RefactoringAnalysis.js';
import PerformanceProfiling from './PerformanceProfiling.js';
import SecurityScanning from './SecurityScanning.js';
import DependencyAnalysisModule from './DependencyAnalysis.js';
import ApiMocking from './ApiMocking.js';
import EnvironmentManagerModule from './EnvironmentManager.js';
import MultiProjectManagerModule from './MultiProjectManager.js';

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
  MultiProjectManager: MultiProjectManagerModule
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
  await Promise.all([
    envManager.initialize(),
    projectManager.initialize()
  ]);
}
