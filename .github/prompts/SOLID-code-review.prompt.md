# SOLID Principles Code Review Prompt for AIA Codebase

## Context
You are conducting a comprehensive code review of the AIA (AI Assistant) codebase to evaluate adherence to SOLID engineering principles. This is a Node.js CLI application with:

- **Architecture**: Service-Component Architecture with Dependency Injection
- **Scale**: 103 files, 59 classes, 44 functions
- **Languages**: TypeScript (30 files) and JavaScript (52 files)
- **Pattern**: Command Pattern with Factory Pattern for object creation

## SOLID Principles Analysis Framework

### 1. Single Responsibility Principle (SRP)
**"A class should have only one reason to change"**

#### Analysis Areas:
- **Service Classes**: Evaluate each service in `src/services/` for single responsibility
  - `ConfigurationService.ts` - Should only handle configuration management
  - `AIService.ts` - Should only handle AI model interactions
  - `CommandService.ts` - Should only handle command execution
  - `MemoryService.ts` - Should only handle memory/storage operations
  - `PluginService.ts` - Should only handle plugin management

- **Command Classes**: Examine each command in `src/commands/` for focused responsibility
  - `AskCommand.ts` - Should only handle AI questioning
  - `AgentCommand.ts` - Should only handle agentic reasoning
  - `ExecuteCommand.ts` - Should only handle command execution
  - `IndexCommand.ts` - Should only handle codebase indexing

- **Utility Classes**: Check utilities for single-purpose design
  - `RobustJSONParser.ts` - Should only handle JSON parsing
  - `ErrorHandler.ts` - Should only handle error management
  - `SecurityValidator.ts` - Should only handle security validation

#### Red Flags to Identify:
- Classes with multiple unrelated methods
- Classes that handle both business logic AND presentation
- Services that perform multiple distinct operations
- Mixed concerns (e.g., data access + formatting + validation)

#### Questions to Answer:
1. Does each class have a clear, single purpose?
2. Are there methods that don't belong to the class's core responsibility?
3. Would changes to different features require modifying the same class?

### 2. Open/Closed Principle (OCP)
**"Software entities should be open for extension, closed for modification"**

#### Analysis Areas:
- **Command Pattern Implementation**: Check if new commands can be added without modifying existing code
  - Review `CommandFactory.ts` for extensibility
  - Examine how `ICommand` interface enables new command types
  - Verify command registration mechanism in `CommandRegistry.ts`

- **Plugin System**: Evaluate plugin extensibility
  - Check `PluginManager.ts` for plugin loading without core modifications
  - Review plugin interfaces in `src/interfaces/IPluginService.ts`
  - Examine example plugins in `examples/` directory

- **AI Service Integration**: Assess how new AI providers can be added
  - Review `AIService.ts` for provider abstraction
  - Check if new models can be integrated without core changes

#### Red Flags to Identify:
- Switch statements or if-else chains for type checking
- Direct instantiation instead of factory patterns
- Hardcoded dependencies
- Modification of existing classes to add new functionality

#### Questions to Answer:
1. Can new commands be added without changing existing command classes?
2. Can new AI providers be integrated without modifying core services?
3. Are there factory patterns that enable extension?
4. Is the plugin system truly extensible?

### 3. Liskov Substitution Principle (LSP)
**"Objects should be replaceable with instances of their subtypes"**

#### Analysis Areas:
- **Interface Implementations**: Check if all implementations properly fulfill their contracts
  - Verify all services implement their respective interfaces correctly
  - Check that `ICommand` implementations are truly substitutable
  - Review inheritance relationships (e.g., `SemanticCodeAnalyzer extends SemanticAnalyzer`)

- **Polymorphic Usage**: Examine polymorphic code patterns
  - Review dependency injection container usage
  - Check command execution through `ICommand` interface
  - Analyze service resolution through interfaces

#### Red Flags to Identify:
- Implementations that throw "not implemented" exceptions
- Subclasses that weaken preconditions or strengthen postconditions
- Type checking before method calls
- Different behavior for the same interface method across implementations

#### Questions to Answer:
1. Can any `ICommand` implementation be used interchangeably?
2. Do all service implementations honor their interface contracts?
3. Are there any inheritance relationships that violate substitutability?

### 4. Interface Segregation Principle (ISP)
**"Clients should not be forced to depend on interfaces they don't use"**

#### Analysis Areas:
- **Service Interfaces**: Examine interfaces in `src/interfaces/` for cohesion
  - `ICommandService.ts` - Should only contain command-related methods
  - `IAIService.ts` - Should only contain AI-related methods
  - `IMemoryService.ts` - Should only contain memory-related methods
  - `IConfigurationService.ts` - Should only contain configuration methods

