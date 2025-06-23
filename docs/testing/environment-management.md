# Test Environment Management

This document explains how to properly manage environment variables during testing to ensure they are restored after test completion.

## Problem

When tests modify environment variables (especially API keys), they can leave the system in an inconsistent state where:

- API keys are set to test values (`sk-ant-test123`) instead of real values
- Other environment variables are modified and not restored
- Subsequent CLI usage fails due to invalid API keys

## Solution

The AIA CLI project uses a comprehensive test setup that:

1. Backs up original environment variables before tests
2. Sets mock values for testing
3. Provides utilities for test-specific environment management
4. Restores original values after all tests complete

## Global Test Setup

The `tests/setup.ts` file automatically:

```typescript
// Store original environment variables
const originalEnv = { ...process.env };

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.AIA_CONFIG_DIR = '/tmp/aia-test';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test123-mock-key-for-testing';
process.env.OPENAI_API_KEY = 'sk-test123-mock-key-for-testing';

// Restore after all tests
afterAll(() => {
  // Restore original environment variables
  Object.keys(process.env).forEach((key) => {
    if (originalEnv[key] !== undefined) {
      process.env[key] = originalEnv[key];
    } else {
      delete process.env[key];
    }
  });
});
```

## Test-Specific Environment Management

For tests that need custom environment variables, use the `setupTestEnv` utility:

```typescript
describe('My test suite', () => {
  let envCleanup: (() => void) | undefined;

  beforeEach(() => {
    // Set up test-specific environment
    envCleanup = setupTestEnv({
      ANTHROPIC_API_KEY: 'sk-ant-custom-test-key',
      NODE_ENV: 'production',
      CUSTOM_VAR: 'test-value',
    });
  });

  afterEach(() => {
    // Clean up environment variables
    if (envCleanup) {
      envCleanup();
      envCleanup = undefined;
    }
  });

  it('should work with custom environment', () => {
    expect(process.env.ANTHROPIC_API_KEY).toBe('sk-ant-custom-test-key');
    // Test code here
  });
});
```

## Best Practices

### ✅ Do:

- Use the global `setupTestEnv` utility for temporary environment changes
- Always call the cleanup function in `afterEach`
- Use descriptive mock API keys that clearly indicate they're for testing
- Document why specific environment variables are needed for tests

### ❌ Don't:

- Directly set `process.env.SOME_VAR = 'value'` without cleanup
- Forget to restore environment variables after tests
- Use real API keys in test files
- Assume environment variables will be automatically restored

## Example: Testing API Key Validation

```typescript
describe('API Key Validation', () => {
  let envCleanup: (() => void) | undefined;

  afterEach(() => {
    if (envCleanup) {
      envCleanup();
    }
  });

  it('should validate Anthropic API key format', () => {
    envCleanup = setupTestEnv({
      ANTHROPIC_API_KEY: 'sk-ant-1234567890abcdef1234567890abcdef',
    });

    const isValid = validateAnthropicKey(process.env.ANTHROPIC_API_KEY);
    expect(isValid).toBe(true);
  });

  it('should reject invalid API key format', () => {
    envCleanup = setupTestEnv({
      ANTHROPIC_API_KEY: 'invalid-key',
    });

    const isValid = validateAnthropicKey(process.env.ANTHROPIC_API_KEY);
    expect(isValid).toBe(false);
  });
});
```

## Verification

After running tests, verify that environment variables are properly restored:

```bash
# Run tests
npm test

# Verify API keys are restored (should show your real keys or undefined)
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
```

## Troubleshooting

If you find that environment variables are not being restored:

1. Check that `tests/setup.ts` is properly included in Jest configuration
2. Ensure all tests use the `setupTestEnv` utility for environment changes
3. Verify that cleanup functions are being called in `afterEach` hooks
4. Run tests with `--verbose` to see detailed execution flow

## Migration Guide

If you have existing tests that set environment variables directly:

### Before:

```typescript
it('should test with custom API key', () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';
  // test code
  // No cleanup - environment variable stays modified!
});
```

### After:

```typescript
it('should test with custom API key', () => {
  const cleanup = setupTestEnv({
    ANTHROPIC_API_KEY: 'sk-ant-test-key',
  });

  try {
    // test code
  } finally {
    cleanup();
  }
});
```

Or better yet, use the recommended pattern with `beforeEach`/`afterEach` hooks shown above.
