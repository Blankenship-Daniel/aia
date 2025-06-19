# Copilot Instructions for AI Assistant

## Role
You are an AI assistant with deep knowledge of this codebase

## Project Context

- **Project Type**: Node.js
- **Primary Language**: javascript
- **Architecture**: Service-Component Architecture
- **Purpose**: Application Development
- **Scale**: 103 files, 59 classes, 44 functions

## Guidelines

- Always reference specific files, classes, and functions when making suggestions
- Consider the existing architecture patterns when proposing changes
- Be aware of the project's primary language and coding conventions
- Reference the TODO items for areas needing attention
- Understand the entry points and key components structure
- Follow established error handling patterns in the codebase
- Maintain consistency with existing API design patterns
- Consider performance implications based on the project scale
- Use the established testing patterns when adding new tests
- Reference related files and components when making suggestions
- Consider the dependency relationships between modules
- Maintain backward compatibility with existing interfaces

## Key Components

- **main.js**: Application entry point
  - Dependencies: src/cli/CLIApplication.js
  - Related: README.md, indexWatcher.ts, jest.config.ts
- **README.md**: Core module with 118 symbols
  - Related: indexWatcher.ts, jest.config.ts, main.js
- **package.json**: Core module with 0 symbols
  - Dependencies: @anthropic-ai/sdk, axios, chalk
  - Related: README.md, indexWatcher.ts, jest.config.ts
- **examples/sample-plugin/README.md**: Core module with 20 symbols
  - Related: examples/sample-plugin/index.js, examples/sample-plugin/package-lock.json, examples/sample-plugin/package.json
- **src/services/CodeIndexService.js**: Core module with 10 symbols
  - Dependencies: src/CodebaseSummarizer.js, src/CodebaseSummarizer.js
  - Related: src/services/AIService.ts, src/services/CommandRegistry.ts, src/services/CommandService.ts
- **tests/test-service-architecture.js**: Core module with 7 symbols
  - Dependencies: src/container/DIContainer.js, src/container/ServiceFactory.js, src/services/ConfigurationService.ts
  - Related: tests/AgenticReasoningEngine.test.js, tests/CommandHandler.test.js, tests/ErrorHandler.test.js
- **.github/copilot-instructions.md**: Core module with 9 symbols
  - Related: .github/copilot-instructions.json, .github/copilot-instructions.md
- **docs/comprehensive/codebase-comprehensive.md**: Core module with 7 symbols
  - Related: docs/comprehensive/codebase-comprehensive.md
- **src/commands/IndexCommand.js**: Core module with 3 symbols
  - Dependencies: src/services/CodeIndexService.js, src/CodebaseSummarizer.js, src/SemanticCodeAnalyzer.js
  - Related: src/commands/AgentCommand.ts, src/commands/AskCommand.ts, src/commands/CommandFactory.ts
  - Exports: index, codebase, prompt
- **src/utils/RobustJSONParser.js**: Core module with 7 symbols
- **src/AgenticReasoningEngine.js**: Core module with 1 symbols
  - Dependencies: src/AgenticSearchEngine.js, src/NLPEngine.js, src/ConversationContextManager.js
  - Related: src/AgenticSearchEngine.js, src/CLIFormatter.js, src/CodebaseSummarizer.js

## Entry Points

- main.js (main)

## Common Patterns

### imports
Most commonly imported modules:
- chalk
- path
- fs-extra
- child_process
- os
- inquirer
- fs
- ../index.js
- ../CodebaseSummarizer
- ../src/container/ServiceFactory
- chokidar
- ./SemanticAnalyzer
- crypto
- ../ConfigurationManager
- ../src/MemoryManager

### inheritance
Class inheritance patterns:
- PerformanceOptimizer extends EventEmitter
- SemanticCodeAnalyzer extends SemanticAnalyzer

### functions
Common function patterns:
- 1 functions follow handler pattern
- 2 getter functions
- 2 setter functions

## Codebase Structure

Key directories and their primary file types:

