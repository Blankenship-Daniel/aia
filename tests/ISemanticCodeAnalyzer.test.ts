To generate comprehensive Jest tests for the `ISemanticCodeAnalyzer` interface, we need to create a mock implementation of this interface since interfaces in TypeScript do not have concrete implementations. The tests will focus on testing a hypothetical implementation of the `analyzeCodebaseSemantics` method, ensuring it handles both successful and erroneous cases. Below is an example of how you might set up these tests given the requirements and context:

```typescript
import { ISemanticCodeAnalyzer } from '../src/interfaces/ISemanticCodeAnalyzer';
import { createMock } from './__mocks__/createMock';

describe('ISemanticCodeAnalyzer Implementation', () => {
  let semanticCodeAnalyzer: ISemanticCodeAnalyzer;
  const mockIndex = { /* mock index data */ };

  beforeEach(() => {
    // Reset mock for every test
    semanticCodeAnalyzer = createMock<ISemanticCodeAnalyzer>({
      analyzeCodebaseSemantics: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeCodebaseSemantics', () => {
    it('successfully analyzes codebase semantics and returns results', async () => {
      // Arrange
      const expectedResults = { /* mock expected analysis results */ };
      (semanticCodeAnalyzer.analyzeCodebaseSemantics as jest.Mock).mockResolvedValue(expectedResults);

      // Act
      const results = await semanticCodeAnalyzer.analyzeCodebaseSemantics(mockIndex);

      // Assert
      expect(results).toEqual(expectedResults);
      expect(semanticCodeAnalyzer.analyzeCodebaseSemantics).toHaveBeenCalledWith(mockIndex);
      expect(semanticCodeAnalyzer.analyzeCodebaseSemantics).toHaveBeenCalledTimes(1);
    });

    it('handles errors during semantic analysis', async () => {
      // Arrange
      const expectedError = new Error('Analysis failed');
      (semanticCodeAnalyzer.analyzeCodebaseSemantics as jest.Mock).mockRejectedValue(expectedError);

      // Act & Assert
      await expect(semanticCodeAnalyzer.analyzeCodebaseSemantics(mockIndex)).rejects.toThrow('Analysis failed');
      expect(semanticCodeAnalyzer.analyzeCodebaseSemantics).toHaveBeenCalledWith(mockIndex);
      expect(semanticCodeAnalyzer.analyzeCodebaseSemantics).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Explanation

1. **Mocks and Setup:**
   - Using `createMock` utility from `./__mocks__/createMock`, we create a mock implementation of `ISemanticCodeAnalyzer`.
   - The mock utility helps follow the project's mocking conventions.

2. **Describe/It Blocks:**
   - The describe block names `analyzeCodebaseSemantics` function and contains two test scenarios for success and error cases.

3. **Success Scenario:**
   - Uses `mockResolvedValue` to simulate a successful resolution with expected results.
   - Tests if the function returns the correct results and verifies the function was called with the correct parameters.

4. **Error Handling Scenario:**
   - Uses `mockRejectedValue` to simulate an error.
   - Tests if the function throws an error with a specific message and verifies the call count and parameters.

5. **Type Safety:**
   - Type assertions like `as jest.Mock` ensure TypeScript recognizes the mocked method properly.
   - `Promise<any>` returned from `analyzeCodebaseSemantics` is handled in an async/await pattern for clarity.

This setup should align well with your TypeScript project's interface-driven development, comprehensive mocking, and Jest-based test configurations. Adjust the mock data to fit the specifics of your codebase and implementation details.