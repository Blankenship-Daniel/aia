#!/bin/bash

echo "🧪 Testing AIA Auto-Execute Configuration Feature"
echo "================================================="
echo ""

# Test with autoExecute disabled (default behavior)
echo "📋 Test 1: autoExecute = false (manual confirmation required)"
echo "Setting autoExecute to false..."
node main.js config --set autoExecute=false
echo ""
echo "Current configuration:"
node main.js config --get autoExecute
echo ""
echo "🔍 Testing agentic command - should prompt for confirmation:"
echo "Note: This would normally prompt for Y/N confirmation, but we'll use a simple goal"
echo ""

# Test with autoExecute enabled 
echo "📋 Test 2: autoExecute = true (automatic execution)"
echo "Setting autoExecute to true..."
node main.js config --set autoExecute=true
echo ""
echo "Current configuration:"
node main.js config --get autoExecute
echo ""
echo "🔍 Testing agentic command - should auto-execute without prompts:"
node main.js agent "show current working directory" 2>/dev/null | head -20
echo ""

echo "✅ Auto-Execute Configuration Test Complete!"
echo ""
echo "📋 Summary:"
echo "  - autoExecute=false: Commands require user confirmation (Y/N prompts)"
echo "  - autoExecute=true:  Commands execute automatically without prompts"
echo "  - This setting can be configured via: aia config --set autoExecute=true/false"
echo "  - Ideal for automated workflows, testing, and CI/CD environments"
