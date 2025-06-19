# Developer Reference

## Quick Start
Main entry points:
- index.js
- main.js

## Development Environment
- Primary language: javascript
- Total files: 96
- Architecture: Service-Component Architecture

## Key Functions
- **gracefulShutdown** (async) - index.js
- **preloadPluginsForCLI** - index.js
- **to** - src/commands/IndexCommand.js
- **isLikelyCommand** - index.js
- **main** - tests/test-js-to-ts-transition.js
- **update** - src/CLIFormatter.js
- **for** - src/container/DIContainer.js
- **async** - src/TestRunner.js
- **mockFn** - src/TestRunner.js
- **getOutputDir** - src/commands/IndexCommand.js
- **if** - src/container/DIContainer.js
- **visit** - src/container/DIContainer.js
- **reference** - src/services/CodeIndexService.js
- **parseAgenticPlan** - src/utils/RobustJSONParser.js
- **parseEvaluationResult** - src/utils/RobustJSONParser.js

## Current Tasks (TODOs)
- [ ] Enhance with semantic vector search (index.js:1385)
- [ ] --verbose is already added as common option above (src/cli/CLIApplication.js:157)
- [ ] Interfaces are now in TypeScript files and not needed for runtime (src/container/ServiceFactory.js:7)
- [ ] Implement feature flags system (src/services/ConfigurationService.ts:350)
- [ ] This is a simplified method. In a real-world scenario, (src/services/PluginService.ts:258)
