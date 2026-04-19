export const relativePath = "review/SKILL.md";
export function render(tool) {
    let frontmatter;
    switch (tool) {
        case "copilot":
            frontmatter = `name: review
description: Project-specific review standards. Use this skill when reviewing code to apply project review rules that override generic review heuristics.
user-invocable: false`;
            break;
        case "opencode":
            frontmatter = `name: review
description: Project-specific review standards. Use this skill when reviewing code to apply project review rules that override generic review heuristics.
compatibility: opencode
user-invocable: false`;
            break;
    }
    return `---
${frontmatter}
---

# Review

Project-specific review standards.
`;
}
//# sourceMappingURL=review.js.map