# AIA Development Context - Quick Reference

## 🚀 Current Session Context

**Date**: June 17, 2025  
**Phase**: Phase 3 Advanced Features In Progress  
**Version**: 1.1.0  
**Status**: Plugin System Complete, Workflow Automation Complete

## ⚡ Quick Start Commands

```bash
# Development workflow
cd /Users/d0b01r1/Documents/code/aia
npm install                    # Install dependencies
npm link                       # Global CLI access
aia --help                     # Verify installation
aia config                     # Configure API keys
aia context                    # Check current context
node index.js --help          # Direct execution

# Testing workflow
aia ask "test query"           # Test AI integration
aia exec echo "test"           # Test command execution
aia memory                     # Check memory system
./demo.sh                      # Run full demo
```

## 🏗️ Architecture Quick Reference

### Core Files

- `index.js` (546 lines) - Main application logic
- `package.json` - Dependencies and metadata
- `README.md` - User documentation
- `.github/copilot-instructions.md` - Project guidelines
- `PROJECT_PLAN.md` - Development roadmap

### Key Classes & Methods

```javascript
class AIA {
  async init()                 // Initialize all systems
  async loadMemory()           // Load persistent data
  async gatherContext()        // Collect environment info
  async queryAI(prompt, model) // AI interaction
  async executeCommand()       // Terminal command execution
  async configure()            // User configuration
}
```

### Memory Structure

```json
{
  "conversations": [{"query", "response", "timestamp", "context"}],
  "commands": [{"command", "timestamp", "workingDirectory"}],
  "preferences": {},
  "workingDirectories": {}
}
```

## 🔧 Key Technologies

- **CLI Framework**: Commander.js v11.0.0
- **AI APIs**: OpenAI v4.20.0, Anthropic v0.24.0
- **UI/UX**: Chalk v4.1.2, Ora v5.4.1, Inquirer v8.2.6
- **Storage**: fs-extra v11.1.0 (JSON files)
- **Runtime**: Node.js v23.6.0

## 🎯 Current Capabilities

✅ **Multi-AI Integration**: GPT-4, GPT-3.5, Claude-3.5-Sonnet, Claude-3-Haiku  
✅ **Context Awareness**: Project type, git status, environment detection  
✅ **Persistent Memory**: Conversations, commands, preferences  
✅ **Command Execution**: Full terminal integration with stdio passthrough  
✅ **Interactive Mode**: Conversational AI interface  
✅ **Configuration**: User-friendly API key management  
✅ **Error Handling**: Comprehensive error recovery  
✅ **Enhanced Memory System**: Semantic search, compression, smart cleanup  
✅ **Advanced Model Selection**: Query classification and context-aware selection  
✅ **Command Intelligence**: Safety validation and prediction  
✅ **Testing Framework**: Jest-based unit tests with 100% pass rate  
✅ **Plugin System**: Extensible architecture with sandboxed plugin execution  
✅ **Plugin Management**: Full CLI for installing, managing, and monitoring plugins  
✅ **Plugin Hooks**: Lifecycle integration for command and AI query processing  
✅ **Agentic Reasoning**: Complete goal decomposition, iterative problem-solving, and execution system  
✅ **Enhanced Error Recovery**: Automatic failure detection and intelligent recovery strategies  
✅ **Learning System**: Learns from execution history and applies insights to future plans  
✅ **Historical Pattern Analysis**: Uses past successes and failures to inform new strategies  
✅ **Output Validation**: Verifies that executed steps achieve their intended outcomes  
✅ **Context-Aware Planning**: Plans generated based on comprehensive context analysis
✅ **Automatic Command Optimization**: Commands are automatically optimized without user prompts

## 🔄 Phase 3 Development Status

### Completed Features ✅

1. **Plugin System Architecture** - Extensible framework for third-party plugins
2. **Plugin Manager** - Core plugin loading, unloading, and lifecycle management
3. **Sandboxed Execution** - Secure plugin environment with controlled API access
4. **Plugin CLI Commands** - Complete command suite for plugin management
5. **Plugin Installation** - Support for local paths, git repositories, and future registry
6. **Plugin Hooks** - Lifecycle integration (beforeCommand, afterAIQuery, etc.)
7. **Sample Plugin** - Working hello-world plugin demonstrating all features
8. **Plugin Development Guide** - Comprehensive documentation for plugin creators
9. **Custom Command Integration** - Plugin commands integrated with Commander.js CLI
10. **Enhanced Plugin Installation** - Support for NPM, URLs, and multiple sources
11. **Plugin Discovery** - Search and discovery system for plugins
12. **Plugin Template Creation** - Developer tools for creating plugins
13. **Workflow Automation System** - Complete macro recording and execution
14. **Persistent Workflow State** - Recording state persists across CLI sessions
15. **Workflow CLI Commands** - Full command suite for workflow management
16. **Advanced Agentic Reasoning** - Goal decomposition with iterative problem-solving
17. **Enhanced Error Recovery** - Automatic failure detection and intelligent recovery
18. **Learning System** - Historical pattern analysis and strategy adaptation
19. **Output Validation** - Verification that executed steps achieve intended outcomes
20. **Context-Aware Planning** - Plans based on comprehensive environment analysis

### Current Implementation Status

