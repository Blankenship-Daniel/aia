const {
  CodeHighlightService,
} = require('./dist/services/CodeHighlightService');

/**
 * Test script to demonstrate code highlighting functionality
 */
async function testCodeHighlighting() {
  console.log('🎨 Testing Code Highlighting Service\n');

  const highlighter = new CodeHighlightService();

  // Test JavaScript highlighting
  console.log('1. JavaScript Code:');
  const jsCode = `
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return "greeting completed";
}

const user = "World";
greet(user);
  `.trim();

  highlighter.displayCodeBlock(jsCode, 'javascript', 'Example Function');

  // Test TypeScript highlighting
  console.log('2. TypeScript Code:');
  const tsCode = `
interface User {
  id: number;
  name: string;
  email?: string;
}

class UserService {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
}
  `.trim();

  highlighter.displayCodeBlock(
    tsCode,
    'typescript',
    'TypeScript Interface & Class'
  );

  // Test JSON highlighting
  console.log('3. JSON Data:');
  const jsonData = `
{
  "name": "AIA CLI",
  "version": "1.0.0",
  "dependencies": {
    "cli-highlight": "^2.1.11",
    "chalk": "^4.1.2"
  },
  "scripts": {
    "build": "tsc",
    "test": "jest"
  }
}
  `.trim();

  highlighter.displayCodeBlock(jsonData, 'json', 'Package Configuration');

  // Test SQL highlighting
  console.log('4. SQL Query:');
  const sqlCode = `
SELECT u.id, u.name, u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name, u.email
ORDER BY order_count DESC
LIMIT 10;
  `.trim();

  highlighter.displayCodeBlock(sqlCode, 'sql', 'User Analytics Query');

  // Test Python highlighting
  console.log('5. Python Code:');
  const pythonCode = `
def calculate_fibonacci(n: int) -> List[int]:
    """Calculate Fibonacci sequence up to n terms."""
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    fib_sequence = [0, 1]
    for i in range(2, n):
        next_fib = fib_sequence[i-1] + fib_sequence[i-2]
        fib_sequence.append(next_fib)
    
    return fib_sequence

# Usage example
fibonacci_numbers = calculate_fibonacci(10)
print(f"First 10 Fibonacci numbers: {fibonacci_numbers}")
  `.trim();

  highlighter.displayCodeBlock(pythonCode, 'python', 'Fibonacci Calculator');

  // Test auto-detection
  console.log('6. Auto-Detection Test:');
  const autoDetectCode = `
const express = require('express');
const app = express();

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
  `.trim();

  const detectedLang = highlighter.detectLanguage(autoDetectCode);
  console.log(`Detected language: ${detectedLang || 'unknown'}`);
  highlighter.displayCodeBlock(autoDetectCode, undefined, 'Auto-Detected Code');

  // Test inline highlighting
  console.log('7. Inline Code Examples:');
  console.log(
    `Install the package: ${highlighter.highlightInline(
      'npm install cli-highlight',
      'bash'
    )}`
  );
  console.log(
    `Import the module: ${highlighter.highlightInline(
      'import { highlight } from "cli-highlight"',
      'javascript'
    )}`
  );
  console.log(
    `Run the command: ${highlighter.highlightInline(
      'node main.js agent "test code highlighting"',
      'bash'
    )}`
  );

  // Test supported languages
  console.log('\n8. Supported Languages:');
  const languages = highlighter.getSupportedLanguages();
  console.log(`Total supported languages: ${languages.length}`);
  console.log('Sample languages:', languages.slice(0, 20).join(', '));

  console.log('\n✅ Code highlighting test completed!');
}

// Run the test
testCodeHighlighting().catch(console.error);
