export const relativePath = "fabys-exploration/SKILL.md";
export function render(tool) {
    let frontmatter;
    let body;
    switch (tool) {
        case "copilot":
            frontmatter = `name: fabys-exploration
description: Use this skill when exploring the codebase to gather context and identify relevant patterns.
user-invocable: false`;
            body = `# Exploration

Invoke the \`fabys-explorer\` subagent to gather codebase context. When the request spans multiple independent areas (e.g., frontend + backend, different features, separate repos), launch **2–3 fabys-explorer subagents in parallel** — one per area — to speed up discovery.

Each fabys-explorer subagent should surface:

- Analogous existing features to use as implementation templates
- Relevant files, modules, and entry points
- Potential blockers or ambiguities grounded in actual code

Wait for all fabys-explorer invocations to fully complete and return their results before proceeding.
`;
            break;
        case "claude":
            frontmatter = `name: fabys-exploration
description: Use this skill when exploring the codebase to gather context and identify relevant patterns.
user-invocable: false`;
            body = `# Exploration

Analyze and search the codebase efficiently through maximum parallelism and report concise, clear answers.

## Strategy
Search broad-to-narrow on every query:
1. Discover — glob or semantic search to locate relevant areas
2. Narrow — regex/text or LSP for specific symbols
3. Read — only when you have a specific path or need full context

- Parallelize independent tool calls (multiple greps, multiple reads).
- Stop searching once you have sufficient context — make targeted searches, not exhaustive sweeps.

## Output
- Files with absolute links
- Specific functions, types, or patterns that can be reused
- Analogous existing features that serve as implementation templates
- Clear answers to what was asked, not comprehensive overviews

## Checklist
Before responding, verify:
- [ ] All paths are absolute
- [ ] All relevant matches were found
- [ ] Relationships between findings are explained

## Project-specific instructions
- Read provided agent instructions, rules, and skills before proceeding — they define project-specific architecture, discovery priorities, and exploration constraints.
- Use the \`exploration\` skill, if available, to load project-specific exploration conventions.
- Use those instructions to decide what to search for, what to prioritize, what to ignore and how to explore.
`;
            break;
        case "opencode":
            frontmatter = `name: fabys-exploration
description: Use this skill when exploring the codebase to gather context and identify relevant patterns.
user-invocable: false`;
            body = `# Exploration

Invoke the \`fabys-explorer\` subagent to gather codebase context. When the request spans multiple independent areas (e.g., frontend + backend, different features, separate repos), launch **2–3 fabys-explorer subagents in parallel** — one per area — to speed up discovery.

Each fabys-explorer subagent should surface:

- Analogous existing features to use as implementation templates
- Relevant files, modules, and entry points
- Potential blockers or ambiguities grounded in actual code

Wait for all fabys-explorer invocations to fully complete and return their results before proceeding.
`;
            break;
    }
    return `---
${frontmatter}
---

${body}
`;
}
//# sourceMappingURL=fabys-exploration.js.map