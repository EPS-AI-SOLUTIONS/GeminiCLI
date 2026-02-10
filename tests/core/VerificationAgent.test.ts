/**
 * GeminiHydra - VerificationAgent Unit Tests
 * Keira Metz: Inter-phase quality gate verification logic
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_VERIFICATION_CONFIG,
  VerificationAgent,
  createVerificationAgent,
  type HealingResult,
  type MissionVerdict,
  type PhaseVerdict,
  type VerificationConfig,
} from '../../src/core/VerificationAgent.js';

// ============================================================================
// HELPERS: create mock verdicts for testing aggregation logic
// ============================================================================

function makeVerdict(
  phase: 'A' | 'B' | 'C' | 'D',
  score: number,
  verdict: 'PASS' | 'FAIL' | 'REVIEW' = score >= 70 ? 'PASS' : score >= 40 ? 'REVIEW' : 'FAIL',
): PhaseVerdict {
  return {
    phase,
    score,
    verdict,
    issues: verdict === 'FAIL' ? [`Phase ${phase} failed`] : [],
    strengths: verdict === 'PASS' ? [`Phase ${phase} strong`] : [],
    recommendations: [],
    timestamp: Date.now(),
    verificationTimeMs: 100,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('VerificationAgent', () => {
  describe('DEFAULT_VERIFICATION_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_VERIFICATION_CONFIG.enabled).toBe(true);
      expect(DEFAULT_VERIFICATION_CONFIG.passThreshold).toBe(70);
      expect(DEFAULT_VERIFICATION_CONFIG.reviewThreshold).toBe(40);
      expect(DEFAULT_VERIFICATION_CONFIG.failOnReview).toBe(false);
      expect(DEFAULT_VERIFICATION_CONFIG.verbose).toBe(false);
    });
  });

  describe('createVerificationAgent', () => {
    it('should create with default config', () => {
      const agent = createVerificationAgent();
      const config = agent.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.passThreshold).toBe(70);
    });

    it('should accept custom thresholds', () => {
      const agent = createVerificationAgent({ passThreshold: 80, failOnReview: true });
      const config = agent.getConfig();
      expect(config.passThreshold).toBe(80);
      expect(config.failOnReview).toBe(true);
      // Defaults preserved
      expect(config.reviewThreshold).toBe(40);
    });
  });

  describe('shouldContinue', () => {
    it('should return true for PASS verdict', () => {
      const agent = createVerificationAgent();
      const verdict = makeVerdict('A', 85, 'PASS');
      expect(agent.shouldContinue(verdict)).toBe(true);
    });

    it('should return false for FAIL verdict', () => {
      const agent = createVerificationAgent();
      const verdict = makeVerdict('A', 30, 'FAIL');
      expect(agent.shouldContinue(verdict)).toBe(false);
    });

    it('should return true for REVIEW when failOnReview=false', () => {
      const agent = createVerificationAgent({ failOnReview: false });
      const verdict = makeVerdict('B', 55, 'REVIEW');
      expect(agent.shouldContinue(verdict)).toBe(true);
    });

    it('should return false for REVIEW when failOnReview=true', () => {
      const agent = createVerificationAgent({ failOnReview: true });
      const verdict = makeVerdict('B', 55, 'REVIEW');
      expect(agent.shouldContinue(verdict)).toBe(false);
    });
  });

  describe('generateVerdict (aggregation)', () => {
    it('should return REVIEW with no phase verdicts', () => {
      const agent = createVerificationAgent();
      const mission = agent.generateVerdict();
      expect(mission.overallScore).toBe(0);
      expect(mission.overallVerdict).toBe('REVIEW');
      expect(mission.phaseVerdicts).toHaveLength(0);
      expect(mission.criticalIssues).toContain('No phases were verified');
    });

    it('should return immutable copy of phase verdicts', () => {
      const agent = createVerificationAgent();
      const mission = agent.generateVerdict();
      expect(mission.phaseVerdicts).not.toBe((agent as any).phaseVerdicts);
    });
  });

  describe('reset', () => {
    it('should clear all phase verdicts', () => {
      const agent = createVerificationAgent();
      // Manually push verdicts (testing internal state)
      (agent as any).phaseVerdicts.push(makeVerdict('A', 80));
      (agent as any).phaseVerdicts.push(makeVerdict('B', 75));
      expect(agent.getPhaseVerdicts()).toHaveLength(2);

      agent.reset();
      expect(agent.getPhaseVerdicts()).toHaveLength(0);
    });
  });

  describe('generateVerdict with injected verdicts', () => {
    it('should calculate weighted score for all PASS phases', () => {
      const agent = createVerificationAgent();
      // Inject verdicts directly for testing aggregation
      (agent as any).phaseVerdicts = [
        makeVerdict('A', 80, 'PASS'),
        makeVerdict('B', 90, 'PASS'),
        makeVerdict('C', 70, 'PASS'),
        makeVerdict('D', 85, 'PASS'),
      ];

      const mission = agent.generateVerdict();
      // Weights: A=0.3, B=0.3, C=0.15, D=0.25
      // (80*0.3 + 90*0.3 + 70*0.15 + 85*0.25) / (0.3+0.3+0.15+0.25) = (24+27+10.5+21.25)/1.0 = 82.75
      expect(mission.overallScore).toBe(83); // Math.round(82.75)
      expect(mission.overallVerdict).toBe('PASS');
      expect(mission.criticalIssues).toHaveLength(0);
    });

    it('should downgrade to REVIEW when a phase FAILs even if avg is PASS', () => {
      const agent = createVerificationAgent();
      (agent as any).phaseVerdicts = [
        makeVerdict('A', 95, 'PASS'),
        makeVerdict('B', 20, 'FAIL'), // FAIL but high others compensate average
        makeVerdict('D', 95, 'PASS'),
      ];

      const mission = agent.generateVerdict();
      // Even if weighted avg >= 70, a FAIL phase forces REVIEW
      expect(mission.overallVerdict).not.toBe('PASS');
      expect(mission.criticalIssues.length).toBeGreaterThan(0);
    });

    it('should return FAIL when overall score < reviewThreshold', () => {
      const agent = createVerificationAgent();
      (agent as any).phaseVerdicts = [makeVerdict('A', 20, 'FAIL'), makeVerdict('B', 30, 'FAIL')];

      const mission = agent.generateVerdict();
      expect(mission.overallScore).toBeLessThan(40);
      expect(mission.overallVerdict).toBe('FAIL');
    });

    it('should aggregate critical issues from FAIL phases only', () => {
      const agent = createVerificationAgent();
      (agent as any).phaseVerdicts = [
        makeVerdict('A', 80, 'PASS'),
        makeVerdict('B', 30, 'FAIL'),
        makeVerdict('C', 50, 'REVIEW'),
      ];

      const mission = agent.generateVerdict();
      // Only Phase B (FAIL) issues should be in criticalIssues
      expect(mission.criticalIssues.some((i) => i.includes('[Phase B]'))).toBe(true);
      expect(mission.criticalIssues.some((i) => i.includes('[Phase A]'))).toBe(false);
      expect(mission.criticalIssues.some((i) => i.includes('[Phase C]'))).toBe(false);
    });

    it('should generate meaningful summary', () => {
      const agent = createVerificationAgent();
      (agent as any).phaseVerdicts = [makeVerdict('A', 90, 'PASS'), makeVerdict('D', 75, 'PASS')];

      const mission = agent.generateVerdict();
      expect(mission.summary).toContain('Werdykt misji');
      expect(mission.summary).toContain('PASS');
      expect(mission.summary).toContain('A:PASS');
      expect(mission.summary).toContain('D:PASS');
    });

    it('should handle partial phase coverage (not all 4 phases)', () => {
      const agent = createVerificationAgent();
      (agent as any).phaseVerdicts = [makeVerdict('A', 80, 'PASS')];

      const mission = agent.generateVerdict();
      expect(mission.overallScore).toBe(80); // Only one phase, its score is the total
      expect(mission.overallVerdict).toBe('PASS');
      expect(mission.phaseVerdicts).toHaveLength(1);
    });
  });

  describe('getPhaseVerdicts', () => {
    it('should return readonly array', () => {
      const agent = createVerificationAgent();
      const verdicts = agent.getPhaseVerdicts();
      expect(Array.isArray(verdicts)).toBe(true);
      expect(verdicts).toHaveLength(0);
    });
  });

  describe('HealingResult interface', () => {
    it('should accept valid healing result structure', () => {
      const result: HealingResult = {
        repairCycles: 2,
        repairedTasks: 3,
        lessonsLearned: ['Lesson 1', 'Lesson 2'],
        successRateBefore: 60,
        successRateAfter: 90,
      };
      expect(result.repairCycles).toBe(2);
      expect(result.repairedTasks).toBe(3);
    });

    it('should accept minimal healing result', () => {
      const result: HealingResult = {
        repairCycles: 0,
        repairedTasks: 0,
      };
      expect(result.lessonsLearned).toBeUndefined();
      expect(result.successRateAfter).toBeUndefined();
    });
  });

  describe('VerificationConfig interface', () => {
    it('should merge with defaults correctly', () => {
      const custom: Partial<VerificationConfig> = { passThreshold: 85 };
      const merged = { ...DEFAULT_VERIFICATION_CONFIG, ...custom };
      expect(merged.passThreshold).toBe(85);
      expect(merged.reviewThreshold).toBe(40); // default preserved
      expect(merged.enabled).toBe(true); // default preserved
    });
  });
});
