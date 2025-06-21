#!/bin/bash

# Context Command Functional Test Script
# Tests all variations and options of the AIA context command

echo "==================================="
echo "🧪 AIA CONTEXT COMMAND FUNCTIONAL TESTS"
echo "==================================="
echo ""

# Navigate to the AIA directory
cd /Users/d0b01r1/Documents/code/aia

echo "📍 Testing basic context command..."
echo "Command: node main.js context"
echo "---"
node main.js context 2>&1 | head -20
echo ""

echo "📍 Testing context command with verbose flag..."
echo "Command: node main.js context --verbose"
echo "---"
node main.js context --verbose 2>&1 | head -25
echo ""

echo "📍 Testing context command with JSON output..."
echo "Command: node main.js context --json"
echo "---"
node main.js context --json 2>&1 | head -15
echo ""

echo "📍 Testing ctx alias..."
echo "Command: node main.js ctx"
echo "---"
node main.js ctx 2>&1 | head -15
echo ""

echo "📍 Testing ctx alias with JSON..."
echo "Command: node main.js ctx --json"
echo "---"
node main.js ctx --json 2>&1 | head -15
echo ""

echo "📍 Testing info alias..."
echo "Command: node main.js info"
echo "---"
node main.js info 2>&1 | head -15
echo ""

echo "📍 Testing info alias with verbose..."
echo "Command: node main.js info --verbose"
echo "---"
node main.js info --verbose 2>&1 | head -20
echo ""

echo "📍 Testing context command help..."
echo "Command: node main.js context --help"
echo "---"
node main.js context --help
echo ""

echo "📍 Testing error handling with invalid option..."
echo "Command: node main.js context --invalid"
echo "---"
node main.js context --invalid 2>&1 | head -10
echo ""

echo "==================================="
echo "✅ CONTEXT COMMAND TESTS COMPLETED"
echo "==================================="
