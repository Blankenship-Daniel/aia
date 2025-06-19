# Prompt: Optimize Copilot Instructions for Enhanced AI Agent Context

## Objective
Update the copilot-instructions.md file generation in the AIA CLI to create a more comprehensive and optimized file that maximizes AI agent effectiveness when using GitHub Copilot in VSCode.

## Background
The current copilot-instructions.md file lacks critical information about the codebase architecture, service relationships, and navigation patterns. This limits the AI agent's ability to provide accurate, context-aware assistance.

## Task
Implement the following optimizations to the copilot-instructions.md generation:

### 1. Update CodeIndexService.generateCopilotInstructions()

Modify the `src/services/CodeIndexService.ts` file's `generateCopilotInstructions()` method to include:

#### A. Enhanced Project Overview
```markdown
- **Project**: AIA CLI (AI Assistant Command Line Interface)
- **Type**: TypeScript Node.js CLI Application
- **Architecture**: Service-Oriented Architecture with Dependency Injection
- **Purpose**: AI-powered development tool for code analysis, optimization, and assistance
- **Scale**: [dynamic from index] files, classes, functions
- **Test Coverage**: [dynamic] test files
```

#### B. Architecture Patterns Section
Include detailed information about:
- Dependency Injection pattern with DIContainer
- Service Factory pattern
- Interface segregation principle
- Command pattern implementation

#### C. Directory Structure Map
Add a visual directory structure showing key folders and their purposes:
```
aia/
├── src/
│   ├── cli/              # CLI application layer
│   ├── commands/         # Command implementations
│   ├── container/        # Dependency injection system
│   ├── interfaces/       # TypeScript interfaces
│   ├── services/         # Core services
│   └── utils/           # Utility functions
```

#### D. Key Components & Relationships
List all major services with their:
- Primary purpose
- Key dependencies
- Files that use them
- Related interfaces

Example format:
```markdown
- **[`AIService`](src/services/AIService.ts)**: Manages AI model interactions
  - Dependencies: ConfigurationService, ContextService
  - Used by: AgentCommand, AskCommand
```

#### E. Code Navigation Guidelines
Add sections for:
- How to use the codebase-index.json for navigation
- Common search patterns
- Quick lookup by feature area
- Service dependency mapping

#### F. Common Development Tasks
Include practical examples:
- Finding where a function is defined
- Understanding service dependencies
- Adding new commands
- Adding new services
- Modifying AI behavior

### 2. Enhance Index Utilization

Add a dedicated section explaining how to leverage the codebase-index.json:

```markdown
## Using the Codebase Index

The `.aia/codebase-index.json` file contains:
- **metadata**: Project statistics, file counts, language distribution
- **files**: Complete file listing with symbols, imports, exports
- **classes**: All class definitions and their locations
- **functions**: All function definitions
- **todos**: Outstanding TODO items

Example queries:
- "Find all classes that extend EventEmitter"
- "Show all files importing chalk"
- "List all test files for memory services"
```

### 3. Add Dynamic Content Generation

Modify the generation to dynamically pull from the codebase index:
- Most imported modules (from actual import analysis)
- Inheritance patterns (from class analysis)
- Common function patterns (from function analysis)
- Current TODO items (from todo analysis)
- Largest files (performance considerations)

### 4. Include Quick Reference Sections

Add quick reference guides for:
- Commands and their purposes
- Services and their responsibilities
- Common patterns (DI, Command, Error Handling)
- Testing patterns
- Performance optimization decorators

### 5. Context-Aware Information

Include project-specific details:
- Entry points with their purposes
- Configuration file locations
- Build and test commands
- Development workflow

## Implementation Steps

1. **Update generateCopilotInstructions() method**:
   - Load and parse the codebase-index.json
   - Extract relevant statistics and patterns
   - Generate sections dynamically based on actual codebase content

2. **Create template structure**:
   - Define markdown template with placeholders
   - Fill placeholders with dynamic content
   - Ensure proper formatting and links

3. **Add service relationship mapping**:
   - Analyze constructor dependencies
   - Map service interactions
   - Generate relationship diagram or list

4. **Include command documentation**:
   - Extract command names and descriptions
   - List available options
   - Provide usage examples

## Expected Outcome

The optimized copilot-instructions.md will:
- Provide comprehensive project context
- Enable faster code navigation
- Improve AI suggestion accuracy
- Reduce context switching
- Enhance development efficiency

## Validation Criteria

The generated file should:
1. Include all major architectural components
2. Provide clear navigation patterns
3. List all available commands and services
4. Include practical usage examples
5. Reference the codebase index effectively
6. Be under 2000 lines for performance
7. Use proper markdown formatting
8. Include working file links

## Code Example

Here's a partial implementation example for the enhanced generation:

```typescript
async generateCopilotInstructions(): Promise<string> {
  const index = await this.loadCodebaseIndex();
  const metadata = index.metadata;
  
  const sections = [
    this.generateHeader(),
    this.generateProjectOverview(metadata),
    this.generateArchitectureSection(),
    this.generateDirectoryStructure(),
    this.generateKeyComponents(index),
    this.generateNavigationGuide(),
    this.generateCommonPatterns(index),
    this.generateQuickReference(index),
    this.generateDevelopmentWorkflow(),
    this.generateTodos(index.todos)
  ];
  
  return sections.join('\n\n');
}
```

## Additional Considerations

- Keep the file concise but comprehensive
- Use proper markdown heading hierarchy
- Include inline code examples where helpful
- Ensure all file paths are relative and correct
- Test with GitHub Copilot to verify effectiveness
- Consider file size limits for optimal performance
- Update documentation to reflect new capabilities

This enhancement will significantly improve the AI agent's understanding of the codebase and ability to provide accurate, contextual assistance.