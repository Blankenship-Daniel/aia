# AI Agent Prompt: Optimized JSDoc Documentation for AIA CLI Codebase

## Objective

Your task is to fully document the AIA CLI TypeScript codebase using comprehensive JSDoc comments optimized specifically for rapid context gathering by future AI agents. Follow the provided guidelines precisely to ensure clarity, maintainability, and ease of automated context extraction.

## Documentation Scope

Document the following components in the specified priority order:

### Priority Order

1. **Core Engine**

   - [`AgenticReasoningEngine.ts`](src/AgenticReasoningEngine.ts)
   - [`AgenticSearchEngine.ts`](src/AgenticSearchEngine.ts)

2. **CLI Layer**

   - [`CLIApplication.ts`](src/cli/CLIApplication.ts)
   - [`CLIFormatter.ts`](src/CLIFormatter.ts)

3. **Service Layer**

   - All services in [`src/services/*.ts`](src/services/)

4. **Command Layer**

   - All commands in [`src/commands/*.ts`](src/commands/)

5. **Interfaces**

   - All interfaces in [`src/interfaces/*.ts`](src/interfaces/)

6. **Utilities & Helpers**

   - All utilities in [`src/utils/*.ts`](src/utils/)

7. **Container & Dependency Injection**

   - [`DIContainer.ts`](src/container/DIContainer.ts)
   - [`ServiceFactory.ts`](src/container/ServiceFactory.ts)

8. **Types & Definitions**
   - All type definitions in [`src/types/*.ts`](src/types/)

## Optimized JSDoc Standards for AI Context Extraction

Use the following structured JSDoc comment format consistently to facilitate rapid context extraction by future AI agents:

```typescript
/**
 * Brief, clear summary of the class, interface, or function.
 *
 * Detailed description explicitly stating:
 * - Purpose and responsibilities
 * - Key interactions with other components (services, commands, interfaces)
 * - Dependencies and relationships clearly listed
 *
 * @param {Type} paramName - Concise description of parameter, including expected values and constraints.
 * @returns {Type} Clear description of return value.
 * @throws {ErrorType} Explicit description of possible exceptions.
 *
 * @example
 * // Typical usage scenario:
 * const result = instance.method(param);
 *
 * @see RelatedClass - Brief reason for relation
 * @see relatedFunction - Brief reason for relation
 */
```

### Documentation Requirements for AI Optimization

- **File-Level**: Summarize the file's role, responsibilities, and key exports clearly at the top.
- **Class-Level**: Explicitly state purpose, responsibilities, dependencies, and usage scenarios.
- **Method-Level**: Clearly document parameters, return values, exceptions, and provide concise usage examples.
- **Property-Level**: Clearly state purpose, type, and default values.
- **Event & Callback-Level**: Explicitly document emitted events and callback signatures.
- **Cross-References**: Use `@see` tags consistently to link related components, clearly stating the relationship.

### Examples & Usage

- Include concise, representative usage examples within JSDoc comments for critical methods and classes.
- Demonstrate typical usage scenarios clearly to aid both human and AI understanding.

### Validation & Review

- Ensure all public methods, classes, interfaces, and properties are fully documented.
- Validate completeness by generating documentation using standard JSDoc tools.
- Review generated documentation for clarity, accuracy, and consistency.

## Action Steps

1. Begin with the highest priority files (Core Engine).
2. Progress systematically through the prioritized list.
3. Follow the optimized JSDoc standards rigorously.
4. Include meaningful examples and explicit cross-references.
5. Validate and review your documentation thoroughly.

Start executing this optimized documentation plan now, beginning with the Core Engine components.
