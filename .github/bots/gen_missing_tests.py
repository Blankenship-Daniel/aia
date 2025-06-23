import os
import sys
import glob
import logging
import subprocess
from datetime import datetime
from typing import List, Dict, Tuple, Optional, Set
from pathlib import Path

import openai
from github import Github, GithubException

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('test-generator-bot')

# Configuration management following AIA patterns
class TestGeneratorConfig:
    """Configuration for test generation bot with validation."""
    
    def __init__(self):
        self.repo_name = os.environ.get("REPO_NAME", "")
        self.pr_number = self._get_pr_number()
        self.pr_branch = os.environ.get("PR_BRANCH", "")
        self.github_token = os.environ.get("GITHUB_TOKEN", "")
        self.openai_api_key = os.environ.get("OPENAI_API_KEY", "")
        
        # Add configuration validation
        self.validate()
    
    def _get_pr_number(self) -> int:
        """Safely get PR number with validation."""
        try:
            return int(os.environ.get("PR_NUMBER", "0"))
        except ValueError:
            raise ValueError("Invalid PR_NUMBER environment variable")
    
    def validate(self):
        """Validate required configuration."""
        required_vars = {
            "REPO_NAME": self.repo_name,
            "PR_NUMBER": self.pr_number,
            "PR_BRANCH": self.pr_branch,
            "GITHUB_TOKEN": self.github_token,
            "OPENAI_API_KEY": self.openai_api_key
        }
        
        missing = [var for var, val in required_vars.items() if not val]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")


# Safe command execution replacing os.system()
def run_command(cmd: List[str], cwd: Optional[str] = None) -> Tuple[bool, str, str]:
    """Run a command safely with proper error handling."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=cwd,
            check=True
        )
        return True, result.stdout, result.stderr
    except subprocess.CalledProcessError as e:
        return False, e.stdout or "", e.stderr or ""
    except Exception as e:
        return False, "", str(e)
# Test file patterns for each language - updated for AIA structure
SOURCE_EXTENSIONS = [".ts", ".js", ".py"]

TEST_PATTERNS = {
    ".ts": [
        "tests/{}.test.ts",           # Primary pattern
        "tests/unit/{}.test.ts",       # Unit tests
        "tests/integration/{}.test.ts" # Integration tests
    ],
    ".js": [
        "tests/{}.test.js",
        "tests/unit/{}.test.js"
    ],
    ".py": ["tests/test_{}.py"],
}

# Exclusion patterns matching AIA's structure
EXCLUDED_PATHS = [
    "tests/",
    ".github/",
    "docs/",
    "node_modules/",
    "dist/",
    "build/",
    "coverage/",
    ".aia/",
    "examples/",
    "scripts/"
]


class GitOperations:
    """Safe git operations handler following AIA patterns."""
    
    @staticmethod
    def configure_git() -> bool:
        """Configure git with bot credentials."""
        commands = [
            ["git", "config", "user.name", "aia-bot"],
            ["git", "config", "user.email", "aia-bot@example.com"]
        ]
        
        for cmd in commands:
            success, _, stderr = run_command(cmd)
            if not success:
                logger.error(f"Failed to configure git: {stderr}")
                return False
        return True
    
    @staticmethod
    def stage_commit_push(files: List[str], branch: str) -> bool:
        """Stage, commit and push files safely."""
        try:
            # Stage files
            success, _, stderr = run_command(["git", "add"] + files)
            if not success:
                logger.error(f"Failed to stage files: {stderr}")
                return False
            
            # Commit
            commit_msg = "test: add AI-generated test stubs for new code"
            success, _, stderr = run_command(
                ["git", "commit", "-m", commit_msg]
            )
            if not success:
                logger.error(f"Failed to commit: {stderr}")
                return False
            
            # Push
            success, _, stderr = run_command(
                ["git", "push", "origin", f"HEAD:{branch}"]
            )
            if not success:
                logger.error(f"Failed to push: {stderr}")
                return False
                
            return True
        except Exception as e:
            logger.error(f"Git operation failed: {e}")
            return False


class TestGenerator:
    """Test generation handler with proper resource management."""
    
    def __init__(self, config: TestGeneratorConfig):
        self.config = config
        self.client = None
    
    def __enter__(self):
        self.client = openai.OpenAI(api_key=self.config.openai_api_key)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Cleanup if needed
        if self.client:
            # Close any open connections
            pass
    
    def generate_test_stub(self, source_code: str, filename: str, ext: str) -> str:
        """Generate test stub following AIA patterns."""
        
        # Add AIA-specific test context for TypeScript
        if ext == ".ts":
            prompt = f"""You are generating tests for the AIA (AI Agentic Assistant) project.

