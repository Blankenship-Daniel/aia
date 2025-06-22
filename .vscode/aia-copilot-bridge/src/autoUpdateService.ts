import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AIASymbolIndexProvider } from './symbolProvider';
import { CopilotContextEnhancer } from './copilotContextProvider';

const execAsync = promisify(exec);

export class AutoUpdateService {
  private updateTimer?: NodeJS.Timeout;
  private isUpdating = false;
  private pendingUpdate = false;
  private lastUpdateTime = 0;
  private fileChecksums = new Map<string, string>();
  private pendingChanges = new Set<string>();
  private aiUpdateTimer?: NodeJS.Timeout;
  private symbolUpdateTimer?: NodeJS.Timeout;
  private lastAIUpdateTime = 0;
  private dailyAIUpdateCount = 0;
  private lastResetDate = new Date().toDateString();

  constructor(
    private symbolProvider: AIASymbolIndexProvider,
    private contextEnhancer: CopilotContextEnhancer,
    private workspaceRoot: string
  ) {
    this.resetDailyCounterIfNeeded();
  }

  /**
   * Reset daily counter if it's a new day
   */
  private resetDailyCounterIfNeeded(): void {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailyAIUpdateCount = 0;
      this.lastResetDate = today;
      console.log('🔄 Daily AI update counter reset');
    }
  }

  /**
   * Start watching for file changes and auto-updating copilot instructions
   */
  startWatching(context: vscode.ExtensionContext): void {
    const config = vscode.workspace.getConfiguration('aia.symbolIndex');
    const autoUpdate = config.get<boolean>('autoUpdate', true);
    const updateInterval = config.get<number>('updateInterval', 300000); // 5 minutes default
    const symbolDebounceDelay = config.get<number>('symbolDebounceDelay', 2000); // 2 seconds for local operations
    const aiDebounceDelay = config.get<number>('aiDebounceDelay', 60000); // 60 seconds for AI operations (more conservative)
    const enableAIUpdates = config.get<boolean>('enableAIUpdates', false); // Default disabled
    const aiUpdateStrategy = config.get<string>('aiUpdateStrategy', 'manual'); // manual, time-based, or smart
    const promptBeforeExpensive = config.get<boolean>(
      'promptBeforeExpensiveUpdates',
      true
    );
    const maxDailyUpdates = config.get<number>('maxDailyAIUpdates', 10);

    if (!autoUpdate) {
      console.log('Auto-update disabled in configuration');
      return;
    }

    console.log('🔄 Starting AIA auto-update service...');
    console.log(`   💡 Symbol updates: ${symbolDebounceDelay}ms debounce`);
    console.log(
      `   🧠 AI updates: ${
        enableAIUpdates ? aiDebounceDelay + 'ms debounce' : 'DISABLED'
      }`
    );
    console.log(`   📋 AI strategy: ${aiUpdateStrategy}`);
    console.log(
      `   ⚠️  AI prompts: ${promptBeforeExpensive ? 'ENABLED' : 'DISABLED'}`
    );
    console.log(
      `   📊 Daily limit: ${this.dailyAIUpdateCount}/${maxDailyUpdates} AI updates used`
    );

    // Watch for TypeScript/JavaScript file changes
    const fileWatcher = vscode.workspace.createFileSystemWatcher(
      '**/*.{ts,js,tsx,jsx,md}',
      false, // Don't ignore create events
      false, // Don't ignore change events
      false // Don't ignore delete events
    );

    // Fast symbol index update (local operation)
    const triggerSymbolUpdate = (uri: vscode.Uri) => {
      this.pendingChanges.add(uri.fsPath);

      if (this.symbolUpdateTimer) {
        clearTimeout(this.symbolUpdateTimer);
      }

      this.symbolUpdateTimer = setTimeout(async () => {
        await this.performLocalSymbolUpdate();
      }, symbolDebounceDelay);
    };

    // Slow AI context update (expensive operation)
    const triggerAIUpdate = async () => {
      if (!enableAIUpdates) {
        console.log('🧠 AI updates disabled in configuration, skipping...');
        return;
      }

      // Check daily limit
      this.resetDailyCounterIfNeeded();
      if (this.dailyAIUpdateCount >= maxDailyUpdates) {
        console.log(
          `🧠 AI updates reached daily limit (${maxDailyUpdates}), skipping...`
        );
        vscode.window.showWarningMessage(
          `⚠️ AIA: Daily AI update limit reached (${maxDailyUpdates}). Manual updates still available.`
        );
        return;
      }

      // Prompt before expensive operation if enabled
      if (promptBeforeExpensive && aiUpdateStrategy !== 'manual') {
        const choice = await vscode.window.showWarningMessage(
          `🧠 AIA wants to perform an expensive AI context update.\n\nThis uses API credits and may take 30-60 seconds.\n\nDaily usage: ${this.dailyAIUpdateCount}/${maxDailyUpdates}`,
          { modal: false },
          'Allow Once',
          "Allow & Don't Ask Today",
          'Cancel'
        );

        if (choice === 'Cancel' || !choice) {
          console.log('🧠 AI update cancelled by user');
          return;
        }

        if (choice === "Allow & Don't Ask Today") {
          await config.update(
            'promptBeforeExpensiveUpdates',
            false,
            vscode.ConfigurationTarget.Workspace
          );
        }
      }

      if (this.aiUpdateTimer) {
        clearTimeout(this.aiUpdateTimer);
      }

      this.aiUpdateTimer = setTimeout(async () => {
        if (await this.shouldPerformAIUpdate(aiUpdateStrategy)) {
          await this.performAIContextUpdate();
        }
      }, aiDebounceDelay);
    };

    // Watch for file changes with smart detection
    fileWatcher.onDidCreate((uri) => {
      console.log(`📄 File created: ${uri.fsPath}`);
      triggerSymbolUpdate(uri);
      if (this.isSignificantChange(uri.fsPath)) {
        triggerAIUpdate();
      }
    });

    fileWatcher.onDidChange(async (uri) => {
      const hasSignificantChange = await this.hasSignificantContentChange(
        uri.fsPath
      );
      if (hasSignificantChange) {
        console.log(`📝 Significant change detected: ${uri.fsPath}`);
        triggerSymbolUpdate(uri);
        if (this.isSignificantChange(uri.fsPath)) {
          triggerAIUpdate();
        }
      } else {
        console.log(`📝 Trivial change ignored: ${uri.fsPath}`);
      }
    });

    fileWatcher.onDidDelete((uri) => {
      console.log(`🗑️ File deleted: ${uri.fsPath}`);
      this.fileChecksums.delete(uri.fsPath);
      triggerSymbolUpdate(uri);
      if (this.isSignificantChange(uri.fsPath)) {
        triggerAIUpdate();
      }
    });

    // Watch for configuration changes
    const configWatcher = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('aia.symbolIndex')) {
        console.log('🔧 AIA configuration changed, triggering updates...');
        triggerSymbolUpdate(vscode.Uri.file('config'));

        // Only trigger AI update if it's a significant configuration change
        const newConfig = vscode.workspace.getConfiguration('aia.symbolIndex');
        const newEnableAI = newConfig.get<boolean>('enableAIUpdates', false);
        if (newEnableAI) {
          triggerAIUpdate();
        }
      }
    });

    // Periodic updates - but only for AI context if enabled
    const periodicUpdate = setInterval(() => {
      const now = Date.now();
      if (now - this.lastUpdateTime > updateInterval) {
        console.log('⏰ Periodic update triggered');
        this.performLocalSymbolUpdate(); // Always update symbols
        if (enableAIUpdates && aiUpdateStrategy === 'time-based') {
          this.performAIContextUpdate(); // Only update AI context if enabled
        }
      }
    }, updateInterval);

    // Register for cleanup
    context.subscriptions.push(fileWatcher, configWatcher, {
      dispose: () => {
        clearInterval(periodicUpdate);
        if (this.symbolUpdateTimer) clearTimeout(this.symbolUpdateTimer);
        if (this.aiUpdateTimer) clearTimeout(this.aiUpdateTimer);
      },
    });

    console.log('✅ Auto-update service started successfully');
  }

  /**
   * Perform the actual update using existing AIA CLI functionality
   */
  private async performUpdate(): Promise<void> {
    if (this.isUpdating) {
      this.pendingUpdate = true;
      return;
    }

    this.isUpdating = true;
    const startTime = Date.now();

    try {
      console.log('🔄 Auto-updating using existing AIA CLI...');

      // Use existing AIA CLI commands instead of duplicating functionality
      await this.rebuildSymbolIndexUsingAIA();
      await this.updateCopilotInstructionsUsingAIA();

      const duration = Date.now() - startTime;
      this.lastUpdateTime = Date.now();

      console.log(`✅ Auto-update completed in ${duration}ms`);

      // Show subtle notification
      const config = vscode.workspace.getConfiguration('aia.symbolIndex');
      if (config.get<boolean>('showUpdateNotifications', false)) {
        vscode.window.showInformationMessage(
          `🔄 AIA: Copilot context updated using existing CLI (${duration}ms)`,
          { modal: false }
        );
      }
    } catch (error) {
      console.error('❌ Auto-update failed:', error);
      vscode.window.showWarningMessage(
        `AIA auto-update failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      this.isUpdating = false;

      // Handle pending update
      if (this.pendingUpdate) {
        this.pendingUpdate = false;
        setTimeout(() => this.performUpdate(), 1000);
      }
    }
  }

  /**
   * Use existing AIA CLI to rebuild symbol index
   */
  private async rebuildSymbolIndexUsingAIA(): Promise<void> {
    try {
      // Check if AIA CLI is available
      const aiaPath = path.join(
        this.workspaceRoot,
        'node_modules',
        '.bin',
        'aia'
      );
      const hasLocalAia = await fs.pathExists(aiaPath);

      let command = 'aia index build --force';
      if (hasLocalAia) {
        command = `${aiaPath} index build --force`;
      } else if (
        await fs.pathExists(path.join(this.workspaceRoot, 'dist', 'index.js'))
      ) {
        command = `node ${path.join(
          this.workspaceRoot,
          'dist',
          'index.js'
        )} index build --force`;
      }

      console.log(`🔨 Running: ${command}`);
      await execAsync(command, {
        cwd: this.workspaceRoot,
        timeout: 30000,
      });

      console.log('✅ Symbol index rebuilt using AIA CLI');
    } catch (error) {
      console.error('Failed to rebuild symbol index:', error);
      throw error;
    }
  }

  /**
   * Use existing AIA CLI to generate copilot instructions
   */
  private async updateCopilotInstructionsUsingAIA(): Promise<void> {
    try {
      // Check if AIA CLI is available
      const aiaPath = path.join(
        this.workspaceRoot,
        'node_modules',
        '.bin',
        'aia'
      );
      const hasLocalAia = await fs.pathExists(aiaPath);

      let command =
        'aia index export --type copilot-instructions --output .github/copilot-instructions.md';
      if (hasLocalAia) {
        command = `${aiaPath} index export --type copilot-instructions --output .github/copilot-instructions.md`;
      } else if (
        await fs.pathExists(path.join(this.workspaceRoot, 'main.js'))
      ) {
        command = `node ${path.join(
          this.workspaceRoot,
          'main.js'
        )} index export --type copilot-instructions --output .github/copilot-instructions.md`;
      }

      console.log(`📝 Running: ${command}`);
      const { stdout } = await execAsync(command, {
        cwd: this.workspaceRoot,
        timeout: 30000,
      });

      // Save the generated instructions to the copilot file
      const copilotInstructionsPath = path.join(
        this.workspaceRoot,
        '.github',
        'copilot-instructions.md'
      );

      await fs.outputFile(copilotInstructionsPath, stdout);
      console.log('✅ Updated .github/copilot-instructions.md using AIA CLI');
    } catch (error) {
      console.error('Failed to update copilot instructions:', error);
      // Fallback to our own generation if AIA CLI fails
      console.log('🔄 Falling back to internal generation...');
      await this.updateCopilotInstructions();
    }
  }

  /**
   * Fallback method using our own copilot instructions generation
   */
  private async updateCopilotInstructions(): Promise<void> {
    const copilotInstructionsPath = path.join(
      this.workspaceRoot,
      '.github',
      'copilot-instructions.md'
    );

    try {
      // Check if the file exists
      const exists = await fs.pathExists(copilotInstructionsPath);
      if (!exists) {
        console.log('📝 Creating new copilot-instructions.md file...');
      }

      // Generate updated instructions using our fallback
      const instructions = await this.generateCopilotInstructions();

      // Write to file
      await fs.outputFile(copilotInstructionsPath, instructions);

      console.log('✅ Updated .github/copilot-instructions.md (fallback)');
    } catch (error) {
      console.error('❌ Failed to update copilot-instructions.md:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive copilot instructions based on current codebase (fallback method)
   */
  private async generateCopilotInstructions(): Promise<string> {
    const indexPath = path.join(
      this.workspaceRoot,
      '.aia',
      'codebase-index.json'
    );

    try {
      const index = await fs.readJson(indexPath);
      const files = index.files || [];

      // Extract symbols and statistics
      let totalSymbols = 0;
      const symbolsByType = {
        class: 0,
        function: 0,
        interface: 0,
        type: 0,
        enum: 0,
      };
      const recentSymbols: string[] = [];

      for (const [filePath, fileData] of files) {
        const symbols = fileData.symbols || [];
        totalSymbols += symbols.length;

        for (const symbol of symbols) {
          if (symbol.type && symbolsByType.hasOwnProperty(symbol.type)) {
            symbolsByType[symbol.type as keyof typeof symbolsByType]++;
          }

          // Collect recent/important symbols
          if (
            symbol.name &&
            (symbol.type === 'class' || symbol.type === 'function')
          ) {
            recentSymbols.push(symbol.name);
          }
        }
      }

      const timestamp = new Date().toISOString();

      return `# GitHub Copilot Instructions - AIA CLI Project

*Last updated: ${timestamp}*
*Auto-generated by AIA VSCode Extension*

## 🎯 Project Context

You are working with the **AIA CLI** (AI Agentic Assistant) - a TypeScript Node.js application that provides intelligent command-line assistance with AI-powered task planning and execution.

### 📊 Current Codebase Statistics
- **Total Files**: ${index.metadata?.totalFiles || 'Unknown'}
- **Total Symbols**: ${totalSymbols}
- **Classes**: ${symbolsByType.class}
- **Functions**: ${symbolsByType.function}
- **Interfaces**: ${symbolsByType.interface}
- **Last Indexed**: ${index.metadata?.indexedAt || timestamp}

## 🧠 Symbol Index Integration

This project uses AIA's **O(1) Symbol Lookup System** for enhanced development:

### Performance Benefits
- **Symbol lookup**: <5ms (vs 50-200ms file scanning)
- **Dependency analysis**: 50-200ms (vs 2-5 seconds)
- **AI agent tasks**: 200-500ms (vs 3-8 seconds)
- **10-40x performance improvement** over traditional approaches

### Available Symbols
When suggesting code, you have instant access to ${totalSymbols} symbols including:
${recentSymbols
  .slice(0, 20)
  .map((name) => `- \`${name}\``)
  .join('\\n')}

## 🏗️ Architecture Patterns

### Core Services Pattern
\`\`\`typescript
// All services follow dependency injection pattern
class ServiceName implements IServiceInterface {
  constructor(
    private dependencyA: IDependencyA,
    private dependencyB: IDependencyB
  ) {}
}
\`\`\`

### Command Pattern Implementation
\`\`\`typescript
// Commands extend BaseCommand
class NewCommand extends BaseCommand {
  async execute(context: ContextInfo): Promise<void> {
    const aiProvider = this.aiProvider.createProvider('gpt4');
    const memory = await this.memoryManager.getMemory();
    // Command logic here
  }
}
\`\`\`

### Key Service Relationships
- **AgenticReasoningEngine**: Core AI decision making
- **MemoryManager**: Context and state management (14+ references)
- **ConfigurationManager**: Settings and configuration (5+ references)
- **CommandFactoryV2**: Command pattern implementation
- **SymbolIndexService**: O(1) symbol lookup and relationships

## 🚀 Development Guidelines

### Import Patterns
\`\`\`typescript
// Use these standard import patterns
import { MemoryManager } from '../managers/MemoryManager';
import { ConfigurationManager } from '../managers/ConfigurationManager';
import { AIProviderFactory } from '../factories/AIProviderFactory';
\`\`\`

### Service Creation Template
\`\`\`typescript
// New service template
export class NewService implements INewService {
  constructor(
    private memoryManager: MemoryManager,
    private configManager: ConfigurationManager
  ) {}

  async execute(context: ContextInfo): Promise<ResultType> {
    // Implementation using injected dependencies
  }
}
\`\`\`

### Adding New Commands
\`\`\`typescript
// New command template
export class NewCommand extends BaseCommand {
  constructor(
    memoryManager: MemoryManager,
    aiProvider: AIProviderFactory,
    configManager: ConfigurationManager
  ) {
    super(memoryManager, aiProvider);
  }

  async execute(context: ContextInfo): Promise<void> {
    // Command implementation
  }
}
\`\`\`

## 📁 Directory Structure & File Organization

\`\`\`
src/
├── commands/          # Command implementations (extends BaseCommand)
├── services/          # Core business logic services
├── managers/          # State and lifecycle management
├── factories/         # Object creation and DI
├── interfaces/        # TypeScript interface definitions
├── analyzers/         # Code analysis and symbol extraction
└── utils/            # Shared utilities and helpers
\`\`\`

## 🎯 Code Generation Best Practices

### 1. **Symbol-Aware Suggestions**
- Always check symbol index for existing implementations
- Use exact class/function names from the index
- Leverage pre-computed relationships for dependency injection

### 2. **Type Safety First**
- Implement interfaces before concrete classes
- Use strong typing throughout
- Follow established naming conventions

### 3. **Performance Considerations**
- Use MemoryManager for efficient state management
- Implement proper cleanup in service lifecycles
- Consider command execution overhead

### 4. **Testing Integration**
- Follow the established test patterns in \`tests/\`
- Mock dependencies using Jest
- Test both success and error scenarios

## 🔧 Common Development Scenarios

### Adding AI Provider Integration
\`\`\`typescript
class NewAIProvider implements IAIProvider {
  constructor(private config: ConfigurationManager) {}
  
  async generate(prompt: string): Promise<string> {
    // Provider implementation
  }
}
\`\`\`

### Creating Memory-Aware Commands
\`\`\`typescript
class MemoryCommand extends BaseCommand {
  async execute(context: ContextInfo): Promise<void> {
    const memories = await this.memoryManager.searchMemories(context.query);
    // Use retrieved memories in command logic
  }
}
\`\`\`

### Service Integration Examples
\`\`\`typescript
// Service with multiple dependencies
class ComplexService {
  constructor(
    private symbolIndex: SymbolIndexService,
    private aiProvider: AIProviderFactory,
    private memory: MemoryManager
  ) {}
}
\`\`\`

## ⚡ Real-Time Updates

This file is **automatically updated** when the codebase changes:
- File modifications trigger symbol index rebuilds
- New classes/functions are immediately available
- Relationship mappings stay current
- Performance metrics are continuously tracked

## 🎯 Usage Examples

### Quick Symbol Lookup
\`\`\`typescript
// These symbols are available for instant completion:
const engine = new AgenticReasoningEngine(/*...*/);
const memory = new MemoryManager(/*...*/);
const config = new ConfigurationManager(/*...*/);
\`\`\`

### Dependency Injection Examples
\`\`\`typescript
// ServiceFactory pattern usage
const serviceFactory = new ServiceFactory();
const memoryService = serviceFactory.createMemoryService();
\`\`\`

---

**🔄 Auto-Update Status**: ✅ **ACTIVE**
**📊 Performance**: 🚀 **10-40x FASTER** symbol lookup
**🧠 AI Enhancement**: ✅ **${totalSymbols} symbols** indexed for intelligent suggestions

*This file automatically updates when code changes to keep GitHub Copilot context fresh and accurate.*`;
    } catch (error) {
      console.error(
        'Failed to load symbol index for instructions generation:',
        error
      );

      // Fallback to basic instructions
      return `# GitHub Copilot Instructions - AIA CLI Project

*Last updated: ${new Date().toISOString()}*
*Auto-generated by AIA VSCode Extension*

## Project Context
AIA CLI - AI Agentic Assistant TypeScript Node.js application.

⚠️ **Symbol index temporarily unavailable** - using fallback instructions.

Please rebuild the symbol index for enhanced context:
1. Run "AIA: Rebuild Symbol Index" command
2. Wait for completion
3. This file will auto-update with full context

## Basic Patterns
- Service-oriented architecture with dependency injection
- Command pattern for user interactions
- TypeScript with strong typing
- Memory-aware AI assistance

---
*This file will auto-update when the symbol index is rebuilt.*`;
    }
  }

  /**
   * Perform fast local symbol index update (no AI required)
   */
  private async performLocalSymbolUpdate(): Promise<void> {
    if (this.isUpdating) {
      this.pendingUpdate = true;
      return;
    }

    this.isUpdating = true;
    const startTime = Date.now();

    try {
      console.log('⚡ Fast symbol index update (local only)...');

      // Only rebuild local symbol index - no AI operations
      await this.rebuildSymbolIndexUsingAIA();

      const duration = Date.now() - startTime;
      this.lastUpdateTime = Date.now();

      console.log(`✅ Local symbol update completed in ${duration}ms`);

      // Clear pending changes after successful update
      this.pendingChanges.clear();
    } catch (error) {
      console.error('❌ Local symbol update failed:', error);
    } finally {
      this.isUpdating = false;

      if (this.pendingUpdate) {
        this.pendingUpdate = false;
        setTimeout(() => this.performLocalSymbolUpdate(), 1000);
      }
    }
  }

  /**
   * Perform expensive AI context update (only when really needed)
   */
  private async performAIContextUpdate(): Promise<void> {
    const startTime = Date.now();

    try {
      console.log('🧠 AI context update (expensive operation)...');

      // Increment daily counter
      this.resetDailyCounterIfNeeded();
      this.dailyAIUpdateCount++;

      const config = vscode.workspace.getConfiguration('aia.symbolIndex');
      const maxDaily = config.get<number>('maxDailyAIUpdates', 10);

      // Only update AI-powered context generation
      await this.updateCopilotInstructionsUsingAIA();

      const duration = Date.now() - startTime;
      this.lastAIUpdateTime = Date.now();

      console.log(`✅ AI context update completed in ${duration}ms`);
      console.log(
        `📊 Daily AI updates: ${this.dailyAIUpdateCount}/${maxDaily}`
      );

      // Show notification for AI updates since they're expensive
      const showNotifications = config.get<boolean>(
        'showAIUpdateNotifications',
        true
      );
      if (showNotifications) {
        vscode.window.showInformationMessage(
          `🧠 AIA: AI context updated (${duration}ms) • ${this.dailyAIUpdateCount}/${maxDaily} daily`,
          { modal: false }
        );
      }

      // Clear pending changes after successful AI update
      this.pendingChanges.clear();

      // Warn when approaching daily limit
      if (this.dailyAIUpdateCount >= maxDaily * 0.8) {
        vscode.window.showWarningMessage(
          `⚠️ AIA: Approaching daily AI update limit (${this.dailyAIUpdateCount}/${maxDaily}). Consider switching to manual strategy.`
        );
      }
    } catch (error) {
      console.error('❌ AI context update failed:', error);
      vscode.window.showWarningMessage(
        `AIA AI context update failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Smart detection for whether AI update is needed
   */
  private async shouldPerformAIUpdate(strategy: string): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('aia.symbolIndex');
    const minAIUpdateInterval = config.get<number>(
      'minAIUpdateInterval',
      600000
    ); // 10 minutes minimum (more conservative)

    // Check minimum time interval
    const timeSinceLastAI = Date.now() - this.lastAIUpdateTime;
    if (timeSinceLastAI < minAIUpdateInterval) {
      console.log(
        `🧠 AI update skipped - too recent (${Math.round(
          timeSinceLastAI / 1000
        )}s ago, minimum ${Math.round(minAIUpdateInterval / 1000)}s)`
      );
      return false;
    }

    // Check daily limit
    this.resetDailyCounterIfNeeded();
    const maxDaily = config.get<number>('maxDailyAIUpdates', 10);
    if (this.dailyAIUpdateCount >= maxDaily) {
      console.log(`🧠 AI update skipped - daily limit reached (${maxDaily})`);
      return false;
    }

    switch (strategy) {
      case 'manual':
        return false; // Only manual triggers

      case 'time-based':
        return true; // Update based on time intervals

      case 'smart':
        return await this.hasSignificantArchitecturalChanges();

      default:
        return false;
    }
  }

  /**
   * Check if file change is significant enough to warrant AI update
   */
  private isSignificantChange(filePath: string): boolean {
    // Only TypeScript/JavaScript files with certain patterns
    if (!filePath.match(/\.(ts|js|tsx|jsx)$/)) {
      return false;
    }

    // Ignore test files, build files, and other non-significant files
    if (
      filePath.match(
        /(\.test\.|\.spec\.|\/tests?\/|\/dist\/|\/build\/|\/node_modules\/|\/coverage\/)/
      )
    ) {
      return false;
    }

    // Focus on files that typically contain architectural changes
    // More restrictive pattern - fewer false positives
    if (
      filePath.match(
        /(service|provider|factory|manager|engine|command|interface|type|config|index)\.ts$/i
      )
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if file content has changed significantly (not just formatting)
   */
  private async hasSignificantContentChange(
    filePath: string
  ): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Create a normalized hash (ignore whitespace changes)
      const normalizedContent = content
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*$/gm, '') // Remove line comments
        .trim();

      const currentHash = crypto
        .createHash('md5')
        .update(normalizedContent)
        .digest('hex');

      const previousHash = this.fileChecksums.get(filePath);
      this.fileChecksums.set(filePath, currentHash);

      if (!previousHash) {
        return true; // New file
      }

      return currentHash !== previousHash;
    } catch (error) {
      console.warn(`Could not check content change for ${filePath}:`, error);
      return true; // Assume significant if we can't check
    }
  }

  /**
   * Check if there have been significant architectural changes since last AI update
   */
  private async hasSignificantArchitecturalChanges(): Promise<boolean> {
    const config = vscode.workspace.getConfiguration('aia.symbolIndex');
    const threshold = config.get<number>('smartUpdateThreshold', 5); // More conservative default

    // Count significant files changed since last AI update
    let significantChanges = 0;

    for (const filePath of this.pendingChanges) {
      if (this.isSignificantChange(filePath)) {
        significantChanges++;
      }
    }

    const hasChanges = significantChanges >= threshold;

    if (hasChanges) {
      console.log(
        `🧠 ${significantChanges} significant architectural changes detected (threshold: ${threshold})`
      );
    } else if (significantChanges > 0) {
      console.log(
        `🧠 Only ${significantChanges} significant changes (threshold: ${threshold}), skipping AI update`
      );
    }

    return hasChanges;
  }

  /**
   * Manually trigger an update
   */
  async triggerUpdate(): Promise<void> {
    await this.performUpdate();
  }

  /**
   * Stop the auto-update service
   */
  dispose(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
  }
}
