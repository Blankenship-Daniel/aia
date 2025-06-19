import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

// Type definitions for CodeIndexService
interface SymbolInfo {
  type: 'class' | 'function' | 'header' | 'codeblock';
  name: string;
  extends?: string;
  level?: number;
  text?: string;
  language?: string;
  content?: string;
  async?: boolean;
}

interface ClassInfo {
  file: string;
  extends?: string;
  methods: MethodInfo[];
}

interface MethodInfo {
  name: string;
  async: boolean;
  static: boolean;
  visibility: 'public' | 'private' | 'protected';
}

interface FunctionInfo {
  file: string;
  async: boolean;
}

interface FileInfo {
  path: string;
  size: number;
  hash: string;
  lastModified: Date;
  type: 'source' | 'config' | 'documentation' | 'test' | 'other';
  language: string;
  symbols: SymbolInfo[];
  imports: string[];
  exports: string[];
  dependencies: string[];
}

interface TodoItem {
  file: string;
  line: number;
  text: string;
}

interface IndexMetadata {
  totalFiles: number;
  totalClasses: number;
  totalFunctions: number;
  totalTodos: number;
  languages: Record<string, number>;
  largestFiles: Array<{ path: string; size: number }>;
  mostImported: Array<{ file: string; count: number }>;
  indexedAt: string;
}

interface CodebaseIndex {
  files: Map<string, FileInfo>;
  symbols: Map<string, unknown>;
  dependencies: Map<string, string[]>;
  imports: Map<string, string[]>;
  exports: Map<string, string[]>;
  classes: Map<string, ClassInfo>;
  functions: Map<string, FunctionInfo>;
  constants: Map<string, unknown>;
  comments: Map<string, unknown>;
  todos: TodoItem[];
  metadata: IndexMetadata;
}

interface SearchResult {
  type: 'class' | 'function';
  name: string;
  file: string;
  relevance: number;
}

interface FileSearchResult {
  path: string;
  type: string;
  relevance: number;
}

interface IndexStats {
  totalFiles: number;
  totalClasses: number;
  totalFunctions: number;
  totalTodos: number;
  languages: Record<string, number>;
  lastIndexed?: string;
}

interface PatternInfo {
  type: string;
  description: string;
  items?: string[];
  count?: number;
}

interface WorkflowInfo {
  type: string;
  description: string;
  steps: string[];
}

interface ComponentInfo {
  file: string;
  purpose: string;
  description: string;
  symbolCount: number;
  relatedFiles: string[];
  dependencies: string[];
  exports: string[];
}

interface InstructionsContext {
  projectType: string;
  primaryLanguage: string;
  architecture: string;
  purpose: string;
  totalFiles: number;
  totalClasses: number;
  totalFunctions: number;
}

interface CopilotInstructions {
  role: string;
  context: InstructionsContext;
  guidelines: string[];
  keyComponents: ComponentInfo[];
  entryPoints: Array<{ file: string; type: string; purpose: string }>;
  architecture: string;
  commonPatterns: PatternInfo[];
  apiPatterns: PatternInfo[];
  configPatterns: PatternInfo[];
  testPatterns: PatternInfo[];
  workflows: WorkflowInfo[];
  codebaseStructure: Record<string, unknown>;
  crossReferences: Record<string, string[]>;
  fileRelationships: Record<string, string[]>;
  contextualHints: string[];
  recentChanges: unknown[];
  hotspots: Array<{ file: string; metrics: number }>;
}

export class CodeIndexService {
  private index: CodebaseIndex;

  constructor() {
    this.index = {
      files: new Map(),
      symbols: new Map(),
      dependencies: new Map(),
      imports: new Map(),
      exports: new Map(),
      classes: new Map(),
      functions: new Map(),
      constants: new Map(),
      comments: new Map(),
      todos: [],
      metadata: {
        totalFiles: 0,
        totalClasses: 0,
        totalFunctions: 0,
        totalTodos: 0,
        languages: {},
        largestFiles: [],
        mostImported: [],
        indexedAt: new Date().toISOString(),
      },
    };
  }

  public async indexCodebase(rootDir: string): Promise<CodebaseIndex> {
    console.log('🔍 Building codebase index...');

    // Reset index
    this.resetIndex();

    // Index all files
    await this.indexDirectory(rootDir);

    // Build relationships
    this.buildRelationships();

    // Generate summary
    this.generateSummary();

    // Save index
    await this.saveIndex();

    return this.index;
  }

