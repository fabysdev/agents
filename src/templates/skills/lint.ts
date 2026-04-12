import type { Tool } from "../index.js";

export const relativePath = "lint/SKILL.md";

export function render(tool: Tool): string {
  let frontmatter;

  switch (tool) {
    case "copilot":
      frontmatter = `name: lint
description: Lint the project. Use this skill when asked to lint, check code style, fix lint errors, run static analysis, or verify code quality. Use it both for linting the full project and for linting a specific file.
argument-hint: "[optional: specific file or directory]"`;
      break;
    case "opencode":
      frontmatter = `name: lint
description: Lint the project. Use this skill when asked to lint, check code style, fix lint errors, run static analysis, or verify code quality. Use it both for linting the full project and for linting a specific file.
compatibility: opencode`;
      break;
  }

  return `---
${frontmatter}
---

# Lint

Inspect the repository and infer the best lint command from its scripts, task runners, config files, and language-specific tooling; prefer the narrowest command that matches the user's request and mention any assumption when multiple commands are plausible.

## Steps

1. Decide whether the request is for the whole project or a specific path.
2. Infer the most appropriate lint command from the repository's existing tooling.
3. Run the command from the project root unless the inferred tool requires a different working directory or a targeted path was requested.
4. Report whether linting passed or list the violations found with file, line, and rule details.
5. If the inferred linter supports safe autofix and the request implies fixing, use the fix-capable form and report what changed.
`;
}
