#!/bin/bash

# Wrapper script to suppress Node.js deprecation warnings
export NODE_NO_WARNINGS=1
export NODE_OPTIONS="--no-warnings"

# Execute the actual Node.js script with suppressed warnings
node /Users/d0b01r1/Documents/code/aia/index.js "$@"
