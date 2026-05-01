import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {PassThrough} from "node:stream";
import {afterEach, beforeEach, describe, it} from "node:test";

import {FABYS_AGENTS_CONFIG_FILENAME, loadFabysAgentConfig, resolveConfiguredProjectSkills, resolveToolConfig} from "../src/config.js";
import {install, optionalProjectSkills, type InstallResult, type Tool} from "../src/install.js";
import {agents, allAgents, skills, type TemplateEntry} from "../src/templates/index.js";
import {determineProjectSkills, determineTool, parseArgs, promptForProjectSkills, promptForTool} from "../src/cli.js";

const CLAUDE_MODEL_PATTERN = /model:\s+claude-[\w.-]+/;
const OPENCODE_MODEL_PATTERN = /model:\s+\S+\/\S+/;
const EXPECTED_SKILL_PATHS: string[] = [
  "dev/SKILL.md",
  "exploration/SKILL.md",
  "fabys-exploration/SKILL.md",
  "fabys-questions/SKILL.md",
  "impl/SKILL.md",
  "implementation/SKILL.md",
  "lint/SKILL.md",
  "planning/SKILL.md",
  "rapid/SKILL.md",
  "review/SKILL.md",
  "tdd/SKILL.md",
  "test-consolidation/SKILL.md",
  "test-engineering/SKILL.md",
  "test/SKILL.md"
].sort();
const EXPECTED_FABYS_SKILL_PATHS: string[] = EXPECTED_SKILL_PATHS.filter((relativePath) => relativePath.startsWith("fabys-"));
const EXPECTED_MANDATORY_SKILL_PATHS: string[] = ["lint/SKILL.md", "test/SKILL.md"];
const EXPECTED_WORKFLOW_SKILL_PATHS: string[] = ["dev/SKILL.md", "impl/SKILL.md", "rapid/SKILL.md", "tdd/SKILL.md"];
const DEFAULT_OPTIONAL_PROJECT_SKILLS: string[] = optionalProjectSkills.map(({name}) => name);
const REQUIRED_SKILL_FRONTMATTER_KEYS: string[] = ["name", "description"];
const SUPPORTED_CLAUDE_SKILL_FRONTMATTER_KEYS: string[] = ["argument-hint", "description", "disable-model-invocation", "name", "user-invocable"];
const PROJECT_SPECIFIC_INSTRUCTION_EXPECTATIONS: Array<{
  relativePath: string;
  requiredSnippets: string[];
  forbiddenSnippets: string[];
}> = [
  {
    relativePath: "fabys-explorer.agent.md",
    requiredSnippets: [
      "Use the `exploration` skill, if available, to load project-specific exploration conventions.",
      "Use those instructions to decide what to search for, what to prioritize, what to ignore and how to explore."
    ],
    forbiddenSnippets: ["<exploration_project_specifics>"]
  },
  {
    relativePath: "fabys-planner.agent.md",
    requiredSnippets: [
      "Use the `planning` skill to load project-specific planning conventions.",
      "Treat those conventions as authoritative where they conflict with default planning heuristics."
    ],
    forbiddenSnippets: ["<planning_project_specifics>"]
  },
  {
    relativePath: "fabys-implementer.agent.md",
    requiredSnippets: [
      "Use the `implementation` skill to load project-specific implementation conventions.",
      "Treat those conventions as authoritative where they conflict with general implementation guidance."
    ],
    forbiddenSnippets: ["<implementation_project_specifics>"]
  },
  {
    relativePath: "fabys-reviewer.agent.md",
    requiredSnippets: ["Use the `review` skill to load project-specific review standards.", "Treat those standards as authoritative where they conflict with general review heuristics."],
    forbiddenSnippets: ["<review_project_specifics>"]
  },
  {
    relativePath: "fabys-test-engineer.agent.md",
    requiredSnippets: [
      "Use the `test-engineering` skill to load project-specific test conventions.",
      "Treat those conventions as authoritative where they conflict with general testing guidance."
    ],
    forbiddenSnippets: ["<test_engineering_project_specifics>"]
  },
  {
    relativePath: "fabys-test-consolidator.agent.md",
    requiredSnippets: [
      "Use the `test-consolidation`, if available, and `test-engineering` skill to load project-specific test consolidation conventions.",
      "Treat those conventions as authoritative where they conflict with general consolidation guidance."
    ],
    forbiddenSnippets: ["<test_consolidation_project_specifics>"]
  }
];
const PORTABILITY_INSTRUCTION_EXPECTATIONS: Array<{
  relativePath: string;
  requiredSnippets: string[];
}> = [
  {
    relativePath: "fabys-analyst.agent.md",
    requiredSnippets: ["`fabys-exploration` skill", "`fabys-questions` skill"]
  },
  {
    relativePath: "fabys-critic.agent.md",
    requiredSnippets: ["`fabys-questions` skill"]
  },
  {
    relativePath: "fabys-impl.agent.md",
    requiredSnippets: ["`fabys-exploration` skill", "`fabys-questions` skill"]
  },
  {
    relativePath: "fabys-implementer.agent.md",
    requiredSnippets: ["`fabys-exploration` skill"]
  },
  {
    relativePath: "fabys-planner.agent.md",
    requiredSnippets: ["`fabys-exploration` skill", "`fabys-questions` skill"]
  },
  {
    relativePath: "fabys-rapid.agent.md",
    requiredSnippets: ["`fabys-questions` skill"]
  },
  {
    relativePath: "fabys-reviewer.agent.md",
    requiredSnippets: ["`fabys-exploration` skill"]
  },
  {
    relativePath: "fabys-tdd.agent.md",
    requiredSnippets: ["`fabys-questions` skill"]
  },
  {
    relativePath: "fabys-test-consolidator.agent.md",
    requiredSnippets: ["`fabys-exploration` skill"]
  },
  {
    relativePath: "fabys-test-engineer.agent.md",
    requiredSnippets: ["`fabys-exploration` skill"]
  }
];
const WORKFLOW_STATE_EXPECTATIONS: Array<{
  relativePath: string;
  requiredSnippets: string[];
  forbiddenSnippets: string[];
}> = [
  {
    relativePath: "fabys-impl.agent.md",
    requiredSnippets: [
      'Keep `state.json` as the single source of truth for resumable "/impl" runs',
      '"workflow": "impl"',
      '"status": "planning"',
      '"current_stage": "planning"',
      '"last_review_file": null',
      '"last_review_verdict": null',
      '"needs_rereview": false',
      '"review_replan_pending": false',
      '"latest_review": null',
      'If no `state.json` exists, treat the run as a new or one-session "/impl" workflow.'
    ],
    forbiddenSnippets: ["COMPLETE_*", "RED_*"]
  },
  {
    relativePath: "fabys-rapid.agent.md",
    requiredSnippets: [
      "Keep `state.json` as the single source of truth for workflow progress",
      "Phase files remain named `phase*.md`; never rename them to track progress",
      '"status": "planning"',
      '"current_stage": "planning"',
      '"review_cycle": 0',
      '"last_review_file": null',
      '"last_review_verdict": null',
      '"needs_rereview": false',
      '"review_replan_pending": false',
      '"latest_review": null',
      "Reviews are append-only and numbered.",
      "If all phases are `complete`, go to Review when `needs_rereview` or `review_requested` is `true`; otherwise ask whether to review or finish."
    ],
    forbiddenSnippets: ["COMPLETE_*", "RED_*"]
  },
  {
    relativePath: "fabys-tdd.agent.md",
    requiredSnippets: [
      "Keep `state.json` as the single source of truth for workflow progress",
      "`state.json` marks a phase as `red_complete` after Red and `complete` after Green",
      '"status": "planning"',
      '"current_stage": "planning"',
      '"review_cycle": 0',
      '"last_review_file": null',
      '"last_review_verdict": null',
      '"needs_rereview": false',
      '"review_replan_pending": false',
      '"latest_review": null',
      "Reviews are append-only and numbered.",
      "If `review_replan_pending` is `true`, resume Stage 1 using `last_review_file` and the latest reviewer findings as inputs."
    ],
    forbiddenSnippets: ["COMPLETE_*", "RED_*"]
  }
];
const REVIEW_ROUTING_EXPECTATIONS: Array<{
  relativePath: string;
  requiredSnippets: string[];
}> = [
  {
    relativePath: "fabys-reviewer.agent.md",
    requiredSnippets: [
      "review-XX.md",
      "Route: NONE | APPEND_PHASES | REPLAN_REQUIRED",
      "You may append rework phase files and update `plan.md` only when Route is `APPEND_PHASES`",
      "## Original phase path",
      "## Required changes",
      "## Constraints to preserve",
      "## Test updates required",
      "original phase: .plan/[feature]/phaseNN_<slug>.md",
      "If Route is `REPLAN_REQUIRED`, create no rework phases."
    ]
  },
  {
    relativePath: "fabys-planner.agent.md",
    requiredSnippets: [
      "review-driven `REPLAN_REQUIRED` follow-up",
      "phaseNN_reviewXX_<slug>.md",
      "Preserve numbered review files during review-driven replans; treat them as input, not output"
    ]
  },
  {
    relativePath: "fabys-rapid.agent.md",
    requiredSnippets: ["review-01.md", "Route: APPEND_PHASES", "Route: REPLAN_REQUIRED"]
  },
  {
    relativePath: "fabys-tdd.agent.md",
    requiredSnippets: ["review-01.md", "Route: APPEND_PHASES", "Route: REPLAN_REQUIRED"]
  }
];
const INLINE_IMPL_REVIEW_EXPECTATIONS: Array<{
  relativePath: string;
  requiredSnippets: string[];
}> = [
  {
    relativePath: "fabys-impl.agent.md",
    requiredSnippets: [
      "For inline mode, include the request summary, key design decisions, review mode, validation results, changed files or diffs, whether tests are in scope and whether review findings should stay inline or be written to a durable artifact.",
      "When delegating from inline mode, explicitly pass the inline plan summary, key decisions, changed files or diffs, validation results, and whether tests are in scope."
    ]
  },
  {
    relativePath: "fabys-reviewer.agent.md",
    requiredSnippets: [
      "If no planning artifacts exist, use the provided request summary, review scope, changed files, diffs, key design decisions, and validation results as the source of truth",
      "Artifact-light reviews: save the review report to `./.plan/[feature]/review.md` only when the caller asked for a durable artifact or the findings are worth preserving.",
      "Inline reviews: do not create a review file; return the review in your response.",
      "If there are no phase files, create no rework phases; keep required follow-up in the review findings and let the caller decide whether to re-enter planning."
    ]
  }
];
const VALIDATION_CONTRACT_EXPECTATIONS: Array<{
  relativePath: string;
  requiredSnippets: string[];
  forbiddenSnippets: string[];
}> = [
  {
    relativePath: "fabys-implementer.agent.md",
    requiredSnippets: ["**Standard no-test:**", "Skip mandatory test validation unless the caller explicitly asks for tests", "required validation for the chosen mode"],
    forbiddenSnippets: ["Code is NOT complete until both lint and test pass."]
  },
  {
    relativePath: "fabys-reviewer.agent.md",
    requiredSnippets: ["**No-test review:**", "Do not block solely because tests are absent.", "Test skill: exit code [0|N] — [PASS|FAIL|N/A]"],
    forbiddenSnippets: ["Lint and test pass. Coverage >80%. Production-ready."]
  }
];
const PHASE_CONTRACT_EXPECTATIONS: Array<{
  relativePath: string;
  requiredSnippets: string[];
}> = [
  {
    relativePath: "fabys-planner.agent.md",
    requiredSnippets: [
      "## Preconditions and invariants",
      "## Edge cases and failure modes to verify",
      "In test-bearing workflows, the test strategy must explicitly map relevant documented edge/failure scenarios to automated coverage or explain alternate verification",
      "Use phase files to externalize hidden reasoning"
    ]
  },
  {
    relativePath: "fabys-critic.agent.md",
    requiredSnippets: [
      "**Execution readiness**: Could a downstream implementation or test agent execute the phase directly from the phase file",
      "Does the test strategy cover the relevant documented edge/failure scenarios or explicitly state alternate verification?",
      "Treat missing or generic invariants / edge-case / failure-mode sections as a CRITICAL issue when they leave correctness or sequencing implicit"
    ]
  },
  {
    relativePath: "fabys-implementer.agent.md",
    requiredSnippets: [
      "Preconditions and invariants or constraints to preserve",
      "If the phase includes `## Original phase path`, read that original phase too and treat the current phase as a review follow-up delta.",
      "Treat documented invariants and edge/failure cases as part of the contract, not optional guidance"
    ]
  },
  {
    relativePath: "fabys-test-engineer.agent.md",
    requiredSnippets: [
      "- Preconditions and invariants or constraints to preserve",
      "- Edge cases and failure modes to verify when present",
      "Test strategy or test updates required: behaviors to verify, mock boundaries, test data, and any documented non-automated verification",
      "If the phase includes `## Original phase path`, read that original phase too and treat the current phase as a review follow-up delta."
    ]
  }
];
const PLANNING_WORKFLOW_EXPECTATIONS: Array<{
  relativePath: string;
  requiredSnippets: string[];
}> = [
  {
    relativePath: "fabys-impl.agent.md",
    requiredSnippets: [
      "The plan should capture: request summary, key design decisions, relevant files and patterns, validation strategy, test expectations, and sequencing constraints.",
      "For one-session work, keep the plan in the conversation.",
      "Present the current plan to the user every time, explicitly stating whether it is inline or artifact mode and why that mode was chosen, alongside the inline mode summary or artifact mode plan.",
      "Use the `fabys-questions` skill to ask for explicit approval before implementation begins.",
      'Do not create `phase*.md` files for ordinary "/impl" work.'
    ]
  },
  {
    relativePath: "fabys-rapid.agent.md",
    requiredSnippets: [
      "Each phase file includes: scope, preconditions and invariants, implementation outline, edge cases and failure modes to verify, and dependencies",
      "but preconditions, invariants, sequencing, and edge/failure handling should still be explicit enough for a smaller implementation model."
    ]
  },
  {
    relativePath: "fabys-tdd.agent.md",
    requiredSnippets: [
      "Each phase file includes: scope, preconditions and invariants, edge cases and failure modes to verify, test strategy, and dependencies",
      "On later planning cycles, reuse the same session when available and pass only the current planning artifacts, current workflow state, and critic feedback.",
      "Each phase must be able to complete a full TDD cycle: write only that phase's failing tests, make them pass, refactor, and leave the suite green before the next phase begins."
    ]
  }
];
const USER_GATE_EXPECTATIONS: Array<{
  relativePath: string;
  requiredSnippets: string[];
}> = [
  {
    relativePath: "fabys-impl.agent.md",
    requiredSnippets: [
      "Use the `fabys-questions` skill whenever you need explicit user approval or a user decision point; always present the plan, get explicit approval before implementation, and ask whether review should run",
      "Always use the `fabys-questions` skill to ask the user whether review should be run, even when your default assessment is that review is unnecessary.",
      "If the user declines review, skip it and proceed without adding extra ceremony."
    ]
  }
];

