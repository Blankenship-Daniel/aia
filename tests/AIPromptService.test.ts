To create comprehensive Jest tests for the `AIPromptService` class in your TypeScript CLI project, we'll follow your specified guidelines. We'll mock external dependencies, use `describe` and `it` blocks with clear, descriptive names, and include `beforeEach` and `afterEach` for setup and teardown.

Here's an example of how you might structure your tests:

```typescript
import { AIPromptService } from '../src/services/AIPromptService';
import prompts from 'prompts';
import { jest } from '@jest/globals';
import * as aiSuggestionServiceMock from '../tests/__mocks__/aiSuggestionServiceMock';

jest.mock('prompts');
jest.mock('../tests/__mocks__/aiSuggestionServiceMock');

describe('AIPromptService', () => {
  let aiPromptService: AIPromptService;
  let mockGetSuggestions: jest.SpyInstance;
  let mockFuzzySearch: jest.SpyInstance;
  let mockPrompts: jest.SpyInstance;

  beforeEach(() => {
    aiPromptService = new AIPromptService();
    mockGetSuggestions = jest.spyOn(aiSuggestionServiceMock, 'getSuggestions');
    mockFuzzySearch = jest.spyOn(aiSuggestionServiceMock, 'fuzzySearch');
    mockPrompts = jest.spyOn(prompts, 'default');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEnhancedInput', () => {
    it('should return the user choice when valid input is provided', async () => {
      const mockChoices = [
        { title: 'Create a new React component', description: 'Generate a component for user profiles.', value: 'react-component' },
        { title: 'Refactor a function', description: 'Improve the authentication logic.', value: 'refactor-auth' },
        { title: 'Write a unit test', description: 'Test the new data processing service.', value: 'unit-test-data' }
      ];

      mockGetSuggestions.mockResolvedValue(mockChoices);
      mockPrompts.mockResolvedValue({ command: 'react-component' });

      const result = await aiPromptService.getEnhancedInput();

      expect(result).toBe('react-component');
      expect(mockGetSuggestions).toHaveBeenCalledTimes(1);
      expect(mockPrompts).toHaveBeenCalledWith(expect.objectContaining({
        type: 'autocomplete',
        name: 'command',
        // ..additional expect statements as necessary
      }));
    });

    it('should handle fuzzy search correctly when input is provided', async () => {
      const mockChoices = [
        { title: 'Create a new React component', description: 'Generate a component for user profiles.', value: 'react-component' }
      ];
      const input = 'react';

      mockGetSuggestions.mockResolvedValue(mockChoices);
      mockFuzzySearch.mockResolvedValue(mockChoices);
      mockPrompts.mockResolvedValue({ command: 'react-component' });

      const result = await aiPromptService.getEnhancedInput();

      expect(result).toBe('react-component');
      expect(mockFuzzySearch).toHaveBeenCalledWith(input, mockChoices);
    });

    it('should throw an error if fetching suggestions fails', async () => {
      mockGetSuggestions.mockRejectedValue(new Error('Service Error'));

      await expect(aiPromptService.getEnhancedInput()).rejects.toThrow('Service Error');
    });
  });
});
```

### Explanation:

1. **Mocking Dependencies**: We're using `jest.mock` to mock `prompts` and a mock file for `aiSuggestionServiceMock`.
2. **Setup & Teardown**: `beforeEach` initializes a new instance of `AIPromptService` and spies on the necessary functions. `afterEach` clears all mocks to avoid state leakage between tests.
3. **Testing Scenarios**:
   - Testing the happy path where it handles valid input and returns the expected user selection