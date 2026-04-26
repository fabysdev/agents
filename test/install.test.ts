import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {PassThrough} from "node:stream";
import {afterEach, beforeEach, describe, it} from "node:test";

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
const EXPECTED_WORKFLOW_SKILL_PATHS: string[] = ["dev/SKILL.md", "rapid/SKILL.md", "tdd/SKILL.md"];
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
      assert.ok(opencode.includes("Invoke the `fabys-explorer` subagent"));
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
    assert.deepStrictEqual(parsed, {force: false, tool: "copilot"});
  });

  it("['node', 'cli.js', '--tool', 'opencode'] returns { tool: 'opencode' }", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--tool", "opencode"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, {force: false, tool: "opencode"});
  });

  it("['node', 'cli.js', '--tool', 'claude'] returns { tool: 'claude' }", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--tool", "claude"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, {force: false, tool: "claude"});
  });

  it("['node', 'cli.js'] returns { tool: undefined }", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, {force: false, tool: undefined});
  });

  it("['node', 'cli.js', '--force', '--tool', 'copilot'] returns force=true", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--force", "--tool", "copilot"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, {force: true, tool: "copilot"});
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
