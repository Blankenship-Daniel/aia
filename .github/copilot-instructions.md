# AIA (AI Agentic Assistant) - Custom Instructions & Project Plan

## 🎯 Project Purpose & Vision

**AIA** is an intelligent, agentic CLI tool that transforms terminal interactions by combining:

- **AI-Powered Assistance**: Integrates multiple AI models (OpenAI GPT, Anthropic Claude)

- **Autonomous Decision Making**: Selects optimal AI models based on contex## 📋 Complete CLI Command Reference

**Note**: The CLI is currently in transition between architectures. Core commands (ask, exec, agent, context, memory, config) are available in both the new service-oriented architecture (`main.js`) and the legacy monolithic system (`index.js`). Plugin and workflow commands are currently only available in the legacy system while their migration to the new architecture is in progress.

### Core Commands (Available in New Architecture)📋 Complete CLI Command Reference and request type

- **Persistent ## 🛠️ Technical Specificationsemory**: Maintains conversation history, command logs, and user preferences with semantic search
- **Context Awareness**: Understands environment, project type, git status, and working directory
- **Command Execution**: Seamless terminal command execution with AI guidance and automatic optimization
- **Agentic Reasoning**: Advanced goal decomposition, iterative problem-solving, and multi-step execution
- **Plugin System**: Extensible architecture with sandboxed plugin execution and lifecycle management
- **Workflow Automation**: Macro recording, playback, and automated task execution
- **Enhanced NLP**: Sophisticated natural language processing with domain specialization
- **Learning System**: Learns from execution history and applies insights to future operations

### Core Philosophy

AIA acts as an intelligent intermediary between users and their development environment, providing contextual assistance that learns and adapts over time. It embodies true agentic behavior through autonomous goal decomposition, iterative problem-solving, and continuous learning from user interactions.

**Current Status (June 2025)**: Complete architectural refactoring achieved with fully working service-oriented architecture, dependency injection, and command pattern implementation. The project has successfully transformed from a monolithic approach to a clean, modular architecture with focused services, commands, and CLI integration. Core CLI functionality is working (ask, exec, context, memory, config, agent) with real command execution and global CLI installation. The new architecture has been fully integrated while legacy modules have been preserved for reference. Plugin and workflow services are implemented in the new architecture but their CLI commands are still only available in the legacy `index.js` system. Migration of plugin and workflow CLI commands to the new architecture is in progress.

## 🏗️ Architecture Overview

### Core Components

1. **Service-Oriented Architecture**: Modern dependency injection-based design

   - Service interfaces (`src/interfaces/`) - Clean contracts between components
   - Service implementations (`src/services/`) - Focused business logic
   - Dependency injection container (`src/container/`) - Service management
   - Command pattern implementation (`src/commands/`) - Encapsulated operations
   - CLI application layer (`src/cli/`) - Modern Commander.js integration

2. **Enhanced AI Integration Layer**

   - OpenAI GPT models (GPT-4, GPT-3.5-turbo)
   - Anthropic Claude models (Claude-3.5-Sonnet, Claude-3-Haiku)
   - Intelligent model selection with query classification
   - Context-enriched prompt engineering with domain specialization
   - Conversation context management for coherent multi-turn interactions

3. **Advanced Memory System**

   - Persistent JSON storage in `~/.aia/` with semantic indexing
   - Conversation history with semantic search capabilities
   - Command execution logs with performance tracking
   - User preferences and configuration with profiles
   - Context history across sessions with relationship mapping
   - Memory compression and intelligent cleanup

4. **Comprehensive Context Engine**

   - Working directory analysis with deep project scanning
   - Project type detection with dependency analysis
   - Git repository status integration with change tracking
   - System environment profiling with performance metrics
   - Shell and platform identification with optimization hints
   - Development environment detection (IDE, tools, workflow)

5. **Agentic Reasoning System**

   - Goal decomposition and multi-step planning
   - Iterative problem-solving with error recovery
   - Historical pattern analysis and strategy adaptation
   - Output validation and confidence scoring
   - Learning system for continuous improvement
   - Context-aware plan generation

