/**
 * Dependency Injection Container for GeminiHydra
 *
 * A lightweight service container that provides:
 * - Singleton management
 * - Factory registration
 * - Lazy initialization
 * - Service resolution
 *
 * This replaces global singletons with a testable, configurable container.
 *
 * @example
 * ```typescript
 * // Register services
 * container.singleton('mcpManager', () => new MCPManager());
 * container.singleton('circuitBreaker', () => new CircuitBreaker());
 *
 * // Resolve services
 * const mcp = container.resolve<MCPManager>('mcpManager');
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export type Factory<T> = () => T;
export type AsyncFactory<T> = () => Promise<T>;

export interface ServiceDescriptor<T = unknown> {
  factory: Factory<T> | AsyncFactory<T>;
  singleton: boolean;
  instance?: T;
  async: boolean;
}

export interface ContainerInterface {
  /** Register a transient service (new instance per resolve) */
  register<T>(key: string, factory: Factory<T>): void;

  /** Register a singleton service (same instance per resolve) */
  singleton<T>(key: string, factory: Factory<T>): void;

  /** Register an async singleton service */
  singletonAsync<T>(key: string, factory: AsyncFactory<T>): void;

  /** Resolve a service by key */
  resolve<T>(key: string): T;

  /** Resolve an async service by key */
  resolveAsync<T>(key: string): Promise<T>;

  /** Check if a service is registered */
  has(key: string): boolean;

  /** Get all registered service keys */
  keys(): string[];

  /** Reset all singleton instances (for testing) */
  reset(): void;

  /** Remove a service registration */
  remove(key: string): boolean;
}

// =============================================================================
// CONTAINER IMPLEMENTATION
// =============================================================================

class Container implements ContainerInterface {
  private services: Map<string, ServiceDescriptor> = new Map();

  /**
   * Register a transient service (new instance on each resolve)
   */
  register<T>(key: string, factory: Factory<T>): void {
    this.services.set(key, {
      factory,
      singleton: false,
      async: false,
    });
  }

  /**
   * Register a singleton service (shared instance)
   */
  singleton<T>(key: string, factory: Factory<T>): void {
    this.services.set(key, {
      factory,
      singleton: true,
      async: false,
    });
  }

  /**
   * Register an async singleton service
   */
  singletonAsync<T>(key: string, factory: AsyncFactory<T>): void {
    this.services.set(key, {
      factory,
      singleton: true,
      async: true,
    });
  }

  /**
   * Resolve a service by key
   */
  resolve<T>(key: string): T {
    const descriptor = this.services.get(key);

    if (!descriptor) {
      throw new Error(`[Container] Service not registered: ${key}`);
    }

    if (descriptor.async) {
      throw new Error(`[Container] Service "${key}" is async. Use resolveAsync() instead.`);
    }

    if (descriptor.singleton) {
      if (descriptor.instance === undefined) {
        descriptor.instance = (descriptor.factory as Factory<T>)();
      }
      return descriptor.instance as T;
    }

    return (descriptor.factory as Factory<T>)();
  }

  /**
   * Resolve an async service by key
   */
  async resolveAsync<T>(key: string): Promise<T> {
    const descriptor = this.services.get(key);

    if (!descriptor) {
      throw new Error(`[Container] Service not registered: ${key}`);
    }

    if (descriptor.singleton) {
      if (descriptor.instance === undefined) {
        if (descriptor.async) {
          descriptor.instance = await (descriptor.factory as AsyncFactory<T>)();
        } else {
          descriptor.instance = (descriptor.factory as Factory<T>)();
        }
      }
      return descriptor.instance as T;
    }

    if (descriptor.async) {
      return (descriptor.factory as AsyncFactory<T>)();
    }
    return (descriptor.factory as Factory<T>)();
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Get all registered service keys
   */
  keys(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Reset all singleton instances (useful for testing)
   */
  reset(): void {
    for (const descriptor of this.services.values()) {
      descriptor.instance = undefined;
    }
  }

  /**
   * Remove a service registration
   */
  remove(key: string): boolean {
    return this.services.delete(key);
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.services.clear();
  }
}

// =============================================================================
// SERVICE KEYS (type-safe keys for common services)
// =============================================================================

export const ServiceKeys = {
  // MCP Services
  MCP_MANAGER: 'mcpManager',
  MCP_TOOL_REGISTRY: 'mcpToolRegistry',
  MCP_CIRCUIT_BREAKER: 'mcpCircuitBreaker',

  // Execution Services
  RESOURCE_SCHEDULER: 'resourceScheduler',
  DEGRADATION_MANAGER: 'degradationManager',
  TASK_TEMPLATE_MANAGER: 'taskTemplateManager',
  EXECUTION_PROFILER: 'executionProfiler',
  CHECKPOINT_MANAGER: 'checkpointManager',
  PARTIAL_MANAGER: 'partialManager',

  // Memory Services
  VECTOR_STORE: 'vectorStore',
  SESSION_CACHE: 'sessionCache',
  CODEBASE_MEMORY: 'codebaseMemory',
  PROJECT_MEMORY: 'projectMemory',

  // Core Services
  OLLAMA_MANAGER: 'ollamaManager',
  GEMINI_SEMAPHORE: 'geminiSemaphore',
  OLLAMA_SEMAPHORE: 'ollamaSemaphore',

  // Config
  CONFIG: 'config',
} as const;

export type ServiceKey = (typeof ServiceKeys)[keyof typeof ServiceKeys];

// =============================================================================
// GLOBAL CONTAINER INSTANCE
// =============================================================================

/**
 * Global container instance
 *
 * Use this for application-wide service registration and resolution.
 * For testing, create a new Container() instance.
 */
export const container = new Container();

// =============================================================================
// DECORATOR HELPERS (for future use with TypeScript decorators)
// =============================================================================

/**
 * Helper to create a typed resolver function
 *
 * @example
 * ```typescript
 * const getMcpManager = createResolver<MCPManager>(ServiceKeys.MCP_MANAGER);
 * const manager = getMcpManager();
 * ```
 */
export function createResolver<T>(key: string): () => T {
  return () => container.resolve<T>(key);
}

/**
 * Helper to create a typed async resolver function
 */
export function createAsyncResolver<T>(key: string): () => Promise<T> {
  return () => container.resolveAsync<T>(key);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Container };

export default container;
