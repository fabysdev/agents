import type {Tool} from "../index.js";

export const relativePath = "tdd.prompt.md";

export function render(tool: Tool): string {
  let header;

  switch (tool) {
    case "copilot":
      header = `agent: fabys-tdd
description: Use test-driven development to implement a new feature or change.`;
      break;
    case "opencode":
      header = `description: Use test-driven development to implement a new feature or change.
agent: fabys-tdd`;
      break;
  }

  return `---
${header}
---

Delegate the user request through your workflow.
`;
}