6. **Plugin Architecture**

   - Sandboxed plugin execution environment
   - Plugin lifecycle management (install, load, unload)
   - Hook system for command and AI query processing
   - Custom command integration with Commander.js
   - Plugin discovery and template creation tools
   - Security validation and permission management

7. **Workflow Automation**

   - Macro recording with persistent state
   - Workflow playback and execution
   - Command sequence automation
   - Conditional logic and variable support
   - Event-triggered workflows
   - Workflow sharing and templates

8. **Modern Command Interface**
   - CLI framework using Commander.js with service integration
   - Interactive mode with multiple execution modes
   - Direct command execution with automatic optimization
   - Configuration management with validation
   - Real-time command suggestion and safety validation

### File Structure

```
/Users/d0b01r1/Documents/code/aia/
├── main.js                     # ✅ New clean entry point using modular service architecture
├── index.js                    # ⚠️ Legacy monolithic application (2779 lines, deprecated post-refactoring)
├── package.json               # Project configuration & dependencies
├── README.md                  # User documentation
├── async_analysis_report.md   # Performance analysis report
├── aia-wrapper.sh             # Wrapper script utilities
├── demo.sh                    # Main demonstration script
├── demo-interactive.sh        # Interactive features demo
├── demo-interactive-features.sh # Interactive features demo
├── index.js.backup            # Backup of previous index.js version
├── src/                       # 🔄 Mixed Architecture (Legacy + New Coexisting)
│   ├── services/              # ✅ Service-Oriented Architecture (IMPLEMENTED & WORKING)
│   │   ├── AIService.js           # ✅ AI model integration (fully implemented)
│   │   ├── MemoryService.js       # ✅ Memory operations with semantic search
│   │   ├── ContextService.js      # ✅ Environment context gathering (working)
│   │   ├── CommandService.js      # ✅ Command execution with real shell integration
│   │   ├── ConfigurationService.js # ✅ Configuration management (working)
│   │   ├── PluginService.js       # ✅ Plugin management (fully implemented)
│   │   ├── WorkflowService.js     # ✅ Workflow automation (fully implemented)
│   │   └── CommandRegistry.js     # ✅ Command registration and resolution (working)
│   ├── commands/              # ✅ Command Pattern Implementation (WORKING)
│   │   ├── AskCommand.js          # ✅ AI queries (fully implemented)
│   │   ├── ExecuteCommand.js      # ✅ Terminal command execution (working)
│   │   ├── ContextCommand.js      # ✅ Environment context display (working)
│   │   ├── MemoryCommand.js       # ✅ Memory statistics and management (working)
│   │   ├── ConfigCommand.js       # ✅ Configuration management (working)
│   │   ├── AgentCommand.js        # ✅ Agentic reasoning command (fully implemented)
│   │   └── CommandFactory.js      # ✅ Command creation with dependency injection (working)
│   ├── cli/                   # ✅ CLI Application Layer (FULLY WORKING)
│   │   └── CLIApplication.js      # ✅ Modern CLI application using Commander.js (working)
│   ├── container/             # ✅ Dependency Injection (WORKING)
│   │   ├── DIContainer.js         # ✅ Core dependency injection container (working)
│   │   └── ServiceFactory.js      # ✅ Service registration and configuration (working)
│   ├── interfaces/            # ✅ Interface Contracts (IMPLEMENTED)
│   │   ├── IAIService.js          # ✅ AI service interface
│   │   ├── IMemoryService.js      # ✅ Memory service interface
│   │   ├── IContextService.js     # ✅ Context service interface
│   │   ├── ICommandService.js     # ✅ Command service interface
│   │   ├── IConfigurationService.js # ✅ Configuration service interface
│   │   ├── IPluginService.js      # ✅ Plugin service interface
│   │   ├── IWorkflowService.js    # ✅ Workflow service interface
│   │   ├── ICommand.js            # ✅ Command interface
│   │   └── ICommandRegistry.js    # ✅ Command registry interface
│   ├── utils/                 # ✅ Utility Functions
│   │   └── RobustJSONParser.js    # ✅ JSON parsing utilities
│   ├── core/                  # ⚠️ Empty directory (placeholder)
│   └── [Legacy Modules]       # ⚠️ Coexisting Legacy Architecture (src/ root level)
│       ├── ModelSelector.js       # ⚠️ Advanced AI model selection (legacy)
│       ├── ContextAnalyzer.js     # ⚠️ Deep project understanding (legacy)
│       ├── CommandIntelligence.js # ⚠️ Intelligent command suggestions (legacy)
│       ├── MemoryManager.js       # ⚠️ Enhanced memory operations (legacy)
│       ├── AgenticReasoningEngine.js  # ⚠️ Goal decomposition & problem solving (legacy)
│       ├── AgenticSearchEngine.js     # ⚠️ Enhanced search & discovery (legacy)
│       ├── PluginManager.js           # ⚠️ Plugin system architecture (legacy)
│       ├── WorkflowManager.js         # ⚠️ Macro recording & automation (legacy)
│       ├── CommandHandler.js          # ⚠️ Command execution (legacy)
│       ├── ErrorHandler.js            # ⚠️ Enhanced error recovery (legacy)
│       ├── SecurityValidator.js       # ⚠️ Input validation & security (legacy)
│       ├── ConfigurationManager.js    # ⚠️ Enhanced configuration (legacy)
│       ├── NLPEngine.js               # ⚠️ Natural language processing (legacy)
│       ├── ConversationContextManager.js # ⚠️ Multi-turn conversation (legacy)
│       ├── DomainSpecialist.js        # ⚠️ Domain-specific knowledge (legacy)
│       ├── QueryProcessor.js          # ⚠️ Query enhancement (legacy)
│       ├── ResponseGenerator.js       # ⚠️ Response generation (legacy)
│       ├── SemanticAnalyzer.js        # ⚠️ Semantic analysis (legacy)
│       ├── CLIFormatter.js            # ⚠️ Output formatting (legacy)
│       ├── PerformanceOptimizer.js    # ⚠️ Caching & performance (legacy)
│       └── TestRunner.js              # ⚠️ Testing infrastructure (legacy)
├── docs/                      # ✅ Documentation files
│   ├── PROJECT_PLAN.md            # ✅ Detailed implementation roadmap across 4 phases
│   ├── DEV_CONTEXT.md             # ✅ Development quick reference and current session context
│   ├── IMPLEMENTATION_SUMMARY.md  # ✅ Technical achievements and feature completeness
│   ├── ENHANCEMENT_PLAN.md        # ✅ Phase 3 enhancement implementation roadmap
│   ├── DOCS_INDEX.md              # ✅ Documentation navigation and maintenance workflow
│   ├── AGENTIC_TEST_REPORT.md     # ✅ Comprehensive agentic reasoning test results and analysis
│   ├── AGENT_IMPROVEMENTS.md      # ✅ Agent experience improvements and optimization plan
│   ├── REFACTORING_PROGRESS.md    # ✅ Complete refactoring progress and achievements
│   └── PHASE_3_COMPLETION_REPORT.md # ✅ Final phase completion report and architecture transformation summary
├── tests/                     # ✅ Comprehensive Jest test suite (100% pass rate)
│   ├── MemoryManager.test.js      # ✅ Memory system tests
│   ├── CommandHandler.test.js     # ✅ Command execution tests
│   ├── ErrorHandler.test.js       # ✅ Error handling tests
│   ├── SecurityValidator.test.js  # ✅ Security validation tests
│   ├── Integration.test.js        # ✅ End-to-end integration tests
│   ├── test-agentic-fixes.js      # ✅ Agentic reasoning component tests
│   ├── test-agentic-goal.js       # ✅ Agentic goal execution tests
│   ├── test-agentic-suite.sh      # ✅ Comprehensive agentic reasoning test suite
│   ├── test-api-key.js            # ✅ API integration tests
│   ├── test-full-aia.js           # ✅ Full system integration tests
│   ├── test-components-fixed.js   # ✅ Component isolation tests
│   ├── test-quick.js              # ✅ Quick functionality tests
│   ├── test-interactive.sh        # ✅ Interactive mode testing
│   ├── test-simple.sh             # ✅ Simple functionality tests
│   ├── test-service-architecture.js # ✅ Architecture tests for service integration
│   └── test-command-system.js     # ✅ Command pattern and CLI integration tests
├── examples/                  # ✅ Plugin development examples & guides
│   ├── PLUGIN_DEVELOPMENT.md     # ✅ Comprehensive plugin development guide
│   ├── sample-plugin/            # ✅ Complete plugin example with all features
│   └── simple-plugin/            # ✅ Minimal plugin example for learning
├── .github/
│   ├── copilot-instructions.md # This file - Project guidelines & architecture
│   └── prompts/                # AI context and prompt templates
│       └── codebase-context.prompt.md # Complete codebase context for AI assistance
└── ~/.aia/                   # User data directory
    ├── config.json           # User configuration with enhanced settings
    ├── memory.json           # Persistent memory storage with semantic indexing
    ├── plugins/              # Installed plugins directory
    └── workflows/            # ✅ Saved workflow macros and automation
```

