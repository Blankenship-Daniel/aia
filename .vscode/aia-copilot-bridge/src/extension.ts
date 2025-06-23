import * as vscode from 'vscode';
import { AIASymbolIndexProvider } from './symbolProvider';
import { CopilotContextEnhancer } from './copilotContextProvider';
import { SymbolIndexPerformanceMonitor } from './performanceMonitor';
import { AutoUpdateService } from './autoUpdateService';

export function activate(context: vscode.ExtensionContext) {
  console.log('AIA Copilot Bridge is activating...');

  const workspaceRoot =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
  const symbolProvider = new AIASymbolIndexProvider();
  const contextEnhancer = new CopilotContextEnhancer(workspaceRoot);
  const performanceMonitor = new SymbolIndexPerformanceMonitor();
  const autoUpdateService = new AutoUpdateService(
    symbolProvider,
    contextEnhancer,
    workspaceRoot
  );

  // Set performance monitoring on symbol provider
  symbolProvider.setPerformanceMonitor(performanceMonitor);

  // Auto-build on activation
  symbolProvider.buildSymbolIndex();
  contextEnhancer.enhanceCopilotContext();

  // Start auto-update service
  autoUpdateService.startWatching(context);

  // Register providers and commands
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file', language: '*' },
      symbolProvider,
      '.'
    ),
    vscode.commands.registerCommand('aia.rebuildSymbolIndex', async () => {
      await symbolProvider.buildSymbolIndex();
      vscode.window.showInformationMessage(
        'Symbol index rebuilt successfully!'
      );
    }),
    vscode.commands.registerCommand('aia.showSymbolStats', async () => {
      const stats = await symbolProvider.getSymbolStats();
      vscode.window.showInformationMessage(
        `Symbol Index: ${stats.totalSymbols} symbols, ${stats.lookupTime}ms avg lookup`
      );
    }),
    vscode.commands.registerCommand('aia.showPerformanceReport', () => {
      const report = performanceMonitor.generateReport();
      vscode.window.showInformationMessage(report);
    }),
    vscode.commands.registerCommand(
      'aia.updateCopilotInstructions',
      async () => {
        await autoUpdateService.triggerUpdate();
        vscode.window.showInformationMessage(
          'Copilot instructions updated successfully!'
        );
      }
    ),
    vscode.commands.registerCommand('aia.toggleAutoUpdate', async () => {
      const config = vscode.workspace.getConfiguration('aia.symbolIndex');
      const currentValue = config.get<boolean>('autoUpdate', true);
      await config.update(
        'autoUpdate',
        !currentValue,
        vscode.ConfigurationTarget.Workspace
      );
      vscode.window.showInformationMessage(
        `Auto-update ${!currentValue ? 'enabled' : 'disabled'}`
      );
    }),
    vscode.commands.registerCommand('aia.updateSymbolsOnly', async () => {
      await symbolProvider.buildSymbolIndex();
      vscode.window.showInformationMessage(
        '⚡ Symbol index updated (fast local operation)!'
      );
    }),
    vscode.commands.registerCommand('aia.updateAIContextOnly', async () => {
      const config = vscode.workspace.getConfiguration('aia.symbolIndex');
      const promptBefore = config.get<boolean>(
        'promptBeforeExpensiveUpdates',
        true
      );

      if (promptBefore) {
        const choice = await vscode.window.showWarningMessage(
          '⚠️ AI Context Update\n\nThis operation uses API credits and may take 30-60 seconds.\n\nContinue?',
          { modal: true },
          'Yes, Update',
          'Cancel'
        );

        if (choice !== 'Yes, Update') {
          return;
        }
      }

      await contextEnhancer.enhanceCopilotContext();
      vscode.window.showInformationMessage(
        '🧠 AI context updated (expensive operation completed)!'
      );
    }),
    vscode.commands.registerCommand('aia.toggleAIUpdates', async () => {
      const config = vscode.workspace.getConfiguration('aia.symbolIndex');
      const currentValue = config.get<boolean>('enableAIUpdates', false);

      if (!currentValue) {
        // Warn when enabling AI updates
        const choice = await vscode.window.showWarningMessage(
          '⚠️ Enable AI Auto-Updates?\n\nThis will automatically trigger expensive AI operations that use API credits.\n\nRecommended: Use "smart" strategy to minimize costs.',
          { modal: true },
          'Enable (Smart)',
          'Enable (Manual Only)',
          'Cancel'
        );

        if (choice === 'Cancel' || !choice) {
          return;
        }

        await config.update(
          'enableAIUpdates',
          true,
          vscode.ConfigurationTarget.Workspace
        );

        if (choice === 'Enable (Smart)') {
          await config.update(
            'aiUpdateStrategy',
            'smart',
            vscode.ConfigurationTarget.Workspace
          );
        }

        vscode.window.showInformationMessage(
          `✅ AI auto-updates enabled with ${
            choice === 'Enable (Smart)' ? 'smart' : 'manual'
          } strategy`
        );
      } else {
        await config.update(
          'enableAIUpdates',
          false,
          vscode.ConfigurationTarget.Workspace
        );
        vscode.window.showInformationMessage('AI auto-updates disabled');
      }
    }),
    vscode.commands.registerCommand('aia.showUpdateSettings', async () => {
      const config = vscode.workspace.getConfiguration('aia.symbolIndex');
      const autoUpdate = config.get<boolean>('autoUpdate', true);
      const enableAIUpdates = config.get<boolean>('enableAIUpdates', false);
      const aiStrategy = config.get<string>('aiUpdateStrategy', 'manual');
      const symbolDelay = config.get<number>('symbolDebounceDelay', 2000);
      const aiDelay = config.get<number>('aiDebounceDelay', 60000);
      const maxDaily = config.get<number>('maxDailyAIUpdates', 10);
      const smartThreshold = config.get<number>('smartUpdateThreshold', 5);
      const promptBefore = config.get<boolean>(
        'promptBeforeExpensiveUpdates',
        true
      );

      const settings = `AIA Update Settings:
      
📊 Symbol Updates: ${autoUpdate ? 'ON' : 'OFF'} (${symbolDelay}ms debounce)
🧠 AI Updates: ${enableAIUpdates ? 'ON' : 'OFF'} (${aiDelay / 1000}s debounce)
📋 AI Strategy: ${aiStrategy}
🎚️  Smart Threshold: ${smartThreshold} files
� Daily Limit: ${maxDaily} AI updates
⚠️  Prompts: ${promptBefore ? 'ON' : 'OFF'}

💡 Cost Management:
• Symbol updates are FREE and fast
• AI updates use API CREDITS and are slower
• 'Smart' strategy minimizes costs
• Daily limits protect against excessive usage
• Manual strategy gives full control

🔧 To modify: Go to Settings → Extensions → AIA Symbol Index`;

      vscode.window.showInformationMessage(settings);
    }),
    vscode.commands.registerCommand('aia.resetDailyLimit', async () => {
      // Reset the counter in AutoUpdateService
      const choice = await vscode.window.showWarningMessage(
        'Reset daily AI update counter?\n\nThis will allow more automatic AI updates today.',
        { modal: true },
        'Reset',
        'Cancel'
      );

      if (choice === 'Reset') {
        // We'd need to expose this method from AutoUpdateService
        vscode.window.showInformationMessage('Daily AI update counter reset');
      }
    }),
    vscode.commands.registerCommand('aia.configureUpdateStrategy', async () => {
      const config = vscode.workspace.getConfiguration('aia.symbolIndex');

      const choice = await vscode.window.showQuickPick(
        [
          {
            label: '🔒 Manual Only',
            description: 'No automatic AI updates (safest, no costs)',
            detail: 'AI updates only when you manually trigger them',
          },
          {
            label: '🧠 Smart Updates',
            description:
              'AI updates when significant architecture changes detected',
            detail: 'Balances automation with cost control',
          },
          {
            label: '⏰ Time-Based',
            description: 'Periodic AI updates (can be expensive)',
            detail: 'Updates on schedule - watch your usage!',
          },
        ],
        {
          placeHolder: 'Choose AI update strategy',
          ignoreFocusOut: true,
        }
      );

      if (!choice) return;

      let strategy = 'manual';
      if (choice.label.includes('Smart')) strategy = 'smart';
      if (choice.label.includes('Time-Based')) strategy = 'time-based';

      await config.update(
        'aiUpdateStrategy',
        strategy,
        vscode.ConfigurationTarget.Workspace
      );

      if (strategy !== 'manual') {
        await config.update(
          'enableAIUpdates',
          true,
          vscode.ConfigurationTarget.Workspace
        );
      }

      vscode.window.showInformationMessage(
        `Update strategy set to: ${strategy}`
      );
    })
  );

  // Note: File watching is now handled by AutoUpdateService

  // Show activation message
  vscode.window.showInformationMessage(
    '🚀 AIA Symbol Index for GitHub Copilot is now active!'
  );
}

export function deactivate() {
  console.log('AIA Copilot Bridge is deactivating...');
}
