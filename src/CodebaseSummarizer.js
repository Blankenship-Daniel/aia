class CodebaseSummarizer {
  async generateAISummary(index) {
    const summary = {
      overview: this.generateOverview(index),
      keyComponents: this.identifyKeyComponents(index),
      entryPoints: this.findEntryPoints(index),
      dataFlow: this.analyzeDataFlow(index),
      dependencies: this.summarizeDependencies(index),
      aiContext: this.generateAIContext(index),
    };

    return this.formatForAI(summary);
  }

  generateOverview(index) {
    return {
      projectType: this.detectProjectType(index),
      primaryLanguage: this.getPrimaryLanguage(index),
      architecture: this.summarizeArchitecture(index),
      purpose: this.inferProjectPurpose(index),
      size: {
        files: index.metadata.totalFiles,
        loc: index.metadata.linesOfCode,
        components: index.metadata.totalClasses + index.metadata.totalFunctions,
      },
    };
  }

  identifyKeyComponents(index) {
    const components = [];

    // Find main entry points
    const entryPoints = ['index.js', 'main.js', 'app.js', 'server.js'];
    for (const entry of entryPoints) {
      if (index.files.has(entry)) {
        components.push({
          type: 'entry',
          file: entry,
          purpose: 'Application entry point',
          exports: index.files.get(entry).exports,
        });
      }
    }

    // Find core classes/modules
    const coreModules = this.findCoreModules(index);
    components.push(...coreModules);

    return components;
  }

  generateAIContext(index) {
    return {
      prompt: `This is a ${this.detectProjectType(
        index
      )} project written primarily in ${this.getPrimaryLanguage(index)}.`,
      keyInsights: [
        `Main architecture pattern: ${this.summarizeArchitecture(index)}`,
        `Key dependencies: ${this.getKeyDependencies(index).join(', ')}`,
        `Primary purpose: ${this.inferProjectPurpose(index)}`,
      ],
      navigationHints: {
        startWith: this.suggestStartingPoints(index),
        coreLogic: this.identifyCoreLogicFiles(index),
        configuration: this.findConfigurationFiles(index),
        tests: this.findTestFiles(index),
      },
    };
  }

  detectProjectType(index) {
    // Check for common project indicators
    if (index.files && index.files.has('package.json')) {
      return 'Node.js';
    }
    if (index.files && index.files.has('requirements.txt')) {
      return 'Python';
    }
    if (index.files && index.files.has('Cargo.toml')) {
      return 'Rust';
    }
    if (index.files && index.files.has('go.mod')) {
      return 'Go';
    }
    if (index.files && index.files.has('pom.xml')) {
      return 'Java';
    }

    // Detect by file extensions
    const languages = index.metadata?.languages || {};
    const primaryLang = Object.entries(languages).sort(
      (a, b) => b[1] - a[1]
    )[0];

    if (primaryLang) {
      const langMap = {
        javascript: 'Node.js',
        typescript: 'TypeScript',
        python: 'Python',
        java: 'Java',
        rust: 'Rust',
        go: 'Go',
      };
      return langMap[primaryLang[0]] || 'Unknown';
    }

    return 'Unknown';
  }

  getPrimaryLanguage(index) {
    const languages = index.metadata?.languages || {};
    const entries = Object.entries(languages);

    if (entries.length === 0) return 'Unknown';

    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }

  summarizeArchitecture(index) {
    const files = Array.from(index.files?.values() || []);

    // Look for common architectural patterns
    const hasControllers = files.some((f) => f.path.includes('controller'));
    const hasModels = files.some((f) => f.path.includes('model'));
    const hasViews = files.some((f) => f.path.includes('view'));
    const hasServices = files.some((f) => f.path.includes('service'));
    const hasComponents = files.some((f) => f.path.includes('component'));

    if (hasControllers && hasModels && hasViews) {
      return 'MVC Architecture';
    }

    if (hasServices && hasComponents) {
      return 'Service-Component Architecture';
    }

    if (hasServices) {
      return 'Service-Oriented Architecture';
    }

    // Check for common directory structures
    const dirs = new Set();
    files.forEach((f) => {
      const parts = f.path.split('/');
      if (parts.length > 1) dirs.add(parts[0]);
    });

    if (dirs.has('src') && dirs.has('tests')) {
      return 'Standard Project Structure';
    }

    return 'Custom Architecture';
  }

  inferProjectPurpose(index) {
    const files = Array.from(index.files?.values() || []);

    // Check package.json for clues
    const packageFile = files.find((f) => f.path === 'package.json');
    if (packageFile) {
      // This would require parsing the file content, simplified for now
      return 'Application Development';
    }

    // Look for common patterns
    const hasAPI = files.some(
      (f) => f.path.includes('api') || f.path.includes('server')
    );
    const hasUI = files.some(
      (f) => f.path.includes('component') || f.path.includes('view')
    );
    const hasCLI = files.some(
      (f) => f.path.includes('cli') || f.path.includes('command')
    );

    if (hasAPI && hasUI) {
      return 'Full-Stack Web Application';
    } else if (hasAPI) {
      return 'Backend API Service';
    } else if (hasUI) {
      return 'Frontend Application';
    } else if (hasCLI) {
      return 'Command Line Tool';
    }

    return 'Software Development';
  }

  getKeyDependencies(index) {
    const deps = new Set();

    // Get from package.json if available
    const files = Array.from(index.files?.entries() || []);
    const packageFile = files.find(([path]) => path === 'package.json');

    if (packageFile) {
      // Would need to parse the actual file content
      // For now, return common dependencies
      return ['express', 'react', 'typescript', 'jest'];
    }

    return [];
  }

  findEntryPoints(index) {
    const entryPoints = [];
    const commonEntries = [
      'index.js',
      'main.js',
      'app.js',
      'server.js',
      'index.ts',
      'main.ts',
    ];

    for (const entry of commonEntries) {
      if (index.files && index.files.has(entry)) {
        entryPoints.push({
          file: entry,
          type: 'main',
          purpose: 'Application entry point',
        });
      }
    }

    return entryPoints;
  }

  analyzeDataFlow(index) {
    const flow = {
      entryPoints: this.findEntryPoints(index),
      dataModels: [],
      apiEndpoints: [],
      services: [],
    };

    // Find data models
    for (const [className, info] of index.classes || []) {
      if (
        className.toLowerCase().includes('model') ||
        className.toLowerCase().includes('entity') ||
        className.toLowerCase().includes('schema')
      ) {
        flow.dataModels.push({
          name: className,
          file: info.file,
        });
      }
    }

    // Find services
    for (const [className, info] of index.classes || []) {
      if (
        className.toLowerCase().includes('service') ||
        className.toLowerCase().includes('manager') ||
        className.toLowerCase().includes('handler')
      ) {
        flow.services.push({
          name: className,
          file: info.file,
        });
      }
    }

    return flow;
  }

  summarizeDependencies(index) {
    const summary = {
      internal: [],
      external: [],
      circularRefs: [],
    };

    // Analyze internal dependencies
    for (const [filePath, fileInfo] of index.files || []) {
      if (fileInfo.dependencies && fileInfo.dependencies.length > 0) {
        summary.internal.push({
          file: filePath,
          dependsOn: fileInfo.dependencies,
          count: fileInfo.dependencies.length,
        });
      }
    }

    return summary;
  }

  suggestStartingPoints(index) {
    const suggestions = [];

    // Main entry points
    const entryPoints = this.findEntryPoints(index);
    suggestions.push(...entryPoints.map((ep) => ep.file));

    // README files
    if (index.files && index.files.has('README.md')) {
      suggestions.push('README.md');
    }

    // Main directories
    const commonDirs = ['src/', 'lib/', 'app/'];
    for (const dir of commonDirs) {
      const hasFiles = Array.from(index.files?.keys() || []).some((path) =>
        path.startsWith(dir)
      );
      if (hasFiles) {
        suggestions.push(dir);
      }
    }

    return suggestions.slice(0, 5); // Top 5 suggestions
  }

  identifyCoreLogicFiles(index) {
    const coreFiles = [];

    // Files with many exports or classes
    for (const [filePath, fileInfo] of index.files || []) {
      if (fileInfo.exports && fileInfo.exports.length > 2) {
        coreFiles.push(filePath);
      }
      if (fileInfo.symbols && fileInfo.symbols.length > 3) {
        coreFiles.push(filePath);
      }
    }

    // Main source files
    const sourceFiles = Array.from(index.files?.keys() || [])
      .filter(
        (path) =>
          path.startsWith('src/') &&
          (path.endsWith('.js') || path.endsWith('.ts'))
      )
      .slice(0, 10); // Top 10

    return [...new Set([...coreFiles, ...sourceFiles])].slice(0, 8);
  }

  findConfigurationFiles(index) {
    const configFiles = [];
    const configPatterns = [
      'package.json',
      'tsconfig.json',
      'webpack.config.js',
      '.env',
      '.env.example',
      'config.js',
      'config.json',
    ];

    for (const pattern of configPatterns) {
      if (index.files && index.files.has(pattern)) {
        configFiles.push(pattern);
      }
    }

    return configFiles;
  }

  findTestFiles(index) {
    const testFiles = [];

    for (const [filePath] of index.files || []) {
      if (
        filePath.includes('test') ||
        filePath.includes('spec') ||
        filePath.endsWith('.test.js') ||
        filePath.endsWith('.test.ts') ||
        filePath.endsWith('.spec.js') ||
        filePath.endsWith('.spec.ts')
      ) {
        testFiles.push(filePath);
      }
    }

    return testFiles.slice(0, 10); // Top 10 test files
  }

  findCoreModules(index) {
    const modules = [];

    // Find files with many symbols or dependencies
    for (const [filePath, fileInfo] of index.files || []) {
      const symbolCount = fileInfo.symbols ? fileInfo.symbols.length : 0;
      const depCount = fileInfo.dependencies ? fileInfo.dependencies.length : 0;

      if (symbolCount > 3 || depCount > 2) {
        modules.push({
          type: 'module',
          file: filePath,
          purpose: `Core module with ${symbolCount} symbols`,
          exports: fileInfo.exports || [],
          importance: symbolCount + depCount,
        });
      }
    }

    // Sort by importance and return top modules
    return modules.sort((a, b) => b.importance - a.importance).slice(0, 10);
  }

  generateQuickReference(summary) {
    return {
      projectType: summary.overview.projectType,
      mainLanguage: summary.overview.primaryLanguage,
      entryPoints: summary.entryPoints,
      keyFiles: summary.keyComponents.slice(0, 5),
      architecture: summary.overview.architecture,
    };
  }

  createSearchableIndex(summary) {
    const searchIndex = {
      files: [],
      symbols: [],
      concepts: [],
    };

    // Index files
    if (summary.keyComponents) {
      searchIndex.files = summary.keyComponents.map((comp) => ({
        path: comp.file,
        type: comp.type,
        purpose: comp.purpose,
      }));
    }

    // Index concepts
    searchIndex.concepts = [
      summary.overview.projectType,
      summary.overview.architecture,
      summary.overview.primaryLanguage,
    ].filter(Boolean);

    return searchIndex;
  }

  formatForAI(summary) {
    return {
      version: '1.0',
      generated: new Date().toISOString(),
      summary: summary,
      quickReference: this.generateQuickReference(summary),
      searchableIndex: this.createSearchableIndex(summary),
    };
  }
}

module.exports = CodebaseSummarizer;