## 📚 Documentation Cross-References

For comprehensive project understanding, refer to these key documentation files:

- **[../docs/DEV_CONTEXT.md](../docs/DEV_CONTEXT.md)**: Current development status, quick commands, and session context
- **[../docs/PROJECT_PLAN.md](../docs/PROJECT_PLAN.md)**: Detailed implementation roadmap and phase planning
- **[../docs/IMPLEMENTATION_SUMMARY.md](../docs/IMPLEMENTATION_SUMMARY.md)**: Technical achievements and feature summary
- **[../docs/DOCS_INDEX.md](../docs/DOCS_INDEX.md)**: Documentation navigation and maintenance workflow
- **[../README.md](../README.md)**: User-facing documentation and installation guide
- **[./prompts/codebase-context.prompt.md](./prompts/codebase-context.prompt.md)**: Complete codebase context for AI assistance

**Note**: Documentation files are now organized in the `docs/` directory for better structure. Test files have been organized in the `tests/` directory. AI prompts are organized in the `.github/prompts/` directory. This modular organization reflects the completion of Phase 3 architectural improvements.

## 🚀 Development Phases & Roadmap

### Phase 1: Core Foundation ✅ COMPLETED

- [x] Basic CLI structure with Commander.js
- [x] AI client integration (OpenAI + Anthropic)
- [x] Memory system implementation
- [x] Context gathering engine
- [x] Configuration management
- [x] Command execution framework
- [x] Interactive mode implementation
- [x] Error handling and user experience

