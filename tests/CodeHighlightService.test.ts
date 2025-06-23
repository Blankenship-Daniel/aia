To generate comprehensive Jest tests for the `CodeHighlightService` in your TypeScript project, we'll break down the test cases into several key areas. We'll test the main functionalities provided by the service, such as syntax highlighting, language detection, and error handling. We'll also mock external dependencies — primarily the `cli-highlight` and `chalk` libraries — to ensure we're testing in isolation. Here's how we can structure these tests:

```typescript
// src/services/__tests__/CodeHighlightService.test.ts
import { CodeHighlightService } from '../CodeHighlightService';
import * as highlight from 'cli-highlight';
import { Chalk } from 'chalk';

jest.mock('cli-highlight');
jest.mock('chalk', () => {
  const actualChalk = jest.requireActual('chalk');
  return {
    Chalk: jest.fn().mockImplementation(() => ({
      ...actualChalk, // Use actual chalk functionality for color testing
      red: jest.fn((text) => `red(${text})`),
      blue: jest.fn((text) => `blue(${text})`),
      cyan: jest.fn((text) => `cyan(${text})`),
      green: jest.fn((text) => `green(${text})`),
      yellow: jest.fn((text) => `yellow(${text})`),
      gray: jest.fn((text) => `gray(${text})`),
      italic: jest.fn((text) => `italic(${text})`),
      bold: jest.fn((text) => `bold(${text})`),
    })),
  };
});

describe('CodeHighlightService', () => {
  let service: CodeHighlightService;

  beforeEach(() => {
    service = new CodeHighlightService();
    jest.clearAllMocks(); // Ensure mocks are reset before each test
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('highlightCode', () => {
    it('should highlight code with detected language when no language is provided', () => {
      const code = `const hello = 'world';`;
      const mockHighlight = (highlight.highlight as jest.MockedFunction<typeof highlight.highlight>);
      mockHighlight.mockReturnValue('highlighted-code');

      const result = service.highlightCode(code);

      expect(mockHighlight).toHaveBeenCalledWith(code, expect.objectContaining({
        language: 'javascript',
        theme: expect.any(Object),
      }));
      expect(result).toBe('highlighted-code');
    });

    it('should return original code when highlighting fails', () => {
      const code = `const hello = 'world';`;
      const mockHighlight = (highlight.highlight as jest.MockedFunction<typeof highlight.highlight>);
      mockHighlight.mockImplementation(() => { throw new Error('Highlighting error'); });

      const result = service.highlightCode(code);

      expect(mockHighlight).toHaveBeenCalled();
      expect(result).toBe(code);
    });
  });

  describe('detectLanguage', () => {
    it('should detect JavaScript language correctly', () => {
      const code = 'function hello() { return true; }';

      const detected = service.detectLanguage(code);

      expect(detected).toBe('javascript');
    });

    it('should return undefined for undetectable languages', () => {
      const code = 'random text';

      const detected = service.detectLanguage(code);

      expect(detected).toBeUndefined();
    });
  });

  describe('formatJSON', () => {
    it('should format and highlight JSON correctly', () => {
      const obj = { key: 'value' };
      const jsonString = JSON.stringify(obj, null, 2);
      const mockHighlight = (highlight.highlight as jest.MockedFunction<typeof highlight.highlight>);
      mockHighlight.mockReturnValue('highlighted-json');

      const result = service.formatJSON(obj);

      expect(mockHighlight).toHaveBeenCalledWith(jsonString, expect.objectContaining({
        language: 'json',
        theme