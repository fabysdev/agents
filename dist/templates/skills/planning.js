export const relativePath = "planning/SKILL.md";
export function render(tool) {
    let frontmatter;
    switch (tool) {
        case "copilot":
            frontmatter = `name: planning
description: Project-specific planning conventions. Use this skill when creating implementation plans to apply project constraints, phase structure, and quality bars.
user-invocable: false`;
            break;
        case "opencode":
            frontmatter = `name: planning
description: Project-specific planning conventions. Use this skill when creating implementation plans to apply project constraints, phase structure, and quality bars.
compatibility: opencode
user-invocable: false`;
            break;
    }
    return `---
${frontmatter}
---

# Planning

Project-specific planning conventions.
`;
}
//# sourceMappingURL=planning.js.map