### Phase 2: Enhanced Intelligence ✅ COMPLETED

#### 2.1 Advanced Model Selection 🎯 ✅ COMPLETED

- [x] **Query Classification**: ML-based categorization
- [x] **Context Weighting**: Priority scoring for different context types
- [x] **Model Performance Tracking**: Basic success rate monitoring
- [x] **MemoryManager Integration**: Enhanced memory operations and semantic search
- [x] **Testing Framework**: Jest-based unit tests with 100% pass rate

#### 2.2 Enhanced Context Analysis 📍 ✅ COMPLETED

- [x] **Deep Project Scanning**: Recursive file analysis for better understanding
- [x] **Dependency Analysis**: Package vulnerability and update recommendations
- [x] **Performance Profiling**: System resource usage and optimization hints
- [x] **Development Environment Detection**: IDE, tools, and workflow recognition
- [x] **Context Linking**: Relationship mapping between sessions

#### 2.3 Improved Command Intelligence 💡 ✅ COMPLETED

- [x] **Command Prediction**: Suggest next likely commands based on history
- [x] **Safety Validation**: Warn about potentially destructive operations
- [x] **Command Optimization**: Suggest more efficient alternatives
- [x] **Pipeline Recognition**: Detect and suggest command chaining
- [x] **Environment-Specific Commands**: Platform-optimized suggestions

#### 2.4 Memory Enhancement 🧠 ✅ COMPLETED

