# Project Symbol Context

## Architecture Overview
### Core Classes (20)\n\n- **HelloPlugin**: examples/simple-plugin/index.js\n- **module**: examples/simple-plugin/index.js\n- **name**: src/SemanticCodeAnalyzer.ts\n- **description**: src/services/providers/OpenAIProvider.ts\n- **DocumentationLinter**: scripts/documentation-linter.ts\n- **declaration**: scripts/documentation-linter.ts\n- **without**: scripts/documentation-linter.ts\n- **ErrorHandlingAnalyzer**: scripts/error-handling-integration.ts\n- **AgenticReasoningEngine**: src/AgenticReasoningEngine.ts\n- **AgenticSearchEngine**: src/AgenticSearchEngine.ts\n- **CLIFormatter**: src/CLIFormatter.ts\n- **CodebaseSummarizer**: src/CodebaseSummarizer.ts\n- **import**: src/CommandHandler.ts\n- **CommandHandler**: src/CommandHandler.ts\n- **CommandIntelligence**: src/CommandIntelligence.ts\n- **ConfigurationManager**: src/ConfigurationManager.ts\n- **ContextAnalyzer**: src/ContextAnalyzer.ts\n- **ConversationContextManager**: src/ConversationContextManager.ts\n- **DomainSpecialist**: src/DomainSpecialist.ts\n- **ErrorHandler**: src/ErrorHandler.ts

## Key Symbols (O(1) Lookup Available)
No symbol data available

## Symbol Relationships
No relationship data available

## Performance Hints
- Total Symbols: 696
- Symbol lookup: O(1) via hash table
- Pre-computed relationships available
- Zero file scanning required

## Quick Symbol Queries

When working with this codebase, these symbols are available for O(1) lookup:

```typescript
// Direct O(1) symbol lookup examples
const AgenticReasoningEngine = symbolIndex.get('AgenticReasoningEngine');
const MemoryManager = symbolIndex.get('MemoryManager');
const CommandFactoryV2 = symbolIndex.get('CommandFactoryV2');

// Find all implementations
const commandImplementations = symbolIndex.getImplementations('ICommand');

// Get dependency graph
const serviceDependencies = symbolIndex.getDependencies('ServiceFactory');
```

## Code Generation Guidelines

When generating code suggestions:

1. **Import statements**: Use exact paths from symbol index
2. **Type references**: Use fully qualified names from index
3. **Method calls**: Verify signatures exist in index
4. **New files**: Follow existing patterns in index

## Performance Benefits

- Symbol lookup: <5ms (vs 50-200ms file scan)
- Dependency analysis: 50-200ms (vs 2-5 seconds)
- Relationship mapping: <50ms (vs 1-3 seconds)
- AI agent tasks: 200-500ms (vs 3-8 seconds)
