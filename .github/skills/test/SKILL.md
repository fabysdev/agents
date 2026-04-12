---
name: test
description: Run the project test suite. Use this skill when asked to run tests, check if tests pass, verify test results, or confirm nothing is broken after a code change. Use it both for running the full suite and for running a specific test file or test case.
argument-hint: "[optional: specific test file or test name]"
---

# Test

## Running the full test suite

When no specific file or test is mentioned, always use the project-specific command from the **project root** or the directory specified in the instructions. The canonical command is:

```bash
task test
```

## Running a specific file or test case

This repository uses `tsx` with Node's built-in test runner for targeted test runs. From the project root, use:

```bash
npx tsx --test path/to/file.test.ts
```

Examples:

```bash
npx tsx --test test/install.test.ts
npx tsx --test test/e2e.test.ts
```

If a specific test name is targeted, use Node's test name filter as well:

```bash
npx tsx --test --test-name-pattern "test name" path/to/file.test.ts
```

## Steps

1. Decide: is a specific file or test targeted? If yes → use the language-specific runner. If no → use `task test`.
2. Report whether all tests passed or how many failed.
3. For any failures, include the test name and error message.

## Important

- If `task` is not found when running the full suite, inform the user and suggest installing it from [taskfile.dev](https://taskfile.dev) rather than falling back silently.