describe("template rendering", () => {
  const tools: Tool[] = ["copilot", "opencode", "claude"];

  describe("agents", () => {
    for (const entry of allAgents) {
      for (const tool of tools) {
        it(`${entry.relativePath} renders valid YAML frontmatter for ${tool}`, (): void => {
          // Act
          const output: string = entry.render(tool);

          // Assert
          assert.match(output, /^---\n/);
          assert.match(output, /\n---\n/);
        });
      }

      it(`${entry.relativePath} copilot output contains copilot model`, (): void => {
        // Act
        const output: string = entry.render("copilot");

        // Assert
        assert.match(output, /\(copilot\)/);
      });

      it(`${entry.relativePath} opencode output contains opencode model`, (): void => {
        // Act
        const output: string = entry.render("opencode");

        // Assert
        assert.match(output, OPENCODE_MODEL_PATTERN);
      });

      it(`${entry.relativePath} claude output contains claude model`, (): void => {
        // Act
        const output: string = entry.render("claude");

        // Assert
        assert.match(output, CLAUDE_MODEL_PATTERN);
      });

      if (agents.includes(entry)) {
        for (const tool of tools) {
          it(`${entry.relativePath} uses the render context model override for ${tool}`, (): void => {
            // Arrange
            const agentName = entry.relativePath.replace(/\.agent\.md$/, "");
            const overrideModel = `custom/${agentName}-${tool}`;

            // Act
            const output: string = entry.render(tool, {
              models: {
                [agentName]: overrideModel
              }
            });

            // Assert
            assert.ok(output.includes(`model: ${overrideModel}`));
          });
        }

        it(`${entry.relativePath} ignores an empty render context`, (): void => {
          // Assert
          assert.strictEqual(entry.render("copilot", {}), entry.render("copilot"));
        });
      }

      it(`${entry.relativePath} output has no template markers`, (): void => {
        // Act
        for (const tool of tools) {
          const output: string = entry.render(tool);

          // Assert
          assert.ok(!output.includes("<!-- copilot-header -->"));
          assert.ok(!output.includes("<!-- opencode-header -->"));
          assert.ok(!output.includes("<!-- body -->"));
        }
      });

      it(`${entry.relativePath} output ends with exactly one trailing newline`, (): void => {
        // Act
        for (const tool of tools) {
          const output: string = entry.render(tool);

          // Assert
          assert.ok(output.endsWith("\n"));
          assert.ok(!output.endsWith("\n\n"));
        }
      });
    }

    it("has the correct .agent.md relative paths", (): void => {
      // Assert
      for (const entry of allAgents) {
        assert.match(entry.relativePath, /\.agent\.md$/);
      }
    });

    it("copilot output does not contain opencode model paths", (): void => {
      // Act & Assert
      for (const entry of allAgents) {
        const output: string = entry.render("copilot");
        assert.ok(!output.includes("anthropic/"));
        assert.ok(!output.includes("openai/"));
      }
    });

    it("opencode output does not contain copilot markers", (): void => {
      // Act & Assert
      for (const entry of allAgents) {
        const output: string = entry.render("opencode");
        assert.ok(!output.includes("(copilot)"));
      }
    });

    for (const expectation of PROJECT_SPECIFIC_INSTRUCTION_EXPECTATIONS) {
      it(`${expectation.relativePath} uses role-specific skills instead of XML blocks`, (): void => {
        // Arrange
        const entry = allAgents.find((agent) => agent.relativePath === expectation.relativePath);

        // Assert
        assert.ok(entry);

        const output: string = entry!.render("copilot");

        for (const snippet of expectation.requiredSnippets) {
          assert.ok(output.includes(snippet));
        }

        for (const snippet of expectation.forbiddenSnippets) {
          assert.ok(!output.includes(snippet));
        }
      });
    }

    for (const expectation of PORTABILITY_INSTRUCTION_EXPECTATIONS) {
      for (const tool of tools) {
        it(`${expectation.relativePath} references portability skills for ${tool}`, (): void => {
          // Arrange
          const entry = allAgents.find((agent) => agent.relativePath === expectation.relativePath);

          // Assert
          assert.ok(entry);

          const output: string = entry!.render(tool);

          for (const snippet of expectation.requiredSnippets) {
            assert.ok(output.includes(snippet));
          }
        });
      }
    }

    for (const expectation of WORKFLOW_STATE_EXPECTATIONS) {
      it(`${expectation.relativePath} uses resumable state without workflow file renames`, (): void => {
        // Arrange
        const entry = allAgents.find((agent) => agent.relativePath === expectation.relativePath);

        // Assert
        assert.ok(entry);

        const output: string = entry!.render("copilot");

        for (const snippet of expectation.requiredSnippets) {
          assert.ok(output.includes(snippet));
        }

        for (const snippet of expectation.forbiddenSnippets) {
          assert.ok(!output.includes(snippet));
        }
      });
    }

    for (const expectation of VALIDATION_CONTRACT_EXPECTATIONS) {
      it(`${expectation.relativePath} supports workflow-specific validation contracts`, (): void => {
        // Arrange
        const entry = allAgents.find((agent) => agent.relativePath === expectation.relativePath);

        // Assert
        assert.ok(entry);

        const output: string = entry!.render("copilot");

        for (const snippet of expectation.requiredSnippets) {
          assert.ok(output.includes(snippet));
        }

        for (const snippet of expectation.forbiddenSnippets) {
          assert.ok(!output.includes(snippet));
        }
      });
    }

    for (const expectation of PHASE_CONTRACT_EXPECTATIONS) {
      it(`${expectation.relativePath} exposes the stronger phase handoff contract`, (): void => {
        // Arrange
        const entry = allAgents.find((agent) => agent.relativePath === expectation.relativePath);

        // Assert
        assert.ok(entry);

        const output: string = entry!.render("copilot");

        for (const snippet of expectation.requiredSnippets) {
          assert.ok(output.includes(snippet));
        }
      });
    }

    for (const expectation of PLANNING_WORKFLOW_EXPECTATIONS) {
      it(`${expectation.relativePath} requires explicit invariants and edge cases in planning output`, (): void => {
        // Arrange
        const entry = allAgents.find((agent) => agent.relativePath === expectation.relativePath);

        // Assert
        assert.ok(entry);

        const output: string = entry!.render("copilot");

        for (const snippet of expectation.requiredSnippets) {
          assert.ok(output.includes(snippet));
        }
      });
    }

    for (const expectation of USER_GATE_EXPECTATIONS) {
      it(`${expectation.relativePath} enforces explicit user approval and review decisions`, (): void => {
        // Arrange
        const entry = allAgents.find((agent) => agent.relativePath === expectation.relativePath);

        // Assert
        assert.ok(entry);

        const output: string = entry!.render("copilot");

        for (const snippet of expectation.requiredSnippets) {
          assert.ok(output.includes(snippet));
        }
      });
    }

    for (const expectation of REVIEW_ROUTING_EXPECTATIONS) {
      it(`${expectation.relativePath} supports numbered review routing and append-only follow-up work`, (): void => {
        // Arrange
        const entry = allAgents.find((agent) => agent.relativePath === expectation.relativePath);

        // Assert
        assert.ok(entry);

        const output: string = entry!.render("copilot");

        for (const snippet of expectation.requiredSnippets) {
          assert.ok(output.includes(snippet));
        }
      });
    }

    for (const expectation of INLINE_IMPL_REVIEW_EXPECTATIONS) {
      it(`${expectation.relativePath} supports inline /impl review handoff without plan artifacts`, (): void => {
        // Arrange
        const entry = allAgents.find((agent) => agent.relativePath === expectation.relativePath);

        // Assert
        assert.ok(entry);

        const output: string = entry!.render("copilot");

        for (const snippet of expectation.requiredSnippets) {
          assert.ok(output.includes(snippet));
        }
      });
    }
  });

  describe("skills", () => {
    for (const entry of skills) {
      for (const tool of tools) {
        it(`${entry.relativePath} renders non-empty content for ${tool}`, (): void => {
          // Act
          const output: string = entry.render(tool);

          // Assert
          assert.ok(output.length > 0);
          assert.ok(output.endsWith("\n"));
          assert.match(output, /^---\n/);
          assert.match(output, /\n---\n/);
        });
      }

      it(`${entry.relativePath} contains SKILL.md in path`, (): void => {
        // Assert
        assert.ok(entry.relativePath.includes("SKILL.md"));
      });

      it(`${entry.relativePath} omits Copilot-only frontmatter for opencode`, (): void => {
        // Act
        const output: string = entry.render("opencode");

        // Assert
        assert.ok(!output.includes("compatibility:"));
        assert.ok(!output.includes("disable-model-invocation:"));
        assert.ok(!output.includes("argument-hint:"));
      });
    }

    it("exports the full workflow and role-specific skill set", (): void => {
      // Arrange
      const relativePaths: string[] = skills.map((entry) => entry.relativePath).sort();

      // Assert
      assert.deepStrictEqual(relativePaths, EXPECTED_SKILL_PATHS);
    });

    it("fabys-exploration skill uses tool-specific exploration instructions", (): void => {
      // Arrange
      const entry = skills.find((skill) => skill.relativePath === "fabys-exploration/SKILL.md");

      // Assert
      assert.ok(entry);

      const copilot: string = entry!.render("copilot");
      const opencode: string = entry!.render("opencode");
      const claude: string = entry!.render("claude");

      assert.ok(copilot.includes("Invoke the `fabys-explorer` subagent"));
      assert.ok(opencode.includes("Use the `exploration` skill, if available,"));
      assert.ok(claude.includes("maximum parallelism"));
      assert.ok(claude.includes("Use the `exploration` skill, if available,"));
    });

    it("fabys-questions skill uses tool-specific question primitives", (): void => {
      // Arrange
      const entry = skills.find((skill) => skill.relativePath === "fabys-questions/SKILL.md");

      // Assert
      assert.ok(entry);

      assert.ok(entry!.render("copilot").includes("`askQuestions` tool"));
      assert.ok(entry!.render("claude").includes("`AskUserQuestion` tool"));
      assert.ok(entry!.render("opencode").includes("`question` tool"));
    });

    it("impl skill tells the workflow to implement the user request", (): void => {
      // Arrange
      const entry = skills.find((skill) => skill.relativePath === "impl/SKILL.md");

      // Assert
      assert.ok(entry);

      const output: string = entry!.render("copilot");

      assert.ok(output.includes("Implement the user request through your workflow."));
      assert.ok(!output.includes("Delegate the user request through your workflow."));
    });

    it("planning skill stays project-specific and does not duplicate agent-level planning rules", (): void => {
      // Arrange
      const entry = skills.find((skill) => skill.relativePath === "planning/SKILL.md");

      // Assert
      assert.ok(entry);

      const output: string = entry!.render("copilot");

      assert.ok(output.includes("Project-specific planning conventions."));
      assert.ok(!output.includes("smaller downstream implementation model"));
      assert.ok(!output.includes("Write edge cases as trigger -> expected behavior pairs."));
    });
  });

  it("render function returns same content for same arguments", (): void => {
    // Arrange
    const entry: TemplateEntry = allAgents[0];

    // Act
    const first: string = entry.render("copilot");
    const second: string = entry.render("copilot");

    // Assert
    assert.strictEqual(first, second);
  });

  it("render returns different content for different tools", (): void => {
    // Act
    const copilot: string = allAgents[0].render("copilot");
    const opencode: string = allAgents[0].render("opencode");
    const claude: string = allAgents[0].render("claude");

    // Assert
    assert.notStrictEqual(copilot, opencode);
    assert.notStrictEqual(copilot, claude);
    assert.notStrictEqual(opencode, claude);
  });
});

