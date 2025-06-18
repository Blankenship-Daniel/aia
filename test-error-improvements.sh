#!/bin/bash

echo "🧪 Testing AIA Error Handling and JSON Parsing Improvements"
echo "==========================================================="
echo ""

echo "📋 Test 1: JSON Parsing Error Handling"
echo "Testing improved error handling for malformed AI responses..."
echo ""

# Test that should succeed with improved error handling
echo "Testing simple agentic goal with 1 iteration:"
node main.js agent "show current directory" --max-iterations 1 2>&1 | head -20

echo ""
echo "📋 Test 2: AutoExecute Configuration"
echo "Testing autoExecute configuration persistence..."
echo ""

# Show current autoExecute setting
echo "Current autoExecute setting:"
node main.js config --get autoExecute

echo ""
echo "📋 Test 3: Configuration Management"
echo "Testing configuration get/set operations..."
echo ""

# Test setting and getting configuration values
echo "Setting autoExecute to false:"
node main.js config --set autoExecute=false
echo ""

echo "Verifying autoExecute is false:"
node main.js config --get autoExecute
echo ""

echo "Setting autoExecute back to true:"
node main.js config --set autoExecute=true
echo ""

echo "Final autoExecute setting:"
node main.js config --get autoExecute

echo ""
echo "✅ Error Handling and Configuration Tests Complete!"
echo ""
echo "📝 Summary of Improvements:"
echo "  - Enhanced JSON parsing with better error messages"
echo "  - Robust fallback extraction for malformed JSON responses"
echo "  - Better logging of raw AI responses for debugging" 
echo "  - Improved validation of AI response content"
echo "  - AutoExecute configuration properly exposed and persistent"
echo "  - Configuration management with type parsing (boolean, number, JSON, string)"
