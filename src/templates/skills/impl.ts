import type {Tool} from "../index.js";

export const relativePath = "impl/SKILL.md";

export function render(tool: Tool): string {
  let frontmatter;

  switch (tool) {
    case "copilot":
      frontmatter = `name: impl
description: Use the compact implementation workflow to implement a new feature or change. Used with fabys-impl agent for medium-complexity changes with tests and lint.
disable-model-invocation: true
argument-hint: "[feature or change to implement]"`;
      break;
    case "claude":
      frontmatter = `name: impl
description: Use the compact implementation workflow to implement a new feature or change. Used with fabys-impl agent for medium-complexity changes with tests and lint.
disable-model-invocation: true
argument-hint: "[feature or change to implement]"`;
      break;
    case "opencode":
      frontmatter = `name: impl
description: Use the compact implementation workflow to implement a new feature or change. Used with fabys-impl agent for medium-complexity changes with tests and lint.`;
      break;
  }

  return `---
${frontmatter}
---

# Impl

Implement the user request through your workflow.
`;
}
