import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { install, type Tool } from "../src/install.js";
import {
  agents,
  prompts,
  skills,
  type TemplateEntry,
} from "../src/templates/index.js";
import { parseArgs } from "../src/cli.js";

const OPENCODE_MODEL_PATTERN = /model:\s+\S+\/\S+/;

describe("template rendering", () => {
  const tools: Tool[] = ["copilot", "opencode"];

  describe("agents", () => {
    for (const entry of agents) {
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
      for (const entry of agents) {
        assert.match(entry.relativePath, /\.agent\.md$/);
      }
    });

    it("copilot output does not contain opencode model paths", (): void => {
      // Act & Assert
      for (const entry of agents) {
        const output: string = entry.render("copilot");
        assert.ok(!output.includes("anthropic/"));
        assert.ok(!output.includes("openai/"));
      }
    });

    it("opencode output does not contain copilot markers", (): void => {
      // Act & Assert
      for (const entry of agents) {
        const output: string = entry.render("opencode");
        assert.ok(!output.includes("user-invocable:"));
      }
    });
  });

  describe("prompts", () => {
    for (const entry of prompts) {
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

      it(`${entry.relativePath} has .prompt.md relative path`, (): void => {
        // Assert
        assert.match(entry.relativePath, /\.prompt\.md$/);
      });
    }

    it("opencode dev command targets the build agent", (): void => {
      // Act
      const output: string = prompts
        .find((entry) => entry.relativePath === "dev.prompt.md")!
        .render("opencode");

      // Assert
      assert.match(
        output,
        /^---\ndescription: Develop prompt with emphasis on tests and observability\.\nagent: build\n---\n/,
      );
      assert.ok(!output.includes("agent: agent"));
    });
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
        assert.match(output, /\ncompatibility: opencode\n/);
        assert.ok(!output.includes("argument-hint:"));
      });
    }
  });

  it("render function returns same content for same arguments", (): void => {
    // Arrange
    const entry: TemplateEntry = agents[0];

    // Act
    const first: string = entry.render("copilot");
    const second: string = entry.render("copilot");

    // Assert
    assert.strictEqual(first, second);
  });

  it("render returns different content for different tools", (): void => {
    // Act
    const copilot: string = agents[0].render("copilot");
    const opencode: string = agents[0].render("opencode");

    // Assert
    assert.notStrictEqual(copilot, opencode);
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
    fs.rmSync(tempRoot, { force: true, recursive: true });
  });

  it("creates all agent files into target/agents/", (): void => {
    // Act
    install({ targetBase, tool: "copilot" });

    // Assert
    for (const entry of agents) {
      const targetPath: string = path.join(
        targetBase,
        "agents",
        entry.relativePath,
      );
      assert.ok(fs.existsSync(targetPath));
      assert.strictEqual(
        fs.readFileSync(targetPath, "utf8"),
        entry.render("copilot"),
      );
    }
  });

  it("creates all prompt files into target/prompts/", (): void => {
    // Act
    install({ targetBase, tool: "copilot" });

    // Assert
    for (const entry of prompts) {
      const targetPath: string = path.join(
        targetBase,
        "prompts",
        entry.relativePath,
      );
      assert.ok(fs.existsSync(targetPath));
      assert.strictEqual(
        fs.readFileSync(targetPath, "utf8"),
        entry.render("copilot"),
      );
    }
  });

  it("creates skill files when they don't exist", (): void => {
    // Act
    install({ targetBase, tool: "copilot" });

    // Assert
    for (const entry of skills) {
      const targetPath: string = path.join(
        targetBase,
        "skills",
        entry.relativePath,
      );
      assert.ok(fs.existsSync(targetPath));
      assert.strictEqual(
        fs.readFileSync(targetPath, "utf8"),
        entry.render("copilot"),
      );
    }
  });

  it("skips skill files when they already exist and preserves their content", (): void => {
    // Arrange
    const existingLintContent: string =
      "---\nname: lint\n---\nProject-specific lint instructions\n";
    const existingTestContent: string =
      "---\nname: test\n---\nProject-specific test instructions\n";

    writeFile(
      targetBase,
      path.join("skills", "lint", "SKILL.md"),
      existingLintContent,
    );
    writeFile(
      targetBase,
      path.join("skills", "test", "SKILL.md"),
      existingTestContent,
    );

    // Act
    install({ targetBase, tool: "copilot" });

    // Assert
    assert.strictEqual(
      fs.readFileSync(
        path.join(targetBase, "skills", "lint", "SKILL.md"),
        "utf8",
      ),
      existingLintContent,
    );
    assert.strictEqual(
      fs.readFileSync(
        path.join(targetBase, "skills", "test", "SKILL.md"),
        "utf8",
      ),
      existingTestContent,
    );
  });

  it("creates target directories recursively when they don't exist", (): void => {
    // Arrange
    const nestedTargetBase: string = path.join(
      tempRoot,
      "deep",
      "nested",
      "project",
      ".github",
    );

    // Act
    install({
      targetBase: nestedTargetBase,
      tool: "copilot",
    });

    // Assert
    assert.ok(fs.existsSync(nestedTargetBase));
    assert.ok(fs.existsSync(path.join(nestedTargetBase, "agents")));
    assert.ok(fs.existsSync(path.join(nestedTargetBase, "prompts")));
    assert.ok(fs.existsSync(path.join(nestedTargetBase, "skills", "lint")));
    assert.ok(fs.existsSync(path.join(nestedTargetBase, "skills", "test")));
  });

  it("returns correct counts for a fresh install", (): void => {
    // Arrange
    const expectedCounts = {
      agents: agents.length,
      prompts: prompts.length,
      skillsWritten: skills.length,
      skillsSkipped: 0,
    };

    // Act
    const result = install({ targetBase, tool: "copilot" });

    // Assert
    assert.deepStrictEqual(result, expectedCounts);
  });

  it("returns correct counts when skills are skipped on re-run", (): void => {
    // Arrange
    install({ targetBase, tool: "copilot" });
    const expectedCounts = {
      agents: agents.length,
      prompts: prompts.length,
      skillsWritten: 0,
      skillsSkipped: skills.length,
    };

    // Act
    const result = install({ targetBase, tool: "copilot" });

    // Assert
    assert.deepStrictEqual(result, expectedCounts);
  });

  describe("install with tool: copilot", () => {
    it("agent files contain copilot frontmatter", (): void => {
      // Act
      install({ targetBase, tool: "copilot" });

      // Assert
      for (const entry of agents) {
        const targetPath: string = path.join(
          targetBase,
          "agents",
          entry.relativePath,
        );
        const content: string = fs.readFileSync(targetPath, "utf8");

        assert.match(content, /\(copilot\)/);
        assert.ok(!content.includes("anthropic/"));
        assert.ok(!content.includes("openai/"));
      }
    });

    it("prompt files are created", (): void => {
      // Act
      install({ targetBase, tool: "copilot" });

      // Assert
      const expectedPrompts: string[] = prompts
        .map((p) => p.relativePath)
        .sort();
      assert.deepStrictEqual(
        collectRelativeFiles(path.join(targetBase, "prompts")),
        expectedPrompts,
      );
    });

    it("skill files are created", (): void => {
      // Act
      install({ targetBase, tool: "copilot" });

      // Assert
      const expectedSkills: string[] = skills.map((s) => s.relativePath).sort();
      assert.deepStrictEqual(
        collectRelativeFiles(path.join(targetBase, "skills")),
        expectedSkills,
      );
    });

    it("agent filenames preserve .agent.md extension", (): void => {
      // Act
      install({ targetBase, tool: "copilot" });

      // Assert
      const installedAgentFiles: string[] = collectRelativeFiles(
        path.join(targetBase, "agents"),
      );

      for (const relativePath of installedAgentFiles) {
        assert.match(relativePath, /\.agent\.md$/);
      }
    });
  });

  describe("install with tool: opencode", () => {
    it("agent files contain opencode frontmatter", (): void => {
      // Arrange
      const targetOpenCodeBase: string = path.join(
        tempRoot,
        "target-project",
        ".opencode",
      );

      // Act
      install({
        targetBase: targetOpenCodeBase,
        tool: "opencode",
      });

      // Assert
      for (const entry of agents) {
        const opencodeFilename: string = entry.relativePath.replace(
          ".agent.md",
          ".md",
        );
        const targetPath: string = path.join(
          targetOpenCodeBase,
          "agents",
          opencodeFilename,
        );
        const content: string = fs.readFileSync(targetPath, "utf8");

        assert.match(content, OPENCODE_MODEL_PATTERN);
        assert.ok(!content.includes("(copilot)"));
        assert.ok(!content.includes("user-invocable:"));
      }
    });

    it("agent files use .md extension", (): void => {
      // Arrange
      const targetOpenCodeBase: string = path.join(
        tempRoot,
        "target-project",
        ".opencode",
      );

      // Act
      install({
        targetBase: targetOpenCodeBase,
        tool: "opencode",
      });

      // Assert
      const installedAgentFiles: string[] = collectRelativeFiles(
        path.join(targetOpenCodeBase, "agents"),
      );

      for (const relativePath of installedAgentFiles) {
        assert.match(relativePath, /\.md$/);
        assert.ok(!relativePath.endsWith(".agent.md"));
      }
    });

    it("command files are created from prompt templates", (): void => {
      // Arrange
      const targetOpenCodeBase: string = path.join(
        tempRoot,
        "target-project",
        ".opencode",
      );

      // Act
      install({
        targetBase: targetOpenCodeBase,
        tool: "opencode",
      });

      // Assert
      const expectedCommands: string[] = prompts
        .map((promptEntry) =>
          promptEntry.relativePath.replace(".prompt.md", ".md"),
        )
        .sort();

      assert.deepStrictEqual(
        collectRelativeFiles(path.join(targetOpenCodeBase, "commands")),
        expectedCommands,
      );

      for (const entry of prompts) {
        const targetPath: string = path.join(
          targetOpenCodeBase,
          "commands",
          entry.relativePath.replace(".prompt.md", ".md"),
        );

        assert.strictEqual(
          fs.readFileSync(targetPath, "utf8"),
          entry.render("opencode"),
        );
      }
    });

    it("skill files are created in the opencode skills directory", (): void => {
      // Arrange
      const targetOpenCodeBase: string = path.join(
        tempRoot,
        "target-project",
        ".opencode",
      );

      // Act
      install({
        targetBase: targetOpenCodeBase,
        tool: "opencode",
      });

      // Assert
      const expectedSkills: string[] = skills
        .map((skill) => skill.relativePath)
        .sort();

      assert.deepStrictEqual(
        collectRelativeFiles(path.join(targetOpenCodeBase, "skills")),
        expectedSkills,
      );

      for (const entry of skills) {
        const targetPath: string = path.join(
          targetOpenCodeBase,
          "skills",
          entry.relativePath,
        );

        assert.strictEqual(
          fs.readFileSync(targetPath, "utf8"),
          entry.render("opencode"),
        );
      }
    });

    it("skips existing opencode skills and preserves their content", (): void => {
      // Arrange
      const targetOpenCodeBase: string = path.join(
        tempRoot,
        "target-project",
        ".opencode",
      );
      const existingLintContent: string =
        "---\nname: lint\ndescription: Project-specific lint skill\ncompatibility: opencode\n---\nKeep the existing lint flow.\n";
      const existingTestContent: string =
        "---\nname: test\ndescription: Project-specific test skill\ncompatibility: opencode\n---\nKeep the existing test flow.\n";

      writeFile(
        targetOpenCodeBase,
        path.join("skills", "lint", "SKILL.md"),
        existingLintContent,
      );
      writeFile(
        targetOpenCodeBase,
        path.join("skills", "test", "SKILL.md"),
        existingTestContent,
      );

      // Act
      install({
        targetBase: targetOpenCodeBase,
        tool: "opencode",
      });

      // Assert
      assert.strictEqual(
        fs.readFileSync(
          path.join(targetOpenCodeBase, "skills", "lint", "SKILL.md"),
          "utf8",
        ),
        existingLintContent,
      );
      assert.strictEqual(
        fs.readFileSync(
          path.join(targetOpenCodeBase, "skills", "test", "SKILL.md"),
          "utf8",
        ),
        existingTestContent,
      );
    });

    it("returns command and skill counts for opencode", (): void => {
      // Arrange
      const targetOpenCodeBase: string = path.join(
        tempRoot,
        "target-project",
        ".opencode",
      );
      const expectedCounts = {
        agents: agents.length,
        prompts: prompts.length,
        skillsWritten: skills.length,
        skillsSkipped: 0,
      };

      // Act
      const result = install({
        targetBase: targetOpenCodeBase,
        tool: "opencode",
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
    assert.deepStrictEqual(parsed, { tool: "copilot" });
  });

  it("['node', 'cli.js', '--tool', 'opencode'] returns { tool: 'opencode' }", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js", "--tool", "opencode"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, { tool: "opencode" });
  });

  it("['node', 'cli.js'] returns { tool: undefined }", (): void => {
    // Arrange
    const argv: string[] = ["node", "cli.js"];

    // Act
    const parsed = parseArgs(argv);

    // Assert
    assert.deepStrictEqual(parsed, { tool: undefined });
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

function collectRelativeFiles(rootPath: string): string[] {
  const relativeFiles: string[] = [];
  const directoryEntries: fs.Dirent[] = fs.readdirSync(rootPath, {
    withFileTypes: true,
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

function writeFile(
  basePath: string,
  relativePath: string,
  content: string,
): void {
  const filePath: string = path.join(basePath, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