describe("loadFabysAgentConfig", () => {
  let tempRoot: string;

  beforeEach((): void => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fabysagents-config-"));
  });

  afterEach((): void => {
    fs.rmSync(tempRoot, {force: true, recursive: true});
  });

  it("loads the default config file from the current working directory", (): void => {
    // Arrange
    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      opencode: {
        models: {
          "fabys-tdd": "openai/gpt-5.5"
        },
        skills: {
          exploration: false,
          review: true
        }
      }
    });

    // Act
    const loadedConfig = loadFabysAgentConfig({cwd: tempRoot});

    // Assert
    assert.strictEqual(loadedConfig.projectRoot, tempRoot);
    assert.deepStrictEqual(loadedConfig.config, {
      opencode: {
        models: {
          "fabys-tdd": "openai/gpt-5.5"
        },
        skills: {
          exploration: false,
          review: true
        }
      }
    });
  });

  it("loads independent model and skill overrides for multiple tools", (): void => {
    // Arrange
    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      claude: {
        models: {
          "fabys-reviewer": "claude-opus-4-5"
        }
      },
      copilot: {
        skills: {
          planning: false
        }
      },
      opencode: {
        models: {
          "fabys-tdd": "openai/gpt-5.5"
        },
        skills: {
          exploration: false
        }
      }
    });

    // Act
    const loadedConfig = loadFabysAgentConfig({cwd: tempRoot});

    // Assert
    assert.deepStrictEqual(loadedConfig.config, {
      claude: {
        models: {
          "fabys-reviewer": "claude-opus-4-5"
        }
      },
      copilot: {
        skills: {
          planning: false
        }
      },
      opencode: {
        models: {
          "fabys-tdd": "openai/gpt-5.5"
        },
        skills: {
          exploration: false
        }
      }
    });
  });

  it("returns an empty config when no default config file exists", (): void => {
    // Act
    const loadedConfig = loadFabysAgentConfig({cwd: tempRoot});

    // Assert
    assert.strictEqual(loadedConfig.projectRoot, tempRoot);
    assert.deepStrictEqual(loadedConfig.config, {});
  });

  it("loads config from a directory passed via --config semantics", (): void => {
    // Arrange
    const projectRoot: string = path.join(tempRoot, "workspace", "project");
    fs.mkdirSync(projectRoot, {recursive: true});
    writeJsonFile(projectRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      claude: {
        skills: {
          planning: false
        }
      }
    });

    // Act
    const loadedConfig = loadFabysAgentConfig({
      configLocation: projectRoot,
      cwd: tempRoot
    });

    // Assert
    assert.strictEqual(loadedConfig.projectRoot, projectRoot);
    assert.deepStrictEqual(loadedConfig.config, {
      claude: {
        skills: {
          planning: false
        }
      }
    });
  });

  it("loads config from an explicit file path", (): void => {
    // Arrange
    const projectRoot: string = path.join(tempRoot, "workspace", "project");
    const configPath: string = path.join(projectRoot, FABYS_AGENTS_CONFIG_FILENAME);

    fs.mkdirSync(projectRoot, {recursive: true});
    writeJsonFile(projectRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      copilot: {
        models: {
          "fabys-reviewer": "openai/gpt-5.5"
        }
      }
    });

    // Act
    const loadedConfig = loadFabysAgentConfig({
      configLocation: configPath,
      cwd: tempRoot
    });

    // Assert
    assert.strictEqual(loadedConfig.projectRoot, projectRoot);
    assert.deepStrictEqual(loadedConfig.config, {
      copilot: {
        models: {
          "fabys-reviewer": "openai/gpt-5.5"
        }
      }
    });
  });

  it("returns an empty config when --config points to a directory without a config file", (): void => {
    // Arrange
    const projectRoot: string = path.join(tempRoot, "workspace", "project");
    fs.mkdirSync(projectRoot, {recursive: true});

    // Act
    const loadedConfig = loadFabysAgentConfig({
      configLocation: projectRoot,
      cwd: tempRoot
    });

    // Assert
    assert.strictEqual(loadedConfig.projectRoot, projectRoot);
    assert.deepStrictEqual(loadedConfig.config, {});
  });

  it("throws when an explicit config file does not exist", (): void => {
    // Arrange
    const missingConfigPath: string = path.join(tempRoot, "missing.json");

    // Act
    const loadMissingConfig = (): ReturnType<typeof loadFabysAgentConfig> =>
      loadFabysAgentConfig({
        configLocation: missingConfigPath,
        cwd: tempRoot
      });

    // Assert
    assert.throws(loadMissingConfig, /config file not found/i);
  });

  it("throws when the config file contains invalid JSON", (): void => {
    // Arrange
    writeFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, "{invalid json}\n");

    // Act
    const loadInvalidConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    // Assert
    assert.throws(loadInvalidConfig, /invalid json/i);
  });

  it("throws when the config root is not an object", (): void => {
    // Arrange
    writeFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, "[]\n");

    // Act
    const loadArrayConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    // Assert
    assert.throws(loadArrayConfig, /json object/i);
  });

  it("throws when the config uses unsupported top-level keys", (): void => {
    // Arrange
    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      models: {}
    });

    // Act
    const loadUnsupportedConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    // Assert
    assert.throws(loadUnsupportedConfig, /unsupported config keys/i);
  });

  it("throws when a tool config is not an object or contains unsupported keys", (): void => {
    // Arrange
    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      opencode: []
    });

    // Act
    const loadArrayToolConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    // Assert
    assert.throws(loadArrayToolConfig, /expected "opencode"/i);

    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      opencode: {
        unknown: true
      }
    });

    const loadUnsupportedToolConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    assert.throws(loadUnsupportedToolConfig, /unsupported opencode config keys/i);
  });

  it("throws when model overrides use unsupported agents or invalid values", (): void => {
    // Arrange
    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      opencode: {
        models: {
          unknown: "openai/gpt-5.5"
        }
      }
    });

    // Act
    const loadUnsupportedAgentConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    // Assert
    assert.throws(loadUnsupportedAgentConfig, /unsupported agent model override/i);

    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      opencode: {
        models: {
          "fabys-tdd": "   "
        }
      }
    });

    const loadEmptyModelConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    assert.throws(loadEmptyModelConfig, /non-empty string/i);

    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      opencode: {
        models: {
          "fabys-tdd": "openai/gpt-5.5\nother"
        }
      }
    });

    const loadMultilineModelConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    assert.throws(loadMultilineModelConfig, /single line/i);
  });

  it("throws when model overrides are not objects or string values", (): void => {
    // Arrange
    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      opencode: {
        models: []
      }
    });

    // Act
    const loadArrayModelsConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    // Assert
    assert.throws(loadArrayModelsConfig, /expected "models" for opencode/i);

    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      opencode: {
        models: {
          "fabys-tdd": 42
        }
      }
    });

    const loadNonStringModelConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    assert.throws(loadNonStringModelConfig, /to be a string/i);
  });

  it("throws when project skill flags use unsupported names or invalid types", (): void => {
    // Arrange
    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      opencode: {
        skills: {
          unknown: false
        }
      }
    });

    // Act
    const loadUnsupportedSkillConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    // Assert
    assert.throws(loadUnsupportedSkillConfig, /unsupported project skill/i);

    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      opencode: {
        skills: {
          exploration: "false"
        }
      }
    });

    const loadInvalidSkillValueConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    assert.throws(loadInvalidSkillValueConfig, /boolean/i);
  });

  it("throws when project skill flags are not an object", (): void => {
    // Arrange
    writeJsonFile(tempRoot, FABYS_AGENTS_CONFIG_FILENAME, {
      opencode: {
        skills: []
      }
    });

    // Act
    const loadArraySkillsConfig = (): ReturnType<typeof loadFabysAgentConfig> => loadFabysAgentConfig({cwd: tempRoot});

    // Assert
    assert.throws(loadArraySkillsConfig, /expected "skills" for opencode/i);
  });
});

