import type {Tool} from "../index.js";

export const relativePath = "rapid/SKILL.md";

export function render(tool: Tool): string {
  let frontmatter;

  switch (tool) {
    case "copilot":
      frontmatter = `name: rapid
description: Use rapid development to implement a new feature or change. Used with fabys-rapid agent for structured spec/plan workflows without tests.
disable-model-invocation: true
argument-hint: "[feature or change to implement]"`;
      break;
    case "claude":
      frontmatter = `name: rapid
description: Use rapid development to implement a new feature or change. Used with fabys-rapid agent for structured spec/plan workflows without tests.
disable-model-invocation: true
argument-hint: "[feature or change to implement]"`;
      break;
    case "opencode":
      frontmatter = `name: rapid
description: Use rapid development to implement a new feature or change. Used with fabys-rapid agent for structured spec/plan workflows without tests.`;
      break;
  }

  return `---
${frontmatter}
---

# Rapid

Delegate the user request through your workflow.
`;
}
