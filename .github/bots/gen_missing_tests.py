import os
import glob
import openai
from github import Github, GithubException

REPO_NAME = os.environ["REPO_NAME"]
PR_NUMBER = int(os.environ["PR_NUMBER"])
PR_BRANCH = os.environ["PR_BRANCH"]
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

client = openai.OpenAI(api_key=OPENAI_API_KEY)

# Source extensions to check
SOURCE_EXTENSIONS = [".ts", ".js", ".py"]
# Test file patterns for each language
TEST_PATTERNS = {
    ".ts": ["tests/test_{}.ts", "tests/{}.spec.ts", "tests/{}.test.ts"],
    ".js": ["tests/test_{}.js", "tests/{}.spec.js", "tests/{}.test.js"],
    ".py": ["tests/test_{}.py"],
}

def find_source_files():
    files = []
    for ext in SOURCE_EXTENSIONS:
        files.extend([
            f for f in glob.glob(f"**/*{ext}", recursive=True)
            if not f.startswith("tests/")
            and not f.startswith(".github/")
            and not f.startswith("docs/")
            and not f.startswith("node_modules/")
        ])
    return files

def find_test_files():
    test_files = []
    for ext in SOURCE_EXTENSIONS:
        test_files.extend([
            f for f in glob.glob(f"tests/**/*{ext}", recursive=True)
        ])
    return test_files

def suggest_test_filenames(src_file):
    ext = os.path.splitext(src_file)[1]
    base = os.path.splitext(os.path.basename(src_file))[0]
    return [pattern.format(base) for pattern in TEST_PATTERNS.get(ext, [])]

def generate_test_stub(source_code, filename, ext):
    language_prompt = {
        ".py": "Python unit tests using pytest.",
        ".ts": "TypeScript unit tests using Jest.",
        ".js": "JavaScript unit tests using Jest.",
    }
    prompt = f"""You are an assistant that writes {language_prompt.get(ext, 'unit tests')}

Write a minimal, but complete test file for the following source code.
Only use standard libraries and the specified framework.

Source file: {filename}
Code:
{source_code}
"""
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=800
    )
    return response.choices[0].message.content

def main():
    source_files = find_source_files()
    test_files = find_test_files()
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

    if not files_missing_tests:
        print("No files missing tests.")
        return

    g = Github(GITHUB_TOKEN)
    repo = g.get_repo(REPO_NAME)
    pr = repo.get_pull(PR_NUMBER)
    branch = PR_BRANCH

    new_tests = []
    for src_file in files_missing_tests:
        ext = os.path.splitext(src_file)[1]
        with open(src_file, "r", encoding="utf-8") as f:
            src_code = f.read()
        # Use first pattern for filename
        test_filename = suggest_test_filenames(src_file)[0]
        test_content = generate_test_stub(src_code, src_file, ext)
        os.makedirs(os.path.dirname(test_filename), exist_ok=True)
        with open(test_filename, "w", encoding="utf-8") as tf:
            tf.write(test_content)
        new_tests.append(test_filename)

    # Stage, commit, and push new tests
    os.system("git config user.name 'aia-bot'")
    os.system("git config user.email 'aia-bot@example.com'")
    os.system("git add " + " ".join(new_tests))
    os.system("git commit -m 'Add AI-generated test stubs for new code'")
    os.system(f"git push origin HEAD:{branch}")

    # Comment on PR
    body = (
        "🤖 Added AI-generated test stubs for the following files:\n\n" +
        "\n".join(f"- `{f}`" for f in new_tests) +
        "\n\nPlease review and improve these tests as needed!"
    )
    try:
        pr.create_issue_comment(body)
    except GithubException as e:
        print("Failed to comment on PR:", e)

if __name__ == "__main__":
    main()