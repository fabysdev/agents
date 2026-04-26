export const relativePath = "tdd/SKILL.md";
export function render(tool) {
    let frontmatter;
    switch (tool) {
        case "copilot":
            frontmatter = `name: tdd
description: Use test-driven development to implement a new feature or change. Used with fabys-tdd agent for TDD workflows where tests drive the development process.
disable-model-invocation: true
argument-hint: "[feature or change to implement]"`;
            break;
        case "claude":
            frontmatter = `name: tdd
description: Use test-driven development to implement a new feature or change. Used with fabys-tdd agent for TDD workflows where tests drive the development process.
disable-model-invocation: true
argument-hint: "[feature or change to implement]"`;
            break;
        case "opencode":
            frontmatter = `name: tdd
description: Use test-driven development to implement a new feature or change. Used with fabys-tdd agent for TDD workflows where tests drive the development process.`;
            break;
    }
    return `---
${frontmatter}
---

# TDD

Delegate the user request through your workflow.
`;
}
//# sourceMappingURL=tdd.js.map