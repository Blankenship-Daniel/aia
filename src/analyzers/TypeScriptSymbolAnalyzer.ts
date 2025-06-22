import * as ts from 'typescript';
import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  SymbolInfo, 
  SymbolReference, 
  FileSymbolEntry, 
  SymbolScope, 
  ReferenceContext,
  SymbolDefinition,
  SymbolRelationships,
  SymbolMetadata 
} from '../types/SymbolTypes.js';

/**
 * TypeScript AST-based symbol analyzer for tracking symbol usage and references
 */
export class TypeScriptSymbolAnalyzer {
  private program: ts.Program | null = null;
  private checker: ts.TypeChecker | null = null;

  /**
   * Initialize the TypeScript program for analysis
   */
  async initialize(rootPath: string): Promise<void> {
    try {
      // Find tsconfig.json or create a default configuration
      const tsconfigPath = this.findTsConfig(rootPath);
      let compilerOptions: ts.CompilerOptions;
      let fileNames: string[];

      if (tsconfigPath) {
        const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
        if (configFile.error) {
          throw new Error(`Error reading tsconfig.json: ${configFile.error.messageText}`);
        }

        const parsedConfig = ts.parseJsonConfigFileContent(
          configFile.config,
          ts.sys,
          path.dirname(tsconfigPath)
        );

        compilerOptions = parsedConfig.options;
        fileNames = parsedConfig.fileNames;
      } else {
        // Create default compiler options
        compilerOptions = {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
          allowJs: true,
          declaration: false,
          skipLibCheck: true,
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
        };

        // Find all TypeScript and JavaScript files
        fileNames = await this.findSourceFiles(rootPath);
      }

      // Create the TypeScript program
      this.program = ts.createProgram(fileNames, compilerOptions);
      this.checker = this.program.getTypeChecker();
    } catch (error) {
      console.warn(`Failed to initialize TypeScript program: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Continue without TypeScript analysis
    }
  }

  /**
   * Analyze a file for symbol usage and references
   */
  async analyzeFileReferences(filePath: string): Promise<{
    symbols: SymbolInfo[];
    references: Map<string, SymbolReference[]>;
  }> {
    const result = {
      symbols: [] as SymbolInfo[],
      references: new Map<string, SymbolReference[]>()
    };

    try {
      if (!this.program || !this.checker) {
        // Fallback to regex-based analysis if TypeScript program is not available
        return await this.analyzeFileWithRegex(filePath);
      }

      const sourceFile = this.program.getSourceFile(filePath);
      if (!sourceFile) {
        return await this.analyzeFileWithRegex(filePath);
      }

      // Extract symbols from the file
      result.symbols = this.extractSymbolsFromSourceFile(sourceFile);

      // Find references to symbols
      const referencesMap = await this.findSymbolReferences(sourceFile);
      result.references = referencesMap;

      return result;
    } catch (error) {
      console.warn(`Failed to analyze ${filePath} with TypeScript AST: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Fallback to regex-based analysis
      return await this.analyzeFileWithRegex(filePath);
    }
  }

  /**
   * Extract symbols from a TypeScript source file
   */
  private extractSymbolsFromSourceFile(sourceFile: ts.SourceFile): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    const visit = (node: ts.Node) => {
      switch (node.kind) {
        case ts.SyntaxKind.ClassDeclaration:
          const classDecl = node as ts.ClassDeclaration;
          if (classDecl.name) {
            symbols.push({
              name: classDecl.name.text,
              type: 'class',
              definitions: [{
                location: {
                  file: sourceFile.fileName,
                  line: ts.getLineAndCharacterOfPosition(sourceFile, classDecl.getStart()).line + 1,
                  column: ts.getLineAndCharacterOfPosition(sourceFile, classDecl.getStart()).character + 1
                },
                snippet: this.getSnippet(sourceFile, classDecl),
                scope: 'module' as SymbolScope,
                modifiers: this.getModifiers(classDecl)
              }],
              references: [], // Will be populated by reference analysis
              relationships: {
                extends: this.getExtendedClass(classDecl) ? [this.getExtendedClass(classDecl)!] : [],
                implements: [],
                uses: [],
                usedBy: [],
                dependencies: []
              },
              metadata: {
                exported: this.isExported(classDecl),
                abstract: this.hasModifier(classDecl, ts.SyntaxKind.AbstractKeyword),
                usageCount: 0
              }
            });
          }
          break;

        case ts.SyntaxKind.FunctionDeclaration:
          const funcDecl = node as ts.FunctionDeclaration;
          if (funcDecl.name) {
            symbols.push({
              name: funcDecl.name.text,
              type: 'function',
              definitions: [{
                location: {
                  file: sourceFile.fileName,
                  line: ts.getLineAndCharacterOfPosition(sourceFile, funcDecl.getStart()).line + 1,
                  column: ts.getLineAndCharacterOfPosition(sourceFile, funcDecl.getStart()).character + 1
                },
                snippet: this.getSnippet(sourceFile, funcDecl),
                scope: 'module' as SymbolScope,
                modifiers: this.getModifiers(funcDecl)
              }],
              references: [],
              relationships: {
                extends: [],
                implements: [],
                uses: [],
                usedBy: [],
                dependencies: []
              },
              metadata: {
                exported: this.isExported(funcDecl),
                async: this.hasModifier(funcDecl, ts.SyntaxKind.AsyncKeyword),
                usageCount: 0
              }
            });
          }
          break;

        case ts.SyntaxKind.VariableDeclaration:
          const varDecl = node as ts.VariableDeclaration;
          if (ts.isIdentifier(varDecl.name)) {
            symbols.push({
              name: varDecl.name.text,
              type: 'variable',
              definitions: [{
                location: {
                  file: sourceFile.fileName,
                  line: ts.getLineAndCharacterOfPosition(sourceFile, varDecl.getStart()).line + 1,
                  column: ts.getLineAndCharacterOfPosition(sourceFile, varDecl.getStart()).character + 1
                },
                snippet: this.getSnippet(sourceFile, varDecl),
                scope: 'module' as SymbolScope,
                modifiers: []
              }],
              references: [],
              relationships: {
                extends: [],
                implements: [],
                uses: [],
                usedBy: [],
                dependencies: []
              },
              metadata: {
                exported: this.isExported(varDecl),
                readonly: ts.isVariableDeclarationList(varDecl.parent) && 
                         !!(varDecl.parent.flags & ts.NodeFlags.Const),
                usageCount: 0
              }
            });
          }
          break;

        case ts.SyntaxKind.InterfaceDeclaration:
          const interfaceDecl = node as ts.InterfaceDeclaration;
          symbols.push({
            name: interfaceDecl.name.text,
            type: 'interface',
            definitions: [{
              location: {
                file: sourceFile.fileName,
                line: ts.getLineAndCharacterOfPosition(sourceFile, interfaceDecl.getStart()).line + 1,
                column: ts.getLineAndCharacterOfPosition(sourceFile, interfaceDecl.getStart()).character + 1
              },
              snippet: this.getSnippet(sourceFile, interfaceDecl),
              scope: 'module' as SymbolScope,
              modifiers: this.getModifiers(interfaceDecl)
            }],
            references: [],
            relationships: {
              extends: interfaceDecl.heritageClauses?.map(clause => 
                clause.types.map(t => t.expression.getText(sourceFile)).join(', ')
              ) || [],
              implements: [],
              uses: [],
              usedBy: [],
              dependencies: []
            },
            metadata: {
              exported: this.isExported(interfaceDecl),
              usageCount: 0
            }
          });
          break;

        case ts.SyntaxKind.TypeAliasDeclaration:
          const typeDecl = node as ts.TypeAliasDeclaration;
          symbols.push({
            name: typeDecl.name.text,
            type: 'type',
            definitions: [{
              location: {
                file: sourceFile.fileName,
                line: ts.getLineAndCharacterOfPosition(sourceFile, typeDecl.getStart()).line + 1,
                column: ts.getLineAndCharacterOfPosition(sourceFile, typeDecl.getStart()).character + 1
              },
              snippet: this.getSnippet(sourceFile, typeDecl),
              scope: 'module' as SymbolScope,
              modifiers: this.getModifiers(typeDecl)
            }],
            references: [],
            relationships: {
              extends: [],
              implements: [],
              uses: [],
              usedBy: [],
              dependencies: []
            },
            metadata: {
              exported: this.isExported(typeDecl),
              description: typeDecl.type.getText(sourceFile),
              usageCount: 0
            }
          });
          break;

        case ts.SyntaxKind.EnumDeclaration:
          const enumDecl = node as ts.EnumDeclaration;
          symbols.push({
            name: enumDecl.name.text,
            type: 'enum',
            definitions: [{
              location: {
                file: sourceFile.fileName,
                line: ts.getLineAndCharacterOfPosition(sourceFile, enumDecl.getStart()).line + 1,
                column: ts.getLineAndCharacterOfPosition(sourceFile, enumDecl.getStart()).character + 1
              },
              snippet: this.getSnippet(sourceFile, enumDecl),
              scope: 'module' as SymbolScope,
              modifiers: this.getModifiers(enumDecl)
            }],
            references: [],
            relationships: {
              extends: [],
              implements: [],
              uses: [],
              usedBy: [],
              dependencies: []
            },
            metadata: {
              exported: this.isExported(enumDecl),
              usageCount: 0
            }
          });
          break;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return symbols;
  }

  /**
   * Find symbol references throughout the codebase
   */
  private async findSymbolReferences(sourceFile: ts.SourceFile): Promise<Map<string, SymbolReference[]>> {
    const references = new Map<string, SymbolReference[]>();

    if (!this.program || !this.checker) {
      return references;
    }

    const visit = (node: ts.Node) => {
      // Look for identifier references
      if (ts.isIdentifier(node)) {
        const symbol = this.checker!.getSymbolAtLocation(node);
        if (symbol) {
          const symbolName = symbol.getName();
          const location = {
            file: sourceFile.fileName,
            line: ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()).line + 1,
            column: ts.getLineAndCharacterOfPosition(sourceFile, node.getStart()).character + 1
          };

          const referenceType = this.determineReferenceType(node);
          
          if (!references.has(symbolName)) {
            references.set(symbolName, []);
          }

          references.get(symbolName)!.push({
            location,
            context: referenceType,
            snippet: this.getContext(node)
          });
        }
      }

      // Look for property access expressions
      if (ts.isPropertyAccessExpression(node)) {
        const propertyName = node.name.text;
        const location = {
          file: sourceFile.fileName,
          line: ts.getLineAndCharacterOfPosition(sourceFile, node.name.getStart()).line + 1,
          column: ts.getLineAndCharacterOfPosition(sourceFile, node.name.getStart()).character + 1
        };

        if (!references.has(propertyName)) {
          references.set(propertyName, []);
        }

        references.get(propertyName)!.push({
          location,
          context: 'call' as ReferenceContext,
          snippet: this.getContext(node)
        });
      }

      // Look for call expressions
      if (ts.isCallExpression(node)) {
        let functionName: string | undefined;

        if (ts.isIdentifier(node.expression)) {
          functionName = node.expression.text;
        } else if (ts.isPropertyAccessExpression(node.expression)) {
          functionName = node.expression.name.text;
        }

        if (functionName) {
          const location = {
            file: sourceFile.fileName,
            line: ts.getLineAndCharacterOfPosition(sourceFile, node.expression.getStart()).line + 1,
            column: ts.getLineAndCharacterOfPosition(sourceFile, node.expression.getStart()).character + 1
          };

          if (!references.has(functionName)) {
            references.set(functionName, []);
          }

          references.get(functionName)!.push({
            location,
            context: 'call' as ReferenceContext,
            snippet: this.getContext(node)
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return references;
  }

  /**
   * Fallback regex-based analysis for when TypeScript AST is not available
   */
  private async analyzeFileWithRegex(filePath: string): Promise<{
    symbols: SymbolInfo[];
    references: Map<string, SymbolReference[]>;
  }> {
    const result = {
      symbols: [] as SymbolInfo[],
      references: new Map<string, SymbolReference[]>()
    };

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      // Extract symbols using regex patterns
      result.symbols = this.extractSymbolsWithRegex(content, filePath);

      // Find references using regex patterns
      result.references = this.findReferencesWithRegex(content, filePath, lines);

      return result;
    } catch (error) {
      console.warn(`Failed to analyze ${filePath} with regex: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Extract symbols using regex patterns
   */
  private extractSymbolsWithRegex(content: string, filePath: string): SymbolInfo[] {
    const symbols: SymbolInfo[] = [];

    // Class declarations
    const classRegex = /class\s+(\w+)(?:\s+extends\s+(\w+))?/g;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: match[1],
        type: 'class',
        definitions: [{
          location: {
            file: filePath,
            line: lineNumber,
            column: match.index - content.lastIndexOf('\n', match.index)
          },
          snippet: this.getSnippetFromContent(content, match.index),
          scope: 'module' as SymbolScope,
          modifiers: []
        }],
        references: [],
        relationships: {
          extends: match[2] ? [match[2]] : [],
          implements: [],
          uses: [],
          usedBy: [],
          dependencies: []
        },
        metadata: {
          exported: content.includes(`export class ${match[1]}`),
          usageCount: 0
        }
      });
    }

    // Function declarations
    const funcRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)\s*=>|function))/g;
    while ((match = funcRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: funcName,
        type: 'function',
        definitions: [{
          location: {
            file: filePath,
            line: lineNumber,
            column: match.index - content.lastIndexOf('\n', match.index)
          },
          snippet: this.getSnippetFromContent(content, match.index),
          scope: 'module' as SymbolScope,
          modifiers: []
        }],
        references: [],
        relationships: {
          extends: [],
          implements: [],
          uses: [],
          usedBy: [],
          dependencies: []
        },
        metadata: {
          exported: content.includes(`export `) && content.includes(funcName),
          async: content.includes('async '),
          usageCount: 0
        }
      });
    }

    // Interface declarations
    const interfaceRegex = /interface\s+(\w+)/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: match[1],
        type: 'interface',
        definitions: [{
          location: {
            file: filePath,
            line: lineNumber,
            column: match.index - content.lastIndexOf('\n', match.index)
          },
          snippet: this.getSnippetFromContent(content, match.index),
          scope: 'module' as SymbolScope,
          modifiers: []
        }],
        references: [],
        relationships: {
          extends: [],
          implements: [],
          uses: [],
          usedBy: [],
          dependencies: []
        },
        metadata: {
          exported: content.includes(`export interface ${match[1]}`),
          usageCount: 0
        }
      });
    }

    // Type declarations
    const typeRegex = /type\s+(\w+)\s*=/g;
    while ((match = typeRegex.exec(content)) !== null) {
      const lineNumber = content.substring(0, match.index).split('\n').length;
      symbols.push({
        name: match[1],
        type: 'type',
        definitions: [{
          location: {
            file: filePath,
            line: lineNumber,
            column: match.index - content.lastIndexOf('\n', match.index)
          },
          snippet: this.getSnippetFromContent(content, match.index),
          scope: 'module' as SymbolScope,
          modifiers: []
        }],
        references: [],
        relationships: {
          extends: [],
          implements: [],
          uses: [],
          usedBy: [],
          dependencies: []
        },
        metadata: {
          exported: content.includes(`export type ${match[1]}`),
          usageCount: 0
        }
      });
    }

    return symbols;
  }

  /**
   * Find references using regex patterns
   */
  private findReferencesWithRegex(content: string, filePath: string, lines: string[]): Map<string, SymbolReference[]> {
    const references = new Map<string, SymbolReference[]>();

    // Find all identifier usages
    const identifierRegex = /\b([A-Za-z_$][\w$]*)\b/g;
    let match;
    while ((match = identifierRegex.exec(content)) !== null) {
      const identifier = match[1];
      
      // Skip keywords and common short names
      if (this.isKeywordOrCommon(identifier)) {
        continue;
      }

      const lineNumber = content.substring(0, match.index).split('\n').length;
      const lineContent = lines[lineNumber - 1] || '';
      const column = match.index - content.lastIndexOf('\n', match.index);

      const referenceType = this.determineReferenceTypeFromContext(lineContent, identifier);

      if (!references.has(identifier)) {
        references.set(identifier, []);
      }

      references.get(identifier)!.push({
        location: {
          file: filePath,
          line: lineNumber,
          column
        },
        context: referenceType,
        snippet: lineContent.trim()
      });
    }

    return references;
  }

  /**
   * Helper methods
   */
  private findTsConfig(rootPath: string): string | null {
    const tsconfigPath = path.join(rootPath, 'tsconfig.json');
    return fs.existsSync(tsconfigPath) ? tsconfigPath : null;
  }

  private async findSourceFiles(rootPath: string): Promise<string[]> {
    const files: string[] = [];
    
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          // Skip node_modules and other excluded directories
          if (!['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
            await walk(fullPath);
          }
        } else if (entry.isFile()) {
          // Include TypeScript and JavaScript files
          if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
            files.push(fullPath);
          }
        }
      }
    };

    await walk(rootPath);
    return files;
  }

  private getSnippet(sourceFile: ts.SourceFile, node: ts.Node): string {
    const start = node.getStart();
    const end = node.getEnd();
    const lines = sourceFile.getText().substring(start, end).split('\n');
    return lines.slice(0, 3).join('\n'); // First 3 lines
  }

  private getSnippetFromContent(content: string, index: number): string {
    const lines = content.split('\n');
    const lineNumber = content.substring(0, index).split('\n').length - 1;
    return lines.slice(lineNumber, lineNumber + 3).join('\n');
  }

  private getModifiers(node: ts.Declaration): string[] {
    const modifiers: string[] = [];
    if (ts.canHaveModifiers(node)) {
      const nodeModifiers = ts.getModifiers(node);
      if (nodeModifiers) {
        for (const modifier of nodeModifiers) {
          modifiers.push(ts.SyntaxKind[modifier.kind].toLowerCase());
        }
      }
    }
    return modifiers;
  }

  private hasModifier(node: ts.Declaration, kind: ts.SyntaxKind): boolean {
    if (ts.canHaveModifiers(node)) {
      const modifiers = ts.getModifiers(node);
      return modifiers?.some(m => m.kind === kind) || false;
    }
    return false;
  }

  private isExported(node: ts.Declaration): boolean {
    return this.hasModifier(node, ts.SyntaxKind.ExportKeyword);
  }

  private getExtendedClass(classDecl: ts.ClassDeclaration): string | undefined {
    const heritageClause = classDecl.heritageClauses?.find(
      clause => clause.token === ts.SyntaxKind.ExtendsKeyword
    );
    return heritageClause?.types[0]?.expression.getText();
  }

  private determineReferenceType(node: ts.Node): ReferenceContext {
    const parent = node.parent;
    
    if (ts.isCallExpression(parent) && parent.expression === node) {
      return 'call';
    }
    if (ts.isImportSpecifier(parent) || ts.isImportClause(parent)) {
      return 'import';
    }
    if (ts.isHeritageClause(parent)) {
      return parent.token === ts.SyntaxKind.ExtendsKeyword ? 'extends' : 'implements';
    }
    if (ts.isNewExpression(parent)) {
      return 'instantiation';
    }
    if (ts.isTypeReferenceNode(parent)) {
      return 'type';
    }
    
    return 'call'; // Default fallback
  }

  private determineReferenceTypeFromContext(lineContent: string, identifier: string): ReferenceContext {
    if (lineContent.includes(`import`) && lineContent.includes(identifier)) {
      return 'import';
    }
    if (lineContent.includes(`extends ${identifier}`) || lineContent.includes(`extends ${identifier}`)) {
      return 'extends';
    }
    if (lineContent.includes(`implements ${identifier}`)) {
      return 'implements';
    }
    if (lineContent.includes(`${identifier}(`)) {
      return 'call';
    }
    if (lineContent.includes(`new ${identifier}`)) {
      return 'instantiation';
    }
    if (lineContent.includes(`: ${identifier}`) || lineContent.includes(`<${identifier}>`)) {
      return 'type';
    }
    if (lineContent.includes(`= ${identifier}`) || lineContent.includes(`${identifier} =`)) {
      return 'assignment';
    }
    
    return 'call'; // Default fallback
  }

  private getContext(node: ts.Node): string {
    // Get the surrounding context for the reference
    const sourceFile = node.getSourceFile();
    const start = Math.max(0, node.getStart() - 50);
    const end = Math.min(sourceFile.getEnd(), node.getEnd() + 50);
    return sourceFile.getText().substring(start, end).replace(/\s+/g, ' ').trim();
  }

  private isKeywordOrCommon(identifier: string): boolean {
    const keywords = [
      'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum',
      'import', 'export', 'default', 'from', 'as', 'extends', 'implements',
      'public', 'private', 'protected', 'static', 'async', 'await',
      'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
      'return', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super',
      'true', 'false', 'null', 'undefined', 'void', 'never', 'any', 'unknown',
      'string', 'number', 'boolean', 'object', 'symbol', 'bigint'
    ];
    
    const commonShort = ['i', 'j', 'k', 'x', 'y', 'z', 'a', 'b', 'c', 'e', 'n', 'm'];
    
    return keywords.includes(identifier) || 
           commonShort.includes(identifier) ||
           identifier.length === 1;
  }
}
