import type {Tool} from "../index.js";

export const relativePath = "tdd/SKILL.md";

export function render(tool: Tool): string {
  let frontmatter;

  switch (tool) {
    case "copilot":
      frontmatter = `name: tdd
description: Use test-driven development to implement a new feature or change. Delegates to the fabys-tdd agent for TDD workflows where tests drive the development process.
argument-hint: "[feature or change to implement]"`;
      break;
    case "opencode":
      frontmatter = `name: tdd
description: Use test-driven development to implement a new feature or change. Delegates to the fabys-tdd agent for TDD workflows where tests drive the development process.
compatibility: opencode`;
      break;
  }

  return `---
${frontmatter}
---

# TDD

Delegate the user request through your workflow.
`;
}
