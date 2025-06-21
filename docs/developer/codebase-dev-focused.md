# Developer Reference

## Quick Reference for TypeScript Project

## Development Setup

```bash
npm install
npm test
npm start
```

## Important Files for Development

- **package.json**: Configuration/entry file
- **README.md**: Configuration/entry file
- **tsconfig.json**: Configuration/entry file
- **jest.config.ts**: Configuration/entry file
- **main.js**: Configuration/entry file

## Entry Points

- **main.js**: Application main file

## Main Classes

- **HelloPlugin** (examples/simple-plugin/index.js)
- **module** (examples/simple-plugin/index.js)
- **AgenticReasoningEngine** (src/AgenticReasoningEngine.ts)
- **AgenticSearchEngine** (src/AgenticSearchEngine.ts)
- **CLIFormatter** (src/CLIFormatter.ts)
- **CodebaseSummarizer** (src/CodebaseSummarizer.ts)
- **import** (src/CommandHandler.ts)
- **CommandHandler** (src/CommandHandler.ts)
- **CommandIntelligence** (src/CommandIntelligence.ts)
- **ConfigurationManager** (src/ConfigurationManager.ts)

## Testing

Found 30 test files:

- tests/AgenticReasoningEngine.test.ts
- tests/CommandHandler.test.ts
- tests/ErrorHandler.test.js
- tests/Integration.test.js
- tests/MemoryManager.test.js

## Development Patterns

- Follow existing code structure when adding new features
- Check test files for usage examples
- Use existing error handling patterns
- Follow naming conventions from existing code

