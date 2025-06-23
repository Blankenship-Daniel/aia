# Jest Migration Guide

## Overview

This guide outlines the migration from the custom TestRunner to Jest for standardized testing in the AIA codebase.

## Current State

- Custom TestRunner in `src/TestRunner.ts`
- Enhanced test setup utilities in `tests/setup.ts`
- 30+ test files using custom test framework

## Migration Benefits

1. **Industry Standard**: Jest is the de facto standard for JavaScript testing
2. **Rich Ecosystem**: Extensive plugin ecosystem and community support
3. **Better IDE Integration**: Enhanced debugging and IntelliSense support
4. **Built-in Features**: Mocking, coverage, snapshot testing out of the box
5. **Performance**: Parallel test execution and optimized runs

## Migration Plan

### Phase 1: Install Jest Dependencies

```bash
npm install --save-dev jest @types/jest ts-jest
```

### Phase 2: Configure Jest

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};
```

### Phase 3: Update Test Files

#### Before (Custom TestRunner):

```typescript
import { TestRunner } from '../src/TestRunner';

const runner = new TestRunner();

runner.registerSuite('Memory Service Tests', async (suite) => {
  suite.test('should load memory', async (context) => {
    const { assert } = context;
    const result = await memoryService.loadMemory();
    assert.truthy(result);
  });
});
```

#### After (Jest):

```typescript
import { describe, test, expect, beforeEach } from '@jest/globals';
import { TestDataManager, EnhancedMockAIProvider } from '../tests/setup';

describe('Memory Service Tests', () => {
  beforeEach(() => {
    TestDataManager.cleanup();
  });

  test('should load memory', async () => {
    const result = await memoryService.loadMemory();
    expect(result).toBeTruthy();
  });
});
```

### Phase 4: Migrate Test Utilities

The enhanced test setup in `tests/setup.ts` provides utilities that bridge the gap:

```typescript
// tests/setup.ts exports are compatible with Jest
import {
  TestDataManager,
  TestAssertions,
  PerformanceTestUtil,
} from '../tests/setup';

describe('Integration Tests', () => {
  test('should create temp files', async () => {
    const tempFile = await TestDataManager.createTempFile('test content');
    const exists = await TestAssertions.fileExists(tempFile);
    expect(exists).toBe(true);
  });
});
```

### Phase 5: Performance and Integration Tests

```typescript
import { PerformanceTestUtil, IntegrationTestHelper } from '../tests/setup';

describe('Performance Tests', () => {
  test('should meet performance benchmarks', async () => {
    const result = await PerformanceTestUtil.benchmark(
      () => expensiveOperation(),
      { maxTime: 1000, iterations: 10 }
    );

    expect(result.averageTime).toBeLessThan(500);
  });
});

describe('Integration Tests', () => {
  test('should handle mock server', async () => {
    const helper = new IntegrationTestHelper();
    const server = await helper.createMockServer(3000, {
      '/api/test': { status: 200, body: { success: true } },
    });

    // Test code here

    await helper.cleanup();
  });
});
```

## Migration Steps

1. **Install Jest**: `npm install --save-dev jest @types/jest ts-jest`

2. **Add Jest configuration**: Create `jest.config.js` with the configuration above

3. **Update package.json scripts**:

   ```json
   {
     "scripts": {
       "test": "jest",
       "test:watch": "jest --watch",
       "test:coverage": "jest --coverage",
       "test:ci": "jest --ci --coverage --watchAll=false"
     }
   }
   ```

4. **Migrate test files one by one**:

   - Start with simple unit tests
   - Move to integration tests
   - Migrate performance tests last

5. **Update CI/CD**:
   - Replace custom test runner commands with Jest
   - Update coverage reporting
   - Configure test result reporting

## Best Practices

### Test Organization

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── performance/    # Performance tests
├── fixtures/       # Test data
└── setup.ts       # Test setup utilities
```

### Naming Conventions

- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- Performance tests: `*.performance.test.ts`

### Mock Strategy

```typescript
// Use Jest mocks for external dependencies
jest.mock('../src/services/AIProvider');

// Use setup utilities for complex scenarios
const mockProvider = new EnhancedMockAIProvider([
  'Mock response 1',
  'Mock response 2',
]);
```

## Validation

After migration, ensure:

1. **All tests pass**: `npm test`
2. **Coverage maintained**: `npm run test:coverage`
3. **Performance benchmarks met**: Run performance test suite
4. **CI/CD pipeline works**: Verify automated test runs

## Rollback Plan

If issues arise:

1. Keep custom TestRunner temporarily
2. Run both systems in parallel
3. Gradual migration file by file
4. Maintain test coverage throughout

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Configuration](https://kulshekhar.github.io/ts-jest/)
- [Jest Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Timeline

- **Week 1**: Setup Jest, migrate 25% of tests
- **Week 2**: Migrate remaining unit tests
- **Week 3**: Migrate integration and performance tests
- **Week 4**: Remove custom TestRunner, finalize CI/CD
