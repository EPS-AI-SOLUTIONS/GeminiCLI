/**
 * CircuitBreaker - Automatic failure detection and recovery
 * Feature #8: Circuit Breaker Pattern
 */

import chalk from 'chalk';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold?: number;      // Failures before opening
  successThreshold?: number;      // Successes to close from half-open
  timeout?: number;               // Time in OPEN state before trying again (ms)
  onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
};

/**
 * Circuit Breaker for protecting against cascading failures
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number = 0;
  private options: Required<CircuitBreakerOptions>;

  constructor(
    private name: string,
    options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? DEFAULT_OPTIONS.failureThreshold!,
      successThreshold: options.successThreshold ?? DEFAULT_OPTIONS.successThreshold!,
      timeout: options.timeout ?? DEFAULT_OPTIONS.timeout!,
      onStateChange: options.onStateChange ?? ((from, to, name) => {
        console.log(chalk.yellow(`[CircuitBreaker:${name}] ${from} → ${to}`));
      })
    };
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Check if timeout has passed
      if (Date.now() - this.lastFailureTime >= this.options.timeout) {
        this.transitionTo('HALF_OPEN');
      } else {
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.transitionTo('CLOSED');
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.successes = 0;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.options.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      this.options.onStateChange(this.state, newState, this.name);
      this.state = newState;

      if (newState === 'CLOSED') {
        this.failures = 0;
        this.successes = 0;
      } else if (newState === 'HALF_OPEN') {
        this.successes = 0;
      }
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset(): void {
    this.transitionTo('CLOSED');
  }

  getStats(): { state: CircuitState; failures: number; successes: number } {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes
    };
  }
}

/**
 * Circuit Breaker Registry - manage multiple breakers
 */
export class CircuitBreakerRegistry {
  private breakers: Map<string, CircuitBreaker> = new Map();

  getOrCreate(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, options));
    }
    return this.breakers.get(name)!;
  }

  get(name: string): CircuitBreaker | undefined {
    return this.breakers.get(name);
  }

  resetAll(): void {
    this.breakers.forEach(breaker => breaker.reset());
  }

  getAllStats(): Record<string, ReturnType<CircuitBreaker['getStats']>> {
    const stats: Record<string, ReturnType<CircuitBreaker['getStats']>> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }
}

// Global registry
export const circuitBreakerRegistry = new CircuitBreakerRegistry();

export default CircuitBreaker;
