# Complete Codebase Context

## Overview
This is a Node.js project with 103 files, primarily written in javascript. The architecture follows Service-Component Architecture patterns.

## Key Statistics
- Files: 103
- Classes: 59
- Functions: 44
- TODO Items: 4

## Language Distribution
- json: 14 files
- markdown: 7 files
- javascript: 52 files
- typescript: 30 files

## Directory Structure
- **.aia/**: 4 files
  - Key files: codebase-index.json
- **.github/**: 2 files
- **docs/**: 4 files
- **examples/**: 7 files
  - Key files: index.js, index.js
- **src/**: 55 files
  - Key files: CommandHandler.js, CommandIntelligence.js, DomainSpecialist.js
- **tests/**: 24 files
  - Key files: CommandHandler.test.js

## Core Components
- **main.js**: Entry point
  - Related: README.md, indexWatcher.ts
  - Dependencies: src/cli/CLIApplication.js
- **README.md**: Documentation
  - Related: indexWatcher.ts, jest.config.ts
- **package.json**: Configuration file
  - Related: README.md, indexWatcher.ts
  - Dependencies: @anthropic-ai/sdk, axios
- **examples/sample-plugin/README.md**: Documentation
  - Related: index.js, package-lock.json
- **src/services/CodeIndexService.js**: Service component
  - Related: AIService.ts, CommandRegistry.ts
  - Dependencies: src/CodebaseSummarizer.js, src/CodebaseSummarizer.js
- **tests/test-service-architecture.js**: Source module
  - Related: AgenticReasoningEngine.test.js, CommandHandler.test.js
  - Dependencies: src/container/DIContainer.js, src/container/ServiceFactory.js
- **.github/copilot-instructions.md**: Documentation
  - Related: copilot-instructions.json, copilot-instructions.md
- **docs/comprehensive/codebase-comprehensive.md**: Documentation
  - Related: codebase-comprehensive.md
- **src/commands/IndexCommand.js**: Command implementation
  - Related: AgentCommand.ts, AskCommand.ts
  - Dependencies: src/services/CodeIndexService.js, src/CodebaseSummarizer.js
- **src/utils/RobustJSONParser.js**: Parser component
- **src/AgenticReasoningEngine.js**: Processing engine
  - Related: AgenticSearchEngine.js, CLIFormatter.js
  - Dependencies: src/AgenticSearchEngine.js, src/NLPEngine.js

## Classes
- **HelloPlugin** (examples/simple-plugin/index.js)
- **module** (src/PluginManager.js) - 1 methods
- **IndexWatcher** (src/IndexWatcher.js)
- **AgenticReasoningEngine** (src/AgenticReasoningEngine.js) - 4 methods
- **AgenticSearchEngine** (src/AgenticSearchEngine.js) - 2 methods
- **CLIFormatter** (src/CLIFormatter.js) - 1 methods
- **CodebaseSummarizer** (src/CodebaseSummarizer.js) - 7 methods
- **const** (tests/test-full-aia.js) - 8 methods
- **CommandHandler** (src/CommandHandler.js) - 1 methods
- **CommandIntelligence** (src/CommandIntelligence.js) - 4 methods
- **ConfigurationManager** (src/ConfigurationManager.js) - 2 methods
- **ContextAnalyzer** (src/ContextAnalyzer.js) - 5 methods
- **ConversationContextManager** (src/ConversationContextManager.js) - 2 methods
- **ReferenceResolver** (src/ConversationContextManager.js) - 4 methods
- **DomainSpecialist** (src/DomainSpecialist.js) - 3 methods
- **ErrorHandler** (src/ErrorHandler.js)
- **MemoryManager** (src/MemoryManager.js) - 2 methods
- **ModelSelector** (src/ModelSelector.js) - 6 methods
- **NLPEngine** (src/NLPEngine.js) - 7 methods
- **PerformanceOptimizer** (src/PerformanceOptimizer.js) extends EventEmitter - 4 methods
- **PluginManager** (src/PluginManager.js) - 5 methods
- **QueryProcessor** (src/QueryProcessor.js) - 3 methods
- **ResponseGenerator** (src/ResponseGenerator.js) - 3 methods
- **ResponseAdaptationEngine** (src/ResponseGenerator.js) - 2 methods
- **SecurityValidator** (src/SecurityValidator.js) - 4 methods

## Key Functions
- **main** - tests/test-js-to-ts-transition.js
- **update** - src/CLIFormatter.js
- **for** - src/container/DIContainer.js
- **async** - src/TestRunner.js
- **to** - src/commands/IndexCommand.js
- **mockFn** - src/TestRunner.js
- **getOutputDir** - src/commands/IndexCommand.js
- **if** - src/container/DIContainer.js
- **visit** - src/container/DIContainer.js
- **patterns** - src/services/CodeIndexService.js
- **naming** - src/services/CodeIndexService.js
- **handlers** - src/services/CodeIndexService.js
- **getters** - src/services/CodeIndexService.js
- **setters** - src/services/CodeIndexService.js
- **reference** - src/services/CodeIndexService.js

## Most Referenced Components
- **src/container/ServiceFactory.js** (referenced 4 times)
- **src/CodebaseSummarizer.js** (referenced 3 times)
- **chalk** (referenced 2 times)
- **src/SemanticAnalyzer.js** (referenced 2 times)
- **src/ConfigurationManager.js** (referenced 2 times)
- **src/container/DIContainer.js** (referenced 2 times)
- **src/ErrorHandler.js** (referenced 2 times)
- **src/SecurityValidator.js** (referenced 2 times)
- **src/MemoryManager.js** (referenced 2 times)
- **src/cli/CLIApplication.js** (referenced 1 times)

## Architecture Patterns
### Service Layer
Service-oriented architecture with dedicated service classes
src/interfaces/IAIService.ts
src/interfaces/ICommandService.ts
src/interfaces/IConfigurationService.ts

### Command Pattern
Command-based architecture for operations
src/CommandHandler.js
src/ErrorHandler.js
src/commands/AgentCommand.ts

### Factory Pattern
Factory pattern for object creation
src/commands/CommandFactory.ts
src/container/ServiceFactory.js

## Configuration Files
- **undefined**: Application configuration management

## Testing Framework
- **Unit Tests**: 24 test files using various testing frameworks
  - Location: tests/ directory and co-located test files
- **Jest Testing**: Jest-based unit testing framework
  - Location: Configured in jest.config.js

## Outstanding Tasks
- src/cli/CLIApplication.js:157 - --verbose is already added as common option above
- src/container/ServiceFactory.js:7 - Interfaces are now in TypeScript files and not needed for runtime
- src/services/ConfigurationService.ts:350 - Implement feature flags system
- src/services/PluginService.ts:258 - This is a simplified method. In a real-world scenario,

## Common Development Workflows
### undefined
Setting up the development environment
1. Clone the repository
2. Install dependencies with npm install
3. Run tests with npm test
4. Start development server if applicable

### undefined
Standard Node.js build and deployment workflow
1. Install dependencies: npm install
2. Run tests: npm test
3. Build application if needed
4. Deploy using configured scripts

### undefined
Running and maintaining tests
1. Run all tests: npm test
2. Run specific test files
3. Add new tests for new features
4. Maintain test coverage