describe("README configuration docs", () => {
  it("documents a valid per-tool config example", (): void => {
    // Arrange
    const readme = fs.readFileSync(path.join(process.cwd(), "README.md"), "utf8");
    const exampleMatch = /```json\n([\s\S]*?"opencode"[\s\S]*?)\n```/.exec(readme);

    // Act
    const configExample = exampleMatch === null ? undefined : JSON.parse(exampleMatch[1]);

    // Assert
    assert.ok(exampleMatch, "Expected README to include a JSON config example for opencode.");
    assert.deepStrictEqual(configExample, {
      claude: {
        skills: {
          planning: false
        }
      },
      opencode: {
        models: {
          "fabys-tdd": "openai/gpt-5.5"
        },
        skills: {
          exploration: false,
          review: true
        }
      }
    });
  });

  it("does not document the retired global config shape", (): void => {
    // Arrange
    const readme = fs.readFileSync(path.join(process.cwd(), "README.md"), "utf8");

    // Act
    const configurationSection = readme.slice(readme.indexOf("### Configuration"), readme.indexOf("### Supported Targets"));

    // Assert
    assert.ok(configurationSection.includes("per tool"));
    assert.ok(!configurationSection.includes("top-level `models`"));
    assert.ok(!configurationSection.includes("top-level `skills`"));
  });
});

