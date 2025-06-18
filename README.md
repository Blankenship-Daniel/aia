# AIA - AI Agentic Assistant

An intelligent, context-aware CLI tool that combines command execution with AI assistance, memory, and adaptive intelligence.

## Features

🤖 **AI-Powered**: Integrates with OpenAI GPT and Anthropic Claude models  
🧠 **Memory**: Remembers conversations, commands, and context across sessions  
📍 **Context-Aware**: Understands your current working directory, project type, and environment  
🎯 **Model Selection**: Automatically selects the best AI model for your request  
💬 **Interactive**: Ask questions in natural language and get intelligent responses  
⚡ **Command Execution**: Execute terminal commands with AI guidance  
🔧 **Configurable**: Easy setup with API keys and preferences  
⚡ **Auto-Optimization**: Automatically applies performance optimizations to commands  
🔗 **Shell Support**: Full support for pipes, redirects, and complex shell operations

## Prerequisites

- Node.js (v14 or higher)
- OpenAI API Key (optional, for GPT models)
- Anthropic API Key (optional, for Claude models)

## Installation

1. **Clone and setup:**

   ```bash
   git clone <repository-url>
   cd aia
   npm install
   npm link  # Make 'aia' command globally available
   ```

2. **Configure API Keys:**
   ```bash
   aia config
   ```

## Usage

### Interactive Mode

Start AIA in interactive mode:

```bash
aia
```

**Enhanced Interactive Features:**

- **Direct Command Execution**: Use prefixes to execute shell commands directly

  - `!ls` - Execute ls command directly
  - `$pwd` - Execute pwd command directly
  - `>git status` - Execute git status directly

- **Execution Modes**: Switch between different input handling modes

  - `:exec` - Command execution mode (all inputs executed as shell commands)
  - `:ai` - AI prompt mode (all inputs sent to AI)
  - `:auto` - Auto-detection mode (smart detection of commands vs prompts)

- **Smart Detection**: In auto mode, AIA detects if input looks like a shell command and asks for confirmation

- **Enhanced Help**: Use `:help` for interactive mode help, or `help` for CLI command help

- **Mode Indicators**: The prompt shows current mode: `[auto]`, `[cmd]`, or `[ai]`

### Ask Questions

```bash
aia ask "How do I list all files in this directory?"
aia q "What's the best way to optimize this Node.js project?"
```

### Execute Commands

```bash
aia exec ls -la
aia x git status
```

### View Context

```bash
aia context  # See current environment context
```

### Memory Management

```bash
aia memory        # View memory summary
aia clear-memory  # Clear all stored memory
```

### Configuration

```bash
aia config  # Configure API keys and preferences
```

**Auto-Execute Configuration:**

AIA supports automatic command execution to streamline workflows and testing:

```bash
# Enable automatic command execution (no confirmation prompts)
aia config --set autoExecute=true

# Disable automatic command execution (show confirmation prompts)
aia config --set autoExecute=false

# Check current setting
aia config --get autoExecute
```

When `autoExecute` is enabled:

- Agentic reasoning automatically executes suggested commands
- No user confirmation prompts are shown
- Ideal for automated workflows and testing
- Commands are still validated for safety

When `autoExecute` is disabled (default):

- User is prompted to confirm each command execution
- Interactive "Y/N" prompts for safety
- Manual control over all command execution

## Context Awareness

AIA automatically gathers context about your environment:

- **Working Directory**: Current location in filesystem
- **Project Type**: Detects package.json, requirements.txt, etc.
- **Git Status**: Current repository state
- **Platform**: Operating system and architecture
- **Shell**: Current shell environment
- **Command History**: Recent commands executed

## Memory System

AIA maintains persistent memory including:

- **Conversations**: Your questions and AI responses
- **Commands**: Recently executed commands with timestamps
- **Preferences**: Your configuration and model preferences
- **Context History**: Working directories and project contexts