- **Plugin Installation**: ✅ Local paths, Git repos, NPM, URLs all working
- **Plugin Management**: ✅ List, info, stats, uninstall commands working
- **Hook System**: ✅ beforeCommand, afterAIQuery hooks tested and working
- **Custom Commands**: ✅ Plugin commands integrated with Commander.js CLI
- **Plugin Security**: ✅ Basic sandboxing implemented
- **Plugin Discovery**: ✅ Search, discovery, and template creation working
- **Workflow Recording**: ✅ Macro recording with persistent state working
- **Workflow Execution**: ✅ Workflow playback and execution working
- **Workflow Management**: ✅ Full CLI suite for workflow management
- **Agentic Reasoning**: ✅ Complete goal decomposition and iterative problem-solving
- **Error Recovery**: ✅ Automatic failure detection and intelligent recovery strategies
- **Historical Learning**: ✅ Pattern analysis and strategy adaptation working
- **Output Validation**: ✅ Step outcome verification and confidence scoring
- **Context-Aware Planning**: ✅ Enhanced context gathering and plan generation
- **Pipe Command Support**: ✅ Shell operators (|, &, ;, <, >) fully supported
- **JSON Plan Parsing**: ✅ Robust plan extraction with fallback generation
- **Documentation**: ✅ Complete development guide and examples created

### Next Priority Features

- [x] **Custom Command Integration**: Integrate plugin commands with Commander.js CLI ← **COMPLETED**
- [x] **Enhanced Plugin Installation**: Support for NPM, URLs, and multiple sources ← **COMPLETED**
- [x] **Plugin Discovery**: Search and discovery system for plugins ← **COMPLETED**
- [x] **Plugin Template Creation**: Developer tools for creating plugins ← **COMPLETED**
- [x] **Workflow Automation**: Complete macro recording and execution system ← **COMPLETED**
- [ ] **Plugin Registry**: Centralized plugin marketplace and discovery
- [ ] **Plugin Dependencies**: Better dependency management and version resolution
- [ ] **Advanced Security**: Enhanced sandboxing and permission system
- [ ] **Plugin Configuration UI**: Interactive configuration management
- [ ] **Workflow Conditionals**: Advanced conditional logic and variables
- [ ] **Workflow Scheduling**: Time-based and event-triggered workflows

### Remaining Phase 2 Tasks

- [ ] Performance profiling and optimization
- [ ] Enhanced error recovery mechanisms
- [ ] Input validation and security improvements
- [ ] Advanced model performance tracking
- [ ] Memory compression optimization

### Current Technical Debt

- [x] ~~Refactor large `index.js` into modules~~ → **COMPLETED** (ModelSelector, ContextAnalyzer, CommandIntelligence, MemoryManager)
- [x] ~~Add comprehensive unit tests~~ → **COMPLETED** (Jest framework with 14 passing tests)
- [ ] Implement proper logging system
- [ ] Add input validation and sanitization
- [ ] Performance optimization for large memory files

## 🐛 Known Issues & Solutions

### Resolved Issues ✅

- ~~`inquirer.prompt is not a function`~~ → Fixed by downgrading to v8.2.6
- ~~`claude-3-sonnet-20240229 not found`~~ → Updated to `claude-3-5-sonnet-20241022`
- ~~Chalk ES module import error~~ → Fixed by using v4.1.2 (CommonJS)
- ~~Command optimization error: "Consider" not found~~ → Fixed optimization suggestions to return executable commands instead of text descriptions

### Active Monitoring

- **punycode deprecation warning** - Non-breaking, will address in Phase 2
- **Memory file growth** - Automatic cleanup implemented, monitoring needed
- **API rate limiting** - Need to implement exponential backoff

## 🔒 Security Considerations

- API keys stored in `~/.aia/config.json` (should encrypt in Phase 2)
- Command execution uses spawn() with proper stdio handling
- Input sanitization needed for user queries
- File system operations use fs-extra with error handling

## 📊 Performance Baseline

- **Startup time**: ~500ms (cold start)
- **AI query response**: 2-5 seconds (depends on model)
- **Memory loading**: <100ms for typical usage
- **Context gathering**: ~200ms
- **Command execution**: Near real-time

## 🧪 Testing Strategy

```bash
# Manual testing checklist
aia --help                     # CLI interface
aia config                     # Configuration flow
aia ask "test question"        # AI integration
aia exec ls                    # Command execution
aia memory                     # Memory system
aia context                    # Context gathering
aia                           # Interactive mode
```

### Test Cases to Implement

- [ ] Unit tests for AIA class methods
- [ ] Integration tests for AI APIs
- [ ] End-to-end CLI command tests
- [ ] Memory persistence tests
- [ ] Error handling validation
- [ ] Performance benchmarks

## 📝 Development Notes

### Code Style Guidelines

- Use async/await consistently
- Implement proper error handling with try-catch
- Add meaningful console output with chalk colors
- Keep methods focused and single-responsibility
- Document complex logic with inline comments

### Git Workflow

```bash
git status                     # Check current changes
git add .                      # Stage changes
git commit -m "feat: description"  # Conventional commits
git push origin main           # Deploy changes
```

### Version Management

- Follow semantic versioning (MAJOR.MINOR.PATCH)
- Update version in package.json
- Tag releases with git tags
- Maintain CHANGELOG.md

## 🎯 Immediate Next Steps

### This Week

1. **Code Organization**: Split index.js into logical modules
2. **Testing Framework**: Set up Jest and initial test cases
3. **Advanced Model Selection**: Implement query classification
4. **Performance Optimization**: Profile and optimize bottlenecks

### Next Month

1. **Plugin System**: Design and implement plugin architecture
2. **Enhanced Context**: Deep project analysis capabilities
3. **Memory Search**: Semantic query functionality
4. **Workflow Automation**: Basic macro recording

---

**💡 Development Tip**: Always reference .github/copilot-instructions.md for architectural decisions and PROJECT_PLAN.md for feature priorities. This file provides quick context for any development session.

**🔍 Debug Commands**: Use `node --trace-deprecation index.js` to trace deprecation warnings and `DEBUG=* aia` for verbose logging (when implemented).
