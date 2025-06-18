#!/bin/bash

# AIA Agentic Reasoning Test Suite
echo "🧪 Starting AIA Agentic Reasoning Test Suite..."
echo "================================================"

# Test 1: Simple file operation with auto-execute
echo "📝 Test 1: Simple file listing with auto-execute"
echo "Goal: List all JavaScript files in the project"
aia agent "list all JavaScript files in this project" --auto-execute --max-iterations 1

echo ""
echo "⏸️  Press Enter to continue to next test..."
read

# Test 2: Analysis task with iteration
echo "📊 Test 2: Analysis task with error handling"
echo "Goal: Create a simple script to count error handling patterns"
aia agent "create a simple Node.js script that counts try-catch blocks in all JavaScript files" --max-iterations 2

echo ""
echo "⏸️  Press Enter to continue to next test..."
read

# Test 3: Complex multi-step goal
echo "🔧 Test 3: Complex multi-step development task"
echo "Goal: Set up basic project documentation"
aia agent "create a simple API documentation file that lists all the main functions from index.js" --max-iterations 3

echo ""
echo "⏸️  Press Enter to continue to next test..."
read

# Test 4: Error recovery test
echo "🚨 Test 4: Error recovery capabilities"
echo "Goal: Deliberately cause an error and test recovery"
aia agent "run a command that doesn't exist and then recover by listing files instead" --auto-execute --max-iterations 2

echo ""
echo "================================================"
echo "✅ Test suite completed!"
echo ""
echo "Check the execution summaries above to verify:"
echo "  - Plan generation working correctly"
echo "  - Error recovery mechanisms functioning"
echo "  - Learning from execution history"
echo "  - Context-aware planning"
echo "  - Output validation"
