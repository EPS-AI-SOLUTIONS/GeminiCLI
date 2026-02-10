/**
 * ProactiveSuggestions.ts - Feature #24: Proactive Suggestions
 *
 * Suggests next steps and improvements based on context.
 * Analyzes errors, actions, and files to provide helpful recommendations.
 *
 * Part of ConversationLayer refactoring - extracted from lines 393-539
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';

// ============================================================
// Types & Interfaces
// ============================================================

export interface Suggestion {
  id: string;
  type: 'improvement' | 'warning' | 'tip' | 'followup';
  priority: 'low' | 'medium' | 'high';
  message: string;
  action?: string;
  relatedFiles?: string[];
}

export interface SuggestionContext {
  lastAction: string;
  result: string;
  files?: string[];
  errors?: string[];
}

// ============================================================
// ProactiveSuggestions Class
// ============================================================

export class ProactiveSuggestions {
  private suggestions: Suggestion[] = [];
  private maxSuggestions: number = 10;

  async analyze(context: SuggestionContext): Promise<Suggestion[]> {
    this.suggestions = [];

    // Error-based suggestions
    if (context.errors && context.errors.length > 0) {
      for (const error of context.errors) {
        this.addErrorSuggestion(error);
      }
    }

    // Action-based suggestions
    await this.addActionBasedSuggestions(context.lastAction, context.result);

    // File-based suggestions
    if (context.files) {
      await this.addFileBasedSuggestions(context.files);
    }

    return this.suggestions.slice(0, this.maxSuggestions);
  }

  private addErrorSuggestion(error: string): void {
    // TypeScript errors
    if (error.includes('TS')) {
      this.suggestions.push({
        id: crypto.randomUUID(),
        type: 'warning',
        priority: 'high',
        message: 'Znaleziono bledy TypeScript',
        action: 'Uruchom `npm run build` aby zobaczyc pelna liste bledow',
      });
    }

    // Import errors
    if (error.includes('Cannot find module') || error.includes('import')) {
      this.suggestions.push({
        id: crypto.randomUUID(),
        type: 'tip',
        priority: 'medium',
        message: 'Brakuje zaleznosci',
        action: 'Sprawdz czy wszystkie importy sa poprawne i zainstaluj brakujace pakiety',
      });
    }

    // Syntax errors
    if (error.includes('SyntaxError') || error.includes('Unexpected token')) {
      this.suggestions.push({
        id: crypto.randomUUID(),
        type: 'warning',
        priority: 'high',
        message: 'Blad skladni w kodzie',
        action: 'Sprawdz ostatnio zmieniony plik pod katem literowek i brakujacych znakow',
      });
    }

    // Runtime errors
    if (error.includes('TypeError') || error.includes('ReferenceError')) {
      this.suggestions.push({
        id: crypto.randomUUID(),
        type: 'warning',
        priority: 'high',
        message: 'Blad uruchomieniowy',
        action: 'Sprawdz typy danych i czy wszystkie zmienne sa zdefiniowane',
      });
    }
  }

  private async addActionBasedSuggestions(action: string, _result: string): Promise<void> {
    // After code generation
    if (action.includes('napisz') || action.includes('stwórz') || action.includes('generate')) {
      this.suggestions.push({
        id: crypto.randomUUID(),
        type: 'followup',
        priority: 'medium',
        message: 'Rozwaz dodanie testow jednostkowych',
        action: 'Popros o wygenerowanie testow dla nowego kodu',
      });
    }

    // After fixing bugs
    if (action.includes('napraw') || action.includes('fix') || action.includes('debug')) {
      this.suggestions.push({
        id: crypto.randomUUID(),
        type: 'tip',
        priority: 'low',
        message: 'Sprawdz czy podobne bledy nie wystepuja w innych miejscach',
        action: 'Uzyj grep/search aby znalezc podobne wzorce',
      });
    }

    // After refactoring
    if (action.includes('refaktor') || action.includes('refactor')) {
      this.suggestions.push({
        id: crypto.randomUUID(),
        type: 'followup',
        priority: 'high',
        message: 'Uruchom testy po refaktoryzacji',
        action: 'Wykonaj pelen zestaw testow aby upewnic sie, ze nic nie zepsuto',
      });
    }

    // After adding dependencies
    if (action.includes('install') || action.includes('npm') || action.includes('yarn')) {
      this.suggestions.push({
        id: crypto.randomUUID(),
        type: 'tip',
        priority: 'low',
        message: 'Sprawdz plik lock po instalacji',
        action: 'Upewnij sie, ze package-lock.json jest zaktualizowany',
      });
    }
  }

  private async addFileBasedSuggestions(files: string[]): Promise<void> {
    for (const file of files) {
      // Large files
      try {
        const stats = await fs.stat(file);
        if (stats.size > 50000) {
          // 50KB
          this.suggestions.push({
            id: crypto.randomUUID(),
            type: 'improvement',
            priority: 'low',
            message: `Plik ${path.basename(file)} jest duzy (${(stats.size / 1024).toFixed(1)}KB)`,
            action: 'Rozwaz podzielenie na mniejsze moduly',
            relatedFiles: [file],
          });
        }
      } catch {
        // File doesn't exist or can't be accessed
      }

      // Missing tests
      if (file.endsWith('.ts') && !file.includes('.test.') && !file.includes('.spec.')) {
        const testFile = file.replace('.ts', '.test.ts');
        try {
          await fs.access(testFile);
        } catch {
          this.suggestions.push({
            id: crypto.randomUUID(),
            type: 'improvement',
            priority: 'low',
            message: `Brak testow dla ${path.basename(file)}`,
            action: `Rozwaz utworzenie ${path.basename(testFile)}`,
            relatedFiles: [file],
          });
        }
      }

      // Config files
      if (file.endsWith('.json') && (file.includes('config') || file.includes('settings'))) {
        this.suggestions.push({
          id: crypto.randomUUID(),
          type: 'tip',
          priority: 'low',
          message: `Zmodyfikowano plik konfiguracyjny ${path.basename(file)}`,
          action: 'Sprawdz czy zmiany nie wplyna na inne czesci systemu',
          relatedFiles: [file],
        });
      }
    }
  }

  getSuggestions(): Suggestion[] {
    return [...this.suggestions];
  }

  clearSuggestions(): void {
    this.suggestions = [];
  }

  /**
   * Add a custom suggestion
   */
  addSuggestion(suggestion: Omit<Suggestion, 'id'>): Suggestion {
    const fullSuggestion: Suggestion = {
      ...suggestion,
      id: crypto.randomUUID(),
    };
    this.suggestions.push(fullSuggestion);
    return fullSuggestion;
  }

  /**
   * Format suggestions for display
   */
  formatSuggestions(): string {
    if (this.suggestions.length === 0) {
      return '';
    }

    const lines: string[] = [chalk.cyan('Sugestie:')];

    for (const s of this.suggestions) {
      const icon =
        s.type === 'warning'
          ? '!'
          : s.type === 'improvement'
            ? '+'
            : s.type === 'followup'
              ? '>'
              : '*';
      const color =
        s.priority === 'high' ? chalk.red : s.priority === 'medium' ? chalk.yellow : chalk.gray;
      lines.push(color(`  [${icon}] ${s.message}`));
      if (s.action) {
        lines.push(chalk.gray(`      -> ${s.action}`));
      }
    }

    return lines.join('\n');
  }
}

// ============================================================
// Default Instance
// ============================================================

export const proactiveSuggestions = new ProactiveSuggestions();