Memory is stored in `~/.aia/` and persists across sessions.

## AI Model Selection

AIA intelligently selects the best model based on your request:

- **Code/Programming**: Prefers GPT-4 for code generation and debugging
- **Analysis/Research**: Prefers Claude for in-depth analysis
- **General**: Uses your configured preferred model

## Automatic Command Optimization

AIA includes intelligent command optimization that automatically enhances performance:

```bash
# When you run:
aia exec "find . -name '*.js' -type f"

# AIA automatically optimizes to:
💡 Optimization applied: find . -name '*.js' -type f | head -20
Reason: Performance optimization available
✨ Using optimized command automatically
```

**Optimization Features:**

- **Performance Enhancement**: Limits output for large result sets
- **Safety Improvements**: Adds safeguards for potentially destructive commands
- **Context-Aware**: Optimizations consider your current environment and project type
- **Automatic Application**: No user prompts - optimizations are applied seamlessly

## Examples

### Getting Help with Git

```bash
aia ask "I want to create a new branch and switch to it"
# AI suggests: git checkout -b new-branch-name
# Option to execute the suggested command
```

### Project Analysis

```bash
aia ask "Analyze this project and suggest improvements"
# AI examines package.json, git status, and provides insights
```

### Command Assistance

```bash
aia ask "How do I find large files in this directory?"
# AI suggests appropriate find/du commands for macOS
```

### Memory Recall

```bash
aia ask "What was that command I used yesterday to check disk usage?"
# AI recalls from command history and provides the answer
```

### Agentic Problem Solving

```bash
aia agent "optimize this React app for production"
# System will:
# 1. Analyze project structure and dependencies
# 2. Generate optimization plan (code splitting, minification, etc.)
# 3. Execute optimization steps with confirmation
# 4. Verify results and iterate if needed

aia agent "set up automated testing" --auto-execute
# System automatically:
# 1. Detects project type and testing needs
# 2. Installs appropriate testing framework
# 3. Creates sample test files
# 4. Configures test scripts in package.json
```

## Configuration

Configuration is stored in `~/.aia/config.json`:

```json
{
  "preferredModel": "gpt-4",
  "openaiApiKey": "your-openai-key",
  "anthropicApiKey": "your-anthropic-key",
  "autoExecute": false
}
```

## Agentic Reasoning

AIA includes a powerful agentic reasoning system that can break down complex goals into actionable steps, iterate on solutions, and execute multi-step plans automatically or with user confirmation.

### Key Features

🧠 **Goal Decomposition**: Automatically breaks down complex goals into manageable steps  
🔄 **Iterative Problem Solving**: Learns from execution results and adapts plans  
🔍 **Enhanced Context Awareness**: Gathers relevant information from memory, project structure, and environment  
🎯 **Multi-step Execution**: Executes sequences of commands to achieve goals  
⚡ **Auto-execution Mode**: Optionally executes suggested commands automatically  
🛡️ **Safety Validation**: Analyzes commands for potential risks before execution  
🔧 **Error Recovery**: Automatically attempts to recover from failed steps  
📊 **Learning System**: Learns from execution history and applies insights to future plans  
🎯 **Historical Pattern Analysis**: Uses past successes and failures to inform new strategies  
✅ **Output Validation**: Verifies that executed steps achieve their intended outcomes

### Advanced Capabilities

**Error Recovery & Learning**: The system automatically detects failures, analyzes the cause, and attempts recovery strategies. It learns from these experiences to avoid similar issues in future executions.

**Historical Analysis**: Before creating a plan, the system analyzes similar past goals to identify successful strategies, common pitfalls, and recommended commands.

**Context-Aware Planning**: Plans are generated based on comprehensive context including:

- Current project structure and dependencies
- Past conversation and command history
- System environment and capabilities
- Git repository status and recent changes
- Available tools and resources

