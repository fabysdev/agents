import type {Tool} from "../index.js";

export const relativePath = "test-engineering/SKILL.md";

export function render(tool: Tool): string {
  let frontmatter;

  switch (tool) {
    case "copilot":
      frontmatter = `name: test-engineering
description: Project-specific test engineering conventions. Use this skill when writing tests to apply coverage expectations, mocking boundaries, and red-phase requirements.
user-invocable: false`;
      break;
    case "opencode":
      frontmatter = `name: test-engineering
description: Project-specific test engineering conventions. Use this skill when writing tests to apply coverage expectations, mocking boundaries, and red-phase requirements.
compatibility: opencode
user-invocable: false`;
      break;
  }

  return `---
${frontmatter}
---

# Test Engineering

Project-specific test engineering conventions.
`;
}
