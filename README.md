# Command Executor CLI

A simple Node.js command-line tool to execute commands passed as arguments.

## Prerequisites

- Node.js installed on your system.

## Setup

1.  **Make the script executable:**
    Before running the script directly, you need to give it execute permissions.

    ```bash
    chmod +x index.js
    ```

## Usage

Once the script is executable, you can run it from your terminal:

```bash
./index.js <command> [arguments...]
```

-   `<command>`: The command you want to execute (e.g., `ls`, `echo`, `node`).
-   `[arguments...]`: Any arguments for that command (e.g., `-la` for `ls`, `"Hello World"` for `echo`).

### Examples

1.  **List files in the current directory:**

    ```bash
    ./index.js ls -la
    ```

2.  **Echo a message:**

    ```bash
    ./index.js echo "Hello from the CLI!"
    ```

3.  **Check Node.js version:**
    ```bash
    ./index.js node --version
    ```

## How it Works

The `index.js` script uses Node.js's `child_process.spawn` method to execute the provided command. It pipes the standard output (stdout) and standard error (stderr) of the child process to the main process, so you see the command's output directly in your terminal. It also handles basic errors, such as the command not being found or the command exiting with an error code.