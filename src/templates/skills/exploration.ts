import type {Tool} from "../index.js";

export const relativePath = "exploration/SKILL.md";

export function render(tool: Tool): string {
  let frontmatter;

  switch (tool) {
    case "copilot":
      frontmatter = `name: exploration
description: Project-specific exploration conventions. Use this skill when exploring the codebase to understand search priorities, exclusions, and discovery hints.
user-invocable: false`;
      break;
    case "claude":
      frontmatter = `name: exploration
description: Project-specific exploration conventions. Use this skill when exploring the codebase to understand search priorities, exclusions, and discovery hints.
user-invocable: false`;
      break;
    case "opencode":
      frontmatter = `name: exploration
description: Project-specific exploration conventions. Use this skill when exploring the codebase to understand search priorities, exclusions, and discovery hints.
user-invocable: false`;
      break;
  }

  return `---
${frontmatter}
---

# Exploration

Project-specific exploration conventions.
`;
}
