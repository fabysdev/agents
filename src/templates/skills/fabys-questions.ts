import type {Tool} from "../index.js";

export const relativePath = "fabys-questions/SKILL.md";

export function render(tool: Tool): string {
  let frontmatter;
  let body;

  switch (tool) {
    case "copilot":
      frontmatter = `name: fabys-questions
description: Use this skill whenever you need clarification, missing requirements, or explicit user confirmation before proceeding.
user-invocable: false`;
      body = `# Questions

Use the \`askQuestions\` tool to ask the user for clarification, missing requirements, or explicit confirmation when needed before proceeding.
`;
      break;
    case "claude":
      frontmatter = `name: fabys-questions
description: Use this skill whenever you need clarification, missing requirements, or explicit user confirmation before proceeding.
user-invocable: false`;
      body = `# Questions

Use the \`AskUserQuestion\` tool to ask the user for clarification, missing requirements, or explicit confirmation when needed before proceeding.
`;
      break;
    case "opencode":
      frontmatter = `name: fabys-questions
description: Use this skill whenever you need clarification, missing requirements, or explicit user confirmation before proceeding.
user-invocable: false`;
      body = `# Questions

Use the \`question\` tool to ask the user for clarification, missing requirements, or explicit confirmation when needed before proceeding.
`;
      break;
  }

  return `---
${frontmatter}
---

${body}
`;
}
