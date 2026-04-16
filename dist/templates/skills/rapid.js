export const relativePath = "rapid/SKILL.md";
export function render(tool) {
    let frontmatter;
    switch (tool) {
        case "copilot":
            frontmatter = `name: rapid
description: Use rapid development to implement a new feature or change. Delegates to the fabys-rapid agent for structured spec/plan workflows without tests.
argument-hint: "[feature or change to implement]"`;
            break;
        case "opencode":
            frontmatter = `name: rapid
description: Use rapid development to implement a new feature or change. Delegates to the fabys-rapid agent for structured spec/plan workflows without tests.
compatibility: opencode`;
            break;
    }
    return `---
${frontmatter}
---

# Rapid

Delegate the user request through your workflow.
`;
}
//# sourceMappingURL=rapid.js.map