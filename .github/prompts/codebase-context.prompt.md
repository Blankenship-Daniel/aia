# AIA Codebase Full Context Prompt

## Overview

This prompt loads the complete context of the AIA (AI Agentic Assistant) codebase for comprehensive understanding and development assistance.

## Project Structure and Architecture

### Core Files

- **main.js** - New clean entry point using modular service architecture
- **index.js** (2779 lines) - Legacy monolithic application (deprecated post-refactoring)
- **package.json** - Project configuration with dependencies and scripts
- **README.md** - User documentation and setup guide
- **async_analysis_report.md** - Performance analysis report with async/await statistics

### Demo and Testing Scripts

- **demo.sh** - Main demonstration script showcasing AIA capabilities
- **demo-interactive.sh** - Interactive features demonstration
- **demo-interactive-features.sh** - Enhanced interactive mode demo
- **aia-wrapper.sh** - Wrapper script utilities for advanced operations

### Documentation Files (docs/)

- **docs/PROJECT_PLAN.md** - Detailed implementation roadmap across 4 phases
- **docs/DEV_CONTEXT.md** - Development quick reference and current session context
- **docs/IMPLEMENTATION_SUMMARY.md** - Technical achievements and feature completeness
- **docs/ENHANCEMENT_PLAN.md** - Phase 3 enhancement implementation roadmap
- **docs/DOCS_INDEX.md** - Documentation navigation and maintenance workflow
- **docs/AGENTIC_TEST_REPORT.md** - Comprehensive agentic reasoning test results and analysis
- **docs/AGENT_IMPROVEMENTS.md** - Agent experience improvements and optimization plan
- **docs/REFACTORING_PROGRESS.md** - Complete refactoring progress and achievements
- **docs/PHASE_3_COMPLETION_REPORT.md** - Final phase completion report and architecture transformation summary
- **.github/copilot-instructions.md** - Project guidelines and architecture reference
- **.github/prompts/codebase-context.prompt.md** - This file - Complete codebase context for AI assistance

### Source Code Modules (src/)

#### Legacy Modules (Pre-Refactoring)

1. **AgenticReasoningEngine.js** - Advanced goal decomposition, iterative problem-solving, and multi-step execution
2. **AgenticSearchEngine.js** - Enhanced search and information discovery for agentic reasoning
3. **CLIFormatter.js** - Output formatting, colors, and user interface elements
4. **CommandHandler.js** - Command execution logic with optimization and shell support
5. **CommandIntelligence.js** - Intelligent command suggestions, predictions, and safety validation
6. **ConfigurationManager.js** - Enhanced configuration handling with profiles and encryption
7. **ContextAnalyzer.js** - Deep project understanding and environmental awareness
8. **ConversationContextManager.js** - Multi-turn conversation coherence and context management
9. **DomainSpecialist.js** - Domain-specific knowledge systems and specialized assistance
10. **ErrorHandler.js** - Enhanced error recovery, retry logic, and circuit breaker patterns
11. **MemoryManager.js** - Semantic search, compression, and intelligent memory management
12. **ModelSelector.js** - Advanced AI model selection based on query analysis and context
13. **NLPEngine.js** - Natural language processing with domain specialization
14. **PerformanceOptimizer.js** - Caching, indexing, and performance monitoring
15. **PluginManager.js** - Extensibility framework for third-party plugins
16. **QueryProcessor.js** - Query enhancement, expansion, and correction
17. **ResponseGenerator.js** - Enhanced response quality and structure
18. **SecurityValidator.js** - Input validation, sanitization, and security framework
19. **SemanticAnalyzer.js** - Semantic similarity matching and analysis
20. **TestRunner.js** - Comprehensive test utilities and integration testing
21. **WorkflowManager.js** - Macro recording, conditional logic, and task automation

#### New Refactored Architecture (Post-Refactoring)

**Service-Oriented Architecture** (`src/services/`)

- **AIService.js** - AI model integration and intelligent selection
- **MemoryService.js** - Memory operations with semantic search
- **ContextService.js** - Environment context gathering and analysis
- **CommandService.js** - Command execution with optimization and validation
- **ConfigurationService.js** - Configuration management with profiles
- **PluginService.js** - Plugin management and execution
- **WorkflowService.js** - Workflow automation and recording
- **CommandRegistry.js** - Command registration and resolution