- [x] **Semantic Search**: Natural language querying of memory
- [x] **Memory Compression**: Efficient storage of large conversation histories
- [x] **Context Linking**: Relationship mapping between sessions
- [x] **Memory Export**: Backup and migration capabilities
- [x] **Smart Cleanup**: Automatic removal of outdated or irrelevant data

### Phase 3: Advanced Features ✅ COMPLETED

#### 3.1 Plugin System Architecture ✅ COMPLETED

- [x] **Plugin API**: Standard interface for third-party extensions
- [x] **Plugin Manager**: Install, update, disable plugins via CLI
- [x] **Sandboxing**: Secure execution environment for plugins
- [x] **Plugin Registry**: Curated marketplace for verified plugins
- [x] **Hot Reloading**: Dynamic plugin loading without restart

#### 3.2 Workflow Automation 🤖 ✅ COMPLETED

- [x] **Macro Recording**: Capture and replay command sequences
- [x] **Conditional Logic**: If-then workflows based on context
- [x] **Scheduled Tasks**: Time-based command execution
- [x] **Event Triggers**: React to file changes, git events, etc.
- [x] **Workflow Sharing**: Export/import automation templates

#### 3.3 Advanced AI Capabilities 🧠 ✅ COMPLETED

- [x] **Agentic Reasoning**: Goal decomposition and iterative problem-solving
- [x] **Enhanced Error Recovery**: Automatic failure detection and recovery
- [x] **Learning System**: Historical pattern analysis and adaptation
- [x] **Output Validation**: Verification of execution outcomes
- [x] **Context-Aware Planning**: Comprehensive environment-based planning
- [x] **Natural Language Processing**: Advanced NLP with domain specialization
- [x] **Conversation Context**: Multi-turn conversation coherence
- [x] **Response Generation**: Enhanced response quality and structure

### Phase 4: Enterprise & Scaling 🔮 FUTURE

- [ ] **SSO Integration**: SAML, OAuth, Active Directory support
- [ ] **Audit Logging**: Comprehensive activity tracking for compliance
- [ ] **Policy Management**: Centralized configuration and restrictions
- [ ] **High Availability**: Clustered deployment with failover
- [ ] **Enterprise Support**: SLA, dedicated support channels
- [ ] **Cloud Memory Sync**: Cross-device memory synchronization
- [ ] **Scalable Backend**: Microservices architecture for growth
- [ ] **Global CDN**: Low-latency response worldwide
- [ ] **Data Analytics**: Usage patterns and optimization insights
- [ ] **API Gateway**: Public API for third-party integrations
- [ ] **Predictive Modeling**: Anticipate user needs and behaviors
- [ ] **Performance Optimization**: ML-driven efficiency improvements
- [ ] **Anomaly Detection**: Identify unusual patterns or security issues
- [ ] **Usage Optimization**: Intelligent resource allocation
- [ ] **Business Intelligence**: ROI analysis and feature effectiveness

## 🏗️ Current Architecture Achievements

### Phase 3 Refactoring Complete: Service-Oriented Architecture (June 2025)

Based on **REFACTORING_PROGRESS.md** and **PHASE_3_COMPLETION_REPORT.md**, the complete architectural transformation has been achieved:

#### ✅ **Service-Oriented Architecture**

- **Service Layer**: Focused business logic services (`src/services/`)
  - AIService, MemoryService, ContextService, CommandService
  - ConfigurationService, PluginService, WorkflowService
  - CommandRegistry for service-based command resolution
- **Command Pattern**: Encapsulated operations (`src/commands/`)
  - AskCommand, ExecuteCommand, ContextCommand, MemoryCommand, ConfigCommand, AgentCommand
  - CommandFactory with dependency injection integration
- **Dependency Injection**: Container-managed services (`src/container/`)
  - DIContainer with singleton support and service lifecycle management
  - ServiceFactory for service registration and configuration
- **Interface Contracts**: Clean separation of concerns (`src/interfaces/`)
  - Service interfaces (IAIService, IMemoryService, etc.)
  - Command interfaces (ICommand, ICommandRegistry)

#### ✅ **Modern CLI Integration**

