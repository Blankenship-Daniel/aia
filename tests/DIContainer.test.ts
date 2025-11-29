To create comprehensive Jest tests for the `DIContainer` class in your TypeScript CLI project, we'll set up tests following the guidelines such as using mocks, testing main functionality and error scenarios, setting up and tearing down properly, and providing clear descriptions. Given the structure of the `DIContainer`, we'll focus on its core capabilities: service registration, resolution, initialization, lifecycle management, and error handling.

Here's a possible setup for your Jest test file:

```typescript
import { DIContainer, ServiceFactory } from '../src/container/DIContainer';
import { mocked, Mock } from 'jest-mock';

// Mock utilities if available
jest.mock('../src/container/DIContainer');
const DIContainerMock = mocked(DIContainer, true);

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a singleton service by default', () => {
      class TestService {}
      container.register('testService', TestService);

      expect(container.has('testService')).toBe(true);
    });

    it('should register a service with specified dependencies', () => {
      class TestService {}
      container.register('testService', TestService, { dependencies: ['dep1'] });

      expect(container.has('testService')).toBe(true);
    });
  });

  describe('resolve', () => {
    it('should resolve a registered service', () => {
      class TestService {}
      container.register('testService', TestService);

      const service = container.resolve<TestService>('testService');
      expect(service).toBeInstanceOf(TestService);
    });

    it('should throw an error for unregistered service', () => {
      expect(() => container.resolve('nonExistentService')).toThrowError(
        "Service 'nonExistentService' is not registered"
      );
    });

    it('should resolve dependencies for a service', () => {
      class DependentService {
        constructor(public dep: TestService) {}
      }
      class TestService {}

      container.register('testService', TestService);
      container.register('dependentService', DependentService, {
        dependencies: ['testService'],
      });

      const service = container.resolve<DependentService>('dependentService');
      expect(service.dep).toBeInstanceOf(TestService);
    });
  });

  describe('initialize', () => {
    it('should initialize all registered services', async () => {
      const initializeMock = jest.fn();

      class TestService {
        async initialize() {
          initializeMock();
        }
      }
      container.register('testService', TestService);

      await container.initialize();
      expect(initializeMock).toHaveBeenCalled();
    });

    it('should handle circular dependencies with error', async () => {
      class TestService1 {
        constructor(public service2: TestService2) {}
      }
      class TestService2 {
        constructor(public service1: TestService1) {}
      }

      container.register('service1', TestService1, { dependencies: ['service2'] });
      container.register('service2', TestService2, { dependencies: ['service1'] });

      await expect(container.initialize()).rejects.toThrow(
        "Circular dependency detected involving 'service1'"
      );
    });
  });

  describe('dispose', () => {
    it('should dispose all services in reverse initialization order', async () => {
      const disposeMock = jest.fn();

      class TestService {
        async dispose() {
          disposeMock();
        }
      }
      container.register('testService', TestService);
      await container.initialize();

      await container.dispose();
      expect(disposeMock).toHaveBeenCalled();
    });
  });

  describe('has', () => {
    it('should return true if service is registered', () => {
      class Test