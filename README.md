# Fabys Agents

My opinionated AI workflow for coding.

- Agents for planning, implementation, review, TDD orchestration, and rapid orchestration
- Workflow skills for `/tdd`, `/rapid`, and `/dev`
- Portability skills for exploration and user questions across GitHub Copilot, OpenCode, and Claude Code
- Role-specific skills for exploration, planning, implementation, review, test engineering, and test consolidation
- Validation skills for linting and testing

## Installation

```bash
npx github:fabysdev/agents#v0.19.0 --tool copilot
npx github:fabysdev/agents#v0.19.0 --tool opencode
npx github:fabysdev/agents#v0.19.0 --tool claude
npx github:fabysdev/agents#v0.19.0 --tool copilot --force
```

If you omit `--tool`, the installer prompts on TTYs and defaults to Copilot in non-interactive environments.
On TTYs, the installer also shows a checklist for the optional project-specific skills to install. `lint` and `test` are always installed. In non-interactive environments, all optional project-specific skills are installed by default.

Pass `--force` to also overwrite `lint`, `test`, and the selected optional project-specific skills.

Re-running the installer always overwrites agent files, refreshes the shared portability skills (`fabys-exploration`, `fabys-questions`), and refreshes the workflow skills (`dev`, `rapid`, `tdd`).
`lint`, `test`, and the selected optional project-specific skills are preserved by default and only overwritten with `--force`.

### Configuration

Create `.fabysagents.json` in the project root, or pass `--config <path>`, to override models and optional project skills per tool. Each top-level key is a tool name; `models` is keyed by agent name, and `skills` is keyed by optional project-specific skill name.

```json
{
  "opencode": {
    "models": {
      "fabys-tdd": "openai/gpt-5.5"
    },
    "skills": {
      "exploration": false,
      "review": true
    }
  },
  "claude": {
    "skills": {
      "planning": false
    }
  }
}
```

### Supported Targets

| Tool           | Output root  | Agent files                 | Skill files                   |
| -------------- | ------------ | --------------------------- | ----------------------------- |
| GitHub Copilot | `.github/`   | `.github/agents/*.agent.md` | `.github/skills/*/SKILL.md`   |
| OpenCode       | `.opencode/` | `.opencode/agents/*.md`     | `.opencode/skills/*/SKILL.md` |
| Claude Code    | `.claude/`   | `.claude/agents/*.md`       | `.claude/skills/*/SKILL.md`   |

### After Installation

The generated files are starting points. Make the skills and instructions match your repository before you rely on them in a real project.

### Lint Skill

- Update the installed lint skill so it runs the actual linting flow for your project under your chosen tool root, `skills/lint/SKILL.md`.

### Test Skill

- Update the installed test skill so it reflects the real test workflow for your project under your chosen tool root, `skills/test/SKILL.md`.

## Project-Specific Instructions

Each agent loads a matching skill to pick up project-specific conventions. The installed skills are starting-point templates — customize them to describe your project's actual constraints.

| Skill                | Used by                                      | Purpose                                                         |
| -------------------- | -------------------------------------------- | --------------------------------------------------------------- |
| `exploration`        | fabys-explorer                               | Search priorities, exclusions, and discovery hints              |
| `planning`           | fabys-planner                                | Planning constraints, phase structure, and quality bars         |
| `implementation`     | fabys-implementer                            | Architecture, coding standards, and validation requirements     |
| `review`             | fabys-reviewer                               | Review rules that override generic heuristics                   |
| `test-engineering`   | fabys-test-engineer, fabys-test-consolidator | Coverage expectations, mocking boundaries, and test conventions |
| `test-consolidation` | fabys-test-consolidator                      | Merge boundaries and structure preservation rules               |

If a skill is present, the matching agent treats it as authoritative. If it conflicts with generic best practices, the project-specific skill wins.

## Recommended Model Profiles

Works best when planning, orchestration, and final review stay on stronger models while the repeated execution agents use cheaper workhorse models.

### Standard