  private async indexDirectory(
    dir: string,
    baseDir: string = dir
  ): Promise<void> {
    const items = await fs.readdir(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = await fs.stat(itemPath);

      if (stat.isDirectory()) {
        if (!this.shouldIgnore(item)) {
          await this.indexDirectory(itemPath, baseDir);
        }
      } else if (stat.isFile() && this.shouldIndex(item)) {
        await this.indexFile(itemPath, baseDir);
      }
    }
  }

  private async indexFile(filePath: string, baseDir: string): Promise<void> {
    const relativePath = path.relative(baseDir, filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const ext = path.extname(filePath);

    // Create file entry
    const fileInfo: FileInfo = {
      path: relativePath,
      size: content.length,
      hash: this.hashContent(content),
      lastModified: (await fs.stat(filePath)).mtime,
      type: this.getFileType(ext),
      language: this.detectLanguage(ext),
      symbols: [],
      imports: [],
      exports: [],
      dependencies: [],
    };

    // Parse based on file type
    if (['.js', '.ts', '.jsx', '.tsx'].includes(ext)) {
      this.parseJavaScriptFile(content, fileInfo);
    } else if (['.py'].includes(ext)) {
      this.parsePythonFile(content, fileInfo);
    } else if (['.json'].includes(ext)) {
      this.parseJSONFile(content, fileInfo);
    } else if (['.md'].includes(ext)) {
      this.parseMarkdownFile(content, fileInfo);
    }

    // Extract comments and TODOs
    this.extractComments(content, fileInfo);

    // Store in index
    this.index.files.set(relativePath, fileInfo);
  }

  private parseJavaScriptFile(content: string, fileInfo: FileInfo): void {
    // Extract classes
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
    let match: RegExpExecArray | null;

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const extendsClass = match[2];

      fileInfo.symbols.push({
        type: 'class',
        name: className,
        extends: extendsClass,
      });

      this.index.classes.set(className, {
        file: fileInfo.path,
        extends: extendsClass,
        methods: this.extractClassMethods(content, className),
      });
    }

    // Extract functions
    const functionRegex =
      /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2];
      fileInfo.symbols.push({
        type: 'function',
        name: funcName,
      });

