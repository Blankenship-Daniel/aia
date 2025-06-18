#!/bin/bash

# Simple test of AIA interactive mode features
echo "=== AIA Interactive Mode Test ==="
echo ""

echo "1. Testing direct command execution with ! prefix:"
echo "Command: !pwd"
echo "!pwd" | timeout 3 node index.js 2>/dev/null | tail -5

echo ""
echo "2. Testing direct command execution with \$ prefix:"
echo "Command: \$date"
echo "\$date" | timeout 3 node index.js 2>/dev/null | tail -5

echo ""
echo "3. Testing help command:"
echo "Command: help"
echo "help" | timeout 3 node index.js 2>/dev/null | grep -A 5 "Commands:"

echo ""
echo "4. Testing exit command:"
echo "Command: exit"
echo "exit" | timeout 3 node index.js 2>/dev/null | tail -2

echo ""
echo "=== Interactive Mode Features Test Complete ==="