**Command Pattern Implementation** (`src/commands/`)

- **AskCommand.js** - AI queries with context awareness
- **ExecuteCommand.js** - Terminal command execution with optimization
- **ContextCommand.js** - Environment context display
- **MemoryCommand.js** - Memory statistics and management
- **ConfigCommand.js** - Configuration management with interactive setup
- **CommandFactory.js** - Command creation with dependency injection

**CLI Application Layer** (`src/cli/`)

- **CLIApplication.js** - Modern CLI application using Commander.js with service architecture

**Dependency Injection** (`src/container/`)

- **DIContainer.js** - Core dependency injection container with singleton support
- **ServiceFactory.js** - Service registration and configuration

**Interface Contracts** (`src/interfaces/`)

- **IAIService.js** - AI service interface
- **IMemoryService.js** - Memory service interface
- **IContextService.js** - Context service interface
- **ICommandService.js** - Command service interface
- **IConfigurationService.js** - Configuration service interface
- **IPluginService.js** - Plugin service interface
- **IWorkflowService.js** - Workflow service interface
- **ICommand.js** - Command interface
- **ICommandRegistry.js** - Command registry interface

### Plugin System (examples/)

- **PLUGIN_DEVELOPMENT.md** - Comprehensive plugin development guide
- **sample-plugin/** - Complete plugin example with all features
- **simple-plugin/** - Minimal plugin example for learning

### Testing Infrastructure (tests/)

- **Jest-based test suite** with 100% pass rate
- **Core module tests**: MemoryManager.test.js, CommandHandler.test.js, ErrorHandler.test.js, SecurityValidator.test.js, Integration.test.js
- **Agentic reasoning tests**: test-agentic-fixes.js, test-agentic-goal.js, test-agentic-suite.sh
- **API integration tests**: test-api-key.js, test-full-aia.js
- **Component tests**: test-components-fixed.js, test-quick.js, test-file.js
- **Interactive mode tests**: test-interactive.sh, test-simple.sh
- **Performance tests** for optimization validation
- **Security tests** for validation and safety
- **Test data files**: profiles.json, user.json, test-output.txt
- **Architecture tests**: test-service-architecture.js, test-command-system.js

## Key Technologies and Dependencies

### Core Dependencies

- **commander** (v14.0.0) - CLI framework and argument parsing
- **openai** (v5.5.0) - OpenAI API client for GPT models
- **@anthropic-ai/sdk** (v0.54.0) - Anthropic API client for Claude models
- **inquirer** (v8.2.6) - Interactive command-line prompts
- **chalk** (v4.1.2) - Terminal text styling and colors
- **ora** (v5.4.1) - Loading spinners for async operations
- **fs-extra** (v11.3.0) - Enhanced file system operations
- **jest** (v30.0.0) - Testing framework

### Architecture Patterns

- **Service-Oriented Architecture** - Clean separation of concerns with focused services
- **Dependency Injection** - Container-managed dependencies for testability
- **Command Pattern** - Encapsulated command execution with registry
- **Interface Segregation** - Clean contracts between components
- **Factory Pattern** - Service and command creation
- **Command Pattern** - Encapsulated command execution with registry
- **Chain of Responsibility** - Error handling and recovery strategies

## Current Development Status

### Refactoring Complete (June 2025) ✅ COMPLETED

**Phase 1**: ✅ Service Extraction & Dependency Injection  
**Phase 2**: ✅ Command System Refactoring  
**Phase 3**: ✅ CLI Integration & Business Logic Migration

✅ **Complete Architecture Transformation** - From monolithic to service-oriented architecture  
✅ **Plugin System Architecture** - Complete extensible framework with CLI integration  
✅ **Workflow Automation System** - Complete macro recording and execution with persistent state  
✅ **Advanced Agentic Reasoning** - Goal decomposition and iterative problem-solving with learning  
✅ **Enhanced Error Recovery** - Automatic failure detection and recovery strategies  
✅ **Learning System** - Historical pattern analysis and adaptation  
✅ **Output Validation** - Step outcome verification and confidence scoring  
✅ **Context-Aware Planning** - Enhanced environment-based plan generation  
✅ **Comprehensive Testing** - Full test suite with API integration validation  
✅ **Step Verification System** - Robust command output verification and validation  
✅ **JSON Plan Evaluation** - Improved plan parsing and execution assessment  
✅ **Working CLI Implementation** - Core commands functional with real execution and global installation (plugin/workflow commands available in legacy system)

### Key Features Implemented

1. **Multi-AI Integration** - GPT-4, GPT-3.5, Claude-3.5-Sonnet, Claude-3-Haiku with intelligent model selection
2. **Context Awareness** - Project type, git status, environment detection with deep analysis
3. **Persistent Memory** - Conversations, commands, preferences with semantic search and compression
4. **Command Execution** - Full terminal integration with automatic optimization and shell support
5. **Interactive Mode** - Conversational AI interface with multiple execution modes and prefixes
6. **Plugin System** - Complete extensible architecture with:
   - Custom CLI command integration (via Commander.js)
   - Lifecycle hooks (beforeCommand, afterAIQuery, etc.)
   - Sandboxed plugin execution environment
   - Plugin discovery, installation, and template creation
   - Security validation and permission management
7. **Workflow Automation** - Complete macro system with:
   - Persistent workflow state across CLI sessions
   - Workflow recording (workflow-start-recording/workflow-stop-recording)
   - Workflow execution (workflow-execute) with verbose options
   - Workflow management (workflow-list, workflow-info, workflow-delete)
   - Conditional logic and event triggers
8. **Agentic Reasoning** - Complete goal decomposition and iterative execution with:
   - Robust step verification and output validation
   - Automatic error recovery and learning system
   - Historical pattern analysis and strategy adaptation
   - Context-aware planning and confidence scoring
9. **Enhanced NLP** - Domain specialization and semantic analysis
10. **Performance Optimization** - Caching, indexing, and intelligent resource management
11. **Comprehensive Testing Suite** - Full validation with step verification and API integration
12. **Error Recovery & Validation** - Advanced step success verification and intelligent error handling
13. **Service-Oriented Architecture** - Clean, modular design with:
    - Dependency injection container with singleton support
    - Service interfaces and implementations
    - Command pattern with factory and registry
    - CLI integration with Commander.js
14. **Interface-based Design** - Clean contracts between all components
15. **Working CLI Commands** - All commands functional with:
    - Real shell command execution with output streaming
    - Global CLI installation (npm link integration)
    - Command aliases and options support
    - Interactive mode with execution modes
16. **Service Integration** - All services properly connected via dependency injection
17. **Command Registry** - Dynamic command registration and resolution
18. **Real-time Execution** - Live command output with proper stdio handling

## Memory and Context Systems

### Memory Structure

```json
{
  "conversations": [{"query", "response", "timestamp", "context", "semanticTags", "confidence"}],
  "commands": [{"command", "timestamp", "workingDirectory", "exitCode", "duration", "optimized"}],
  "preferences": {"preferredModel", "autoOptimize", "plugins"},
  "workingDirectories": {},
  "semanticIndex": {},
  "agenticHistory": [{"goal", "plan", "executionResults", "learnings", "timestamp"}]
}
```

### Context Schema

```json
{
  "workingDirectory": "string",
  "platform": "string",
  "projectType": "string",
  "gitStatus": "string",
  "environmentScore": "number",
  "performanceMetrics": "object",
  "securityStatus": "object",
  "pluginContext": "object"
}
```

## API Integration and Model Selection

### Supported AI Models

- **OpenAI**: GPT-4, GPT-3.5-turbo
- **Anthropic**: Claude-3.5-Sonnet, Claude-3-Haiku

### Intelligent Model Selection

- **Code/Programming**: Prefers GPT-4 for code generation and debugging
- **Analysis/Research**: Prefers Claude for in-depth analysis
- **Context-Aware**: Automatically selects based on query type and context
- **Performance Tracking**: Monitors success rates and adapts selection

## Plugin System Architecture

### Plugin Structure

```
plugin-name/
├── plugin.json     # Plugin manifest
├── index.js        # Main plugin code
├── package.json    # Dependencies
└── README.md       # Documentation
```

### Plugin Capabilities

- **Custom CLI Commands** - Add new commands to AIA
- **Lifecycle Hooks** - beforeCommand, afterAIQuery, etc.
- **Sandboxed Execution** - Secure plugin environment
- **Configuration Management** - Plugin-specific settings
- **Command Integration** - Full Commander.js integration

## Workflow Automation

### Workflow Features

- **Macro Recording** - Capture command sequences
- **Persistent State** - Workflows survive CLI sessions
- **Conditional Logic** - If-then workflow capabilities
- **Event Triggers** - React to file changes, git events
- **Workflow Sharing** - Export/import templates

## Security and Safety

### Security Measures

- **Input Validation** - Comprehensive sanitization
- **Command Safety** - Destructive operation warnings
- **Rate Limiting** - Abuse prevention
- **Plugin Sandboxing** - Secure execution environment
- **API Key Encryption** - Secure credential storage

### Safety Patterns

- **Circuit Breaker** - Automatic failure isolation
- **Retry Logic** - Intelligent retry mechanisms
- **Error Recovery** - Automatic recovery strategies
- **Timeout Handling** - Prevent hanging operations

## Testing and Quality Assurance

### Test Coverage

- **Unit Tests** - Individual module testing
- **Integration Tests** - Cross-module functionality
- **End-to-End Tests** - Complete workflow validation
- **Performance Tests** - Optimization verification
- **Security Tests** - Safety validation

### Quality Metrics

- **100% Test Pass Rate** - All tests passing
- **Comprehensive Error Handling** - Robust error recovery
- **Performance Optimization** - Sub-2-second response times
- **Memory Efficiency** - Intelligent cleanup and compression

## Development Workflow

### Git Workflow

- **Conventional Commits** - Standardized commit messages
- **Semantic Versioning** - MAJOR.MINOR.PATCH versioning
- **Feature Branches** - Isolated development
- **Automated Testing** - Pre-commit validation

### Code Standards

- **ES6+ JavaScript** - Modern syntax and features
- **Async/Await** - Consistent asynchronous handling
- **Modular Design** - Clear separation of concerns
- **Comprehensive Documentation** - JSDoc and inline comments

## Performance Characteristics

### Performance Baselines

- **Startup Time**: ~500ms (cold start)
- **AI Query Response**: 2-5 seconds (model dependent)
- **Memory Loading**: <100ms for typical usage
- **Context Gathering**: ~200ms
- **Command Execution**: Near real-time

### Optimization Features

- **Intelligent Caching** - Context and response caching
- **Semantic Indexing** - Fast memory search
- **Batch Processing** - Efficient bulk operations
- **Memory Compression** - Automatic cleanup
- **Performance Monitoring** - Real-time metrics

## Future Roadmap (Phase 4)

### Enterprise Features (Planned)

- **SSO Integration** - Enterprise authentication
- **Audit Logging** - Compliance tracking
- **Policy Management** - Centralized configuration
- **High Availability** - Clustered deployment
- **Cloud Sync** - Cross-device memory synchronization

### Advanced Capabilities (Planned)

- **Multi-Modal Input** - Voice, image, document analysis
- **Predictive Modeling** - Anticipate user needs
- **Advanced Analytics** - Usage optimization
- **Global CDN** - Low-latency worldwide access
- **API Gateway** - Public API for integrations

---

## Complete CLI Command Reference

**Note**: The CLI is currently in transition between architectures. Core commands (ask, exec, agent, context, memory, config) are available in both the new service-oriented architecture (`main.js`) and the legacy monolithic system (`index.js`). Plugin and workflow commands are currently only available in the legacy system while their migration to the new architecture is in progress.

### Core Commands (Available in New Architecture)

- **ask** (aliases: q, query) - Ask AI a question with context awareness
- **exec** (aliases: x) - Execute terminal commands with optimization
- **agent** (aliases: a, agentic) - Execute agentic reasoning for complex goals
- **context** (aliases: ctx, info) - Show current environment context
- **memory** (aliases: mem, stats) - Memory statistics and management
- **config** (aliases: cfg, configure) - Configuration management

### Plugin Management Commands (Legacy System Only)

- **plugin** - Show plugin management help
- **plugin-list** - List all installed plugins
- **plugin-install** `<source>` - Install plugin from local/git/npm/url
- **plugin-uninstall** `<name>` - Uninstall a plugin
- **plugin-info** `<name>` - Show detailed plugin information
- **plugin-stats** - Show plugin system statistics
- **plugin-reload** `<name>` - Reload a plugin
- **plugin-create** `<name>` - Create new plugin template
- **plugin-search** `<query>` - Search for plugins
- **plugin-discover** - Discover available plugins

### Workflow Automation Commands (Legacy System Only)

- **workflow** - Show workflow automation help
- **workflow-start-recording** `<name>` - Start recording a workflow
- **workflow-stop-recording** - Stop recording and save workflow
- **workflow-list** - List all available workflows
- **workflow-execute** `<name>` - Execute a saved workflow
- **workflow-info** `<name>` - Show detailed workflow information
- **workflow-delete** `<name>` - Delete a workflow

### Utility Commands

- **clear-memory** - Clear all stored memory
- **memory-export** `<path>` - Export memory for backup (legacy only)
- **search** `<query>` - Semantic search through memory (legacy only)
- **auto-execute** - Enable/disable automatic command execution (legacy only)
- **validate-key** `<provider>` - Validate API key (legacy only)

### Interactive Mode Features

- **Direct execution prefixes**: `!`, `$`, `>` for shell commands
- **Mode switching**: `:exec`, `:ai`, `:auto` for execution modes
- **Agentic mode**: `:agent <goal>` for complex reasoning
- **Help**: `:help` for interactive mode help
- **Mode indicators**: `[auto]`, `[cmd]`, `[ai]` show current mode

## Usage Examples for Context Understanding

### Basic Commands

```bash
# Core AI and execution commands
aia ask "How do I optimize this Node.js project?"  # aliases: q, query
aia exec npm audit                                 # aliases: x
aia agent "set up automated testing" --auto-execute  # aliases: a, agentic
aia context --verbose                              # aliases: ctx, info
aia memory --search "git commands"                 # aliases: mem, stats
aia config --interactive                           # aliases: cfg, configure

# Memory and utility commands
aia clear-memory
aia memory-export backup.json
aia search "previous commands" --limit 5
aia auto-execute --enable
```

### Advanced Agentic Goals

```bash
# Agentic reasoning with various options
aia agent "analyze error handling patterns in all JavaScript files"
aia agent "create comprehensive test suite" --max-iterations 3 --auto-execute
aia agent "optimize project for production deployment" --no-iteration
aia agent "debug the failing tests" --max-iterations 5
```

### Plugin Management

```bash
# Plugin installation and management
aia plugin-install ./my-plugin --name custom-plugin
aia plugin-install git+https://github.com/user/plugin.git
aia plugin-install some-npm-package
aia plugin-list
aia plugin-info sample-plugin
aia plugin-stats
aia plugin-uninstall plugin-name
aia plugin-reload plugin-name
aia plugin-create my-new-plugin --template basic
aia plugin-search "search-term"
aia plugin-discover
```

### Workflow Automation

```bash
# Workflow recording and execution
aia workflow-start-recording deployment-prep --description "Deploy to production"
aia workflow-stop-recording
aia workflow-list
aia workflow-execute deployment-prep --verbose
aia workflow-info deployment-prep
aia workflow-delete old-workflow
```

### Interactive Mode Features

```bash
# Start interactive mode
aia

# Within interactive mode:
# Direct command execution
!ls -la                    # Execute shell command directly
$pwd                       # Execute shell command directly
>git status               # Execute shell command directly

# Execution mode switching
:exec                     # Switch to command execution mode
:ai                       # Switch to AI prompt mode
:auto                     # Switch to auto-detection mode
:agent optimize project   # Use agentic reasoning
:help                     # Show interactive help

# The prompt shows current mode: [auto], [cmd], or [ai]
```

### Development and Testing

```bash
# Component testing
node tests/test-components-fixed.js
node tests/test-agentic-fixes.js

# API integration testing
node tests/test-api-key.js
node tests/test-full-aia.js

# Agentic reasoning testing
./tests/test-agentic-suite.sh
node tests/test-agentic-goal.js

# Architecture testing
node tests/test-service-architecture.js
node tests/test-command-system.js
```

This comprehensive context provides a complete understanding of the AIA codebase, its architecture, capabilities, and development status as of June 2025.
