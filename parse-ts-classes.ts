import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';

function findTypeScriptFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTypeScriptFiles(fullPath));
    } else if (entry.name.endsWith('.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

function extractClasses(filePath: string): { name: string; file: string }[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );
  
  const classes: { name: string; file: string }[] = [];
  
  function visit(node: ts.Node) {
    if (ts.isClassDeclaration(node) && node.name) {
      classes.push({
        name: node.name.text,
        file: filePath
      });
    }
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return classes;
}

const files = findTypeScriptFiles('.');
const allClasses: { name: string; file: string }[] = [];

files.forEach(file => {
  try {
    const classes = extractClasses(file);
    allClasses.push(...classes);
  } catch (error) {
    console.error(`Error processing ${file}:`, error);
  }
});

const markdown = ['# TypeScript Classes Summary\n'];

allClasses.forEach(c => {
  markdown.push(`## ${c.name}\n`);
  markdown.push(`File: \`${c.file}\`\n`);
  markdown.push('---\n');
});

fs.writeFileSync('classes-summary.md', markdown.join('\n'));
