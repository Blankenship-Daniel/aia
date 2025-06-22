import prompts from 'prompts';
import chalk from 'chalk';
import gradient from 'gradient-string';

// Dummy services for demonstration
const aiSuggestionService = {
  async getSuggestions(): Promise<
    { title: string; description: string; value: string }[]
  > {
    return [
      {
        title: 'Create a new React component',
        description: 'Generate a component for user profiles.',
        value: 'react-component',
      },
      {
        title: 'Refactor a function',
        description: 'Improve the authentication logic.',
        value: 'refactor-auth',
      },
      {
        title: 'Write a unit test',
        description: 'Test the new data processing service.',
        value: 'unit-test-data',
      },
    ];
  },
  async fuzzySearch(input: string, choices: any[]): Promise<any[]> {
    if (!input) return choices;
    const fuse = new (require('fuse.js'))(choices, {
      keys: ['title', 'description'],
    });
    return fuse.search(input).map((result: any) => result.item);
  },
};

export class AIPromptService {
  async getEnhancedInput(): Promise<string> {
    const suggestions = await aiSuggestionService.getSuggestions();

    const response = await prompts({
      type: 'autocomplete',
      name: 'command',
      message: gradient.atlas('What would you like me to help with?'),
      choices: suggestions.map((s) => ({
        title: s.title,
        description: chalk.gray(s.description),
        value: s.value,
      })),
      initial: 0,
      suggest: async (input, choices) => {
        const filtered = await aiSuggestionService.fuzzySearch(input, choices);
        return filtered;
      },
    });

    return response.command;
  }
}