- **CLI Application**: Modern Commander.js integration (`src/cli/CLIApplication.js`)
- **New Entry Point**: Clean `main.js` replacing monolithic `index.js` (2779 lines)
- **Real Command Execution**: Working shell commands with output streaming
- **Global CLI Installation**: Proper npm link integration with new architecture
- **Dynamic Command Registration**: Service-based command discovery and registration

#### ✅ **Architecture Quality**

- **SOLID Principles**: Single responsibility, open/closed, interface segregation
- **Separation of Concerns**: Each service has focused responsibility
- **Testability**: Interface-based design enables comprehensive testing
- **Maintainability**: Modular structure supports ongoing development
- **Extensibility**: Plugin system and command pattern support growth

#### ✅ **Testing Infrastructure**

- **Service Architecture Tests**: `tests/test-service-architecture.js`
- **Command System Tests**: `tests/test-command-system.js`
- **Integration Tests**: Full system integration validation
- **Legacy Module Tests**: Comprehensive coverage of all existing functionality

## � Complete CLI Command Reference

### Core Commands

| Command          | Aliases            | Description                    | Options                                                       |
| ---------------- | ------------------ | ------------------------------ | ------------------------------------------------------------- |
| `ask <query>`    | `q`, `query`       | Ask AI a question with context | `--model <model>`, `--context <context>`                      |
| `exec <command>` | `x`                | Execute terminal command       | `--no-optimize`, `--force`, `--dry-run`                       |
| `agent <goal>`   | `a`, `agentic`     | Execute agentic reasoning      | `--auto-execute`, `--max-iterations <n>`, `--no-iteration`    |
| `context`        | `ctx`, `info`      | Show environment context       | `--json`, `--verbose`                                         |
| `memory`         | `mem`, `stats`     | Memory statistics              | `--search <query>`, `--clear`, `--export <file>`              |
| `config`         | `cfg`, `configure` | Configuration management       | `--interactive`, `--set <key=value>`, `--get <key>`, `--list` |

### Plugin Management Commands (Legacy System Only)

| Command                   | Description                | Options             |
| ------------------------- | -------------------------- | ------------------- |
| `plugin`                  | Show plugin help           |                     |
| `plugin-list`             | List installed plugins     |                     |
| `plugin-install <source>` | Install plugin             | `--name <name>`     |
| `plugin-uninstall <name>` | Uninstall plugin           |                     |
| `plugin-info <name>`      | Show plugin information    |                     |
| `plugin-stats`            | Plugin system statistics   |                     |
| `plugin-reload <name>`    | Reload plugin              |                     |
| `plugin-create <name>`    | Create plugin template     | `--template <type>` |
| `plugin-search <query>`   | Search for plugins         |                     |
| `plugin-discover`         | Discover available plugins |                     |

### Workflow Automation Commands (Legacy System Only)

| Command                           | Description               | Options                                                      |
| --------------------------------- | ------------------------- | ------------------------------------------------------------ |
| `workflow`                        | Show workflow help        |                                                              |
| `workflow-start-recording <name>` | Start recording workflow  | `--description <desc>`, `--author <author>`, `--tags <tags>` |
| `workflow-stop-recording`         | Stop recording workflow   |                                                              |
| `workflow-list`                   | List all workflows        |                                                              |
| `workflow-execute <name>`         | Execute workflow          | `--verbose`                                                  |
| `workflow-info <name>`            | Show workflow information |                                                              |
| `workflow-delete <name>`          | Delete workflow           |                                                              |

### Utility Commands

| Command                   | Description             | Options                             | Availability |
| ------------------------- | ----------------------- | ----------------------------------- | ------------ |
| `clear-memory`            | Clear all stored memory |                                     | Both systems |
| `memory-export <path>`    | Export memory           | `--format <format>`                 | Legacy only  |
| `search <query>`          | Semantic search memory  | `--limit <number>`                  | Legacy only  |
| `auto-execute`            | Manage auto-execution   | `--enable`, `--disable`, `--status` | Legacy only  |
| `validate-key <provider>` | Validate API key        |                                     | Legacy only  |

### Interactive Mode Features

#### Execution Prefixes

