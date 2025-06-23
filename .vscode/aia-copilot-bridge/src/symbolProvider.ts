import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { SymbolIndexPerformanceMonitor } from './performanceMonitor';

const execAsync = promisify(exec);

export class AIASymbolIndexProvider implements vscode.CompletionItemProvider {
  private symbolIndex: Map<string, any> = new Map();
  private lookupStats = { totalLookups: 0, totalTime: 0 };
  private performanceMonitor?: SymbolIndexPerformanceMonitor;

  setPerformanceMonitor(monitor: SymbolIndexPerformanceMonitor) {
    this.performanceMonitor = monitor;
  }

  async buildSymbolIndex() {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      console.warn('No workspace folder found');
      return;
    }

    const buildStart = Date.now();

    try {
      // Check if AIA CLI is available in this workspace
      const aiaPath = path.join(workspaceRoot, 'node_modules', '.bin', 'aia');
      const hasLocalAia = await fs.pathExists(aiaPath);

      let command = 'aia index symbols:build --force';
      if (hasLocalAia) {
        command = `${aiaPath} index symbols:build --force`;
      } else if (
        await fs.pathExists(path.join(workspaceRoot, 'dist', 'index.js'))
      ) {
        // Use local build if available
        command = `node ${path.join(
          workspaceRoot,
          'dist',
          'index.js'
        )} index symbols:build --force`;
      }

      console.log(`Running: ${command}`);
      await execAsync(command, {
        cwd: workspaceRoot,
        timeout: 30000, // 30 second timeout
      });

      // Load the generated symbol index
      const indexPath = path.join(workspaceRoot, '.aia', 'codebase-index.json');
      if (await fs.pathExists(indexPath)) {
        const index = await fs.readJson(indexPath);
        this.processSymbolIndex(index);

        const buildTime = Date.now() - buildStart;
        this.performanceMonitor?.trackBuild(buildTime);

        console.log(`Symbol index built successfully in ${buildTime}ms`);
      } else {
        console.warn('Symbol index file not found after build');
      }
    } catch (error) {
      console.error('Failed to build symbol index:', error);
      vscode.window.showErrorMessage(`Failed to build symbol index: ${error}`);
    }
  }

  private processSymbolIndex(index: any) {
    this.symbolIndex.clear();

    // Process files array to extract symbols
    const files = index.files || [];
    for (const [filePath, fileData] of files) {
      const symbols = fileData.symbols || [];

      for (const symbol of symbols) {
        const symbolKey = symbol.name;
        if (symbolKey) {
          this.symbolIndex.set(symbolKey, {
            type: symbol.type,
            name: symbol.name,
            file: filePath,
            exports: fileData.exports || [],
            imports: fileData.imports || [],
            dependencies: fileData.dependencies || [],
            indexedAt: Date.now(),
          });
        }
      }
    }

    console.log(`Loaded ${this.symbolIndex.size} symbols into index`);
  }

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    const startTime = Date.now();
    const linePrefix = document
      .lineAt(position)
      .text.substr(0, position.character);

    const symbols = this.findRelevantSymbols(linePrefix);

    // Track performance
    const duration = Date.now() - startTime;
    this.lookupStats.totalLookups++;
    this.lookupStats.totalTime += duration;

    this.performanceMonitor?.trackLookup('completion', duration);

    return symbols.map((symbol) => this.createCompletionItem(symbol));
  }

  private findRelevantSymbols(context: string): any[] {
    const results = [];
    const searchTerm = context.split(/\\s+/).pop()?.toLowerCase() || '';

    if (searchTerm.length < 2) {
      return []; // Avoid noise for very short searches
    }

    // O(1) lookup with partial matching
    for (const [name, data] of this.symbolIndex) {
      if (name.toLowerCase().includes(searchTerm)) {
        results.push({ name, ...data });
      }
      if (results.length >= 15) break; // Limit results to avoid overwhelming
    }

    return results.sort((a, b) => {
      // Prioritize exact matches and shorter names
      const aExact = a.name.toLowerCase().startsWith(searchTerm);
      const bExact = b.name.toLowerCase().startsWith(searchTerm);

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      return a.name.length - b.name.length;
    });
  }

  private createCompletionItem(symbol: any): vscode.CompletionItem {
    const item = new vscode.CompletionItem(
      symbol.name,
      this.getCompletionItemKind(symbol.info?.type || symbol.type)
    );

    const location = symbol.info?.definitions?.[0]?.location || symbol.location;
    if (location) {
      item.detail = `${symbol.info?.type || symbol.type} from ${location.file}`;
      item.documentation = this.generateSymbolDocumentation(symbol);
    }

    item.insertText = symbol.name;

    // Add import statement if needed and we can determine the import path
    if (symbol.needsImport && symbol.importPath) {
      item.additionalTextEdits = [
        vscode.TextEdit.insert(
          new vscode.Position(0, 0),
          `import { ${symbol.name} } from '${symbol.importPath}';\\n`
        ),
      ];
    }

    // Set sort text to prioritize based on relevance
    item.sortText = `${symbol.info?.metadata?.usageCount || 0}`.padStart(
      5,
      '0'
    );

    return item;
  }

  private getCompletionItemKind(type: string): vscode.CompletionItemKind {
    const kindMap: Record<string, vscode.CompletionItemKind> = {
      class: vscode.CompletionItemKind.Class,
      function: vscode.CompletionItemKind.Function,
      interface: vscode.CompletionItemKind.Interface,
      variable: vscode.CompletionItemKind.Variable,
      constant: vscode.CompletionItemKind.Constant,
      enum: vscode.CompletionItemKind.Enum,
      method: vscode.CompletionItemKind.Method,
      property: vscode.CompletionItemKind.Property,
      type: vscode.CompletionItemKind.TypeParameter,
    };
    return kindMap[type] || vscode.CompletionItemKind.Reference;
  }

  private generateSymbolDocumentation(symbol: any): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    const symbolInfo = symbol.info || symbol;
    const symbolType = symbolInfo.type || 'symbol';

    md.appendMarkdown(`**${symbolType}**: \`${symbol.name}\`\\n\\n`);

    const location = symbolInfo.definitions?.[0]?.location || symbol.location;
    if (location) {
      md.appendMarkdown(
        `📍 Location: [${location.file}:${location.line}](${location.file})\\n\\n`
      );
    }

    if (symbolInfo.metadata?.description) {
      md.appendMarkdown(
        `📝 Description: ${symbolInfo.metadata.description}\\n\\n`
      );
    }

    if (symbolInfo.relationships) {
      md.appendMarkdown('**Relationships:**\\n');
      if (symbolInfo.relationships.extends?.length > 0) {
        md.appendMarkdown(
          `- Extends: ${symbolInfo.relationships.extends.join(', ')}\\n`
        );
      }
      if (symbolInfo.relationships.implements?.length > 0) {
        md.appendMarkdown(
          `- Implements: ${symbolInfo.relationships.implements.join(', ')}\\n`
        );
      }
      if (symbolInfo.relationships.usedBy?.length > 0) {
        md.appendMarkdown(
          `- Used by: ${symbolInfo.relationships.usedBy.length} symbols\\n`
        );
      }
    }

    if (symbolInfo.metadata?.usageCount) {
      md.appendMarkdown(`📊 Usage count: ${symbolInfo.metadata.usageCount}\\n`);
    }

    return md;
  }

  async getSymbolStats() {
    const avgLookupTime =
      this.lookupStats.totalLookups > 0
        ? (this.lookupStats.totalTime / this.lookupStats.totalLookups).toFixed(
            2
          )
        : '0';

    return {
      totalSymbols: this.symbolIndex.size,
      lookupTime: avgLookupTime,
      totalLookups: this.lookupStats.totalLookups,
    };
  }
}