**Iterative Refinement**: If initial attempts fail, the system refines its approach based on what was learned, creating improved plans for subsequent iterations.
⚡ **Auto-execution Mode**: Optionally executes suggested commands automatically
🛡️ **Safety Validation**: Analyzes commands for potential risks before execution

### Using Agentic Mode

```bash
# Basic agentic reasoning
aia agent "optimize this Node.js project for production"

# With auto-execution enabled
aia agent "set up a CI/CD pipeline for this project" --auto-execute

# With custom iteration limits
aia agent "debug the failing tests" --max-iterations 3

# Disable iterative reasoning for simple goals
aia agent "list all JavaScript files" --no-iteration
```

### Advanced Usage Examples

#### Complex Analysis Tasks

```bash
# Analyze code quality across the project
aia agent "analyze error handling patterns in all JavaScript files and create a report"

# The system will:
# 1. Find all JavaScript files
# 2. Analyze each file for error handling patterns
# 3. Generate a comprehensive report
# 4. Suggest improvements based on findings
```

#### Multi-step Development Tasks

```bash
# Set up a complete testing environment
aia agent "create a comprehensive test suite for this Node.js project" --auto-execute

# The system will:
# 1. Analyze project structure and dependencies
# 2. Install appropriate testing frameworks
# 3. Create test files with proper structure
# 4. Configure test scripts and CI integration
# 5. Run initial tests to verify setup
```

#### Error Recovery Demonstration

```bash
# Example of automatic error recovery
aia agent "find all TODO comments and create a task list file"

# If the first approach fails (e.g., grep command issues):
# 1. System detects the failure
# 2. Analyzes the error and context
# 3. Generates alternative approaches
# 4. Executes recovery strategy
# 5. Validates the recovery was successful
```

### Execution Modes and Options

```bash
# Basic agentic reasoning
aia agent "optimize this Node.js project for production"

# With auto-execution enabled (no confirmation prompts)
aia agent "set up a CI/CD pipeline for this project" --auto-execute

# With custom iteration limits
aia agent "debug the failing tests" --max-iterations 3

# Disable iterative reasoning for simple goals
aia agent "list all JavaScript files" --no-iteration
```

### Agentic Command Options

| Option             | Description                             | Default |
| ------------------ | --------------------------------------- | ------- |
| `--auto-execute`   | Execute commands without confirmation   | `false` |
| `--max-iterations` | Maximum number of refinement iterations | `5`     |
| `--no-iteration`   | Disable iterative refinement            | `false` |

### Interactive Mode Agentic Features

In interactive mode, you can also use agentic features:

```bash
aia
> :agent optimize this project for better performance
> :agent set up testing framework --auto-execute
> :agent create documentation for the main functions
```

The system will:

1. **Analyze** your goal and gather relevant context from memory, project structure, and environment
2. **Plan** a multi-step approach with specific, executable commands
3. **Execute** each step (with or without confirmation based on settings)
4. **Validate** that each step achieved its intended outcome
5. **Recover** from any failures using learned strategies
6. **Learn** from the execution to improve future performance
7. **Iterate** if initial attempts don't fully achieve the goal
8. **Summarize** achievements and provide insights for future reference

### Learning and Adaptation

The agentic reasoning system continuously learns from execution history:

- **Success Patterns**: Remembers what strategies work for similar goals
- **Failure Recovery**: Builds a knowledge base of successful error recovery techniques
- **Command Optimization**: Learns which commands are most effective in different contexts
- **Environmental Adaptation**: Adapts strategies based on project type, platform, and available tools

### Best Practices for Agentic Goals

✅ **Good Goals:**

- "Create a test file that validates the main functionality"
- "Find and fix linting errors in the codebase"
- "Set up automated deployment for this project"
- "Analyze dependencies and suggest updates"

❌ **Avoid:**

- Vague goals: "Make the code better"
- Goals requiring human judgment: "Choose the best color scheme"
- Goals requiring external accounts: "Deploy to my personal AWS"
