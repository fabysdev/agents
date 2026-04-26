---
name: fabys-exploration
description: Use this skill when exploring the codebase to gather context and identify relevant patterns.
user-invocable: false
---

# Exploration

Invoke the `fabys-explorer` subagent to gather codebase context. When the request spans multiple independent areas (e.g., frontend + backend, different features, separate repos), launch **2–3 fabys-explorer subagents in parallel** — one per area — to speed up discovery.

Each fabys-explorer subagent should surface:

- Analogous existing features to use as implementation templates
- Relevant files, modules, and entry points
- Potential blockers or ambiguities grounded in actual code

Wait for all fabys-explorer invocations to fully complete and return their results before proceeding.

