#!/bin/bash

# Script to fix chalk imports across all TypeScript files

echo "Fixing chalk imports in all TypeScript files..."

# Find all TypeScript files that import chalk
grep -r "import chalk from 'chalk'" src/ --include="*.ts" -l | while read file; do
    echo "Fixing $file..."
    
    # Replace the chalk import with the new pattern
    sed -i.bak "s/import chalk from 'chalk';/\/\/ @ts-ignore - chalk may not have types available\nconst { Chalk } = require('chalk');\n\/\/ Instantiate Chalk for color methods in CommonJS context\nconst chalk = new Chalk({ level: 3 });/" "$file"
    
    # Remove backup file
    rm "$file.bak" 2>/dev/null || true
done

echo "Done fixing chalk imports!"
