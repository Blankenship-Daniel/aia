import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tests/tsconfig.json',
        useESM: false,
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(extract-first-json|parse-json-object|dirty-json|chalk|boxen|inquirer|ora|log-symbols|figures|terminal-size|gradient-string|cli-table3|node-notifier|jsonic|json5|log-update|cli-spinners|prompts)/)',
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/types/**/*'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@commands/(.*)$': '<rootDir>/src/commands/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/interfaces/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    // Map .js imports to .ts files for TypeScript modules
    '(.+)\\.js$': '$1',
    // Mock problematic ESM modules - be more specific about the mocks
    '^extract-first-json$': '<rootDir>/tests/__mocks__/extract-first-json.js',
    '^dirty-json$': '<rootDir>/tests/__mocks__/dirty-json.js',
    '^chalk$': '<rootDir>/tests/__mocks__/chalk.js',
    '^boxen$': '<rootDir>/tests/__mocks__/boxen.js',
    '^inquirer$': '<rootDir>/tests/__mocks__/inquirer.js',
    '^gradient-string$': '<rootDir>/tests/__mocks__/gradient-string.js',
    '^figures$': '<rootDir>/tests/__mocks__/figures.js',
    '^terminal-size$': '<rootDir>/tests/__mocks__/terminal-size.js',
    '^cli-table3$': '<rootDir>/tests/__mocks__/cli-table3.js',
    '^node-notifier$': '<rootDir>/tests/__mocks__/node-notifier.js',
    '^ora$': '<rootDir>/tests/__mocks__/ora.js',
    '^log-symbols$': '<rootDir>/tests/__mocks__/log-symbols.js',
    '^jsonic$': '<rootDir>/tests/__mocks__/jsonic.js',
    '^json5$': '<rootDir>/tests/__mocks__/json5.js',
    '^log-update$': '<rootDir>/tests/__mocks__/log-update.js',
    '^cli-spinners$': '<rootDir>/tests/__mocks__/cli-spinners.js',
    '^prompts$': '<rootDir>/tests/__mocks__/prompts.js',
    '^terminal-kit$': '<rootDir>/tests/__mocks__/terminal-kit.js',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
  verbose: true,
  // Add better teardown handling
  forceExit: true,
  detectOpenHandles: true,
  // Improve memory management
  maxWorkers: '50%',
};

export default config;
