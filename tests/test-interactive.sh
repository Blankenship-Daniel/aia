#!/bin/bash

# Test script for AIA interactive mode functionality
echo "Testing AIA Interactive Mode Command Execution"
echo "============================================="

# Test direct command execution with prefixes
echo "Testing direct command execution with prefixes..."

# Create a temporary expect script to simulate interactive input
cat > /tmp/aia_test.exp << 'EOF'
#!/usr/bin/expect -f

set timeout 10
spawn node index.js

# Wait for the prompt
expect "aia>"

# Test help command
send "help\r"
expect "aia>"

# Test direct command execution with ! prefix
send "!pwd\r"
expect "aia>"

# Test direct command execution with $ prefix
send "\$ls -la | head -5\r"
expect "aia>"

# Test mode switching to command mode
send ":exec\r"
expect "aia>"

# Test command in exec mode
send "echo 'Hello from exec mode'\r"
expect "aia>"

# Test switching back to auto mode
send ":auto\r"
expect "aia>"

# Test AI query
send "what is 2+2?\r"
expect "aia>"

# Exit
send "exit\r"
expect eof
EOF

# Run the expect script
if command -v expect >/dev/null 2>&1; then
    echo "Running interactive test with expect..."
    chmod +x /tmp/aia_test.exp
    /tmp/aia_test.exp
    rm -f /tmp/aia_test.exp
else
    echo "expect not available, testing manually..."
    
    # Test basic functionality without expect
    echo "Testing basic command execution..."
    echo "!pwd" | node index.js &
    sleep 2
    pkill -f "node.*index.js" || true
    
    echo "Test completed"
fi
