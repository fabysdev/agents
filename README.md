# Fabys Agents

My opinionated AI workflow for coding.

- Agents for analysis, planning, implementation, review, TDD orchestration, and rapid orchestration
- Workflow skills for `/tdd`, `/rapid`, and `/dev`
- Role-specific skills for exploration, planning, implementation, review, test engineering, and test consolidation
- Validation skills for linting and testing

## Installation

```bash
npx github:fabysdev/agents#v0.5.0
```

### After Installation

The generated files are starting points. Make the skills and instructions match your repository before you rely on them in a real project.

### Lint Skill

- Update the installed lint skill so it runs the actual linting flow for your project, `skills/lint/SKILL.md`.

### Test Skill

- Update the installed test skill so it reflects the real test workflow for your project, `skills/test/SKILL.md`.

## Project-Specific Instructions

- Keep broader repository guidance in the main instructions file for the tool you chose.

This keeps the installed agents reusable while still giving the tool the local context it needs to behave correctly in your codebase.

### Role-Specific Skills

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

Customize the skills in the `skills/` directory to match your project. Keep them short, concrete, and role-specific.

## Model Thinking Effort

Recommended thinking effort settings for the models used in this workflow:

| Model               | Recommended effort | Why                                                                        |
| ------------------- | ------------------ | -------------------------------------------------------------------------- |
| `GPT-5.4 (copilot)` | `xhigh`            | Core orchestration and implementation quality benefit from deep reasoning. |

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
