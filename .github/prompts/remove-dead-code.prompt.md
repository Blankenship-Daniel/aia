# Dead Code Removal Prompt for AIA Codebase

## Context
You are analyzing the AIA (AI Assistant) codebase, a Node.js application with:
- 103 files (primarily JavaScript with some TypeScript)
- Service-Component Architecture with Dependency Injection
- CLI-based interface with multiple commands
- Plugin system and workflow management
- Memory management and performance optimization features

## Dead Code Detection Criteria

### 1. Unused Exports and Functions
Identify and remove:
- Functions/classes exported but never imported anywhere in the codebase
- Private methods in classes that are never called within the class
- Utility functions in files like [`src/utils/RobustJSONParser.js`](src/utils/RobustJSONParser.js) that aren't used

### 2. Orphaned Files
Check for files that:
- Are not imported by any other file
- Are not entry points (main.js)
- Are not configuration files (jest.config.ts, package.json)
- Are not documentation (README.md, docs/*)
- Are not test files actively used

### 3. Redundant Service Registrations
In the DI container system:
- Services registered in [`src/container/ServiceFactory.js`](src/container/ServiceFactory.js) but never resolved
- Duplicate service registrations
- Services with circular dependencies that are never used

### 4. Commented Code Blocks
Remove:
- Large commented-out code sections (more than 5 consecutive lines)
- TODO comments referencing completed tasks
- Old implementations left as comments

### 5. Unused Dependencies
In package.json:
- Dependencies imported in package.json but never used in code
- Dev dependencies that don't match any build/test scripts

### 6. Dead Conditional Branches
- If/else blocks that can never be reached
- Switch cases that are impossible given the codebase logic
- Feature flags that are permanently disabled

### 7. Unused Command Handlers
In the command system:
- Commands registered but not exposed in CLI
- Command aliases that point to non-existent commands
- Legacy command implementations superseded by new ones

### 8. Stale Test Code
- Test files for components that no longer exist
- Mock data and fixtures not referenced by any test
- Test utilities that aren't used

## Specific Areas to Focus On

1. **Legacy Index Commands**: The code mentions "Individual index commands have been removed" - ensure all related code is cleaned up
2. **Plugin System**: Check for example plugins or test plugins that shouldn't be in production
3. **Memory Management**: Look for duplicate memory optimization implementations between [`src/MemoryManager.js`](src/MemoryManager.js) and [`src/PerformanceOptimizer.js`](src/PerformanceOptimizer.js)
4. **Service Interfaces**: TypeScript interfaces that were migrated but old JavaScript implementations remain
5. **Command Pattern**: Old command implementations before the factory pattern was introduced

## Safe Removal Guidelines

### DO Remove:
- Unreachable code after return/throw statements
- Empty catch blocks without comments
- Variables declared but never used
- Duplicate implementations of the same functionality
- Test files for non-existent features

### DO NOT Remove:
- Event handlers (even if not obviously connected)
- Plugin hooks and lifecycle methods
- Error handling code (even if rarely triggered)
- Performance monitoring code
- Configuration loading code
- Files referenced in package.json scripts

## Validation Steps After Removal

1. Run all tests: `npm test`
2. Verify CLI commands still work: `node main.js --help`
3. Check that all services can be instantiated
4. Ensure plugins can still be loaded
5. Verify no TypeScript compilation errors

## Expected Impact

After dead code removal, expect:
- Reduced bundle size
- Faster test execution
- Clearer code navigation
- Easier maintenance
- Better IDE performance

## Priority Order

1. **High Priority**: Commented code, unused exports, orphaned files
2. **Medium Priority**: Unused dependencies, redundant service registrations
3. **Low Priority**: TODO cleanup, minor optimizations

Please analyze the codebase systematically, starting with the src/ directory, and provide a detailed report of what can be safely removed with justification for each item.