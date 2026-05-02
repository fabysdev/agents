export const relativePath = "fabys-planning/SKILL.md";
export function render(tool) {
    let frontmatter;
    switch (tool) {
        case "copilot":
            frontmatter = `name: fabys-planning
description: Use this skill when creating or revising implementation plans to apply the shared planning output contract, grounding expectations, and plan quality bar.
user-invocable: false`;
            break;
        case "claude":
            frontmatter = `name: fabys-planning
description: Use this skill when creating or revising implementation plans to apply the shared planning output contract, grounding expectations, and plan quality bar.
user-invocable: false`;
            break;
        case "opencode":
            frontmatter = `name: fabys-planning
description: Use this skill when creating or revising implementation plans to apply the shared planning output contract, grounding expectations, and plan quality bar.
user-invocable: false`;
            break;
    }
    return `---
${frontmatter}
---

# Planning Contract

Create or revise an implementation plan.
Use the optional \`planning\` skill to load project-specific planning conventions.

## Required Result

- Every plan must capture: request summary, key design decisions, relevant files and patterns, validation strategy, test expectations, sequencing constraints, and any material risks or open questions.
- The plan must make important design decisions now instead of deferring them to later execution.
- The plan must externalize invariants, ordering constraints, edge cases, and failure handling instead of keeping them implicit.
- The plan must be actionable as written and avoid placeholders such as "investigate further", "analyze", or "handle errors" without concrete follow-through.

## Grounding Expectations

- File, symbol, and pattern references must be grounded in verified codebase context.
- The plan must surface enough supporting context to justify the chosen approach: analogous implementations, relevant entry points, existing tests or fixtures, technical constraints, and meaningful blockers or ambiguities.
- Use the \`fabys-exploration\` skill when codebase discovery is needed, but only gather enough context to support the plan.
- Use Context7 when library or framework behavior materially affects the plan.
- Use the \`fabys-questions\` skill only when material ambiguity remains after exploration and the answer would change architecture, scope, sequencing, or validation.

## Mode-Specific Deliverables

- Inline plans must still satisfy the full contract; they should be compact, but they must not collapse into a one-line summary.
- Artifact plans must make the expected deliverables explicit for the caller, for example compact \`plan.md\` guidance or phased \`phase*.md\` outputs for phased planning modes.
- Do not create \`phase*.md\` files unless the calling workflow explicitly requires phased planning.

## Plan Quality Bar

- Use the optional \`planning\` skill for project-specific planning instructions when it exists, and treat it as authoritative when it conflicts with this default contract.
- Plans should be sequential and implementation-ready rather than analysis-oriented.
- Plans should make validation and test expectations specific enough that a downstream implementation or test-writing agent can act without re-planning.
- Document the important edge cases and failure modes that validation or tests must cover.
- Ask questions only when the codebase cannot answer them.
`;
}
//# sourceMappingURL=fabys-planning.js.map