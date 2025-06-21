"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ts = require("typescript");
var fs = require("fs");
var path = require("path");
function findTypeScriptFiles(dir) {
    var files = [];
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var entry = entries_1[_i];
        if (entry.name === 'node_modules')
            continue;
        var fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push.apply(files, findTypeScriptFiles(fullPath));
        }
        else if (entry.name.endsWith('.ts')) {
            files.push(fullPath);
        }
    }
    return files;
}
function extractClasses(filePath) {
    var content = fs.readFileSync(filePath, 'utf-8');
    var sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    var classes = [];
    function visit(node) {
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
var files = findTypeScriptFiles('.');
var allClasses = [];
files.forEach(function (file) {
    try {
        var classes = extractClasses(file);
        allClasses.push.apply(allClasses, classes);
    }
    catch (error) {
        console.error("Error processing ".concat(file, ":"), error);
    }
});
var markdown = ['# TypeScript Classes Summary\n'];
allClasses.forEach(function (c) {
    markdown.push("## ".concat(c.name, "\n"));
    markdown.push("File: `".concat(c.file, "`\n"));
    markdown.push('---\n');
});
fs.writeFileSync('classes-summary.md', markdown.join('\n'));
