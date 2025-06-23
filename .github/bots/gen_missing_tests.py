import os
import glob
import openai
from github import Github, GithubException

REPO_NAME = os.environ["REPO_NAME"]
PR_NUMBER = int(os.environ["PR_NUMBER"])
PR_BRANCH = os.environ["PR_BRANCH"]
GITHUB_TOKEN = os.environ["GITHUB_TOKEN"]
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

openai.api_key = OPENAI_API_KEY

def find_python_files():
    return [
        f for f in glob.glob("**/*.py", recursive=True)
        if not f.startswith("tests/") and not f.startswith(".github/")
    ]

def find_test_files():
    return [
        f for f in glob.glob("tests/**/*.py", recursive=True)
    ]

def suggest_test_filename(src_file):
    filename = os.path.basename(src_file)
    return f"tests/test_{filename}"

def generate_test_stub(source_code, filename):
    prompt = f"""You are an assistant that writes Python unit tests using pytest.
Write a minimal, but complete test file for the following source code. Only use standard python and pytest.

Source file: {filename}
Code:
{source_code}
"""
    response = openai.ChatCompletion.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=600
    )
    return response.choices[0].message.content

def main():
    python_files = find_python_files()
    test_files = find_test_files()
    files_missing_tests = []

    for src_file in python_files:
        filename = os.path.basename(src_file)
        test_pattern = f"test_{filename}"
        found = any(test_pattern in os.path.basename(tf) for tf in test_files)
        if not found:
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
        with open(src_file, "r") as f:
            src_code = f.read()
        test_filename = suggest_test_filename(src_file)
        test_content = generate_test_stub(src_code, src_file)
        os.makedirs(os.path.dirname(test_filename), exist_ok=True)
        with open(test_filename, "w") as tf:
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