- **docs/**: 4 files
- **examples/**: 2 files
- **src/**: 31 files (24 javascript)
- **tests/**: 24 files (19 javascript, 3 typescript, 2 json)

## API Patterns

### Service Layer
Service-oriented architecture with dedicated service classes
```javascript
src/interfaces/IAIService.ts
src/interfaces/ICommandService.ts
src/interfaces/IConfigurationService.ts
```

### Command Pattern
Command-based architecture for operations
```javascript
src/CommandHandler.js
src/ErrorHandler.js
src/commands/AgentCommand.ts
```

### Factory Pattern
Factory pattern for object creation
```javascript
src/commands/CommandFactory.ts
src/container/ServiceFactory.js
```

## Configuration Patterns

- **Configuration Files**: Application configuration management
  - Examples: .aia/codebase-index.json, .aia/config.json, .aia/profiles.json

## Testing Patterns

- **Unit Tests**: 24 test files using various testing frameworks
  - Location: tests/ directory and co-located test files
- **Jest Testing**: Jest-based unit testing framework
  - Location: Configured in jest.config.js

## Common Workflows

### Development Setup
Setting up the development environment
1. Clone the repository
2. Install dependencies with npm install
3. Run tests with npm test
4. Start development server if applicable

### Build Process
Standard Node.js build and deployment workflow
1. Install dependencies: npm install
2. Run tests: npm test
3. Build application if needed
4. Deploy using configured scripts

### Testing Workflow
Running and maintaining tests
1. Run all tests: npm test
2. Run specific test files
3. Add new tests for new features
4. Maintain test coverage

## Contextual Hints

These hints help understand the codebase context and relationships:

- **Service Architecture**: Service classes handle business logic and are injected via DI container
  - Examples: src/container/ServiceFactory.js, src/interfaces/IAIService.ts, src/interfaces/ICommandService.ts
- **Command Pattern**: Commands handle CLI operations and implement the ICommand interface
  - Examples: src/CommandHandler.js, src/CommandIntelligence.js, src/commands/AgentCommand.ts
- **Configuration**: Configuration files define application settings and output directories
  - Examples: .aia/config.json, jest.config.ts, src/ConfigurationManager.js
- **Testing Strategy**: Tests are organized in the tests/ directory with corresponding source files
  - Examples: tests/AgenticReasoningEngine.test.js, tests/CommandHandler.test.js, tests/ErrorHandler.test.js

## File Cross-References

Understanding how files relate to each other:

- **src/CodebaseSummarizer.js**:
  - Used by: IndexCommand.js, CodeIndexService.js...
- **src/ConfigurationManager.js**:
  - Imports: fs-extra, path, os...
  - Used by: CLIApplication.js, IndexCommand.js
- **src/ErrorHandler.js**:
  - Imports: chalk
  - Used by: ServiceFactory.js, ErrorHandler.test.js
- **src/AgenticSearchEngine.js**:
  - Imports: chalk, fs-extra, path
  - Used by: AgenticReasoningEngine.js
- **src/CLIFormatter.js**:
  - Imports: chalk, ora
  - Used by: ServiceFactory.js
- **src/CommandHandler.js**:
  - Imports: child_process, chalk, inquirer
  - Used by: CommandHandler.test.js
- **src/ConversationContextManager.js**:
  - Imports: chalk
  - Used by: AgenticReasoningEngine.js
- **src/DomainSpecialist.js**:
  - Imports: chalk
  - Used by: NLPEngine.js
- **examples/sample-plugin/index.js**:
  - Imports: chalk
- **indexWatcher.ts**:
  - Imports: chokidar
- **jest.config.ts**:
  - Exports: config
- **main.js**:
  - Imports: ./src/cli/CLIApplication
- **src/AgenticReasoningEngine.js**:
  - Imports: chalk, inquirer, ./AgenticSearchEngine...
- **src/ContextAnalyzer.js**:
  - Imports: fs-extra, path, child_process
- **src/IndexWatcher.js**:
  - Imports: chokidar

## Code Hotspots

Areas of the codebase that are frequently modified or highly connected:

- **src/container/ServiceFactory.js**: Highly imported (4 references)
  - Metrics: 4 imports
- **src/CodebaseSummarizer.js**: Highly imported (3 references)
  - Metrics: 3 imports
- **src/SemanticAnalyzer.js**: Highly imported (2 references)
  - Metrics: 2 imports
- **src/ConfigurationManager.js**: Highly imported (2 references)
  - Metrics: 2 imports
- **src/container/DIContainer.js**: Highly imported (2 references)
  - Metrics: 2 imports

