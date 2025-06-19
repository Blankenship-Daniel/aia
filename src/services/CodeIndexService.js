const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class CodeIndexService {
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
      metadata: {},
    };
  }

  async indexCodebase(rootDir) {
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

  async indexDirectory(dir, baseDir = dir) {
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory() && !this.shouldIgnore(item)) {
        await this.indexDirectory(fullPath, baseDir);
      } else if (stat.isFile() && this.shouldIndex(item)) {
        await this.indexFile(fullPath, baseDir);
      }
    }
  }

  async indexFile(filePath, baseDir) {
    const relativePath = path.relative(baseDir, filePath);
    const content = await fs.readFile(filePath, 'utf8');
    const ext = path.extname(filePath);

    // Create file entry
    const fileInfo = {
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

  parseJavaScriptFile(content, fileInfo) {
    // Extract classes
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
    let match;
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

  extractClassMethods(content, className) {
    const methods = [];
    const methodRegex = new RegExp(`class\\s+${className}[^{]*{([^}]+)}`, 's');
    const classMatch = content.match(methodRegex);

    if (classMatch) {
      const classBody = classMatch[1];
      const methodPattern = /(?:async\s+)?(\w+)\s*\([^)]*\)/g;
      let methodMatch;

      while ((methodMatch = methodPattern.exec(classBody)) !== null) {
        if (methodMatch[1] !== 'constructor') {
          methods.push(methodMatch[1]);
        }
      }
    }

    return methods;
  }

  extractComments(content, fileInfo) {
    // Extract JSDoc comments
    const jsdocRegex = /\/\*\*[\s\S]*?\*\//g;
    const todoRegex =
      /(?:\/\/|#|\/\*)\s*(?:TODO|FIXME|HACK|NOTE|XXX):\s*(.+)/gi;

    let match;
    while ((match = todoRegex.exec(content)) !== null) {
      this.index.todos.push({
        file: fileInfo.path,
        line: content.substring(0, match.index).split('\n').length,
        text: match[1].trim(),
      });
    }
  }

  parsePythonFile(content, fileInfo) {
    // Extract Python classes
    const classRegex = /class\s+(\w+)(?:\(([^)]+)\))?:/g;
    let match;
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

  extractPythonMethods(content, className) {
    const methods = [];
    const methodRegex = new RegExp(
      `class\\s+${className}[^:]*:([\\s\\S]*?)(?=class|$)`,
      's'
    );
    const classMatch = content.match(methodRegex);

    if (classMatch) {
      const classBody = classMatch[1];
      const methodPattern = /def\s+(\w+)\s*\(/g;
      let methodMatch;

      while ((methodMatch = methodPattern.exec(classBody)) !== null) {
        if (methodMatch[1] !== '__init__') {
          methods.push(methodMatch[1]);
        }
      }
    }

    return methods;
  }

  parseJSONFile(content, fileInfo) {
    try {
      const jsonData = JSON.parse(content);

      // If it's package.json, extract dependencies
      if (fileInfo.path.endsWith('package.json')) {
        const deps = Object.keys(jsonData.dependencies || {});
        const devDeps = Object.keys(jsonData.devDependencies || {});
        fileInfo.dependencies = [...deps, ...devDeps];
      }

      // Mark as valid JSON
      fileInfo.valid = true;
    } catch (error) {
      fileInfo.valid = false;
      fileInfo.error = error.message;
    }
  }

  parseMarkdownFile(content, fileInfo) {
    // Extract headers
    const headerRegex = /^(#+)\s+(.+)$/gm;
    let match;
    while ((match = headerRegex.exec(content)) !== null) {
      fileInfo.symbols.push({
        type: 'header',
        level: match[1].length,
        text: match[2].trim(),
      });
    }

    // Extract code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      fileInfo.symbols.push({
        type: 'codeblock',
        language: match[1] || 'unknown',
        content: match[2].trim(),
      });
    }
  }

  buildRelationships() {
    // Build dependency graph
    for (const [filePath, fileInfo] of this.index.files) {
      for (const imp of fileInfo.imports) {
        if (imp.startsWith('.')) {
          // Relative import
          const resolvedPath = this.resolveImport(filePath, imp);
          if (resolvedPath && this.index.files.has(resolvedPath)) {
            fileInfo.dependencies.push(resolvedPath);
          }
        }
      }
    }
  }

  generateSummary() {
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

  async saveIndex() {
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
  shouldIgnore(name) {
    const ignorePatterns = [
      'node_modules',
      '.git',
      'dist',
      'build',
      'coverage',
      '.next',
      '.cache',
      '.venv', // Python virtual environment
      'venv', // Alternative Python virtual environment name
      'env', // Another common virtual environment name
      '__pycache__', // Python cache directory
      '.pytest_cache', // Pytest cache directory
      '.mypy_cache', // MyPy cache directory
      '.tox', // Tox testing directory
      '.idea', // IntelliJ IDEA directory
      '.vscode', // VS Code directory
      '.DS_Store', // macOS directory
      'target', // Rust/Java build directory
      'vendor', // Go/PHP vendor directory
    ];
    return ignorePatterns.includes(name);
  }

  shouldIndex(name) {
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

  hashContent(content) {
    return crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .substring(0, 16);
  }

  detectLanguage(ext) {
    const languageMap = {
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

  getFileType(ext) {
    const typeMap = {
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

  resolveImport(fromFile, importPath) {
    const fromDir = path.dirname(fromFile);
    const resolvedPath = path.resolve(fromDir, importPath);

    // Try common extensions
    const extensions = ['.js', '.ts', '.jsx', '.tsx', '.json'];
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (this.index.files.has(path.relative(process.cwd(), fullPath))) {
        return path.relative(process.cwd(), fullPath);
      }
    }

    return null;
  }

  getLanguageDistribution() {
    const distribution = {};
    for (const [, fileInfo] of this.index.files) {
      const lang = fileInfo.language;
      distribution[lang] = (distribution[lang] || 0) + 1;
    }
    return distribution;
  }

  getLargestFiles(limit = 10) {
    const files = Array.from(this.index.files.entries())
      .map(([path, info]) => ({ path, size: info.size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, limit);

    return files;
  }

  getMostImportedFiles(limit = 10) {
    const importCount = new Map();

    for (const [, fileInfo] of this.index.files) {
      for (const dep of fileInfo.dependencies) {
        importCount.set(dep, (importCount.get(dep) || 0) + 1);
      }
    }

    return Array.from(importCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([file, count]) => ({ file, count }));
  }

  resetIndex() {
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
      metadata: {},
    };
  }

  async reindexFile(filePath, baseDir = process.cwd()) {
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

  async removeFromIndex(filePath, baseDir = process.cwd()) {
    const relativePath = path.relative(baseDir, filePath);

    // Remove from files
    this.index.files.delete(relativePath);

    // Remove from other indexes
    for (const [key, value] of this.index.classes) {
      if (value.file === relativePath) {
        this.index.classes.delete(key);
      }
    }

    for (const [key, value] of this.index.functions) {
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

  async loadIndex() {
    const indexPath = path.join(process.cwd(), '.aia', 'codebase-index.json');

    if (await fs.pathExists(indexPath)) {
      const indexData = await fs.readJson(indexPath);

      this.index.metadata = indexData.metadata;
      this.index.files = new Map(indexData.files);
      this.index.classes = new Map(indexData.classes);
      this.index.functions = new Map(indexData.functions);
      this.index.todos = indexData.todos;

      return this.index;
    }

    return null;
  }

  // Search functionality
  searchSymbols(query) {
    const results = [];
    const queryLower = query.toLowerCase();

    // Search in classes
    for (const [name, info] of this.index.classes) {
      if (name.toLowerCase().includes(queryLower)) {
        results.push({
          type: 'class',
          name,
          file: info.file,
          relevance: this.calculateRelevance(name, query),
        });
      }
    }

    // Search in functions
    for (const [name, info] of this.index.functions) {
      if (name.toLowerCase().includes(queryLower)) {
        results.push({
          type: 'function',
          name,
          file: info.file,
          relevance: this.calculateRelevance(name, query),
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  searchFiles(query) {
    const results = [];
    const queryLower = query.toLowerCase();

    for (const [filePath, fileInfo] of this.index.files) {
      const fileName = path.basename(filePath).toLowerCase();

      if (
        fileName.includes(queryLower) ||
        filePath.toLowerCase().includes(queryLower)
      ) {
        results.push({
          path: filePath,
          type: fileInfo.type,
          language: fileInfo.language,
          size: fileInfo.size,
          relevance: this.calculateRelevance(filePath, query),
        });
      }
    }

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  searchTodos(query = '') {
    if (!query) return this.index.todos;

    const queryLower = query.toLowerCase();
    return this.index.todos.filter((todo) =>
      todo.text.toLowerCase().includes(queryLower)
    );
  }

  calculateRelevance(text, query) {
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
      if (textLower.includes(char)) matches++;
    }

    return (matches / queryLower.length) * 0.4;
  }

  getIndexStats() {
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
  async generateCustomInstructions(format = 'markdown') {
    const index = await this.loadIndex();
    if (!index) {
      throw new Error('No index found. Build one first.');
    }

    const CodebaseSummarizer = require('../CodebaseSummarizer');
    const summarizer = new CodebaseSummarizer();
    const summary = await summarizer.generateAISummary(index);

    const instructions = {
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
      ],
      keyComponents: (summary.summary.keyComponents || []).slice(0, 10),
      entryPoints: summary.summary.entryPoints || [],
      architecture: summary.summary.overview.architecture,
      commonPatterns: this.extractCommonPatterns(),
      codebaseStructure: this.generateStructureMap(),
    };

    if (format === 'json') {
      return JSON.stringify(instructions, null, 2);
    } else {
      return this.formatInstructionsAsMarkdown(instructions);
    }
  }

  async generatePromptFile(type = 'comprehensive', includeCode = false) {
    const index = await this.loadIndex();
    if (!index) {
      throw new Error('No index found. Build one first.');
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

  extractCommonPatterns() {
    const patterns = [];

    // Analyze import patterns
    const importPatterns = new Map();
    for (const [, fileInfo] of this.index.files) {
      for (const imp of fileInfo.imports) {
        importPatterns.set(imp, (importPatterns.get(imp) || 0) + 1);
      }
    }

    // Get most common imports
    const commonImports = Array.from(importPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([imp]) => imp);

    patterns.push({
      type: 'imports',
      description: 'Most commonly imported modules',
      items: commonImports,
    });

    // Analyze class patterns
    const classPatterns = [];
    for (const [className, classInfo] of this.index.classes) {
      if (classInfo.extends) {
        classPatterns.push(`${className} extends ${classInfo.extends}`);
      }
    }

    if (classPatterns.length > 0) {
      patterns.push({
        type: 'inheritance',
        description: 'Class inheritance patterns',
        items: classPatterns.slice(0, 5),
      });
    }

    return patterns;
  }

  generateStructureMap() {
    const structure = {};

    for (const [filePath, fileInfo] of this.index.files) {
      const parts = filePath.split('/');
      let current = structure;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }

      const fileName = parts[parts.length - 1];
      current[fileName] = {
        type: fileInfo.type,
        language: fileInfo.language,
        symbolCount: fileInfo.symbols.length,
      };
    }

    return structure;
  }

  formatInstructionsAsMarkdown(instructions) {
    let content = '# Custom Instructions for AI Assistant\n\n';

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
      for (const component of instructions.keyComponents) {
        content += `- **${component.file}**: ${
          component.purpose || 'Core component'
        }\n`;
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
        for (const item of pattern.items) {
          content += `- ${item}\n`;
        }
        content += '\n';
      }
    }

    return content;
  }

  async generateComprehensivePrompt(summary, index, includeCode) {
    let content = '# Complete Codebase Context\n\n';

    content += '## Overview\n';
    content += `This is a ${summary.summary.overview.projectType} project with ${index.metadata.totalFiles} files, `;
    content += `primarily written in ${summary.summary.overview.primaryLanguage}. `;
    content += `The architecture follows ${summary.summary.overview.architecture} patterns.\n\n`;

    content += '## Key Statistics\n';
    content += `- Files: ${index.metadata.totalFiles}\n`;
    content += `- Classes: ${index.metadata.totalClasses}\n`;
    content += `- Functions: ${index.metadata.totalFunctions}\n`;
    content += `- TODO Items: ${index.metadata.totalTodos}\n\n`;

    // Add language breakdown
    content += '## Language Distribution\n';
    for (const [lang, count] of Object.entries(index.metadata.languages)) {
      content += `- ${lang}: ${count} files\n`;
    }
    content += '\n';

    // Add key components
    if (summary.summary.keyComponents.length > 0) {
      content += '## Core Components\n';
      for (const comp of summary.summary.keyComponents.slice(0, 15)) {
        content += `- **${comp.file}**: ${
          comp.purpose || 'Core functionality'
        }\n`;
      }
      content += '\n';
    }

    // Add class information
    content += '## Classes\n';
    let classCount = 0;
    for (const [className, classInfo] of index.classes) {
      if (classCount >= 20) break;
      content += `- **${className}** (${classInfo.file})`;
      if (classInfo.extends) {
        content += ` extends ${classInfo.extends}`;
      }
      content += '\n';
      classCount++;
    }
    content += '\n';

    // Add TODO items
    if (index.todos.length > 0) {
      content += '## Outstanding Tasks\n';
      for (const todo of index.todos.slice(0, 10)) {
        content += `- ${todo.file}:${todo.line} - ${todo.text}\n`;
      }
      content += '\n';
    }

    return content;
  }

  async generateMinimalPrompt(summary, index) {
    let content = `# ${summary.summary.overview.projectType} Project Context\n\n`;

    content += `A ${summary.summary.overview.primaryLanguage} project with ${index.metadata.totalFiles} files `;
    content += `using ${summary.summary.overview.architecture} architecture.\n\n`;

    content += '## Key Files\n';
    const keyFiles = (summary.summary.keyComponents || []).slice(0, 8);
    for (const comp of keyFiles) {
      content += `- ${comp.file}\n`;
    }

    content += '\n## Main Classes\n';
    let count = 0;
    for (const [className] of index.classes) {
      if (count >= 10) break;
      content += `- ${className}\n`;
      count++;
    }

    return content;
  }

  async generateArchitecturePrompt(summary, index) {
    let content = '# Architecture Analysis\n\n';

    content += `## System Design\n`;
    content += `**Type**: ${summary.summary.overview.projectType}\n`;
    content += `**Architecture**: ${summary.summary.overview.architecture}\n`;
    content += `**Primary Language**: ${summary.summary.overview.primaryLanguage}\n\n`;

    // Analyze directory structure
    content += '## Directory Structure\n';
    const dirs = new Set();
    for (const [filePath] of index.files) {
      const dir = path.dirname(filePath);
      if (dir !== '.') {
        dirs.add(dir.split('/')[0]);
      }
    }

    for (const dir of Array.from(dirs).sort()) {
      content += `- ${dir}/\n`;
    }
    content += '\n';

    // Add dependency analysis
    content += '## Module Dependencies\n';
    const deps = this.index.metadata.mostImported || [];
    for (const dep of deps.slice(0, 10)) {
      content += `- ${dep.file} (imported ${dep.count} times)\n`;
    }

    return content;
  }

  async generateDeveloperPrompt(summary, index, includeCode) {
    let content = '# Developer Reference\n\n';

    content += '## Quick Start\n';
    const entryPoints = summary.summary.entryPoints || [];
    if (entryPoints.length > 0) {
      content += 'Main entry points:\n';
      for (const entry of entryPoints) {
        content += `- ${entry.file}\n`;
      }
    } else {
      content += '- index.js (main entry point)\n';
    }
    content += '\n';

    content += '## Development Environment\n';
    content += `- Primary language: ${summary.summary.overview.primaryLanguage}\n`;
    content += `- Total files: ${index.metadata.totalFiles}\n`;
    content += `- Architecture: ${summary.summary.overview.architecture}\n\n`;

    // Add function reference
    content += '## Key Functions\n';
    let funcCount = 0;
    for (const [funcName, funcInfo] of index.functions) {
      if (funcCount >= 15) break;
      content += `- **${funcName}**${funcInfo.async ? ' (async)' : ''} - ${
        funcInfo.file
      }\n`;
      funcCount++;
    }
    content += '\n';

    // Add current tasks
    if (index.todos.length > 0) {
      content += '## Current Tasks (TODOs)\n';
      for (const todo of index.todos) {
        content += `- [ ] ${todo.text} (${todo.file}:${todo.line})\n`;
      }
    }

    return content;
  }

  async savePromptFile(content, filename, directory = '.') {
    // Ensure directory exists
    await fs.ensureDir(directory);
    const fullPath = path.join(directory, filename);
    await fs.writeFile(fullPath, content, 'utf8');
    return fullPath;
  }

  async saveCustomInstructions(
    filename = 'copilot-instructions.md',
    directory = '.'
  ) {
    const instructions = await this.generateCustomInstructions('markdown');
    return await this.savePromptFile(instructions, filename, directory);
  }

  async savePromptFiles(directory = '.') {
    const results = [];

    // Generate different types of prompt files
    const comprehensive = await this.generatePromptFile('comprehensive');
    const minimal = await this.generatePromptFile('minimal');
    const architecture = await this.generatePromptFile('architecture');
    const devFocused = await this.generatePromptFile('dev-focused');
    const customInstructions = await this.generateCustomInstructions(
      'markdown'
    );
    const customInstructionsJSON = await this.generateCustomInstructions(
      'json'
    );

    // Save all files
    results.push(
      await this.savePromptFile(
        comprehensive,
        'codebase-comprehensive.md',
        directory
      )
    );
    results.push(
      await this.savePromptFile(minimal, 'codebase-minimal.md', directory)
    );
    results.push(
      await this.savePromptFile(
        architecture,
        'codebase-architecture.md',
        directory
      )
    );
    results.push(
      await this.savePromptFile(devFocused, 'codebase-developer.md', directory)
    );
    results.push(
      await this.savePromptFile(
        customInstructions,
        'copilot-instructions.md',
        directory
      )
    );
    results.push(
      await this.savePromptFile(
        customInstructionsJSON,
        'custom-instructions.json',
        directory
      )
    );

    return results;
  }
}

module.exports = CodeIndexService;