describe("resolveToolConfig", () => {
  it("returns the requested tool config without using other tool overrides", (): void => {
    // Act
    const toolConfig = resolveToolConfig(
      {
        copilot: {
          models: {
            "fabys-tdd": "GPT-5.4 (copilot)"
          }
        },
        opencode: {
          skills: {
            exploration: false
          }
        }
      },
      "opencode"
    );

    // Assert
    assert.deepStrictEqual(toolConfig, {
      skills: {
        exploration: false
      }
    });
  });

  it("returns an empty config when the selected tool has no overrides", (): void => {
    // Act
    const toolConfig = resolveToolConfig(
      {
        claude: {
          skills: {
            planning: false
          }
        }
      },
      "copilot"
    );

    // Assert
    assert.deepStrictEqual(toolConfig, {});
  });
});

describe("resolveConfiguredProjectSkills", () => {
  it("keeps the default optional skill set except for disabled entries", (): void => {
    // Act
    const selectedSkills = resolveConfiguredProjectSkills({
      exploration: false,
      review: false,
      "test-engineering": true
    });

    // Assert
    assert.deepStrictEqual(
      selectedSkills,
      DEFAULT_OPTIONAL_PROJECT_SKILLS.filter((skillName) => skillName !== "exploration" && skillName !== "review")
    );
  });

  it("returns all optional skills when the config object is empty", (): void => {
    // Act
    const selectedSkills = resolveConfiguredProjectSkills({});

    // Assert
    assert.deepStrictEqual(selectedSkills, DEFAULT_OPTIONAL_PROJECT_SKILLS);
  });
});

