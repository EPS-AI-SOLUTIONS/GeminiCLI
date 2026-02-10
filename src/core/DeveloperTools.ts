/**
 * @deprecated This file is a backward-compatibility shim.
 * All functionality has been modularized into src/core/developer/.
 *
 * For new code, import directly from './developer/index.js' instead.
 * This re-export file will be removed in a future version.
 *
 * @module DeveloperTools
 */

// Re-export everything from the modular developer subpackage
// Note: detectLanguage is renamed to detectFileLanguage to avoid conflict
// with SemanticChunking.detectLanguage exported from intelligence/index.js
// Backward-compatible alias
// Re-export default for backward compatibility
export {
  type ApiEndpointSpec,
  // Feature #37: Dependency Analysis
  analyzeDependencies,
  // Feature #34: Refactoring Analysis
  analyzeRefactoring,
  type CodeMetrics,
  type CodeReviewIssue,
  type CodeReviewResult,
  calculateSeverityScore,
  calculateTotalEffort,
  type DependencyAnalysis,
  type DependencyInfo,
  type DocEntry,
  type DocParam,
  type DocReturn,
  type DocumentationFormat,
  type DocumentationResult,
  default,
  detectLanguage as detectFileLanguage,
  type EnvironmentConfig,
  type EnvironmentManagerState,
  type EnvironmentValidationResult,
  // Feature #39: Environment Management
  EnvManager,
  envManager,
  filterIssuesByCategory,
  filterSuggestionsByType,
  findDependencies,
  formatCodeReview,
  formatDependencyAnalysis,
  formatDocumentation,
  formatEnvironments,
  formatGeneratedTests,
  formatMockApiConfig,
  formatPerformanceProfile,
  formatProjectList,
  formatRecentProjects,
  formatRefactoringAnalysis,
  formatSecurityScan,
  type GeneratedTest,
  generateDependencyReport,
  // Feature #33: Documentation Generation
  generateDocumentation,
  generateJSDoc,
  generateMockData,
  // Feature #38: API Mocking
  generateMockEndpoints,
  generateMockHandler,
  generateMockList,
  generateMockServer,
  generateTableOfContents,
  generateTestFileContent,
  // Feature #32: Test Generation
  generateTests,
  getDefaultTestFramework,
  getIssueSummaryByCategory,
  getSuggestionDetails,
  getTestFileName,
  groupDependenciesByType,
  hasCriticalIssues,
  // Initialization
  initDeveloperModules,
  initDeveloperModules as initDeveloperTools,
  type MockApiConfig,
  type MockEndpoint,
  type MockServerOptions,
  // Feature #40: Multi-Project Support
  MultiProjectManager,
  type PerformanceCategory,
  type PerformanceHotspot,
  type PerformanceIssue,
  type PerformanceOptimization,
  type PerformanceProfile,
  type PerformanceSeverity,
  type ProjectFilter,
  type ProjectInfo,
  type ProjectType,
  type ProjectWorkspace,
  // Feature #35: Performance Profiling
  profilePerformance,
  projectManager,
  type RefactoringAnalysis,
  type RefactoringEffort,
  type RefactoringPriority,
  type RefactoringSuggestion,
  type RefactoringType,
  // Feature #31: Code Review
  reviewCode,
  type SecurityScanResult,
  type SecurityVulnerability,
  // Feature #36: Security Scanning
  scanSecurity,
  type TestGenerationOptions,
  type TestGenerationResult,
} from './developer/index.js';
