interface FileInfo {
  path: string;
  content?: string;
  exports?: string[];
  imports?: string[];
  classes?: string[];
  functions?: string[];
  type?: string;
  size?: number;
}

interface IndexMetadata {
  totalFiles: number;
  linesOfCode: number;
  totalClasses: number;
  totalFunctions: number;
  languages?: Record<string, number>;
  dependencies?: Record<string, string>;
}

interface CodebaseIndex {
  files: Map<string, FileInfo>;
  metadata: IndexMetadata;
  dependencies?: Record<string, string>;
}

interface ProjectOverview {
  projectType: string;
  primaryLanguage: string;
  architecture: string;
  purpose: string;
  size: {
    files: number;
    loc: number;
    components: number;
  };
}

interface KeyComponent {
  type: string;
  file: string;
  purpose: string;
  exports?: string[];
  description?: string;
}

interface DataFlowInfo {
  entryPoints: string[];
  dataFlow: string[];
  patterns: string[];
}

interface DependencyInfo {
  external: Record<string, string>;
  internal: string[];
  devDependencies?: Record<string, string>;
}

interface AIContext {
  suggestedStartingPoints: string[];
  keyDirectories: string[];
  importantFiles: string[];
  quickReference: Record<string, string>;
}

interface EntryPoint {
  file: string;
  purpose: string;
}

interface CodebaseSummary {
  overview: ProjectOverview;
  keyComponents: KeyComponent[];
  entryPoints: EntryPoint[];
  dataFlow: DataFlowInfo;
  dependencies: DependencyInfo;
  aiContext: AIContext;
}

/**
 * CodebaseSummarizer class
 * 
 * TODO: Add class description
 */
class CodebaseSummarizer {
  async generateAISummary(
    index: CodebaseIndex
  ): Promise<{ summary: CodebaseSummary; rawSummary: string }> {
    const summary: CodebaseSummary = {
      overview: this.generateOverview(index),
      keyComponents: this.identifyKeyComponents(index),
      entryPoints: this.findEntryPoints(index),
      dataFlow: this.analyzeDataFlow(index),
      dependencies: this.summarizeDependencies(index),
      aiContext: this.generateAIContext(index),
    };

    const rawSummary = this.formatForAI(summary);

    return { summary, rawSummary };
  }

