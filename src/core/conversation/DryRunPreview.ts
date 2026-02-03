/**
 * DryRunPreview.ts - Feature #29: Dry-Run Preview
 *
 * Shows what would happen without executing the actual operations.
 * Analyzes task descriptions to predict file operations, commands,
 * and their impact levels.
 *
 * Part of ConversationLayer module extraction.
 */

import chalk from 'chalk';

// ============================================================
// Types & Interfaces
// ============================================================

export type ActionType = 'file_create' | 'file_modify' | 'file_delete' | 'command' | 'api_call';
export type ImpactLevel = 'low' | 'medium' | 'high';
export type TotalImpactLevel = 'low' | 'medium' | 'high' | 'critical';

export interface DryRunAction {
  type: ActionType;
  target: string;
  description: string;
  preview?: string;
  impact: ImpactLevel;
}

export interface DryRunPreview {
  taskDescription: string;
  actions: DryRunAction[];
  totalImpact: TotalImpactLevel;
  warnings: string[];
  estimatedChanges: number;
}

// ============================================================
// Constants
// ============================================================

const IMPACT_SCORES: Record<ImpactLevel, number> = {
  low: 1,
  medium: 2,
  high: 3
};

// ============================================================
// Core Function
// ============================================================

/**
 * Generates a dry-run preview for a task
 * @param taskDescription - Description of the task to preview
 * @param context - Optional additional context
 * @returns DryRunPreview with predicted actions and impact
 */
export async function generateDryRunPreview(
  taskDescription: string,
  context?: string
): Promise<DryRunPreview> {
  const actions: DryRunAction[] = [];
  const warnings: string[] = [];
  const lowerTask = taskDescription.toLowerCase();

  // Analyze task for potential actions

  // File creation operations
  if (lowerTask.includes('stworz') || lowerTask.includes('create') || lowerTask.includes('napisz') || lowerTask.includes('write')) {
    actions.push({
      type: 'file_create',
      target: 'new file(s)',
      description: 'Utworzenie nowych plikow',
      impact: 'low'
    });
  }

  // File modification operations
  if (lowerTask.includes('zmien') || lowerTask.includes('modify') || lowerTask.includes('napraw') || lowerTask.includes('fix') || lowerTask.includes('update')) {
    actions.push({
      type: 'file_modify',
      target: 'existing file(s)',
      description: 'Modyfikacja istniejacych plikow',
      impact: 'medium'
    });
    warnings.push('Zmiany w istniejacych plikach - rozwaz utworzenie punktu rollback');
  }

  // File deletion operations
  if (lowerTask.includes('usun') || lowerTask.includes('delete') || lowerTask.includes('remove')) {
    actions.push({
      type: 'file_delete',
      target: 'file(s)',
      description: 'Usuniecie plikow',
      impact: 'high'
    });
    warnings.push('USUWANIE PLIKOW - upewnij sie, ze masz backup!');
  }

  // NPM/Yarn commands
  if (lowerTask.includes('npm') || lowerTask.includes('install') || lowerTask.includes('build') || lowerTask.includes('yarn')) {
    actions.push({
      type: 'command',
      target: 'npm/yarn',
      description: 'Wykonanie polecen npm/yarn',
      impact: 'medium'
    });
  }

  // Git operations
  if (lowerTask.includes('git') || lowerTask.includes('commit') || lowerTask.includes('push') || lowerTask.includes('merge')) {
    actions.push({
      type: 'command',
      target: 'git',
      description: 'Operacje git',
      impact: 'high'
    });
    warnings.push('Operacje git moga wplynac na historie repozytorium');
  }

  // API calls
  if (lowerTask.includes('api') || lowerTask.includes('request') || lowerTask.includes('fetch') || lowerTask.includes('http')) {
    actions.push({
      type: 'api_call',
      target: 'external API',
      description: 'Wywolanie zewnetrznego API',
      impact: 'medium'
    });
  }

  // Database operations
  if (lowerTask.includes('database') || lowerTask.includes('db') || lowerTask.includes('sql') || lowerTask.includes('migration')) {
    actions.push({
      type: 'command',
      target: 'database',
      description: 'Operacje bazodanowe',
      impact: 'high'
    });
    warnings.push('Operacje bazodanowe moga byc nieodwracalne');
  }

  // Calculate total impact
  const totalScore = actions.reduce((sum, a) => sum + IMPACT_SCORES[a.impact], 0);
  const avgScore = actions.length > 0 ? totalScore / actions.length : 0;

  const totalImpact: TotalImpactLevel =
    avgScore >= 2.5 ? 'critical' :
    avgScore >= 2 ? 'high' :
    avgScore >= 1.5 ? 'medium' : 'low';

  console.log(chalk.cyan(`[DryRun] Preview: ${actions.length} actions, impact: ${totalImpact}`));

  return {
    taskDescription,
    actions,
    totalImpact,
    warnings,
    estimatedChanges: actions.length
  };
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Formats dry-run preview as a human-readable string
 * @param preview - DryRunPreview to format
 * @returns Formatted string
 */
export function formatDryRunPreview(preview: DryRunPreview): string {
  const lines: string[] = [];

  lines.push(`[DRY RUN] Task: ${preview.taskDescription}`);
  lines.push(`Impact: ${preview.totalImpact.toUpperCase()}`);
  lines.push('');

  if (preview.actions.length > 0) {
    lines.push('Planned Actions:');
    for (const action of preview.actions) {
      const impactIcon = action.impact === 'high' ? '[!]' :
                         action.impact === 'medium' ? '[~]' : '[ ]';
      lines.push(`  ${impactIcon} ${action.type}: ${action.description}`);
      lines.push(`      Target: ${action.target}`);
      if (action.preview) {
        lines.push(`      Preview: ${action.preview}`);
      }
    }
  } else {
    lines.push('No actions predicted');
  }

  if (preview.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of preview.warnings) {
      lines.push(`  [!] ${warning}`);
    }
  }

  return lines.join('\n');
}

/**
 * Creates a specific action for dry-run
 * @param type - Action type
 * @param target - Target of the action
 * @param description - Human-readable description
 * @param impact - Impact level
 * @param preview - Optional preview content
 * @returns DryRunAction object
 */
export function createAction(
  type: ActionType,
  target: string,
  description: string,
  impact: ImpactLevel = 'medium',
  preview?: string
): DryRunAction {
  return { type, target, description, impact, preview };
}

/**
 * Calculates impact level from score
 * @param score - Numeric score
 * @returns TotalImpactLevel
 */
export function calculateImpact(score: number): TotalImpactLevel {
  if (score >= 2.5) return 'critical';
  if (score >= 2) return 'high';
  if (score >= 1.5) return 'medium';
  return 'low';
}

/**
 * Checks if a task description suggests destructive operations
 * @param taskDescription - Task description to check
 * @returns true if potentially destructive
 */
export function isDestructive(taskDescription: string): boolean {
  const destructiveKeywords = ['delete', 'remove', 'usun', 'drop', 'reset', 'clear', 'wipe'];
  const lowerTask = taskDescription.toLowerCase();
  return destructiveKeywords.some(kw => lowerTask.includes(kw));
}

// ============================================================
// Exports
// ============================================================

export default {
  generateDryRunPreview,
  formatDryRunPreview,
  createAction,
  calculateImpact,
  isDestructive
};
