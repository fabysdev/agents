import type {Tool} from "../index.js";

export const relativePath = "test-consolidation/SKILL.md";

export function render(tool: Tool): string {
  let frontmatter;

  switch (tool) {
    case "copilot":
      frontmatter = `name: test-consolidation
description: Project-specific test consolidation conventions. Use this skill when consolidating test files to apply merge boundaries and structure preservation rules.
user-invocable: false`;
      break;
    case "opencode":
      frontmatter = `name: test-consolidation
description: Project-specific test consolidation conventions. Use this skill when consolidating test files to apply merge boundaries and structure preservation rules.
compatibility: opencode
user-invocable: false`;
      break;
  }

  return `---
${frontmatter}
---

# Test Consolidation

Project-specific test consolidation conventions.
`;
}
