# Fabys Agents

My opinionated AI workflow for coding.

- Agents for analysis, planning, implementation, review, TDD orchestration, and rapid orchestration
- Prompt or command entrypoints for `/tdd`, `/rapid`, and `/dev`
- Project skills for linting and testing

## Installation

```bash
npx github:fabysdev/agents#v0.3.0
```

### After Installation

The generated files are starting points. Make the skills and instructions match your repository before you rely on them in a real project.

### Lint Skill

- Update the installed lint skill so it runs the actual linting flow for your project, `skills/lint/SKILL.md`.

### Test Skill

- Update the installed test skill so it reflects the real test workflow for your project, `skills/test/SKILL.md`.

### Project-Specific Instructions

- Keep broader repository guidance in the main instructions file for the tool you chose.

This keeps the installed agents reusable while still giving the tool the local context it needs to behave correctly in your codebase.

## Agent Roles and Block Tags

The agents tell the model to pay attention to project instructions, skills, and rules. For the agents that depend heavily on repository-specific conventions, you can make that guidance more reliable by adding dedicated XML-style blocks to your main instruction file.

When one of these blocks is present, the matching agent is told to check it explicitly and treat it as authoritative for that role. If a block conflicts with generic best practices, the project-specific block wins.

- `fabys-explorer` checks \`<exploration_project_specifics>\` for search priorities, exclusions, and repository-specific discovery hints.
- `fabys-planner` checks \`<planning_project_specifics>\` for planning constraints that must appear in \`plan.md\` and every phase file.
- `fabys-implementer` checks \`<implementation_project_specifics>\` for architecture, conventions, and validation requirements.
- `fabys-reviewer` checks \`<review_project_specifics>\` for review rules that override generic review heuristics.
- `fabys-test-engineer` checks \`<test_engineering_project_specifics>\` for coverage expectations, mocking boundaries, and red-phase requirements.
- `fabys-test-consolidator` checks \`<test_consolidation_project_specifics>\` for merge boundaries and structure that must be preserved.

Example:

```xml
<review_project_specifics>
- Authorization must use `hasPermission()` and `usePermissions()` patterns; never role-name checks.
- User-facing text must go through i18next.
- External input should be validated with Zod before use.
</review_project_specifics>
```

Put these blocks in the same instruction file where you keep the rest of your repository guidance. Keep them short, concrete, and role-specific.

## Usage

These are the three entrypoints I use.

### TDD Workflow

This uses the full orchestrated TDD workflow. The agent delegates work through analyst, planner, critic, test engineer, implementer, and reviewer subagents.

- Prompt: `/tdd <request>`
- Agent: `fabys-tdd`
- Workflow: Expansion -> Planning -> TDD Red Phase -> TDD Green Phase -> Review
- Best for: bug fixes, API changes, refactors, and features where test-first delivery matters

Example:

```text
/tdd
add rate limiting to the login endpoint
```

### Rapid Workflow

This route keeps the spec and planning flow, then moves straight into implementation and an optional review (no tests).

- Prompt: `/rapid <request>`
- Agent: `fabys-rapid`
- Workflow: Expansion -> Planning -> Implementation -> Optional Review
- Best for: projects or features without test requirements (e.g. game jams, weekend playgrounds, ...)

Example:

```text
/rapid
scaffold a new CLI command for syncing templates
```

### Small Direct Change

`/dev` is the quickest path when the work is small and you just want the change implemented cleanly with tests and lint handled before finishing.

- Prompt: `/dev <request>`
- Agent: Copilot `agent` by default, or OpenCode `build`
- Workflow: direct implementation of the request, update or add tests for every changed file, then run lint and the full test suite
- Best for: small fixes, narrow refactors, copy changes, and other direct edits that do not need the full orchestrated workflow

Example:

```text
/dev
rename the install summary variable to make the output clearer
```

## Planning Artifacts

The orchestrated workflows use `.plan/<feature-name>/` as their working directory for planning and execution artifacts.

- `spec.md` stores the analyzed request and constraints
- `plan.md` stores the implementation plan
- `phase*.md` stores the per-phase execution plan
- `state.json` and `run-log.md` track workflow progress
- `review.md` stores the final review output when a review stage runs

This directory is primarily used by `/tdd` and `/rapid`. `/dev` is the direct path and normally does not need `.plan/` artifacts.

## Recommended Default

- Use `/tdd` when correctness and regression safety matter most
- Use `/dev` for small direct changes
- Use `/rapid` when you want structure without the TDD overhead