describe("install", () => {
  let tempRoot: string;
  let targetBase: string;

  beforeEach((): void => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "fabysagents-test-"));
    targetBase = path.join(tempRoot, "target-project", ".github");
  });

  afterEach((): void => {
    fs.rmSync(tempRoot, {force: true, recursive: true});
  });

  it("creates all agent files into target/agents/", (): void => {
    // Act
    install({targetBase, tool: "copilot"});

    // Assert
    for (const entry of agents) {
      const targetPath: string = path.join(targetBase, "agents", entry.relativePath);
      assert.ok(fs.existsSync(targetPath));
      assert.strictEqual(fs.readFileSync(targetPath, "utf8"), entry.render("copilot"));
    }
  });

  it("does not install the analyst reference agent", (): void => {
    // Act
    install({targetBase, tool: "copilot"});

    // Assert
    assert.ok(!fs.existsSync(path.join(targetBase, "agents", "fabys-analyst.agent.md")));
  });

  it("removes the retired analyst agent on re-run", (): void => {
    // Arrange
    writeFile(targetBase, path.join("agents", "fabys-analyst.agent.md"), "stale analyst agent\n");

    // Act
    install({targetBase, tool: "copilot"});

    // Assert
    assert.ok(!fs.existsSync(path.join(targetBase, "agents", "fabys-analyst.agent.md")));
  });

  it("creates skill files when they don't exist", (): void => {
    // Act
    install({targetBase, tool: "copilot"});

    // Assert
    for (const entry of skills) {
      const targetPath: string = path.join(targetBase, "skills", entry.relativePath);
      assert.ok(fs.existsSync(targetPath));
      assert.strictEqual(fs.readFileSync(targetPath, "utf8"), entry.render("copilot"));
    }
  });

  it("preserves project-specific skills and refreshes shared skills when they already exist", (): void => {
    // Arrange
    const existingDevContent: string = "---\nname: dev\n---\nOutdated workflow skill\n";
    const existingLintContent: string = "---\nname: lint\n---\nProject-specific lint instructions\n";
    const existingTestContent: string = "---\nname: test\n---\nProject-specific test instructions\n";
    const existingExplorationContent: string = "---\nname: exploration\n---\nProject-specific exploration instructions\n";
    const existingFabysExplorationContent: string = "---\nname: fabys-exploration\n---\nOutdated shared exploration workflow\n";

    writeFile(targetBase, path.join("skills", "dev", "SKILL.md"), existingDevContent);
    writeFile(targetBase, path.join("skills", "lint", "SKILL.md"), existingLintContent);
    writeFile(targetBase, path.join("skills", "test", "SKILL.md"), existingTestContent);
    writeFile(targetBase, path.join("skills", "exploration", "SKILL.md"), existingExplorationContent);
    writeFile(targetBase, path.join("skills", "fabys-exploration", "SKILL.md"), existingFabysExplorationContent);

    // Act
    install({targetBase, tool: "copilot"});

    // Assert
    assert.strictEqual(fs.readFileSync(path.join(targetBase, "skills", "dev", "SKILL.md"), "utf8"), findSkillTemplate("dev/SKILL.md").render("copilot"));
    assert.strictEqual(fs.readFileSync(path.join(targetBase, "skills", "lint", "SKILL.md"), "utf8"), existingLintContent);
    assert.strictEqual(fs.readFileSync(path.join(targetBase, "skills", "test", "SKILL.md"), "utf8"), existingTestContent);
    assert.strictEqual(fs.readFileSync(path.join(targetBase, "skills", "exploration", "SKILL.md"), "utf8"), existingExplorationContent);
    assert.strictEqual(fs.readFileSync(path.join(targetBase, "skills", "fabys-exploration", "SKILL.md"), "utf8"), findSkillTemplate("fabys-exploration/SKILL.md").render("copilot"));
  });

  it("installs only the selected optional project skills alongside mandatory, workflow, and fabys skills", (): void => {
    // Arrange
    const selectedProjectSkills: string[] = ["planning", "review"];

    // Act
    install({selectedProjectSkills, targetBase, tool: "copilot"});

    // Assert
    assert.deepStrictEqual(collectRelativeFiles(path.join(targetBase, "skills")), buildExpectedInstalledSkillPaths(selectedProjectSkills));
  });

  it("force overwrites mandatory and selected optional project skills while workflow skills are always refreshed", (): void => {
    // Arrange
    const existingDevContent: string = "---\nname: dev\n---\nCustom workflow skill\n";
    const existingLintContent: string = "---\nname: lint\n---\nCustom lint workflow\n";
    const existingReviewContent: string = "---\nname: review\n---\nCustom review workflow\n";

    writeFile(targetBase, path.join("skills", "dev", "SKILL.md"), existingDevContent);
    writeFile(targetBase, path.join("skills", "lint", "SKILL.md"), existingLintContent);
    writeFile(targetBase, path.join("skills", "review", "SKILL.md"), existingReviewContent);

    // Act
    install({
      force: true,
      selectedProjectSkills: ["review"],
      targetBase,
      tool: "copilot"
    });

    // Assert
    assert.strictEqual(fs.readFileSync(path.join(targetBase, "skills", "dev", "SKILL.md"), "utf8"), findSkillTemplate("dev/SKILL.md").render("copilot"));
    assert.strictEqual(fs.readFileSync(path.join(targetBase, "skills", "lint", "SKILL.md"), "utf8"), findSkillTemplate("lint/SKILL.md").render("copilot"));
    assert.strictEqual(fs.readFileSync(path.join(targetBase, "skills", "review", "SKILL.md"), "utf8"), findSkillTemplate("review/SKILL.md").render("copilot"));
  });

  it("throws when an unknown project skill is selected", (): void => {
    // Act
    const installWithInvalidSkill = (): InstallResult =>
      install({
        selectedProjectSkills: ["unknown-skill"],
        targetBase,
        tool: "copilot"
      });

    // Assert
    assert.throws(installWithInvalidSkill, /invalid project skill selection/i);
  });

  it("creates target directories recursively when they don't exist", (): void => {
    // Arrange
    const nestedTargetBase: string = path.join(tempRoot, "deep", "nested", "project", ".github");

    // Act
    install({
      targetBase: nestedTargetBase,
      tool: "copilot"
    });

    // Assert
    assert.ok(fs.existsSync(nestedTargetBase));
    assert.ok(fs.existsSync(path.join(nestedTargetBase, "agents")));

    for (const relativePath of EXPECTED_SKILL_PATHS) {
      assert.ok(fs.existsSync(path.join(nestedTargetBase, "skills", path.dirname(relativePath))));
    }
  });

  it("returns correct counts for a fresh install", (): void => {
    // Arrange
    const expectedCounts = {
      agents: agents.length,
      skillsWritten: skills.length,
      skillsSkipped: 0
    };

    // Act
    const result = install({targetBase, tool: "copilot"});

    // Assert
    assert.deepStrictEqual(result, expectedCounts);
  });

  it("returns correct counts when skills are skipped on re-run", (): void => {
    // Arrange
    install({targetBase, tool: "copilot"});
    const expectedCounts = {
      agents: agents.length,
      skillsWritten: EXPECTED_FABYS_SKILL_PATHS.length + EXPECTED_WORKFLOW_SKILL_PATHS.length,
      skillsSkipped: skills.length - EXPECTED_FABYS_SKILL_PATHS.length - EXPECTED_WORKFLOW_SKILL_PATHS.length
    };

    // Act
    const result = install({targetBase, tool: "copilot"});

    // Assert
    assert.deepStrictEqual(result, expectedCounts);
  });

  it("applies configured model overrides to installed agents", (): void => {
    // Act
    install({
      agentModels: {
        "fabys-explorer": "openai/gpt-5.5",
        "fabys-tdd": "openai/o4-mini"
      },
      targetBase,
      tool: "opencode"
    });

    // Assert
    assert.match(fs.readFileSync(path.join(targetBase, "agents", "fabys-explorer.md"), "utf8"), /^model: openai\/gpt-5\.5$/m);
    assert.match(fs.readFileSync(path.join(targetBase, "agents", "fabys-tdd.md"), "utf8"), /^model: openai\/o4-mini$/m);
  });

  it("leaves non-overridden agent models unchanged", (): void => {
    // Act
    install({
      agentModels: {
        "fabys-tdd": "openai/gpt-5.5"
      },
      targetBase,
      tool: "copilot"
    });

    // Assert
    assert.match(fs.readFileSync(path.join(targetBase, "agents", "fabys-tdd.agent.md"), "utf8"), /^model: openai\/gpt-5\.5$/m);
    assert.match(fs.readFileSync(path.join(targetBase, "agents", "fabys-explorer.agent.md"), "utf8"), /^model: Claude Haiku 4\.5 \(copilot\)$/m);
  });

  it("does not change skill output when agent model overrides are provided", (): void => {
    // Act
    install({
      agentModels: {
        "fabys-reviewer": "openai/gpt-5.5"
      },
      targetBase,
      tool: "copilot"
    });

    // Assert
    assert.strictEqual(fs.readFileSync(path.join(targetBase, "skills", "dev", "SKILL.md"), "utf8"), findSkillTemplate("dev/SKILL.md").render("copilot"));
  });

  it("supports installing with an empty configured project-skill selection", (): void => {
    // Act
    install({
      selectedProjectSkills: [],
      targetBase,
      tool: "copilot"
    });

    // Assert
    assert.deepStrictEqual(
      collectRelativeFiles(path.join(targetBase, "skills")),
      [...EXPECTED_FABYS_SKILL_PATHS, ...EXPECTED_MANDATORY_SKILL_PATHS, ...EXPECTED_WORKFLOW_SKILL_PATHS].sort()
    );
  });

  describe("install with tool: copilot", () => {
    it("agent files contain copilot frontmatter", (): void => {
      // Act
      install({targetBase, tool: "copilot"});

      // Assert
      for (const entry of agents) {
        const targetPath: string = path.join(targetBase, "agents", entry.relativePath);
        const content: string = fs.readFileSync(targetPath, "utf8");

        assert.match(content, /\(copilot\)/);
        assert.ok(!content.includes("anthropic/"));
        assert.ok(!content.includes("openai/"));
      }
    });

    it("skill files are created", (): void => {
      // Act
      install({targetBase, tool: "copilot"});

      // Assert
      assert.deepStrictEqual(collectRelativeFiles(path.join(targetBase, "skills")), EXPECTED_SKILL_PATHS);
    });

    it("agent filenames preserve .agent.md extension", (): void => {
      // Act
      install({targetBase, tool: "copilot"});

      // Assert
      const installedAgentFiles: string[] = collectRelativeFiles(path.join(targetBase, "agents"));

      for (const relativePath of installedAgentFiles) {
        assert.match(relativePath, /\.agent\.md$/);
      }
    });
  });

  describe("install with tool: opencode", () => {
    it("agent files contain opencode frontmatter", (): void => {
      // Arrange
      const targetOpenCodeBase: string = path.join(tempRoot, "target-project", ".opencode");

      // Act
      install({
        targetBase: targetOpenCodeBase,
        tool: "opencode"
      });

      // Assert
      for (const entry of agents) {
        const opencodeFilename: string = entry.relativePath.replace(".agent.md", ".md");
        const targetPath: string = path.join(targetOpenCodeBase, "agents", opencodeFilename);
        const content: string = fs.readFileSync(targetPath, "utf8");

        assert.match(content, OPENCODE_MODEL_PATTERN);
        assert.ok(!content.includes("(copilot)"));
      }
    });

    it("agent files use .md extension", (): void => {
      // Arrange
      const targetOpenCodeBase: string = path.join(tempRoot, "target-project", ".opencode");

      // Act
      install({
        targetBase: targetOpenCodeBase,
        tool: "opencode"
      });

      // Assert
      const installedAgentFiles: string[] = collectRelativeFiles(path.join(targetOpenCodeBase, "agents"));

      for (const relativePath of installedAgentFiles) {
        assert.match(relativePath, /\.md$/);
        assert.ok(!relativePath.endsWith(".agent.md"));
      }
    });

    it("skill files are created in the opencode skills directory", (): void => {
      // Arrange
      const targetOpenCodeBase: string = path.join(tempRoot, "target-project", ".opencode");

      // Act
      install({
        targetBase: targetOpenCodeBase,
        tool: "opencode"
      });

      // Assert
      assert.deepStrictEqual(collectRelativeFiles(path.join(targetOpenCodeBase, "skills")), EXPECTED_SKILL_PATHS);

      for (const entry of skills) {
        const targetPath: string = path.join(targetOpenCodeBase, "skills", entry.relativePath);

        assert.strictEqual(fs.readFileSync(targetPath, "utf8"), entry.render("opencode"));
      }
    });

    it("skips existing opencode skills and preserves their content", (): void => {
      // Arrange
      const targetOpenCodeBase: string = path.join(tempRoot, "target-project", ".opencode");
      const existingLintContent: string = "---\nname: lint\ndescription: Project-specific lint skill\ncompatibility: opencode\n---\nKeep the existing lint flow.\n";
      const existingTestContent: string = "---\nname: test\ndescription: Project-specific test skill\ncompatibility: opencode\n---\nKeep the existing test flow.\n";
      const existingTestEngineeringContent: string =
        "---\nname: test-engineering\ndescription: Project-specific test engineering skill\ncompatibility: opencode\n---\nKeep the existing red-phase workflow.\n";

      writeFile(targetOpenCodeBase, path.join("skills", "lint", "SKILL.md"), existingLintContent);
      writeFile(targetOpenCodeBase, path.join("skills", "test", "SKILL.md"), existingTestContent);
      writeFile(targetOpenCodeBase, path.join("skills", "test-engineering", "SKILL.md"), existingTestEngineeringContent);

      // Act
      install({
        targetBase: targetOpenCodeBase,
        tool: "opencode"
      });

      // Assert
      assert.strictEqual(fs.readFileSync(path.join(targetOpenCodeBase, "skills", "lint", "SKILL.md"), "utf8"), existingLintContent);
      assert.strictEqual(fs.readFileSync(path.join(targetOpenCodeBase, "skills", "test", "SKILL.md"), "utf8"), existingTestContent);
      assert.strictEqual(fs.readFileSync(path.join(targetOpenCodeBase, "skills", "test-engineering", "SKILL.md"), "utf8"), existingTestEngineeringContent);
    });

    it("returns command and skill counts for opencode", (): void => {
      // Arrange
      const targetOpenCodeBase: string = path.join(tempRoot, "target-project", ".opencode");
      const expectedCounts = {
        agents: agents.length,
        skillsWritten: skills.length,
        skillsSkipped: 0
      };

      // Act
      const result = install({
        targetBase: targetOpenCodeBase,
        tool: "opencode"
      });

      // Assert
      assert.deepStrictEqual(result, expectedCounts);
    });
  });

  describe("install with tool: claude", () => {
    it("agent files contain claude frontmatter", (): void => {
      // Arrange
      const targetClaudeBase: string = path.join(tempRoot, "target-project", ".claude");

      // Act
      install({
        targetBase: targetClaudeBase,
        tool: "claude"
      });

      // Assert
      for (const entry of agents) {
        const claudeFilename: string = entry.relativePath.replace(".agent.md", ".md");
        const targetPath: string = path.join(targetClaudeBase, "agents", claudeFilename);
        const content: string = fs.readFileSync(targetPath, "utf8");

        assert.match(content, CLAUDE_MODEL_PATTERN);
        assert.ok(!content.includes("(copilot)"));
        assert.ok(!content.includes("compatibility: opencode"));
      }
    });

    it("agent files use .md extension", (): void => {
      // Arrange
      const targetClaudeBase: string = path.join(tempRoot, "target-project", ".claude");

      // Act
      install({
        targetBase: targetClaudeBase,
        tool: "claude"
      });

      // Assert
      const installedAgentFiles: string[] = collectRelativeFiles(path.join(targetClaudeBase, "agents"));

      for (const relativePath of installedAgentFiles) {
        assert.match(relativePath, /\.md$/);
        assert.ok(!relativePath.endsWith(".agent.md"));
      }
    });

    it("skill files are created in the claude skills directory", (): void => {
      // Arrange
      const targetClaudeBase: string = path.join(tempRoot, "target-project", ".claude");

      // Act
      install({
        targetBase: targetClaudeBase,
        tool: "claude"
      });

      // Assert
      assert.deepStrictEqual(collectRelativeFiles(path.join(targetClaudeBase, "skills")), EXPECTED_SKILL_PATHS);

      for (const entry of skills) {
        const targetPath: string = path.join(targetClaudeBase, "skills", entry.relativePath);

        assert.strictEqual(fs.readFileSync(targetPath, "utf8"), entry.render("claude"));
      }
    });

    it("skill files use only Claude-supported frontmatter keys", (): void => {
      // Arrange
      const targetClaudeBase: string = path.join(tempRoot, "target-project", ".claude");

      // Act
      install({
        targetBase: targetClaudeBase,
        tool: "claude"
      });

      // Assert
      for (const entry of skills) {
        const targetPath: string = path.join(targetClaudeBase, "skills", entry.relativePath);
        const content: string = fs.readFileSync(targetPath, "utf8");

        assertSupportedFrontmatterKeys(readFrontmatterKeys(content), SUPPORTED_CLAUDE_SKILL_FRONTMATTER_KEYS);
      }
    });

    it("overwrites existing fabys claude skills", (): void => {
      // Arrange
      const targetClaudeBase: string = path.join(tempRoot, "target-project", ".claude");
      const existingExplorationContent: string = "---\nname: fabys-exploration\n---\nGather context locally inside the current Claude worker.\n";
      const existingQuestionsContent: string = "---\nname: fabys-questions\n---\nAsk the user only when the answer materially changes the work.\n";

      writeFile(targetClaudeBase, path.join("skills", "fabys-exploration", "SKILL.md"), existingExplorationContent);
      writeFile(targetClaudeBase, path.join("skills", "fabys-questions", "SKILL.md"), existingQuestionsContent);

      // Act
      install({
        targetBase: targetClaudeBase,
        tool: "claude"
      });

      // Assert
      assert.strictEqual(fs.readFileSync(path.join(targetClaudeBase, "skills", "fabys-exploration", "SKILL.md"), "utf8"), findSkillTemplate("fabys-exploration/SKILL.md").render("claude"));
      assert.strictEqual(fs.readFileSync(path.join(targetClaudeBase, "skills", "fabys-questions", "SKILL.md"), "utf8"), findSkillTemplate("fabys-questions/SKILL.md").render("claude"));
    });

    it("returns command and skill counts for claude", (): void => {
      // Arrange
      const targetClaudeBase: string = path.join(tempRoot, "target-project", ".claude");
      const expectedCounts = {
        agents: agents.length,
        skillsWritten: skills.length,
        skillsSkipped: 0
      };

      // Act
      const result = install({
        targetBase: targetClaudeBase,
        tool: "claude"
      });

      // Assert
      assert.deepStrictEqual(result, expectedCounts);
    });
  });
});

