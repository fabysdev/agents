export const relativePath = "rapid.prompt.md";
export function render(tool) {
    let header;
    switch (tool) {
        case "copilot":
            header = `agent: fabys-rapid
description: Use rapid development to implement a new feature or change.`;
            break;
        case "opencode":
            header = `description: Use rapid development to implement a new feature or change.
agent: fabys-rapid`;
            break;
    }
    return `---
${header}
---

Delegate the user request through your workflow.
`;
}
//# sourceMappingURL=rapid.js.map