Project context:
- TypeScript CLI tool with sophisticated error handling
- Uses Jest for testing with specific configuration
- Follows interface-driven development
- Has comprehensive mocking patterns in tests/__mocks__/
- Uses dependency injection and service patterns

Generate Jest tests following these patterns:
1. Import statements should use the project's mock utilities where available
2. Use describe/it blocks with clear, descriptive names
3. Include beforeEach/afterEach for setup/teardown
4. Mock external dependencies using Jest mocks
5. Test both success and error scenarios
6. Follow the existing test patterns in the codebase

Source file: {filename}
Code:
{source_code}

Generate comprehensive tests that:
- Test the main functionality
- Include error handling tests
- Mock external dependencies appropriately
- Follow TypeScript best practices
- Include type assertions where needed
"""
        else:
            # Enhanced prompts for other languages
            language_prompt = {
                ".py": "Python unit tests using pytest with proper error handling.",
                ".js": "JavaScript unit tests using Jest with comprehensive coverage.",
            }
            prompt = f"""You are an assistant that writes {language_prompt.get(ext, 'unit tests')}

Write a minimal, but complete test file for the following source code.
Include proper error handling tests and mock external dependencies.
Follow best practices for the testing framework.

Source file: {filename}
Code:
{source_code}
"""
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Failed to generate test stub for {filename}: {e}")
            return f"// Failed to generate test stub: {e}"
    
    def generate_tests_for_files(self, files_missing_tests: List[str]) -> List[str]:
        """Generate tests for all files missing tests."""
        new_tests = []
        
        for src_file in files_missing_tests:
            try:
                ext = os.path.splitext(src_file)[1]
                
                with open(src_file, "r", encoding="utf-8") as f:
                    src_code = f.read()
                
                # Use first pattern for filename
                test_filename = suggest_test_filenames(src_file)[0]
                test_content = self.generate_test_stub(src_code, src_file, ext)
                
                # Create directory if it doesn't exist
                os.makedirs(os.path.dirname(test_filename), exist_ok=True)
                
                with open(test_filename, "w", encoding="utf-8") as tf:
                    tf.write(test_content)
                
                new_tests.append(test_filename)
                logger.info(f"Generated test file: {test_filename}")
                
            except Exception as e:
                logger.error(f"Failed to generate test for {src_file}: {e}")
                continue
        
        return new_tests

def find_source_files() -> List[str]:
    """
    Find all source files that need tests.
    
    Returns:
        List of file paths relative to repository root
    """
    files = []
    for ext in SOURCE_EXTENSIONS:
        pattern_files = glob.glob(f"**/*{ext}", recursive=True)
        # Filter out excluded paths
        filtered_files = [
            f for f in pattern_files 
            if not any(f.startswith(excluded) for excluded in EXCLUDED_PATHS)
        ]
        files.extend(filtered_files)
    return files


def find_test_files() -> List[str]:
    """
    Find all existing test files.
    
    Returns:
        List of test file paths
    """
    test_files = []
    for ext in SOURCE_EXTENSIONS:
        test_files.extend([
            f for f in glob.glob(f"tests/**/*{ext}", recursive=True)
        ])
    return test_files


def suggest_test_filenames(src_file: str) -> List[str]:
    """
    Suggest possible test filenames for a source file.
    
    Args:
        src_file: Path to source file
        
    Returns:
        List of possible test file paths
    """
    ext = os.path.splitext(src_file)[1]
    base = os.path.splitext(os.path.basename(src_file))[0]
    return [pattern.format(base) for pattern in TEST_PATTERNS.get(ext, [])]


def identify_files_missing_tests(source_files: List[str], test_files: List[str]) -> List[str]:
    """
    Identify source files that are missing corresponding test files.
    
    Args:
        source_files: List of source file paths
        test_files: List of existing test file paths
        
    Returns:
        List of source files missing tests
    """
    files_missing_tests = []

    for src_file in source_files:
        ext = os.path.splitext(src_file)[1]
        base = os.path.splitext(os.path.basename(src_file))[0]
        tests_exist = False
        
        for test_pattern in TEST_PATTERNS.get(ext, []):
            test_filename = test_pattern.format(base)
            if any(os.path.basename(tf) == os.path.basename(test_filename) for tf in test_files):
                tests_exist = True
                break
                
        if not tests_exist:
            files_missing_tests.append(src_file)

    return files_missing_tests


def create_pr_comment(pr, new_tests: List[str]) -> bool:
    """Create enhanced PR comment with test information."""
    
    # Group tests by type
    unit_tests = [t for t in new_tests if "/unit/" in t]
    integration_tests = [t for t in new_tests if "/integration/" in t]
    other_tests = [t for t in new_tests if t not in unit_tests + integration_tests]
    
    body = f"""🤖 **AI Test Generation Report**

