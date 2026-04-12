---
name: lint
description: Lint the project. Use this skill when asked to lint, check code style, fix lint errors, run static analysis, or verify code quality. Use it both for linting the full project and for linting a specific file.
argument-hint: "[optional: specific file or directory]"
---

# Lint

## Linting the full project

When no specific file or directory is mentioned, always use the project-specific command from the **project root**:

```bash
task lint
```

## Linting a specific file or directory

This repository uses ESLint directly for targeted lint runs. From the project root, use:

```bash
npx eslint --fix path/to/file.ts
```

Examples:

```bash
npx eslint --fix src/cli.ts
npx eslint --fix test/install.test.ts
```

If the user only wants diagnostics without applying fixes, omit `--fix`.

## Steps

1. Decide: is a specific file or directory targeted? If yes → use the language-specific linter. If no → use `task lint`.
2. Report whether linting passed or list the violations found (file, line, rule).
3. If auto-fixable issues are present, offer to fix them (e.g. `eslint --fix`, `ruff check --fix`).
4. If violations are clearly related to a recent code change, suggest a fix.

## Important

- If `task` is not found when linting the full project, inform the user and suggest installing it from [taskfile.dev](https://taskfile.dev) rather than falling back silently.
