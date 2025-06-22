"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const symbolProvider_1 = require("./symbolProvider");
const copilotContextProvider_1 = require("./copilotContextProvider");
const performanceMonitor_1 = require("./performanceMonitor");
const autoUpdateService_1 = require("./autoUpdateService");
function activate(context) {
    console.log('AIA Copilot Bridge is activating...');
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    const symbolProvider = new symbolProvider_1.AIASymbolIndexProvider();
    const contextEnhancer = new copilotContextProvider_1.CopilotContextEnhancer(workspaceRoot);
    const performanceMonitor = new performanceMonitor_1.SymbolIndexPerformanceMonitor();
    const autoUpdateService = new autoUpdateService_1.AutoUpdateService(symbolProvider, contextEnhancer, workspaceRoot);
    // Set performance monitoring on symbol provider
    symbolProvider.setPerformanceMonitor(performanceMonitor);
    // Auto-build on activation
    symbolProvider.buildSymbolIndex();
    contextEnhancer.enhanceCopilotContext();
    // Start auto-update service
    autoUpdateService.startWatching(context);
    // Register providers and commands
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file', language: '*' }, symbolProvider, '.'), vscode.commands.registerCommand('aia.rebuildSymbolIndex', async () => {
        await symbolProvider.buildSymbolIndex();
        vscode.window.showInformationMessage('Symbol index rebuilt successfully!');
    }), vscode.commands.registerCommand('aia.showSymbolStats', async () => {
        const stats = await symbolProvider.getSymbolStats();
        vscode.window.showInformationMessage(`Symbol Index: ${stats.totalSymbols} symbols, ${stats.lookupTime}ms avg lookup`);
    }), vscode.commands.registerCommand('aia.showPerformanceReport', () => {
        const report = performanceMonitor.generateReport();
        vscode.window.showInformationMessage(report);
    }), vscode.commands.registerCommand('aia.updateCopilotInstructions', async () => {
        await autoUpdateService.triggerUpdate();
        vscode.window.showInformationMessage('Copilot instructions updated successfully!');
    }), vscode.commands.registerCommand('aia.toggleAutoUpdate', async () => {
        const config = vscode.workspace.getConfiguration('aia.symbolIndex');
        const currentValue = config.get('autoUpdate', true);
        await config.update('autoUpdate', !currentValue, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(`Auto-update ${!currentValue ? 'enabled' : 'disabled'}`);
    }));
    // Watch for file changes if auto-update is enabled
    if (vscode.workspace.getConfiguration('aia.symbolIndex').get('autoUpdate')) {
        const watcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,js,tsx,jsx}');
        watcher.onDidChange(() => symbolProvider.buildSymbolIndex());
        watcher.onDidCreate(() => symbolProvider.buildSymbolIndex());
        watcher.onDidDelete(() => symbolProvider.buildSymbolIndex());
        context.subscriptions.push(watcher);
    }
    // Show activation message
    vscode.window.showInformationMessage('🚀 AIA Symbol Index for GitHub Copilot is now active!');
}
exports.activate = activate;
function deactivate() {
    console.log('AIA Copilot Bridge is deactivating...');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map