  /**
   * Generates overview
   * 
   * @param index - Parameter description
   * 
   * @returns ProjectOverview - Return value description
   */
  private generateOverview(index: CodebaseIndex): ProjectOverview {
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

  /**
   * Handles identifyKeyComponents operation
   * 
   * @param index - Parameter description
   * 
   * @returns KeyComponent[] - Return value description
   */
  private identifyKeyComponents(index: CodebaseIndex): KeyComponent[] {
    const components: KeyComponent[] = [];

    // Find main entry points
    const entryPoints = ['index.js', 'main.js', 'app.js', 'server.js'];
    for (const entry of entryPoints) {
      if (index.files.has(entry)) {
        const fileInfo = index.files.get(entry)!;
        components.push({
          type: 'entry',
          file: entry,
          purpose: 'Application entry point',
          exports: fileInfo.exports,
        });
      }
    }

    // Find core classes/modules
    const coreModules = this.findCoreModules(index);
    components.push(...coreModules);

    return components;
  }

  /**
   * Generates aicontext
   * 
   * @param index - Parameter description
   * 
   * @returns AIContext - Return value description
   */
  private generateAIContext(index: CodebaseIndex): AIContext {
    return {
      suggestedStartingPoints: this.suggestStartingPoints(index),
      keyDirectories: this.getKeyDirectories(index),
      importantFiles: this.getImportantFiles(index),
      quickReference: this.generateQuickReference(index),
    };
  }

  /**
   * Handles detectProjectType operation
   * 
   * @param index - Parameter description
   * 
   * @returns string - Return value description
   */
  private detectProjectType(index: CodebaseIndex): string {
    const files = Array.from(index.files.keys());

    // Check for common project indicators
    if (files.includes('package.json')) {
      const packageFile = index.files.get('package.json');
      if (packageFile?.content) {
        try {
          const pkg = JSON.parse(packageFile.content);

          // Check dependencies for framework indicators
          const deps = { ...pkg.dependencies, ...pkg.devDependencies };

          if (deps['react'] || deps['@types/react']) return 'React Application';
          if (deps['next']) return 'Next.js Application';
          if (deps['vue']) return 'Vue.js Application';
          if (deps['angular'] || deps['@angular/core'])
            return 'Angular Application';
          if (deps['express']) return 'Express.js Server';
          if (deps['electron']) return 'Electron Application';
          if (deps['commander'] || deps['inquirer']) return 'Node.js CLI';

          return 'Node.js Application';
        } catch {
          return 'Node.js Project';
        }
      }
    }

    if (files.includes('requirements.txt') || files.includes('setup.py')) {
      return 'Python Project';
    }

    if (files.includes('Cargo.toml')) {
      return 'Rust Project';
    }

    if (files.includes('go.mod')) {
      return 'Go Project';
    }

    if (files.includes('pom.xml') || files.includes('build.gradle')) {
      return 'Java Project';
    }

    if (files.includes('Gemfile')) {
      return 'Ruby Project';
    }

    if (files.includes('composer.json')) {
      return 'PHP Project';
    }

    // Check for common file patterns
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    const tsFiles = files.filter((f) => f.endsWith('.ts'));
    const pyFiles = files.filter((f) => f.endsWith('.py'));

    if (tsFiles.length > jsFiles.length) {
      return 'TypeScript Project';
    }

    if (jsFiles.length > 0) {
      return 'JavaScript Project';
    }

    if (pyFiles.length > 0) {
      return 'Python Project';
    }

    return 'Unknown Project Type';
  }

  /**
   * Gets primarylanguage
   * 
   * @param index - Parameter description
   * 
   * @returns string - Return value description
   */
  private getPrimaryLanguage(index: CodebaseIndex): string {
    const languages = index.metadata?.languages || {};
    const entries = Object.entries(languages);

    if (entries.length === 0) return 'Unknown';

    const primaryLang = entries.sort((a, b) => b[1] - a[1])[0];

    if (primaryLang) {
      const langMap: Record<string, string> = {
        javascript: 'JavaScript',
        typescript: 'TypeScript',
        python: 'Python',
        java: 'Java',
        rust: 'Rust',
        go: 'Go',
        php: 'PHP',
        ruby: 'Ruby',
        'c++': 'C++',
        'c#': 'C#',
      };
      return langMap[primaryLang[0]] || primaryLang[0];
    }

    return 'Unknown';
  }

  /**
   * Handles summarizeArchitecture operation
   * 
   * @param index - Parameter description
   * 
   * @returns string - Return value description
   */
  private summarizeArchitecture(index: CodebaseIndex): string {
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
    const dirs = new Set<string>();
    files.forEach((f) => {
      const parts = f.path.split('/');
      if (parts.length > 1) dirs.add(parts[0]);
    });

    if (dirs.has('src') && dirs.has('tests')) {
      return 'Standard Project Structure';
    }

    if (dirs.has('lib') || dirs.has('dist')) {
      return 'Library Project';
    }

    return 'Custom Architecture';
  }

  /**
   * Handles inferProjectPurpose operation
   * 
   * @param index - Parameter description
   * 
   * @returns string - Return value description
   */
  private inferProjectPurpose(index: CodebaseIndex): string {
    const files = Array.from(index.files.keys());

    // Check package.json for description
    if (files.includes('package.json')) {
      const packageFile = index.files.get('package.json');
      if (packageFile?.content) {
        try {
          const pkg = JSON.parse(packageFile.content);
          if (pkg.description) {
            return pkg.description;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Check README for description
    const readmeFiles = files.filter((f) => f.toLowerCase().includes('readme'));
    if (readmeFiles.length > 0) {
      const readmeFile = index.files.get(readmeFiles[0]);
      if (readmeFile?.content) {
        // Extract first paragraph as purpose
        const lines = readmeFile.content.split('\n');
        const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
        if (nonEmptyLines.length > 1) {
          return nonEmptyLines[1].trim();
        }
      }
    }

    // Infer from project structure
    const projectType = this.detectProjectType(index);

    switch (projectType) {
      case 'React Application':
        return 'Web application built with React';
      case 'Node.js CLI':
        return 'Command-line interface application';
      case 'Express.js Server':
        return 'Web server application';
      case 'Python Project':
        return 'Python application or library';
      default:
        return 'Application Development';
    }
  }

  /**
   * Gets keydependencies
   * 
   * @param index - Parameter description
   * 
   * @returns Record<string, string> - Return value description
   */
  private getKeyDependencies(index: CodebaseIndex): Record<string, string> {
    const files = Array.from(index.files.keys());

    if (files.includes('package.json')) {
      const packageFile = index.files.get('package.json');
      if (packageFile?.content) {
        try {
          const pkg = JSON.parse(packageFile.content);
          return pkg.dependencies || {};
        } catch {
          return {};
        }
      }
    }

    return {};
  }

  /**
   * Handles findEntryPoints operation
   * 
   * @param index - Parameter description
   * 
   * @returns EntryPoint[] - Return value description
   */
  private findEntryPoints(index: CodebaseIndex): EntryPoint[] {
    const entryPoints: EntryPoint[] = [];
    const files = Array.from(index.files.keys());

    // Common entry point files
    const commonEntryPoints = [
      { file: 'index.js', purpose: 'Main application entry point' },
      {
        file: 'index.ts',
        purpose: 'Main application entry point (TypeScript)',
      },
      { file: 'main.js', purpose: 'Application main file' },
      { file: 'main.ts', purpose: 'Application main file (TypeScript)' },
      { file: 'app.js', purpose: 'Application bootstrap file' },
      { file: 'app.ts', purpose: 'Application bootstrap file (TypeScript)' },
      { file: 'server.js', purpose: 'Server entry point' },
      { file: 'server.ts', purpose: 'Server entry point (TypeScript)' },
      { file: 'index.html', purpose: 'Web application entry point' },
    ];

    for (const entry of commonEntryPoints) {
      if (files.includes(entry.file)) {
        entryPoints.push(entry);
      }
    }

    // Check package.json for main entry
    if (files.includes('package.json')) {
      const packageFile = index.files.get('package.json');
      if (packageFile?.content) {
        try {
          const pkg = JSON.parse(packageFile.content);
          if (pkg.main && !entryPoints.some((ep) => ep.file === pkg.main)) {
            entryPoints.push({
              file: pkg.main,
              purpose: 'Package main entry point',
            });
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    return entryPoints;
  }

  /**
   * Analyzes dataflow
   * 
   * @param index - Parameter description
   * 
   * @returns DataFlowInfo - Return value description
   */
  private analyzeDataFlow(index: CodebaseIndex): DataFlowInfo {
    const entryPoints = this.findEntryPoints(index);
    const dataFlow: string[] = [];
    const patterns: string[] = [];

    // Analyze common patterns
    const files = Array.from(index.files.values());

    if (
      files.some((f) => f.path.includes('router') || f.path.includes('routes'))
    ) {
      patterns.push('Router Pattern');
      dataFlow.push('Request → Router → Handler');
    }

    if (files.some((f) => f.path.includes('middleware'))) {
      patterns.push('Middleware Pattern');
      dataFlow.push('Request → Middleware → Handler');
    }

    if (files.some((f) => f.path.includes('controller'))) {
      patterns.push('Controller Pattern');
      dataFlow.push('Request → Controller → Service → Model');
    }

    return {
      entryPoints: entryPoints.map((ep) => ep.file),
      dataFlow,
      patterns,
    };
  }

  /**
   * Handles summarizeDependencies operation
   * 
   * @param index - Parameter description
   * 
   * @returns DependencyInfo - Return value description
   */
  private summarizeDependencies(index: CodebaseIndex): DependencyInfo {
    const external: Record<string, string> = {};
    const internal: string[] = [];
    let devDependencies: Record<string, string> = {};

    // Get external dependencies from package.json
    const packageFile = index.files.get('package.json');
    if (packageFile?.content) {
      try {
        const pkg = JSON.parse(packageFile.content);
        Object.assign(external, pkg.dependencies || {});
        devDependencies = pkg.devDependencies || {};
      } catch {
        // Ignore parse errors
      }
    }

    // Get internal dependencies (imports within project)
    const files = Array.from(index.files.values());
    const internalPaths = new Set<string>();

    files.forEach((file) => {
      if (file.imports) {
        file.imports.forEach((imp) => {
          if (imp.startsWith('.') || imp.startsWith('/')) {
            internalPaths.add(imp);
          }
        });
      }
    });

    internal.push(...Array.from(internalPaths));

    return {
      external,
      internal,
      devDependencies,
    };
  }

  /**
   * Handles suggestStartingPoints operation
   * 
   * @param index - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private suggestStartingPoints(index: CodebaseIndex): string[] {
    const suggestions: string[] = [];
    const files = Array.from(index.files.keys());

    // Add entry points
    const entryPoints = this.findEntryPoints(index);
    suggestions.push(...entryPoints.map((ep) => ep.file));

    // Add README files
    const readmeFiles = files.filter((f) => f.toLowerCase().includes('readme'));
    suggestions.push(...readmeFiles);

    // Add main source directory
    if (files.some((f) => f.startsWith('src/'))) {
      suggestions.push('src/');
    }

    // Add configuration files
    const configFiles = files.filter(
      (f) =>
        f.includes('config') ||
        f.includes('package.json') ||
        f.includes('tsconfig.json')
    );
    suggestions.push(...configFiles);

    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Gets keydirectories
   * 
   * @param index - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private getKeyDirectories(index: CodebaseIndex): string[] {
    const dirs = new Set<string>();
    const files = Array.from(index.files.keys());

    files.forEach((file) => {
      const parts = file.split('/');
      if (parts.length > 1) {
        dirs.add(parts[0]);
      }
    });

    return Array.from(dirs).sort();
  }

  /**
   * Gets importantfiles
   * 
   * @param index - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private getImportantFiles(index: CodebaseIndex): string[] {
    const important: string[] = [];
    const files = Array.from(index.files.keys());

    // Configuration files
    const configFiles = files.filter(
      (f) =>
        f.includes('config') ||
        f.includes('package.json') ||
        f.includes('tsconfig.json') ||
        f.includes('webpack') ||
        f.includes('babel')
    );
    important.push(...configFiles);

    // Documentation files
    const docFiles = files.filter(
      (f) =>
        f.toLowerCase().includes('readme') ||
        f.toLowerCase().includes('changelog') ||
        f.toLowerCase().includes('license')
    );
    important.push(...docFiles);

    // Entry points
    const entryPoints = this.findEntryPoints(index);
    important.push(...entryPoints.map((ep) => ep.file));

    return [...new Set(important)];
  }

  /**
   * Generates quickreference
   * 
   * @param index - Parameter description
   * 
   * @returns Record<string, string> - Return value description
   */
  private generateQuickReference(index: CodebaseIndex): Record<string, string> {
    const reference: Record<string, string> = {};
    const files = Array.from(index.files.entries());

    // Add file type counts
    const extensions = new Map<string, number>();
    files.forEach(([path]) => {
      const ext = path.split('.').pop() || '';
      extensions.set(ext, (extensions.get(ext) || 0) + 1);
    });

    extensions.forEach((count, ext) => {
      if (count > 1) {
        reference[`${ext} files`] = count.toString();
      }
    });

    return reference;
  }

  /**
   * Handles identifyCoreLogicFiles operation
   * 
   * @param index - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private identifyCoreLogicFiles(index: CodebaseIndex): string[] {
    const files = Array.from(index.files.keys());

    return files.filter((file) => {
      const path = file.toLowerCase();
      return (
        path.includes('service') ||
        path.includes('controller') ||
        path.includes('model') ||
        path.includes('core') ||
        path.includes('lib') ||
        (path.includes('src') && !path.includes('test'))
      );
    });
  }

  /**
   * Handles findConfigurationFiles operation
   * 
   * @param index - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private findConfigurationFiles(index: CodebaseIndex): string[] {
    const files = Array.from(index.files.keys());

    return files.filter((file) => {
      const name = file.toLowerCase();
      return (
        name.includes('config') ||
        name.includes('settings') ||
        name.includes('env') ||
        name === 'package.json' ||
        name === 'tsconfig.json' ||
        name.includes('webpack') ||
        name.includes('babel')
      );
    });
  }

  /**
   * Handles findTestFiles operation
   * 
   * @param index - Parameter description
   * 
   * @returns string[] - Return value description
   */
  private findTestFiles(index: CodebaseIndex): string[] {
    const files = Array.from(index.files.keys());

    return files.filter((file) => {
      const path = file.toLowerCase();
      return (
        path.includes('test') ||
        path.includes('spec') ||
        path.includes('__tests__') ||
        path.endsWith('.test.js') ||
        path.endsWith('.test.ts') ||
        path.endsWith('.spec.js') ||
        path.endsWith('.spec.ts')
      );
    });
  }

  /**
   * Handles findCoreModules operation
   * 
   * @param index - Parameter description
   * 
   * @returns KeyComponent[] - Return value description
   */
  private findCoreModules(index: CodebaseIndex): KeyComponent[] {
    const components: KeyComponent[] = [];
    const files = Array.from(index.files.entries());

    // Find files with significant exports
    files.forEach(([path, fileInfo]) => {
      if (fileInfo.exports && fileInfo.exports.length > 0) {
        if (fileInfo.classes && fileInfo.classes.length > 0) {
          components.push({
            type: 'class',
            file: path,
            purpose: `Contains ${fileInfo.classes.length} class(es)`,
            exports: fileInfo.exports,
          });
        } else if (fileInfo.functions && fileInfo.functions.length > 0) {
          components.push({
            type: 'module',
            file: path,
            purpose: `Contains ${fileInfo.functions.length} function(s)`,
            exports: fileInfo.exports,
          });
        }
      }
    });

    // Sort by number of exports (most important first)
    return components
      .sort((a, b) => (b.exports?.length || 0) - (a.exports?.length || 0))
      .slice(0, 10); // Top 10 components
  }

  private createSearchableIndex(
    summary: CodebaseSummary
  ): Record<string, string[]> {
    const searchIndex: Record<string, string[]> = {};

    // Index by file types
    summary.keyComponents.forEach((component) => {
      if (!searchIndex[component.type]) {
        searchIndex[component.type] = [];
      }
      searchIndex[component.type].push(component.file);
    });

    // Index by architecture patterns
    const arch = summary.overview.architecture.toLowerCase();
    searchIndex.architecture = [arch];

    // Index by language
    const lang = summary.overview.primaryLanguage.toLowerCase();
    searchIndex.language = [lang];

    return searchIndex;
  }

  /**
   * Formats forai
   * 
   * @param summary - Parameter description
   * 
   * @returns string - Return value description
   */
  private formatForAI(summary: CodebaseSummary): string {
    let formatted = '';

    // Overview section
    formatted += `# Codebase Overview\n\n`;
    formatted += `- **Project Type**: ${summary.overview.projectType}\n`;
    formatted += `- **Primary Language**: ${summary.overview.primaryLanguage}\n`;
    formatted += `- **Architecture**: ${summary.overview.architecture}\n`;
    formatted += `- **Purpose**: ${summary.overview.purpose}\n`;
    formatted += `- **Scale**: ${summary.overview.size.files} files, ${summary.overview.size.components} components\n\n`;

    // Key components
    if (summary.keyComponents.length > 0) {
      formatted += `## Key Components\n\n`;
      summary.keyComponents.forEach((component) => {
        formatted += `- **${component.file}**: ${component.purpose}\n`;
        if (component.exports && component.exports.length > 0) {
          formatted += `  - Exports: ${component.exports.join(', ')}\n`;
        }
      });
      formatted += '\n';
    }

    // Entry points
    if (summary.entryPoints.length > 0) {
      formatted += `## Entry Points\n\n`;
      summary.entryPoints.forEach((entry) => {
        formatted += `- ${entry}\n`;
      });
      formatted += '\n';
    }

    // Dependencies
    if (Object.keys(summary.dependencies.external).length > 0) {
      formatted += `## Key Dependencies\n\n`;
      Object.entries(summary.dependencies.external)
        .slice(0, 10)
        .forEach(([name, version]) => {
          formatted += `- ${name}: ${version}\n`;
        });
      formatted += '\n';
    }

    // AI Context
    formatted += `## AI Assistant Context\n\n`;
    formatted += `### Suggested Starting Points\n`;
    summary.aiContext.suggestedStartingPoints.forEach((point) => {
      formatted += `- ${point}\n`;
    });

    formatted += `\n### Important Files\n`;
    summary.aiContext.importantFiles.forEach((file) => {
      formatted += `- ${file}\n`;
    });

    return formatted;
  }
}

export default CodebaseSummarizer;
