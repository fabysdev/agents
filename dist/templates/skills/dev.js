export const relativePath = "dev/SKILL.md";
export function render(tool) {
    let frontmatter;
    switch (tool) {
        case "copilot":
            frontmatter = `name: dev
description: Implement a feature or fix with emphasis on tests and observability. Use this skill when asked to develop, implement, or make code changes that require proper test coverage.
argument-hint: "[feature or change to implement]"`;
            break;
        case "opencode":
            frontmatter = `name: dev
description: Implement a feature or fix with emphasis on tests and observability. Use this skill when asked to develop, implement, or make code changes that require proper test coverage.
compatibility: opencode`;
            break;
    }
    return `---
${frontmatter}
---

# Dev

Implement the user request.

When done, list every file you created or modified. For each file, add or update tests that cover:

- The primary behavior / happy path
- Edge cases (empty input, boundary values, unexpected types, etc.)
- Error and failure conditions

Every changed file must have corresponding test coverage — do not skip files because they seem minor or the change seems obvious.

Run **all** tests and lint. Fix any failures. Do not stop until both pass cleanly.
`;
}
//# sourceMappingURL=dev.js.map