- `!<command>` - Execute shell command directly
- `$<command>` - Execute shell command directly
- `><command>` - Execute shell command directly

#### Mode Commands

- `:exec` - Switch to command execution mode
- `:ai` - Switch to AI prompt mode
- `:auto` - Switch to auto-detection mode (default)
- `:agent <goal>` - Use agentic reasoning
- `:help` - Show interactive help

#### Mode Indicators

- `[auto]` - Auto-detection mode
- `[cmd]` - Command execution mode
- `[ai]` - AI prompt mode

## �🛠️ Technical Specifications

### Dependencies

- **commander**: CLI framework and argument parsing (v14.0.0)
- **openai**: OpenAI API client for GPT models (v5.5.0)
- **@anthropic-ai/sdk**: Anthropic API client for Claude models (v0.54.0)
- **inquirer**: Interactive command-line prompts (v8.2.6)
- **chalk**: Terminal text styling and colors (v4.1.2)
- **ora**: Loading spinners for async operations (v5.4.1)
- **fs-extra**: Enhanced file system operations (v11.3.0)
- **jest**: Testing framework for comprehensive test coverage (v30.0.0)

### Key Design Patterns

- **Service-Oriented Architecture**: Clean separation of concerns with focused services
- **Dependency Injection**: Container-managed dependencies for testability
- **Command Pattern**: Encapsulated command execution with registry
- **Interface Segregation**: Clean contracts between components
- **Factory Pattern**: Service and command creation
- **Strategy Pattern**: Different AI models for different query types
- **Plugin Pattern**: Extensible architecture with lifecycle management
- **Chain of Responsibility**: Error handling and recovery strategies

### Memory Schema

```json
{
  "conversations": [
    {
      "query": "string",
      "response": "string",
      "timestamp": "ISO8601",
      "context": "object",
      "semanticTags": ["array"],
      "confidence": "number"
    }
  ],
  "commands": [
    {
      "command": "string",
      "timestamp": "ISO8601",
      "workingDirectory": "string",
      "exitCode": "number",
      "duration": "number",
      "optimized": "boolean"
    }
  ],
  "preferences": {
    "preferredModel": "string",
    "autoOptimize": "boolean",
    "plugins": "object"
  },
  "workingDirectories": "object",
  "semanticIndex": "object",
  "agenticHistory": [
    {
      "goal": "string",
      "plan": "array",
      "executionResults": "array",
      "learnings": "array",
      "timestamp": "ISO8601"
    }
  ]
}
```

### Context Schema

```json
{
  "workingDirectory": "string",
  "platform": "string",
  "arch": "string",
  "nodeVersion": "string",
  "user": "string",
  "shell": "string",
  "projectType": "string",
  "projectInfo": "object",
  "gitStatus": "string",
  "environmentScore": "number",
  "performanceMetrics": "object",
  "securityStatus": "object",
  "pluginContext": "object"
}
```

## 📋 Development Guidelines

### Code Standards

- **ES6+ JavaScript**: Modern syntax and features
- **Async/Await**: Consistent asynchronous handling
- **Error Handling**: Comprehensive try-catch blocks with circuit breakers
- **Modular Design**: Clear separation of concerns with dependency injection
- **Documentation**: Inline comments for complex logic and JSDoc for public APIs
- **Security**: Input validation, sanitization, and rate limiting
- **Performance**: Caching, optimization, and resource management

### Testing Strategy

- Unit tests for core AIA class methods and individual modules
- Integration tests for AI client interactions and cross-module functionality
- End-to-end tests for CLI command flows and user workflows
- Memory persistence testing with edge cases
- Context gathering validation across different environments
- Plugin system testing with sandboxing validation
- Performance and load testing for scalability
- Security testing for input validation and command safety

### Security Considerations

- API key encryption in storage with secure credential management
- Input sanitization for command execution with SQL injection prevention
- Safe file system operations with path traversal protection
- Memory data validation with integrity checks
- Rate limiting for AI API calls and abuse prevention
- Plugin sandboxing with permission-based access control
- Command safety validation with destructive operation warnings
- User session management with timeout handling

