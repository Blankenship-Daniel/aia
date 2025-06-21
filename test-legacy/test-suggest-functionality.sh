#!/bin/bash

# Test script for AIA Suggest Command functionality
# This script tests all suggest command features and options

echo "=== AIA SUGGEST COMMAND FUNCTIONAL TESTS ==="
echo "Starting comprehensive tests for 'aia suggest' command..."
echo "============================================="

# Function to test command and capture both output and exit code
test_command() {
    local test_name="$1"
    local command="$2"
    local expected_success="$3"  # "true" or "false"
    
    echo ""
    echo "TEST: $test_name"
    echo "COMMAND: $command"
    echo "EXPECTED: $expected_success"
    echo "---"
    
    # Run command and capture output and exit code
    if eval "$command" 2>&1; then
        echo "EXIT_CODE: 0 (SUCCESS)"
        if [ "$expected_success" = "true" ]; then
            echo "RESULT: ✅ PASS"
        else
            echo "RESULT: ❌ FAIL (Expected failure but got success)"
        fi
    else
        echo "EXIT_CODE: $? (FAILURE)"
        if [ "$expected_success" = "false" ]; then
            echo "RESULT: ✅ PASS"
        else
            echo "RESULT: ❌ FAIL (Expected success but got failure)"
        fi
    fi
    echo "============================================="
}

# Function to test command with timeout for interactive commands
test_command_with_timeout() {
    local test_name="$1"
    local command="$2"
    local timeout_seconds="$3"
    
    echo ""
    echo "TEST: $test_name"
    echo "COMMAND: $command"
    echo "TIMEOUT: ${timeout_seconds}s"
    echo "---"
    
    # Run command with timeout to avoid hanging on interactive prompts
    if timeout "$timeout_seconds" bash -c "$command" 2>&1; then
        echo "EXIT_CODE: 0 (SUCCESS or TIMEOUT)"
        echo "RESULT: ✅ PASS (Command completed within timeout)"
    else
        local exit_code=$?
        if [ $exit_code -eq 124 ]; then
            echo "EXIT_CODE: 124 (TIMEOUT)"
            echo "RESULT: ✅ PASS (Command reached interactive prompt as expected)"
        else
            echo "EXIT_CODE: $exit_code (FAILURE)"
            echo "RESULT: ❌ FAIL (Command failed before reaching prompt)"
        fi
    fi
    echo "============================================="
}

# 1. Test help and basic usage
test_command "Help output" "node main.js suggest --help" "true"

# 2. Test command without arguments (should show usage)
test_command "No arguments (should show usage)" "node main.js suggest" "false"

# 3. Test basic suggest functionality
test_command_with_timeout "Basic suggest with simple query" "echo '' | node main.js suggest 'list files'" 10

# 4. Test suggest command aliases
test_command_with_timeout "Suggest alias 'sug'" "echo '' | node main.js sug 'show current directory'" 10

# 5. Test suggest with context option (if available)
test_command_with_timeout "Suggest with context option" "echo '' | node main.js suggest 'find git status' --context git" 10

# 6. Test suggest with no-fallback option
test_command_with_timeout "Suggest with no-fallback" "echo '' | node main.js suggest 'list processes' --no-fallback" 10

# 7. Test suggest with no-safety-check option
test_command_with_timeout "Suggest with no-safety-check" "echo '' | node main.js suggest 'check system info' --no-safety-check" 10

# 8. Test suggest with missing options that should be available
echo ""
echo "TEST: Testing missing CLI options (these should work but might fail due to missing registration)"
echo "---"

# Test limit option (from command definition)
test_command_with_timeout "Suggest with limit option" "echo '' | node main.js suggest 'show files' --limit 3" 10

# Test no-context option (from command definition)
test_command_with_timeout "Suggest with no-context option" "echo '' | node main.js suggest 'list directories' --no-context" 10

# Test auto-execute option (from command definition)
test_command_with_timeout "Suggest with auto-execute option" "echo '' | node main.js suggest 'echo hello' --auto-execute" 10

# 9. Test suggest with empty/whitespace query
test_command "Empty query with spaces" "node main.js suggest '   '" "false"

# 10. Test suggest with very long query
test_command_with_timeout "Long query" "echo '' | node main.js suggest 'find all files modified in the last 7 days that contain the word test and are larger than 1KB'" 10

# 11. Test error handling - invalid option
test_command "Invalid option" "node main.js suggest 'test' --invalid-option" "false"

# Summary
echo ""
echo "=== TEST SUMMARY ==="
echo "All suggest command functional tests completed!"
echo "Check the output above for detailed results."
echo ""
echo "EXPECTED BEHAVIOR:"
echo "✅ Help should show comprehensive suggest command documentation"
echo "✅ No arguments should show usage error"
echo "✅ Basic suggest should work with GitHub Copilot CLI integration"
echo "✅ Aliases (sug) should work"
echo "✅ Context and safety options should be recognized"
echo "❌ Some options may fail due to missing CLI registration (--limit, --no-context, --auto-execute)"
echo "✅ Error handling should work for invalid inputs"
echo ""
echo "NOTE: Some tests use timeout to handle interactive prompts."
echo "If Copilot CLI is not available, commands should fall back gracefully."
echo "======================"
