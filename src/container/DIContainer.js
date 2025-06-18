/**
 * Dependency Injection Container
 * Manages service registration, resolution, and lifecycle
 */
class DIContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.factories = new Map();
    this.initialized = false;
  }

  /**
   * Register a service with the container
   * @param {string} name - Service name/identifier
   * @param {Function|Object} implementation - Service implementation (class constructor or instance)
   * @param {Object} [options] - Registration options
   * @param {boolean} [options.singleton=true] - Whether to create as singleton
   * @param {Array<string>} [options.dependencies] - Service dependencies
   * @param {Function} [options.factory] - Custom factory function
   */
  register(name, implementation, options = {}) {
    const config = {
      implementation,
      singleton: options.singleton !== false, // Default to singleton
      dependencies: options.dependencies || [],
      factory: options.factory || null,
      instance: null,
      initialized: false,
    };

    this.services.set(name, config);
  }

  /**
   * Register a factory function for a service
   * @param {string} name - Service name
   * @param {Function} factory - Factory function
   * @param {Object} [options] - Registration options
   */
  registerFactory(name, factory, options = {}) {
    this.register(name, null, {
      ...options,
      factory,
    });
  }

  /**
   * Register a singleton instance
   * @param {string} name - Service name
   * @param {Object} instance - Service instance
   */
  registerInstance(name, instance) {
    const config = {
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
   * @param {string} name - Service name to resolve
   * @returns {Object} Service instance
   */
  resolve(name) {
    const config = this.services.get(name);
    if (!config) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Return existing singleton instance
    if (config.singleton && config.instance) {
      return config.instance;
    }

    // Create new instance
    const instance = this.createInstance(config);

    // Store singleton instance
    if (config.singleton) {
      config.instance = instance;
    }

    return instance;
  }

  /**
   * Create service instance
   * @param {Object} config - Service configuration
   * @returns {Object} Service instance
   */
  createInstance(config) {
    try {
      // Use factory function if provided
      if (config.factory) {
        return config.factory(this);
      }

      // Use existing instance if available
      if (config.instance) {
        return config.instance;
      }

      // Create instance from constructor
      if (config.implementation) {
        // Resolve dependencies
        const dependencies = config.dependencies.map((dep) =>
          this.resolve(dep)
        );

        // Create instance with dependencies
        return new config.implementation(...dependencies);
      }

      throw new Error('No implementation or factory provided');
    } catch (error) {
      throw new Error(`Failed to create instance: ${error.message}`);
    }
  }

  /**
   * Initialize all registered services
   * @returns {Promise<void>}
   */
  async initialize() {
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
   * @param {string} name - Service name to initialize
   * @returns {Promise<void>}
   */
  async initializeService(name) {
    const config = this.services.get(name);
    if (!config || config.initialized) {
      return;
    }

    // Resolve service instance
    const instance = this.resolve(name);

    // Call initialize method if it exists
    if (instance && typeof instance.initialize === 'function') {
      await instance.initialize();
    }

    config.initialized = true;
  }

  /**
   * Get service initialization order based on dependencies
   * @returns {Array<string>} Ordered array of service names
   */
  getInitializationOrder() {
    const visited = new Set();
    const visiting = new Set();
    const order = [];

    const visit = (name) => {
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
    for (const serviceName of this.services.keys()) {
      visit(serviceName);
    }

    return order;
  }

  /**
   * Check if service is registered
   * @param {string} name - Service name
   * @returns {boolean} True if service is registered
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   * @returns {Array<string>} Array of service names
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
   * Unregister a service
   * @param {string} name - Service name to unregister
   */
  unregister(name) {
    this.services.delete(name);
    this.singletons.delete(name);
  }

  /**
   * Clear all registered services
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.factories.clear();
    this.initialized = false;
  }

  /**
   * Create a child container with inherited services
   * @returns {DIContainer} Child container
   */
  createChild() {
    const child = new DIContainer();

    // Copy service registrations
    for (const [name, config] of this.services) {
      child.services.set(name, { ...config });
    }

    return child;
  }

  /**
   * Dispose of all services and cleanup resources
   * @returns {Promise<void>}
   */
  async dispose() {
    // Dispose services in reverse initialization order
    const disposeOrder = this.getInitializationOrder().reverse();

    for (const serviceName of disposeOrder) {
      await this.disposeService(serviceName);
    }

    this.clear();
  }

  /**
   * Dispose of a specific service
   * @param {string} name - Service name to dispose
   * @returns {Promise<void>}
   */
  async disposeService(name) {
    const config = this.services.get(name);
    if (!config || !config.instance) {
      return;
    }

    // Call dispose method if it exists
    if (typeof config.instance.dispose === 'function') {
      await config.instance.dispose();
    }

    config.instance = null;
    config.initialized = false;
  }
}

module.exports = DIContainer;