describe("parseArgs", () => {
  it("['node', 'cli.js', '--tool', 'copilot'] returns { tool: 'copilot' }", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--tool", "copilot"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, {force: false, tool: "copilot", configLocation: undefined});
  });

  it("['node', 'cli.js', '--tool', 'opencode'] returns { tool: 'opencode' }", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--tool", "opencode"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, {force: false, tool: "opencode", configLocation: undefined});
  });

  it("['node', 'cli.js', '--tool', 'claude'] returns { tool: 'claude' }", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--tool", "claude"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, {force: false, tool: "claude", configLocation: undefined});
  });

  it("['node', 'cli.js'] returns { tool: undefined }", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, {force: false, tool: undefined, configLocation: undefined});
  });

  it("['node', 'cli.js', '--force', '--tool', 'copilot'] returns force=true", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--force", "--tool", "copilot"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, {force: true, tool: "copilot", configLocation: undefined});
  });

  it("['node', 'cli.js', '--tool'] throws", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--tool"];

    // Act
    const parseMissingToolValue = (): unknown => parseArgs(argv);

    // Assert
    assert.throws(parseMissingToolValue, /--tool/i);
  });

  it("['node', 'cli.js', '--tool', 'invalid'] throws", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--tool", "invalid"];

    // Act
    const parseInvalidTool = (): unknown => parseArgs(argv);

    // Assert
    assert.throws(parseInvalidTool, /invalid/i);
  });

  it("['node', 'cli.js', '--config', 'config-dir'] returns the config location", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--config", "config-dir"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, {configLocation: "config-dir", force: false, tool: undefined});
  });

  it("['node', 'cli.js', '--config'] throws", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--config"];

    // Act
    const parseMissingConfigValue = (): unknown => parseArgs(argv);

    // Assert
    assert.throws(parseMissingConfigValue, /--config/i);
  });

  it("['node', 'cli.js', '--config', '--tool', 'copilot'] throws", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--config", "--tool", "copilot"];

    // Act
    const parseFlagAsConfigValue = (): unknown => parseArgs(argv);

    // Assert
    assert.throws(parseFlagAsConfigValue, /--config/i);
  });
});

