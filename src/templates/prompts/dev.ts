import type { Tool } from "../index.js";

export const relativePath = "dev.prompt.md";

export function render(tool: Tool): string {
  let header;

  switch (tool) {
    case "copilot":
      header = `agent: agent
description: Develop prompt with emphasis on tests and observability.`;
      break;
    case "opencode":
      header = `description: Develop prompt with emphasis on tests and observability.
agent: build`;
      break;
  }

  return `---
${header}
---

Implement the user request.

When done, list every file you created or modified. For each file, add or update tests that cover:

- The primary behavior / happy path
- Edge cases (empty input, boundary values, unexpected types, etc.)
- Error and failure conditions

Every changed file must have corresponding test coverage — do not skip files because they seem minor or the change seems obvious.

Run **all** tests and lint. Fix any failures. Do not stop until both pass cleanly.
`;
}
