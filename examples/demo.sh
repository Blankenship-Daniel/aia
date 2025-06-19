#!/bin/bash

echo "🤖 AIA CLI Tool Demonstration"
echo "============================="
echo

echo "1. Showing context awareness:"
aia context
echo

echo "2. Executing a simple command:"
aia exec ls -- -la
echo

echo "3. Checking memory after command execution:"
aia memory
echo

echo "4. Trying to ask AI (will fail without API key configured):"
echo "Note: To actually use AI features, run 'aia config' and add your API keys"
echo

echo "✅ AIA CLI tool is working correctly!"
echo "📋 Next steps:"
echo "  - Run 'aia config' to configure API keys"
echo "  - Use 'aia ask' to ask AI questions"
echo "  - Use 'aia' for interactive mode"