| Agent                     | Recommended model | Suggested effort |
| ------------------------- | ----------------- | ---------------- |
| `fabys-critic`            | `gpt-5.4`         | `xhigh`          |
| `fabys-explorer`          | `gpt-5.4-mini`    | `low`            |
| `fabys-implementer`       | `gpt-5.4`         | `high`           |
| `fabys-planner`           | `gpt-5.5`         | `high`           |
| `fabys-rapid`             | `gpt-5.4`         | `high`           |
| `fabys-reviewer`          | `gpt-5.5`         | `high`           |
| `fabys-tdd`               | `gpt-5.4`         | `high`           |
| `fabys-test-consolidator` | `gpt-5.4`         | `xhigh`          |
| `fabys-test-engineer`     | `gpt-5.4`         | `high`           |

### Max

| Agent                     | Recommended model | Suggested effort |
| ------------------------- | ----------------- | ---------------- |
| `fabys-critic`            | `gpt-5.5`         | `high`           |
| `fabys-explorer`          | `gpt-5.4-mini`    | `low`            |
| `fabys-implementer`       | `gpt-5.5`         | `high`           |
| `fabys-planner`           | `gpt-5.5`         | `high`           |
| `fabys-rapid`             | `gpt-5.5`         | `medium`         |
| `fabys-reviewer`          | `gpt-5.5`         | `high`           |
| `fabys-tdd`               | `gpt-5.5`         | `medium`         |
| `fabys-test-consolidator` | `gpt-5.5`         | `high`           |
| `fabys-test-engineer`     | `gpt-5.5`         | `high`           |

## Usage

These are the three entrypoints I use.

### Claude Code Operating Model

Claude Code works best here as short-lived top-level sessions with `.plan/<feature-name>/` artifacts as the handoff, not as one long-lived, deeply nested worker tree.

- Install with `--tool claude`.
- Create one git worktree per feature or bug fix.
- Start a fresh top-level Claude Code session for each workflow stage you want to run.
- Use `fabys-tdd` or `fabys-rapid` in that session, and treat `.plan/<feature-name>/state.json` plus the generated plan artifacts as the handoff to the next session.
- For `/tdd`, keep Stage 2 (Implementation) in the same session because the orchestrator is designed to run Red then Green for each phase before moving to the next one.
- For `/rapid`, splitting Planning, Implementation, and optional Review into separate sessions is a good default.

### TDD Workflow

This uses the full orchestrated TDD workflow. The planner handles upfront request analysis and phased planning, then the agent delegates through critic, test engineer, implementer, and reviewer subagents.

- Prompt: `/tdd <request>`
- Agent: `fabys-tdd`
- Workflow: Planning -> Implementation (Red -> Green per phase) -> Review
- Best for: bug fixes, API changes, refactors, and features where test-first delivery matters

Example:

```text
/tdd
add rate limiting to the login endpoint
```

### Rapid Workflow

This route keeps the planning flow, then moves straight into implementation and an optional review (no tests).

- Prompt: `/rapid <request>`
- Agent: `fabys-rapid`
- Workflow: Planning -> Implementation -> Optional Review
- Best for: projects or features without test requirements (e.g. game jams, weekend playgrounds, ...)

Example:

```text
/rapid
scaffold a new CLI command for syncing templates
```

### Small Direct Change

`/dev` is the quickest path when the work is small and you just want the change implemented cleanly with tests and lint handled before finishing.

- Prompt: `/dev <request>`
- Agent: Copilot `agent` by default, OpenCode `build`, or the equivalent direct small-change flow in your Claude Code session
- Workflow: direct implementation of the request, update or add tests for every changed file, then run lint and the full test suite
- Best for: small fixes, narrow refactors, copy changes, and other direct edits that do not need the full orchestrated workflow

Example:

```text
/dev
rename the install summary variable to make the output clearer
```

## Planning Artifacts

The orchestrated workflows use `.plan/<feature-name>/` as their working directory for planning and execution artifacts.

- `plan.md` stores the analyzed request, global decisions, and compact cross-phase manifest
- `phase*.md` stores the per-phase execution plan
- `state.json` tracks workflow progress and resume state
- `review.md` stores the final review output when a review stage runs

This directory is primarily used by `/tdd` and `/rapid`. `/dev` is the direct path and normally does not need `.plan/` artifacts.

## Recommended Default

- Use `/tdd` when correctness and regression safety matter most
- Use `/dev` for small direct changes
- Use `/rapid` when you want structure without the TDD overhead
- On Claude Code, use one worktree per feature, prefer fresh top-level sessions per workflow stage, and scale parallel work by adding worktrees rather than nesting more workers