- **Command Interface**: Check if `ICommand` is appropriately focused
  - Review required methods vs. optional methods
  - Check if all commands need all interface methods

#### Red Flags to Identify:
- Large interfaces with many unrelated methods
- Implementations with empty or stub methods
- Clients importing interfaces but only using a subset
- "God" interfaces that try to do everything

#### Questions to Answer:
1. Are interfaces focused on specific client needs?
2. Do any implementations have unused interface methods?
3. Can interfaces be broken down into smaller, more focused contracts?

### 5. Dependency Inversion Principle (DIP)
**"High-level modules should not depend on low-level modules. Both should depend on abstractions."**

#### Analysis Areas:
- **Dependency Injection**: Examine DI container implementation
  - Review `DIContainer.ts` for proper abstraction usage
  - Check `ServiceFactory.ts` for dependency management
  - Verify services depend on interfaces, not concrete classes

- **Service Dependencies**: Analyze service dependency chains
  - Check if high-level services depend on abstractions
  - Verify low-level utilities are injected, not instantiated
  - Review constructor dependencies across services

- **Import Analysis**: Examine import statements for dependency direction
  - High-level modules should import interfaces, not implementations
  - Check for circular dependencies
  - Verify abstraction layers are respected

#### Red Flags to Identify:
- Direct instantiation of concrete classes in constructors
- Imports of concrete classes instead of interfaces
- High-level modules depending on low-level implementation details
- Tight coupling between layers

#### Questions to Answer:
1. Do services depend on interfaces rather than concrete implementations?
2. Is the dependency injection container properly abstracting dependencies?
3. Are there any violations of the dependency direction?

## Comprehensive Analysis Checklist

### Architecture Review
- [ ] Verify Service-Component Architecture adherence
- [ ] Check Command Pattern implementation
- [ ] Evaluate Factory Pattern usage
- [ ] Assess Dependency Injection implementation

### Code Quality Metrics
- [ ] Analyze class cohesion and coupling
- [ ] Review method complexity and size
- [ ] Check for code duplication
- [ ] Evaluate error handling patterns

### Interface Design Review
- [ ] Assess interface segregation and focus
- [ ] Check for proper abstraction levels
- [ ] Verify contract completeness
- [ ] Review polymorphic usage patterns

### Extensibility Assessment
- [ ] Evaluate plugin system design
- [ ] Check command extensibility
- [ ] Assess service provider patterns
- [ ] Review configuration flexibility

## Specific Files to Analyze

### High Priority (Core Architecture)
1. `src/container/DIContainer.ts` - DI implementation
2. `src/container/ServiceFactory.ts` - Service composition
3. `src/commands/CommandFactory.ts` - Command creation
4. `src/cli/CLIApplication.ts` - Application orchestration

### Medium Priority (Services)
1. `src/services/ConfigurationService.ts`
2. `src/services/AIService.ts`
3. `src/services/CommandService.ts`
4. `src/services/MemoryService.ts`

### Interface Contracts
1. All files in `src/interfaces/` directory
2. Service implementations vs. their interfaces
3. Command implementations vs. `ICommand`

## Expected Deliverables

### 1. SOLID Compliance Report
- **Violations Found**: List specific violations with file locations
- **Severity Assessment**: Rate violations as High/Medium/Low priority
- **Code Examples**: Show problematic code snippets
- **Recommendations**: Provide specific refactoring suggestions

### 2. Architecture Assessment
- **Strengths**: Identify well-implemented SOLID principles
- **Weaknesses**: Point out architectural debt
- **Improvement Opportunities**: Suggest architectural enhancements

### 3. Refactoring Roadmap
- **Quick Wins**: Simple fixes that improve SOLID compliance
- **Medium-term Goals**: Larger refactoring efforts
- **Long-term Vision**: Architectural improvements

## Success Criteria

A SOLID-compliant codebase should demonstrate:
- ✅ Clear single responsibilities for each class
- ✅ Extensible design without core modifications
- ✅ Proper interface substitutability
- ✅ Focused, client-specific interfaces
- ✅ Dependency inversion with proper abstractions

## Analysis Instructions

1. **Start with Architecture**: Begin with the DI container and service factory
2. **Examine Interfaces**: Review all interface definitions for ISP compliance
3. **Check Implementations**: Verify LSP adherence in service implementations
4. **Assess Extensions**: Review command and plugin extensibility for OCP
5. **Validate Dependencies**: Check dependency direction for DIP compliance
6. **Identify Violations**: Document specific SOLID principle violations
7. **Provide Solutions**: Suggest concrete refactoring approaches

Focus on providing actionable insights that will help maintain the codebase's architectural integrity while supporting its continued evolution as an AI-powered development tool.