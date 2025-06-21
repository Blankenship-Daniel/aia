/**
 * Global test utilities type definitions
 */

declare global {
  /**
   * Helper function to temporarily set environment variables for testing
   * @param env Object with environment variables to set
   * @returns Cleanup function to restore original values
   *
   * @example
   * ```typescript
   * describe('My test', () => {
   *   let cleanup: () => void;
   *
   *   beforeEach(() => {
   *     cleanup = setupTestEnv({
   *       ANTHROPIC_API_KEY: 'sk-ant-custom-test-key',
   *       NODE_ENV: 'production'
   *     });
   *   });
   *
   *   afterEach(() => {
   *     cleanup();
   *   });
   *
   *   it('should work with custom env', () => {
   *     // Test code here
   *   });
   * });
   * ```
   */
  var setupTestEnv: (env: Record<string, string>) => () => void;
}

export {};
