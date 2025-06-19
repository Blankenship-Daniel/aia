# JavaScript to TypeScript Conversion Prompt

## Context
You are converting JavaScript files to TypeScript in an AI Assistant (AIA) codebase that follows a Service-Component Architecture with dependency injection. This is a Node.js CLI application with the following key characteristics:

### Architecture Overview
- **Service Layer**: Services implement interfaces from `src/interfaces/` (e.g., `ICommandService`, `IMemoryService`, `IPluginService`)
- **Command Pattern**: Commands implement `ICommand` interface with specific methods
- **Dependency Injection**: Uses `DIContainer` and `ServiceFactory` for service management
- **Type System**: Central types defined in `src/types/index.ts`

### Key Patterns to Follow

1. **Import Statements**:
   - Convert `require()` to ES6 imports
   - Add `.js` extension to local imports (even for .ts files)
   - Import types/interfaces from appropriate locations
   ```typescript
   // Before
   const fs = require('fs-extra');
   const { ServiceFactory } = require('../container/ServiceFactory');
   
   // After
   import fs from 'fs-extra';
   import { ServiceFactory } from '../container/ServiceFactory.js';
   ```

2. **Service Implementation Pattern**:
   ```typescript
   import { IServiceName } from '../interfaces/IServiceName.js';
   import { ServiceResult, AsyncResult } from '../types/index.js';
   
   export class ServiceName implements IServiceName {
     // Implementation
   }
   ```

3. **Command Implementation Pattern**:
   ```typescript
   import { ICommand } from '../interfaces/ICommand.js';
   import { CommandResult, CommandOptions, CommandDefinition } from '../types/index.js';
   
   export class CommandName implements ICommand {
     public getDefinition(): CommandDefinition { }
     public getName(): string { }
     public getAliases(): string[] { }
     public validateArgs(args: string[]): { valid: boolean; errors: string[] } { }
     public getHelp(): string { }
     public async execute(
       context: Record<string, unknown>,
       args: string[],
       options: CommandOptions
     ): Promise<CommandResult> { }
   }
   ```

4. **Common Type Imports**:
   ```typescript
   import {
     AIAConfig,
     CommandResult,
     CommandOptions,
     ContextInfo,
     MemoryData,
     PluginManifest,
     AgenticExecution,
     ExecutionStep,
     // ... other types as needed
   } from '../types/index.js';
   ```

## Conversion Instructions

When converting a JavaScript file to TypeScript:

1. **Analyze the file's role**:
   - Is it a service? Check if it should implement an interface from `src/interfaces/`
   - Is it a command? It must implement `ICommand`
   - Is it a utility? Add appropriate type annotations

2. **Add type annotations**:
   - Function parameters and return types
   - Class properties
   - Variable declarations where type inference isn't sufficient
   - Use types from `src/types/index.js` where applicable

3. **Handle async/await properly**:
   ```typescript
   // Use AsyncResult<T> for service methods that return success/error
   async doSomething(): Promise<AsyncResult<string>> {
     try {
       return { success: true, data: 'result' };
     } catch (error) {
       return { success: false, error: error.message };
     }
   }
   ```

4. **Error handling**:
   ```typescript
   // Type guard for errors
   error instanceof Error ? error.message : 'Unknown error'
   ```

5. **Common replacements**:
   - `module.exports = ClassName` → `export { ClassName }`
   - `exports.functionName = ` → `export function functionName`
   - Dynamic requires → Static imports at top

6. **File structure preservation**:
   - Keep the same file location
   - Change extension from `.js` to `.ts`
   - Update imports in other files that reference this file

7. **Type safety considerations**:
   - Use `unknown` instead of `any` where possible
   - Add proper null/undefined checks
   - Use type guards for runtime type checking

## Example Conversion

**Before (JavaScript)**:
```javascript
const chalk = require('chalk');
const { ServiceFactory } = require('../container/ServiceFactory');

class ExampleService {
  constructor() {
    this.data = [];
  }
  
  async processData(input, options = {}) {
    try {
      const result = await this.transform(input);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = ExampleService;
```

**After (TypeScript)**:
```typescript
import chalk from 'chalk';
import { ServiceFactory } from '../container/ServiceFactory.js';
import { IExampleService } from '../interfaces/IExampleService.js';
import { AsyncResult } from '../types/index.js';

export class ExampleService implements IExampleService {
  private data: unknown[];
  
  constructor() {
    this.data = [];
  }
  
  public async processData(
    input: string,
    options: Record<string, unknown> = {}
  ): Promise<AsyncResult<string>> {
    try {
      const result = await this.transform(input);
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  private async transform(input: string): Promise<string> {
    // Implementation
    return input;
  }
}
```

## Validation Checklist
- [ ]