Generated {len(new_tests)} test stub(s) for files missing test coverage.

### 📋 Test Summary
- **Unit Tests**: {len(unit_tests)}
- **Integration Tests**: {len(integration_tests)}
- **Other Tests**: {len(other_tests)}

### 📁 Generated Files
"""
    
    if unit_tests:
        body += "\n**Unit Tests:**\n"
        body += "\n".join(f"- `{f}`" for f in sorted(unit_tests))
    
    if integration_tests:
        body += "\n\n**Integration Tests:**\n"
        body += "\n".join(f"- `{f}`" for f in sorted(integration_tests))
    
    if other_tests:
        body += "\n\n**Other Tests:**\n"
        body += "\n".join(f"- `{f}`" for f in sorted(other_tests))
    
    body += """

### ⚡ Next Steps
1. Review the generated test stubs
2. Add specific test cases for your implementation
3. Ensure all edge cases are covered
4. Run `npm test` to verify the tests pass

> **Note**: These are starter templates. Please enhance them with comprehensive test cases specific to your implementation.
"""
    
    try:
        pr.create_issue_comment(body)
        logger.info("Successfully posted PR comment")
        return True
    except GithubException as e:
        logger.error(f"Failed to comment on PR: {e}")
        return False

def main():
    """Main entry point with comprehensive error handling."""
    try:
        # Initialize configuration
        config = TestGeneratorConfig()
        logger.info(f"Starting test generation for PR #{config.pr_number}")
        
        # Find files
        source_files = find_source_files()
        test_files = find_test_files()
        files_missing_tests = identify_files_missing_tests(source_files, test_files)
        
        if not files_missing_tests:
            logger.info("No files missing tests.")
            return 0
        
        logger.info(f"Found {len(files_missing_tests)} files missing tests")
        
        # Initialize GitHub client
        g = Github(config.github_token)
        repo = g.get_repo(config.repo_name)
        pr = repo.get_pull(config.pr_number)
        
        # Generate tests using context manager
        with TestGenerator(config) as test_generator:
            new_tests = test_generator.generate_tests_for_files(files_missing_tests)
        
        if not new_tests:
            logger.warning("No tests were generated")
            return 1
        
        # Git operations
        git_ops = GitOperations()
        if not git_ops.configure_git():
            logger.error("Failed to configure git")
            return 1
            
        if not git_ops.stage_commit_push(new_tests, config.pr_branch):
            logger.error("Failed to commit and push changes")
            return 1
        
        # Create PR comment
        if not create_pr_comment(pr, new_tests):
            logger.warning("Failed to create PR comment, but tests were generated")
        
        logger.info(f"Successfully generated {len(new_tests)} test stubs")
        return 0
        
    except Exception as e:
        logger.error(f"Test generation failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    sys.exit(main())