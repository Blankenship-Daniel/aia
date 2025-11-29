Given the requirements and considering the structure of a typical test suite for a TypeScript project using Jest, I can provide you with a set of example tests that align with your project's practices. We'll mock dependencies, follow interface-driven development, and handle different scenarios, including error cases.

Let's create tests for the `ICodebaseSummarizer` interface, focusing on its `generateAISummary` method.

Here's what the test suite could look like:

```typescript
// tests/unit/ICodebaseSummarizer.test.ts

// Importing mocks and necessary utilities
import { ICodebaseSummarizer } from '../../src/interfaces/ICodebaseSummarizer';
import { createMock } from '../__mocks__/mockUtilities';
import { mocked } from 'ts-jest/utils';

// Mock external dependencies if any, otherwise create mock implementations
const mockIndex = { /* Mock structure of the index */ };
const mockSummaryResult = { summary: { /* ...summary content */ }, rawSummary: "Raw summary content" };
const mockError = new Error("Mock error");

describe('ICodebaseSummarizer Interface', () => {
  let codebaseSummarizer: ICodebaseSummarizer;
  
  beforeEach(() => {
    // Setup: Create a mock implementation of the ICodebaseSummarizer
    codebaseSummarizer = createMock<ICodebaseSummarizer>({
      generateAISummary: jest.fn().mockResolvedValue(mockSummaryResult),
    });
  });

  afterEach(() => {
    // Teardown: Clear all mock invocations and implementations
    jest.clearAllMocks();
  });

  describe('generateAISummary Method', () => {
    it('should successfully generate an AI-powered summary', async () => {
      const result = await codebaseSummarizer.generateAISummary(mockIndex);

      // Using type assertions to verify return types
      expect(result).toBeTruthy();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('rawSummary');
      expect(result.rawSummary).toBe('Raw summary content');

      // Asserting mock function calls
      expect(codebaseSummarizer.generateAISummary).toHaveBeenCalledWith(mockIndex);
      expect(codebaseSummarizer.generateAISummary).toHaveBeenCalledTimes(1);
    });

    it('should handle errors correctly during summary generation', async () => {
      // Simulating an error in the mock implementation
      jest.spyOn(codebaseSummarizer, 'generateAISummary').mockRejectedValueOnce(mockError);

      await expect(codebaseSummarizer.generateAISummary(mockIndex)).rejects.toThrow('Mock error');
      expect(codebaseSummarizer.generateAISummary).toHaveBeenCalledWith(mockIndex);
      expect(codebaseSummarizer.generateAISummary).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Key Points:

- **Mock Implementation**: We use `createMock<ICodebaseSummarizer>()` to create a mock with predefined behavior for the `generateAISummary` method.
- **BeforeEach/AfterEach**: Used for setting up the mock implementation and cleaning up mocks after each test to ensure no test interference.
- **Mock Error Handling**: Included a test case to verify how the interface handles errors.
- **Type Assertions**: Ensure the return types are what we expect, leveraging TypeScript's type system.
- **Mock Functions**: Utilize Jest's mocking capabilities (`jest.fn()`, `jest.spyOn()`) to simulate and control the behavior of functions and test their interactions.

Remember to adjust the mock structures and implementation details based on the actual context and requirements of your project.