describe("promptForTool", () => {
  it("returns the selected tool and exposes all supported choices", async (): Promise<void> => {
    // Arrange
    let capturedMessage = "";
    let capturedChoices: Array<{description: string; name: string; value: Tool}> = [];
    let clearPromptOnDone = false;

    // Act
    const tool = await promptForTool({
      selectPrompt: async (config, context) => {
        capturedMessage = config.message;
        capturedChoices = config.choices;
        clearPromptOnDone = context?.clearPromptOnDone ?? false;

        return "claude";
      }
    });

    // Assert
    assert.strictEqual(tool, "claude");
    assert.strictEqual(capturedMessage, "Which AI tool do you use?");
    assert.deepStrictEqual(
      capturedChoices.map((choice) => choice.value),
      ["copilot", "opencode", "claude"]
    );
    assert.ok(capturedChoices.some((choice) => choice.name === "Claude Code"));
    assert.ok(capturedChoices.some((choice) => choice.description.includes(".claude/")));
    assert.strictEqual(clearPromptOnDone, true);
  });
});

describe("determineTool", () => {
  it("uses the inquirer tool prompt on a tty when --tool is omitted", async (): Promise<void> => {
    // Arrange
    const input = new PassThrough() as PassThrough & {isTTY?: boolean};
    const output = new PassThrough() as PassThrough & {isTTY?: boolean};
    let promptCallCount = 0;

    input.isTTY = true;
    output.isTTY = true;

    // Act
    const tool = await determineTool(["node", "cli.js"], {
      input,
      output,
      selectPrompt: async () => {
        promptCallCount += 1;

        return "opencode";
      }
    });

    // Assert
    assert.strictEqual(tool, "opencode");
    assert.strictEqual(promptCallCount, 1);
  });

  it("defaults to copilot outside a tty", async (): Promise<void> => {
    // Act
    const tool = await determineTool(["node", "cli.js"], {
      input: new PassThrough(),
      output: new PassThrough()
    });

    // Assert
    assert.strictEqual(tool, "copilot");
  });
});

describe("promptForProjectSkills", () => {
  it("returns the selected optional project skills and preselects every option", async (): Promise<void> => {
    // Arrange
    let capturedChoices: Array<{checked?: boolean; value: string}> = [];
    let capturedMessage = "";

    // Act
    const selectedSkills = await promptForProjectSkills({
      checkboxPrompt: async (config) => {
        capturedChoices = config.choices;
        capturedMessage = config.message;

        return ["planning", "review"];
      }
    });

    // Assert
    assert.strictEqual(capturedMessage, "Select project-specific skills to install. lint and test are always installed.");
    assert.deepStrictEqual(
      capturedChoices.map((choice) => choice.value),
      DEFAULT_OPTIONAL_PROJECT_SKILLS
    );
    assert.ok(capturedChoices.every((choice) => choice.checked === true));
    assert.deepStrictEqual(selectedSkills, ["planning", "review"]);
  });
});

describe("determineProjectSkills", () => {
  it("defaults to all optional project skills outside a tty", async (): Promise<void> => {
    // Act
    const selectedSkills = await determineProjectSkills({
      input: new PassThrough(),
      output: new PassThrough()
    });

    // Assert
    assert.deepStrictEqual(selectedSkills, DEFAULT_OPTIONAL_PROJECT_SKILLS);
  });

  it("uses configured skills without prompting on a tty", async (): Promise<void> => {
    // Arrange
    const input = new PassThrough() as PassThrough & {isTTY?: boolean};
    const output = new PassThrough() as PassThrough & {isTTY?: boolean};
    let promptCallCount = 0;

    input.isTTY = true;
    output.isTTY = true;

    // Act
    const selectedSkills = await determineProjectSkills({
      checkboxPrompt: async () => {
        promptCallCount += 1;
        return ["exploration"];
      },
      configuredSkills: {
        exploration: false,
        planning: true,
        review: false
      },
      input,
      output
    });

    // Assert
    assert.deepStrictEqual(
      selectedSkills,
      DEFAULT_OPTIONAL_PROJECT_SKILLS.filter((skillName) => skillName !== "exploration" && skillName !== "review")
    );
    assert.strictEqual(promptCallCount, 0);
  });
});

function collectRelativeFiles(rootPath: string): string[] {
  const relativeFiles: string[] = [];
  const directoryEntries: fs.Dirent[] = fs.readdirSync(rootPath, {
    withFileTypes: true
  });

  for (const entry of directoryEntries) {
    const absolutePath: string = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles: string[] = collectRelativeFiles(absolutePath);

      for (const nestedFile of nestedFiles) {
        relativeFiles.push(path.join(entry.name, nestedFile));
      }

      continue;
    }

    relativeFiles.push(entry.name);
  }

  return relativeFiles.sort();
}

function writeFile(basePath: string, relativePath: string, content: string): void {
  const filePath: string = path.join(basePath, relativePath);
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, content);
}

function writeJsonFile(basePath: string, relativePath: string, content: unknown): void {
  writeFile(basePath, relativePath, `${JSON.stringify(content, null, 2)}\n`);
}

function buildExpectedInstalledSkillPaths(selectedProjectSkills: string[]): string[] {
  return [...EXPECTED_FABYS_SKILL_PATHS, ...EXPECTED_MANDATORY_SKILL_PATHS, ...EXPECTED_WORKFLOW_SKILL_PATHS, ...selectedProjectSkills.map((skillName) => `${skillName}/SKILL.md`)].sort();
}

function findSkillTemplate(relativePath: string): TemplateEntry {
  const entry = skills.find((skill) => skill.relativePath === relativePath);

  assert.ok(entry, `Expected skill template: ${relativePath}`);

  return entry!;
}

function readFrontmatterKeys(content: string): string[] {
  const headerMatch = /^---\n([\s\S]*?)\n---\n/.exec(content);

  if (!headerMatch) {
    throw new Error("Expected YAML frontmatter");
  }

  return headerMatch[1]
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        throw new Error(`Expected frontmatter key/value line: ${line}`);
      }

      return line.slice(0, separatorIndex);
    });
}

function assertSupportedFrontmatterKeys(actualKeys: string[], supportedKeys: string[]): void {
  for (const requiredKey of REQUIRED_SKILL_FRONTMATTER_KEYS) {
    assert.ok(actualKeys.includes(requiredKey), `Expected frontmatter key: ${requiredKey}`);
  }

  for (const actualKey of actualKeys) {
    assert.ok(supportedKeys.includes(actualKey), `Unsupported frontmatter key: ${actualKey}`);
  }
}
