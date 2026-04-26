import type {Tool} from "../index.js";

export const relativePath = "test/SKILL.md";

export function render(tool: Tool): string {
  let frontmatter;

  switch (tool) {
    case "copilot":
      frontmatter = `name: test
description: Run the project test suite. Use this skill when asked to run tests, check if tests pass, verify test results, or confirm nothing is broken after a code change. Use it both for running the full suite and for running a specific test file or test case.
argument-hint: "[optional: specific test file or test name]"`;
      break;
    case "claude":
      frontmatter = `name: test
description: Run the project test suite. Use this skill when asked to run tests, check if tests pass, verify test results, or confirm nothing is broken after a code change. Use it both for running the full suite and for running a specific test file or test case.
argument-hint: "[optional: specific test file or test name]"`;
      break;
    case "opencode":
      frontmatter = `name: test
description: Run the project test suite. Use this skill when asked to run tests, check if tests pass, verify test results, or confirm nothing is broken after a code change. Use it both for running the full suite and for running a specific test file or test case.`;
      break;
  }

  return `---
${frontmatter}
---

# Test

Inspect the repository and infer the best test command from its scripts, task runners, config files, and language-specific tooling; prefer the narrowest command that matches the user's request and mention any assumption when multiple commands are plausible.

## Steps

1. Decide whether the request is for the whole suite or a targeted test.
2. Infer the most appropriate test command from the repository's existing tooling.
3. Run the command from the project root unless the inferred tool requires a different working directory or a targeted test path or name was requested.
4. Report whether all tests passed or how many failed.
5. For any failures, include the failing test or suite and the relevant error message.
`;
}