## 🎯 Success Metrics

### Technical Metrics

- Response time < 2 seconds for AI queries
- 99.9% uptime for command execution
- Memory corruption rate < 0.1%
- Context accuracy > 95%
- Error recovery rate > 90%
- Plugin system isolation effectiveness > 99%
- Command optimization success rate > 85%
- Agentic reasoning task completion rate > 80%

### User Experience Metrics

- User adoption and retention
- Command suggestion acceptance rate > 70%
- Session length and engagement
- Feature utilization patterns
- User feedback and satisfaction scores
- Plugin ecosystem growth and usage
- Workflow automation effectiveness
- Learning system improvement metrics

## 🔧 Maintenance & Operations

### Monitoring

- AI API usage and costs with detailed analytics
- Error rates and patterns with automated alerting
- Memory usage and growth with intelligent cleanup
- Performance bottlenecks with profiling integration
- User behavior analytics with privacy protection
- Plugin performance and security monitoring
- Workflow execution success rates
- Agentic reasoning effectiveness metrics
- Learning system adaptation tracking

### Updates & Releases

- Semantic versioning (MAJOR.MINOR.PATCH)
- Automated testing before releases
- Backward compatibility maintenance
- Migration scripts for breaking changes
- Documentation updates with each release

## 🤝 Contributing Guidelines

### Development Workflow

1. Fork repository and create feature branch
2. Implement changes with tests
3. Update documentation as needed
4. Submit pull request with detailed description
5. Code review and integration testing
6. Merge and deploy with version bump

### Code Review Checklist

- [ ] Functionality works as expected
- [ ] Error handling is comprehensive
- [ ] Code follows established patterns
- [ ] Documentation is updated
- [ ] Tests are included and passing
- [ ] Performance impact is acceptable

## 📚 Knowledge Base

### Key Concepts

- **Agentic Behavior**: Autonomous decision-making and action
- **Context Awareness**: Understanding environment and state
- **Memory Persistence**: Long-term data retention and recall
- **Model Selection**: Choosing optimal AI for specific tasks
- **Command Orchestration**: Seamless terminal integration
- **Plugin Extensibility**: Third-party enhancement framework
- **Workflow Automation**: Macro recording and task automation
- **Iterative Problem-Solving**: Goal decomposition and refinement
- **Learning System**: Continuous improvement from execution history
- **Semantic Understanding**: Advanced NLP and domain specialization

### Common Issues & Solutions

- **API Rate Limits**: Implement exponential backoff
- **Memory Corruption**: Add validation and recovery
- **Context Staleness**: Refresh on directory changes
- **Model Availability**: Graceful fallback mechanisms
- **Permission Issues**: Clear error messages and guidance

## 🔗 Related Documentation

This custom instructions file serves as the central reference for understanding AIA's purpose, architecture, and development roadmap. For additional context and current development status, please refer to:

### Quick Development References

- **[../docs/DEV_CONTEXT.md](../docs/DEV_CONTEXT.md)** - Current session context, commands, and development focus
- **[../docs/PROJECT_PLAN.md](../docs/PROJECT_PLAN.md)** - Detailed roadmap, phases, and implementation timeline
- **[../docs/IMPLEMENTATION_SUMMARY.md](../docs/IMPLEMENTATION_SUMMARY.md)** - Technical achievements and feature completeness

### Documentation Management

- **[../docs/DOCS_INDEX.md](../docs/DOCS_INDEX.md)** - Documentation navigation and maintenance workflow
- **[../README.md](../README.md)** - User documentation and setup instructions

### Development Context Workflow

1. **Start Development**: Read `docs/DEV_CONTEXT.md` for current status
2. **Architecture Decisions**: Reference this file for guidelines
3. **Feature Planning**: Check `docs/PROJECT_PLAN.md` for phase priorities
4. **Documentation**: Use `docs/DOCS_INDEX.md` for navigation

This documentation system ensures that anyone (including AI assistants) can quickly understand the project's current state, purpose, and direction at any point in the development lifecycle.

It should be referenced and updated throughout the project lifecycle to maintain consistency and context across all development phases.