      this.index.functions.set(funcName, {
        file: fileInfo.path,
        async:
          content.includes(`async ${funcName}`) ||
          content.includes(`${funcName} = async`),
      });
    }

    // Extract imports
    const importRegex = /(?:import|require)\s*\(?\s*['"`]([^'"`]+)['"`]\s*\)?/g;
    while ((match = importRegex.exec(content)) !== null) {
      fileInfo.imports.push(match[1]);
    }

    // Extract exports
    const exportRegex =
      /export\s+(?:default\s+)?(?:class|function|const|let|var)?\s*(\w+)/g;
    while ((match = exportRegex.exec(content)) !== null) {
      fileInfo.exports.push(match[1]);
    }
  }

  private extractClassMethods(
    content: string,
    className: string
  ): MethodInfo[] {
    const methods: MethodInfo[] = [];
    const methodRegex = new RegExp(`class\\s+${className}[^{]*{([^}]+)}`, 's');
    const classMatch = content.match(methodRegex);

    if (classMatch) {
      const classBody = classMatch[1];
      const methodPattern =
        /(async\s+)?(static\s+)?(public\s+|private\s+|protected\s+)?(\w+)\s*\(/g;
      let methodMatch: RegExpExecArray | null;

      while ((methodMatch = methodPattern.exec(classBody)) !== null) {
        methods.push({
          name: methodMatch[4],
          async: !!methodMatch[1],
          static: !!methodMatch[2],
          visibility:
            (methodMatch[3]?.trim() as 'public' | 'private' | 'protected') ||
            'public',
        });
      }
    }

    return methods;
  }

  private extractComments(content: string, fileInfo: FileInfo): void {
    // Extract JSDoc comments
    const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
    const todoRegex =
      /(?:\/\/|#|\/\*)\s*(?:TODO|FIXME|HACK|NOTE|XXX):\s*(.+)/gi;

    let match: RegExpExecArray | null;
    while ((match = todoRegex.exec(content)) !== null) {
      this.index.todos.push({
        file: fileInfo.path,
        line: content.substring(0, match.index!).split('\n').length,
        text: match[1].trim(),
      });
    }
  }

  private parsePythonFile(content: string, fileInfo: FileInfo): void {
    // Extract Python classes
    const classRegex = /class\s+(\w+)(?:\(([^)]+)\))?:/g;
    let match: RegExpExecArray | null;

    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const extendsClass = match[2];

      fileInfo.symbols.push({
        type: 'class',
        name: className,
        extends: extendsClass,
      });

      this.index.classes.set(className, {
        file: fileInfo.path,
        extends: extendsClass,
        methods: this.extractPythonMethods(content, className),
      });
    }

    // Extract functions
    const functionRegex = /def\s+(\w+)\s*\(/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1];
      fileInfo.symbols.push({
        type: 'function',
        name: funcName,
      });

      this.index.functions.set(funcName, {
        file: fileInfo.path,
        async: content.includes(`async def ${funcName}`),
      });
    }

    // Extract imports
    const importRegex = /(?:import|from)\s+([a-zA-Z_][a-zA-Z0-9_.]*)/g;
    while ((match = importRegex.exec(content)) !== null) {
      fileInfo.imports.push(match[1]);
    }
  }

  private extractPythonMethods(
    content: string,
    className: string
  ): MethodInfo[] {
    const methods: MethodInfo[] = [];
    const methodRegex = new RegExp(
      `class\\s+${className}[^:]*:([\\s\\S]*?)(?=class|$)`,
      's'
    );
    const classMatch = content.match(methodRegex);

    if (classMatch) {
      const classBody = classMatch[1];
      const methodPattern = /def\s+(\w+)\s*\(/g;
      let methodMatch: RegExpExecArray | null;

      while ((methodMatch = methodPattern.exec(classBody)) !== null) {
        methods.push({
          name: methodMatch[1],
          async: classBody.includes(`async def ${methodMatch[1]}`),
          static: classBody.includes(`@staticmethod`),
          visibility: methodMatch[1].startsWith('_') ? 'private' : 'public',
        });
      }
    }

    return methods;
  }

  private parseJSONFile(content: string, fileInfo: FileInfo): void {
    try {
      const jsonData = JSON.parse(content);

      // Extract top-level keys as symbols
      if (typeof jsonData === 'object' && jsonData !== null) {
        for (const key of Object.keys(jsonData)) {
          fileInfo.symbols.push({
            type: 'function', // Using function type for JSON keys
            name: key,
          });
        }
      }
    } catch (error) {
      // Invalid JSON - ignore parsing errors
    }
  }

  private parseMarkdownFile(content: string, fileInfo: FileInfo): void {
    // Extract headers
    const headerRegex = /^(#+)\s+(.+)$/gm;
    let match: RegExpExecArray | null;

    while ((match = headerRegex.exec(content)) !== null) {
      fileInfo.symbols.push({
        type: 'header',
        level: match[1].length,
        text: match[2].trim(),
        name: match[2].trim(),
      });
    }

    // Extract code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      fileInfo.symbols.push({
        type: 'codeblock',
        language: match[1] || 'unknown',
        content: match[2].trim(),
        name: `CodeBlock_${match[1] || 'unknown'}`,
      });
    }
  }

  private buildRelationships(): void {
    // Build dependency graph
    for (const [filePath, fileInfo] of Array.from(this.index.files.entries())) {
      const dependencies: string[] = [];

      for (const importPath of fileInfo.imports) {
        const resolved = this.resolveImport(filePath, importPath);
        if (resolved && this.index.files.has(resolved)) {
          dependencies.push(resolved);
        }
      }

      this.index.dependencies.set(filePath, dependencies);
    }
  }

  private generateSummary(): void {
    this.index.metadata = {
      totalFiles: this.index.files.size,
      totalClasses: this.index.classes.size,
      totalFunctions: this.index.functions.size,
      totalTodos: this.index.todos.length,
      languages: this.getLanguageDistribution(),
      largestFiles: this.getLargestFiles(10),
      mostImported: this.getMostImportedFiles(10),
      indexedAt: new Date().toISOString(),
    };
  }

  private async saveIndex(): Promise<void> {
    const indexPath = path.join(process.cwd(), '.aia', 'codebase-index.json');
    await fs.ensureDir(path.dirname(indexPath));

    const indexData = {
      metadata: this.index.metadata,
      files: Array.from(this.index.files.entries()),
      classes: Array.from(this.index.classes.entries()),
      functions: Array.from(this.index.functions.entries()),
      todos: this.index.todos,
    };

    await fs.writeJson(indexPath, indexData, { spaces: 2 });
  }

  // Helper methods
  private shouldIgnore(name: string): boolean {
    const ignorePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.cache',
      '.venv',
      'venv',
      'env',
      '__pycache__',
      '.pytest_cache',
      '.mypy_cache',
      '.tox',
      '.idea',
      '.vscode',
      '.DS_Store',
      'target',
      'vendor',
    ];
    return ignorePatterns.includes(name);
  }

  private shouldIndex(name: string): boolean {
    const indexExtensions = [
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.py',
      '.java',
      '.go',
      '.rs',
      '.json',
      '.md',
      '.yaml',
      '.yml',
    ];
    return indexExtensions.some((ext) => name.endsWith(ext));
  }

  private hashContent(content: string): string {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16);
  }

  private detectLanguage(ext: string): string {
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.md': 'markdown',
      '.json': 'json',
    };
    return languageMap[ext] || 'unknown';
  }

  private getFileType(
    ext: string
  ): 'source' | 'config' | 'documentation' | 'test' | 'other' {
    const typeMap: Record<
      string,
      'source' | 'config' | 'documentation' | 'test' | 'other'
    > = {
      '.js': 'source',
      '.ts': 'source',
      '.py': 'source',
      '.json': 'config',
      '.md': 'documentation',
      '.test.js': 'test',
      '.spec.js': 'test',
    };
    return typeMap[ext] || 'other';
  }

  private resolveImport(fromFile: string, importPath: string): string | null {
    const fromDir = path.dirname(fromFile);
    const resolvedPath = path.resolve(fromDir, importPath);

    // Try common extensions
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.json'];
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      const relativePath = path.relative(process.cwd(), fullPath);
      if (this.index.files.has(relativePath)) {
        return relativePath;
      }
    }

    return null;
  }

  private getLanguageDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const [, fileInfo] of Array.from(this.index.files.entries())) {
      distribution[fileInfo.language] =
        (distribution[fileInfo.language] || 0) + 1;
    }
    return distribution;
  }

  private getLargestFiles(
    limit: number = 10
  ): Array<{ path: string; size: number }> {
    const files = Array.from(this.index.files.entries())
      .map(([path, info]) => ({ path, size: info.size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, limit);

    return files;
  }

  private getMostImportedFiles(
    limit: number = 10
  ): Array<{ file: string; count: number }> {
    const importCount = new Map<string, number>();

    for (const [, fileInfo] of Array.from(this.index.files.entries())) {
      for (const importPath of fileInfo.imports) {
        const resolved = this.resolveImport(fileInfo.path, importPath);
        if (resolved) {
          importCount.set(resolved, (importCount.get(resolved) || 0) + 1);
        }
      }
    }

    return Array.from(importCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([file, count]) => ({ file, count }));
  }

  private resetIndex(): void {
    this.index = {
      files: new Map(),
      symbols: new Map(),
      dependencies: new Map(),
      imports: new Map(),
      exports: new Map(),
      classes: new Map(),
      functions: new Map(),
      constants: new Map(),
      comments: new Map(),
      todos: [],
      metadata: {} as IndexMetadata,
    };
  }

  public async reindexFile(
    filePath: string,
    baseDir: string = process.cwd()
  ): Promise<void> {
    const relativePath = path.relative(baseDir, filePath);

    // Remove old entry
    this.index.files.delete(relativePath);

    // Re-index the file
    await this.indexFile(filePath, baseDir);

    // Rebuild relationships
    this.buildRelationships();

    // Save updated index
    await this.saveIndex();
  }

  public async removeFromIndex(
    filePath: string,
    baseDir: string = process.cwd()
  ): Promise<void> {
    const relativePath = path.relative(baseDir, filePath);

    // Remove from files
    this.index.files.delete(relativePath);

    // Remove from other indexes
    for (const [key, value] of Array.from(this.index.classes.entries())) {
      if (value.file === relativePath) {
        this.index.classes.delete(key);
      }
    }

    for (const [key, value] of Array.from(this.index.functions.entries())) {
      if (value.file === relativePath) {
        this.index.functions.delete(key);
      }
    }

    // Remove TODOs from this file
    this.index.todos = this.index.todos.filter(
      (todo) => todo.file !== relativePath
    );

    // Save updated index
    await this.saveIndex();
  }

  public async loadIndex(): Promise<CodebaseIndex | null> {
    const indexPath = path.join(process.cwd(), '.aia', 'codebase-index.json');

    if (await fs.pathExists(indexPath)) {
      const indexData = await fs.readJson(indexPath);

      // Reconstruct Maps from arrays
      this.index.files = new Map(indexData.files);
      this.index.classes = new Map(indexData.classes);
      this.index.functions = new Map(indexData.functions);
      this.index.todos = indexData.todos;
      this.index.metadata = indexData.metadata;

      return this.index;
    }

    return null;
  }

  // Search functionality
  public searchSymbols(query: string): SearchResult[] {
    const results: SearchResult[] = [];
    const queryLower = query.toLowerCase();

    // Search in classes
    for (const [name, info] of Array.from(this.index.classes.entries())) {
      const relevance = this.calculateRelevance(name, query);
      if (relevance > 0) {
        results.push({
          type: 'class',
          name,
          file: info.file,
          relevance,
        });
      }
    }

    // Search in functions
    for (const [name, info] of Array.from(this.index.functions.entries())) {
      const relevance = this.calculateRelevance(name, query);
      if (relevance > 0) {
        results.push({
          type: 'function',
          name,
          file: info.file,
          relevance,
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  public searchFiles(query: string): FileSearchResult[] {
    const results: FileSearchResult[] = [];
    const queryLower = query.toLowerCase();

    for (const [filePath, fileInfo] of Array.from(this.index.files.entries())) {
      const filename = path.basename(filePath);
      const relevance = this.calculateRelevance(filename, query);

      if (relevance > 0) {
        results.push({
          path: filePath,
          type: fileInfo.type,
          relevance,
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  public searchTodos(query: string = ''): TodoItem[] {
    if (!query) return this.index.todos;

    const queryLower = query.toLowerCase();
    return this.index.todos.filter((todo) =>
      todo.text.toLowerCase().includes(queryLower)
    );
  }

  private calculateRelevance(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    // Exact match gets highest score
    if (textLower === queryLower) return 1.0;

    // Starts with query gets high score
    if (textLower.startsWith(queryLower)) return 0.8;

    // Contains query gets medium score
    if (textLower.includes(queryLower)) return 0.6;

    // Fuzzy match gets lower score
    let matches = 0;
    for (const char of queryLower) {
      if (textLower.includes(char)) {
        matches++;
      }
    }

    return (matches / queryLower.length) * 0.4;
  }

  public getIndexStats(): IndexStats {
    return {
      totalFiles: this.index.files.size,
      totalClasses: this.index.classes.size,
      totalFunctions: this.index.functions.size,
      totalTodos: this.index.todos.length,
      languages: this.getLanguageDistribution(),
      lastIndexed: this.index.metadata.indexedAt,
    };
  }

  // Export and prompt generation methods
  public async generateCopilotInstructions(
    format: 'markdown' | 'json' = 'markdown'
  ): Promise<string> {
    const index = await this.loadIndex();
    if (!index) {
      throw new Error('No index found. Build one first with: aia index build');
    }

    const CodebaseSummarizer = require('../CodebaseSummarizer');
    const summarizer = new CodebaseSummarizer();
    const summary = await summarizer.generateAISummary(index);

    // Generate cross-reference map for better context
    const crossReferences: Record<string, string[]> = {};
    const fileRelationships: Record<string, string[]> = {};
    const contextualHints: string[] = [];

    const instructions: CopilotInstructions = {
      role: 'You are an AI assistant with deep knowledge of this codebase',
      context: {
        projectType: summary.summary.overview.projectType,
        primaryLanguage: summary.summary.overview.primaryLanguage,
        architecture: summary.summary.overview.architecture,
        purpose: summary.summary.overview.purpose,
        totalFiles: index.metadata.totalFiles,
        totalClasses: index.metadata.totalClasses,
        totalFunctions: index.metadata.totalFunctions,
      },
      guidelines: [
        'Always reference specific files, classes, and functions when making suggestions',
        'Consider the existing architecture patterns when proposing changes',
        "Be aware of the project's primary language and coding conventions",
        'Reference the TODO items for areas needing attention',
        'Understand the entry points and key components structure',
        'Follow established error handling patterns in the codebase',
        'Maintain consistency with existing API design patterns',
        'Consider performance implications based on the project scale',
        'Use the established testing patterns when adding new tests',
        'Reference related files and components when making suggestions',
        'Consider the dependency relationships between modules',
        'Maintain backward compatibility with existing interfaces',
      ],
      keyComponents: (summary.summary.keyComponents || [])
        .slice(0, 15)
        .map((comp: any) => ({
          file: comp.file,
          purpose: comp.purpose,
          description: this.getComponentDescription(comp.file),
          symbolCount: comp.symbolCount || 0,
          relatedFiles: fileRelationships[comp.file] || [],
          dependencies: this.getFileDependencies(comp.file, index),
          exports: this.getFileExports(comp.file, index),
        })),
      entryPoints: summary.summary.entryPoints || [],
      architecture: summary.summary.overview.architecture,
      commonPatterns: this.extractCommonPatterns(),
      apiPatterns: this.extractAPIPatterns(),
      configPatterns: this.extractConfigPatterns(),
      testPatterns: this.extractTestPatterns(),
      workflows: this.extractCommonWorkflows(),
      codebaseStructure: this.generateStructureMap(),
      crossReferences: crossReferences,
      fileRelationships: fileRelationships,
      contextualHints: contextualHints,
      recentChanges: [],
      hotspots: [],
    };

    if (format === 'json') {
      return JSON.stringify(instructions, null, 2);
    } else {
      return this.formatInstructionsAsMarkdown(instructions);
    }
  }

  public async generatePromptFile(
    type: string = 'comprehensive',
    includeCode: boolean = false
  ): Promise<string> {
    const index = await this.loadIndex();
    if (!index) {
      throw new Error('No index found. Build one first with: aia index build');
    }

    const CodebaseSummarizer = require('../CodebaseSummarizer');
    const summarizer = new CodebaseSummarizer();
    const summary = await summarizer.generateAISummary(index);

    let content = '';

    if (type === 'comprehensive') {
      content = await this.generateComprehensivePrompt(
        summary,
        index,
        includeCode
      );
    } else if (type === 'minimal') {
      content = await this.generateMinimalPrompt(summary, index);
    } else if (type === 'architecture') {
      content = await this.generateArchitecturePrompt(summary, index);
    } else if (type === 'dev-focused') {
      content = await this.generateDeveloperPrompt(summary, index, includeCode);
    }

    return content;
  }

  private extractCommonPatterns(): PatternInfo[] {
    const patterns: PatternInfo[] = [];

    // Analyze import patterns
    const importPatterns = new Map<string, number>();
    for (const [, fileInfo] of Array.from(this.index.files.entries())) {
      for (const imp of fileInfo.imports) {
        importPatterns.set(imp, (importPatterns.get(imp) || 0) + 1);
      }
    }

    // Get most common imports
    const commonImports = Array.from(importPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([imp]) => imp);

    patterns.push({
      type: 'imports',
      description: 'Most commonly imported modules',
      items: commonImports,
    });

    // Analyze class patterns
    const classPatterns: string[] = [];
    for (const [className, classInfo] of Array.from(
      this.index.classes.entries()
    )) {
      if (classInfo.extends) {
        classPatterns.push(`${className} extends ${classInfo.extends}`);
      }
    }

    if (classPatterns.length > 0) {
      patterns.push({
        type: 'inheritance',
        description: 'Class inheritance patterns',
        items: classPatterns.slice(0, 10),
      });
    }

    // Analyze function patterns
    const functionPatterns = this.extractFunctionPatterns();
    if (functionPatterns.length > 0) {
      patterns.push({
        type: 'functions',
        description: 'Common function patterns',
        items: functionPatterns.map((p) => `${p.count} ${p.description}`),
      });
    }

    return patterns;
  }

  private extractFunctionPatterns(): Array<{
    description: string;
    count: number;
  }> {
    const patterns: Array<{ description: string; count: number }> = [];
    const asyncCount = Array.from(this.index.functions.values()).filter(
      (f) => f.async
    ).length;
    const totalFunctions = this.index.functions.size;

    if (asyncCount > 0) {
      patterns.push({
        description: 'async functions',
        count: asyncCount,
      });
    }

    // Extract common function naming patterns
    const functionNames = Array.from(this.index.functions.keys());
    const handlers = functionNames.filter(
      (name) => name.includes('Handler') || name.includes('handle')
    ).length;
    const getters = functionNames.filter((name) =>
      name.startsWith('get')
    ).length;
    const setters = functionNames.filter((name) =>
      name.startsWith('set')
    ).length;

    if (handlers > 0) {
      patterns.push({
        description: 'functions follow handler pattern',
        count: handlers,
      });
    }
    if (getters > 0) {
      patterns.push({ description: 'getter functions', count: getters });
    }
    if (setters > 0) {
      patterns.push({ description: 'setter functions', count: setters });
    }

    return patterns.slice(0, 5);
  }

  private extractAPIPatterns(): PatternInfo[] {
    const patterns: PatternInfo[] = [];

    // Service Layer
    const services = Array.from(this.index.files.keys()).filter(
      (f) =>
        f.includes('/services/') ||
        f.includes('Service.js') ||
        f.includes('Service.ts')
    );
    if (services.length > 0) {
      patterns.push({
        type: 'Service Layer',
        description:
          'Service-oriented architecture with dedicated service classes',
        items: services.slice(0, 10),
      });
    }

    // Command Pattern
    const commands = Array.from(this.index.files.keys()).filter(
      (f) =>
        f.includes('/commands/') ||
        f.includes('Command.js') ||
        f.includes('Command.ts') ||
        f.includes('Handler.js')
    );
    if (commands.length > 0) {
      patterns.push({
        type: 'Command Pattern',
        description: 'Command-based architecture for operations',
        items: commands.slice(0, 10),
      });
    }

    // Factory Pattern
    const factories = Array.from(this.index.files.keys()).filter(
      (f) => f.includes('Factory') || f.includes('Builder')
    );
    if (factories.length > 0) {
      patterns.push({
        type: 'Factory Pattern',
        description: 'Factory pattern for object creation',
        items: factories.slice(0, 10),
      });
    }

    return patterns;
  }

  private extractConfigPatterns(): PatternInfo[] {
    const patterns: PatternInfo[] = [];
    const configFiles = Array.from(this.index.files.keys()).filter(
      (f) => f.includes('config') || f.endsWith('.json') || f.includes('.aia/')
    );

    if (configFiles.length > 0) {
      patterns.push({
        type: 'Configuration Files',
        description: 'Application configuration management',
        items: configFiles.slice(0, 10),
      });
    }

    return patterns;
  }

  private extractTestPatterns(): PatternInfo[] {
    const patterns: PatternInfo[] = [];
    const testFiles = Array.from(this.index.files.keys()).filter(
      (f) =>
        f.includes('test') ||
        f.includes('spec') ||
        f.includes('.test.') ||
        f.includes('.spec.')
    );

    if (testFiles.length > 0) {
      patterns.push({
        type: 'Unit Tests',
        description: `${testFiles.length} test files using various testing frameworks`,
        items: testFiles.slice(0, 10),
      });
    }

    return patterns;
  }

  private extractCommonWorkflows(): WorkflowInfo[] {
    const workflows: WorkflowInfo[] = [];

    // Development Setup
    workflows.push({
      type: 'Development Setup',
      description: 'Setting up the development environment',
      steps: [
        'Clone the repository',
        'Install dependencies with npm install',
        'Run tests with npm test',
        'Start development server if applicable',
      ],
    });

    // Build Process
    workflows.push({
      type: 'Build Process',
      description: 'Standard Node.js build and deployment workflow',
      steps: [
        'Install dependencies: npm install',
        'Run tests: npm test',
        'Build application if needed',
        'Deploy using configured scripts',
      ],
    });

    // Testing Workflow
    workflows.push({
      type: 'Testing Workflow',
      description: 'Running and maintaining tests',
      steps: [
        'Run all tests: npm test',
        'Run specific test files',
        'Add new tests for new features',
        'Maintain test coverage',
      ],
    });

    return workflows;
  }

  private generateStructureMap(): Record<string, unknown> {
    const structure: Record<string, unknown> = {};

    for (const [filePath, fileInfo] of Array.from(this.index.files.entries())) {
      const pathParts = filePath.split('/');
      let current = structure;

      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      const filename = pathParts[pathParts.length - 1];
      current[filename] = {
        type: fileInfo.type,
        language: fileInfo.language,
        symbols: fileInfo.symbols.length,
      };
    }

    return structure;
  }

  private formatInstructionsAsMarkdown(
    instructions: CopilotInstructions
  ): string {
    let content = '# Copilot Instructions for AI Assistant\n\n';

    content += `## Role\n${instructions.role}\n\n`;

    content += '## Project Context\n\n';
    content += `- **Project Type**: ${instructions.context.projectType}\n`;
    content += `- **Primary Language**: ${instructions.context.primaryLanguage}\n`;
    content += `- **Architecture**: ${instructions.context.architecture}\n`;
    content += `- **Purpose**: ${instructions.context.purpose}\n`;
    content += `- **Scale**: ${instructions.context.totalFiles} files, ${instructions.context.totalClasses} classes, ${instructions.context.totalFunctions} functions\n\n`;

    content += '## Guidelines\n\n';
    for (const guideline of instructions.guidelines) {
      content += `- ${guideline}\n`;
    }
    content += '\n';

    if (instructions.keyComponents.length > 0) {
      content += '## Key Components\n\n';
      for (const comp of instructions.keyComponents.slice(0, 15)) {
        content += `- **${comp.file}**: ${comp.purpose}\n`;
        if (comp.dependencies.length > 0) {
          content += `  - Dependencies: ${comp.dependencies.join(', ')}\n`;
        }
        if (comp.relatedFiles.length > 0) {
          content += `  - Related: ${comp.relatedFiles.join(', ')}\n`;
        }
        if (comp.exports.length > 0) {
          content += `  - Exports: ${comp.exports.join(', ')}\n`;
        }
      }
      content += '\n';
    }

    if (instructions.entryPoints.length > 0) {
      content += '## Entry Points\n\n';
      for (const entry of instructions.entryPoints) {
        content += `- ${entry.file} (${entry.type})\n`;
      }
      content += '\n';
    }

    if (instructions.commonPatterns.length > 0) {
      content += '## Common Patterns\n\n';
      for (const pattern of instructions.commonPatterns) {
        content += `### ${pattern.type}\n`;
        content += `${pattern.description}:\n`;
        if (pattern.items) {
          for (const item of pattern.items.slice(0, 10)) {
            content += `- ${item}\n`;
          }
        }
        content += '\n';
      }
    }

    return content;
  }

  private async generateComprehensivePrompt(
    summary: any,
    index: CodebaseIndex,
    includeCode: boolean
  ): Promise<string> {
    let content = '# Complete Codebase Context\n\n';

    content += '## Overview\n';
    content += `This is a ${summary.summary.overview.projectType} project with ${index.metadata.totalFiles} files, `;
    content += `primarily written in ${summary.summary.overview.primaryLanguage}. `;
    content += `The architecture follows ${summary.summary.overview.architecture} patterns.\n\n`;

    // Add more comprehensive content...
    return content;
  }

  private async generateMinimalPrompt(
    summary: any,
    index: CodebaseIndex
  ): Promise<string> {
    return `# ${summary.summary.overview.projectType} Project Context\n\n`;
  }

  private async generateArchitecturePrompt(
    summary: any,
    index: CodebaseIndex
  ): Promise<string> {
    return '# Architecture Analysis\n\n';
  }

  private async generateDeveloperPrompt(
    summary: any,
    index: CodebaseIndex,
    includeCode: boolean
  ): Promise<string> {
    return '# Developer Reference\n\n';
  }

  public async savePromptFile(
    content: string,
    filename: string,
    directory: string = '.'
  ): Promise<string> {
    await fs.ensureDir(directory);
    const fullPath = path.join(directory, filename);
    await fs.writeFile(fullPath, content, 'utf8');
    return fullPath;
  }

  // Enhanced helper methods for better AI context

  private getFileDependencies(
    filePath: string,
    index: CodebaseIndex
  ): string[] {
    return index.dependencies.get(filePath) || [];
  }

  private getFileExports(filePath: string, index: CodebaseIndex): string[] {
    const fileInfo = index.files.get(filePath);
    return fileInfo?.exports || [];
  }

  private getComponentDescription(filePath: string): string {
    return `Core module with dynamic functionality`;
  }
}
