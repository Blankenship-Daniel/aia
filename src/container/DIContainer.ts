/**
 * Dependency Injection Container
 * Manages service registration, resolution, and lifecycle
 */

// Type definitions for DI Container
interface ServiceConfig<T = unknown> {
  implementation: (new (...args: unknown[]) => T) | null;
  singleton: boolean;
  dependencies: string[];
  factory: ServiceFactory<T> | null;
  instance: T | null;
  initialized: boolean;
}

interface RegistrationOptions {
  singleton?: boolean;
  dependencies?: string[];
  factory?: ServiceFactory<unknown>;
}

type ServiceFactory<T = unknown> = (container: DIContainer) => T;

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class DIContainer {
  private services: Map<string, ServiceConfig>;
  private singletons: Map<string, unknown>;
  private factories: Map<string, ServiceFactory>;
  private initialized: boolean;

  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
    this.initialized = false;
  }

  /**
   * Register a service with the container
   * @param name - Service name/identifier
   * @param implementation - Service implementation (class constructor or instance)
   * @param options - Registration options
   */
  public register<T = unknown>(
    name: string,
    implementation: (new (...args: unknown[]) => T) | null,
    options: RegistrationOptions = {}
  ): void {
    const config: ServiceConfig<T> = {
      implementation,
      singleton: options.singleton !== false, // Default to singleton
      dependencies: options.dependencies || [],
      factory: (options.factory as ServiceFactory<T>) || null,
      instance: null,
      initialized: false,
    };

    this.services.set(name, config);
  }

  /**
   * Register a factory function for a service
   * @param name - Service name
   * @param factory - Factory function
   * @param options - Registration options
   */
  public registerFactory<T = unknown>(
    name: string,
    factory: ServiceFactory<T>,
    options: RegistrationOptions = {}
  ): void {
    this.register<T>(name, null, {
      ...options,
      factory,
    });
  }

  /**
   * Register a singleton instance
   * @param name - Service name
   * @param instance - Service instance
   */
  public registerInstance<T = unknown>(name: string, instance: T): void {
    const config: ServiceConfig<T> = {
      implementation: null,
      singleton: true,
      dependencies: [],
      factory: null,
      instance,
      initialized: true,
    };

    this.services.set(name, config);
  }

  /**
   * Resolve a service by name
   * @param name - Service name to resolve
   * @returns Service instance
   */
  public resolve<T = unknown>(name: string): T {
    const config = this.services.get(name);
    if (!config) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Return existing singleton instance
    if (config.singleton && config.instance) {
      return config.instance as T;
    }

    // Create new instance
    const instance = this.createInstance<T>(config);

    // Store singleton instance
    if (config.singleton) {
      config.instance = instance;
    }

    return instance;
  }

  /**
   * Create service instance
   * @param config - Service configuration
   * @returns Service instance
   */
  private createInstance<T = unknown>(config: ServiceConfig): T {
    try {
      // Use factory function if provided
      if (config.factory) {
        return config.factory(this) as T;
      }

      // Use existing instance if available
      if (config.instance) {
        return config.instance as T;
      }

      // Create instance from constructor
      if (config.implementation) {
        // Resolve dependencies
        const dependencies = config.dependencies.map((dep) =>
          this.resolve(dep)
        );

        // Create instance with dependencies
        return new config.implementation(...dependencies) as T;
      }

      throw new Error('No implementation or factory provided');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to create instance: ${errorMessage}`);
    }
  }

  /**
   * Initialize all registered services
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Initialize services in dependency order
    const initializationOrder = this.getInitializationOrder();

    for (const serviceName of initializationOrder) {
      await this.initializeService(serviceName);
    }

    this.initialized = true;
  }

  /**
   * Initialize a specific service
   * @param name - Service name to initialize
   */
  public async initializeService(name: string): Promise<void> {
    const config = this.services.get(name);
    if (!config || config.initialized) {
      return;
    }

    // Resolve service instance
    const instance = this.resolve(name);

    // Call initialize method if it exists
    if (instance && typeof (instance as any).initialize === 'function') {
      await (instance as any).initialize();
    }

    config.initialized = true;
  }

  /**
   * Get service initialization order based on dependencies
   * @returns Ordered array of service names
   */
  public getInitializationOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (name: string): void => {
      if (visited.has(name)) {
        return;
      }

      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving '${name}'`);
      }

      visiting.add(name);

      const config = this.services.get(name);
      if (config && config.dependencies) {
        for (const dependency of config.dependencies) {
          visit(dependency);
        }
      }

      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    // Visit all services
    for (const serviceName of Array.from(this.services.keys())) {
      visit(serviceName);
    }

    return order;
  }

  /**
   * Check if service is registered
   * @param name - Service name
   * @returns True if service is registered
   */
  public has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   * @returns Array of service names
   */
  public getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Unregister a service
   * @param name - Service name to unregister
   */
  public unregister(name: string): void {
    this.services.delete(name);
    this.singletons.delete(name);
  }

  /**
   * Clear all registered services
   */
  public clear(): void {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
    this.initialized = false;
  }

  /**
   * Create a child container with inherited services
   * @returns Child container
   */
  public createChild(): DIContainer {
    const child = new DIContainer();

    // Copy service registrations
    for (const [name, config] of Array.from(this.services.entries())) {
      child.services.set(name, { ...config });
    }

    return child;
  }

  /**
   * Dispose of all services and cleanup resources
   */
  public async dispose(): Promise<void> {
    // Dispose services in reverse initialization order
    const disposeOrder = this.getInitializationOrder().reverse();

    for (const serviceName of disposeOrder) {
      await this.disposeService(serviceName);
    }

    this.clear();
  }

  /**
   * Dispose of a specific service
   * @param name - Service name to dispose
   */
  public async disposeService(name: string): Promise<void> {
    const config = this.services.get(name);
    if (!config || !config.instance) {
      return;
    }

    // Call dispose method if it exists
    if (typeof (config.instance as any).dispose === 'function') {
      await (config.instance as any).dispose();
    }

    config.instance = null;
    config.initialized = false;
  }
}

export { ServiceFactory, RegistrationOptions, ValidationResult };
