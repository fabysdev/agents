import type {Tool} from "../index.js";

export const relativePath = "fabys-questions/SKILL.md";

export function render(tool: Tool): string {
  let frontmatter;
  let body;

  switch (tool) {
    case "copilot":
      frontmatter = `name: fabys-questions
description: Use this skill whenever you need to ask the user a blocking user-facing question, including clarification, missing requirements, choices, decisions, or explicit confirmation before proceeding.
user-invocable: false`;
      body = `# Questions

Use the \`askQuestions\` tool to ask the user questions.
`;
      break;
    case "claude":
      frontmatter = `name: fabys-questions
description: Use this skill whenever you need to ask the user a blocking user-facing question, including clarification, missing requirements, choices, decisions, or explicit confirmation before proceeding.
user-invocable: false`;
      body = `# Questions

Use the \`AskUserQuestion\` tool to ask the user questions.
`;
      break;
    case "opencode":
      frontmatter = `name: fabys-questions
description: Use this skill whenever you need to ask the user a blocking user-facing question, including clarification, missing requirements, choices, decisions, or explicit confirmation before proceeding.
user-invocable: false`;
      body = `# Questions

Use the \`question\` tool to ask the user questions.
`;
      break;
  }

  return `---
${frontmatter}
---

${body}
`;
}
