export const relativePath = "implementation/SKILL.md";
export function render(tool) {
    let frontmatter;
    switch (tool) {
        case "copilot":
            frontmatter = `name: implementation
description: Project-specific implementation conventions. Use this skill when writing production code to apply architecture, coding standards, and validation requirements.
user-invocable: false`;
            break;
        case "claude":
            frontmatter = `name: implementation
description: Project-specific implementation conventions. Use this skill when writing production code to apply architecture, coding standards, and validation requirements.
user-invocable: false`;
            break;
        case "opencode":
            frontmatter = `name: implementation
description: Project-specific implementation conventions. Use this skill when writing production code to apply architecture, coding standards, and validation requirements.
user-invocable: false`;
            break;
    }
    return `---
${frontmatter}
---

# Implementation

Project-specific implementation conventions.
`;
}
//# sourceMappingURL=implementation.js.map