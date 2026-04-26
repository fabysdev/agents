import assert from "node:assert";
import {execFileSync, spawnSync} from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {afterEach, beforeEach, describe, it} from "node:test";

import {agents, skills} from "../src/templates/index.js";

const REPO_ROOT: string = path.resolve(import.meta.dirname, "..");
const BIN_PATH: string = path.join(REPO_ROOT, "dist", "cli.js");
const CLAUDE_MODEL_PATTERN = /model:\s+claude-[\w.-]+/;
const OPENCODE_MODEL_PATTERN = /model:\s+\S+\/\S+/;
const EXPECTED_SKILL_COUNT = 13;
const EXPECTED_FABYS_SKILL_PATHS: string[] = skills
  .map((skill) => skill.relativePath)
  .filter((relativePath) => relativePath.startsWith("fabys-"))
  .sort();
const REQUIRED_SKILL_FRONTMATTER_KEYS: string[] = ["name", "description"];
const SUPPORTED_CLAUDE_SKILL_FRONTMATTER_KEYS: string[] = ["argument-hint", "description", "disable-model-invocation", "name", "user-invocable"];
const SUPPORTED_TOOLS = ["copilot", "opencode", "claude"] as const;

describe("install script e2e", () => {
  let tempDir: string;

  const expectedAgentFiles: string[] = agents.map((a) => a.relativePath).sort();
  const expectedSkillFiles: string[] = skills.map((s) => s.relativePath).sort();
  const expectedOpenCodeAgentFiles: string[] = expectedAgentFiles.map((f) => f.replace(/\.agent\.md$/, ".md")).sort();
  const expectedClaudeAgentFiles: string[] = expectedAgentFiles.map((f) => f.replace(/\.agent\.md$/, ".md")).sort();

  beforeEach((): void => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fabysagents-e2e-"));
  });

  afterEach((): void => {
    fs.rmSync(tempDir, {force: true, recursive: true});
  });

  it("installs all files into an empty directory", (): void => {
    // Arrange
    const targetGithubPath: string = path.join(tempDir, ".github");

    // Act
    runInstaller(tempDir, ["--tool", "copilot"]);

    // Assert
    assert.strictEqual(SUPPORTED_TOOLS.length, 3);
    assert.strictEqual(expectedAgentFiles.length, 10);
    assert.strictEqual(expectedSkillFiles.length, EXPECTED_SKILL_COUNT);
    assert.strictEqual(EXPECTED_FABYS_SKILL_PATHS.length, 2);
    assert.ok(expectedSkillFiles.includes("fabys-exploration/SKILL.md"));
    assert.ok(expectedSkillFiles.includes("fabys-questions/SKILL.md"));

    assert.deepStrictEqual(collectRelativeFiles(path.join(targetGithubPath, "agents")), expectedAgentFiles);
    assert.deepStrictEqual(collectRelativeFiles(path.join(targetGithubPath, "skills")), expectedSkillFiles);

    const installedAgentFiles: string[] = collectRelativeFiles(path.join(targetGithubPath, "agents"));

    for (const relativePath of installedAgentFiles) {
      assertStartsWithYamlFrontmatter(path.join(targetGithubPath, "agents", relativePath));
    }

    const installedAgentContent: string = fs.readFileSync(path.join(targetGithubPath, "agents", expectedAgentFiles[0]), "utf8");

    assert.match(installedAgentContent, /model:\s+.+\(copilot\)/);
    assert.ok(!installedAgentContent.includes("<!-- copilot-header -->"));
    assert.ok(!installedAgentContent.includes("<!-- opencode-header -->"));
    assert.ok(!installedAgentContent.includes("<!-- body -->"));

    const firstSkill = skills.find((s) => s.relativePath === expectedSkillFiles[0]);
    assert.strictEqual(fs.readFileSync(path.join(targetGithubPath, "skills", expectedSkillFiles[0]), "utf8"), firstSkill!.render("copilot"));
  });

  it("prints a summary to stdout with counts", (): void => {
    // Act
    const stdout: string = runInstaller(tempDir, ["--tool", "copilot"]);

    // Assert
    assert.match(stdout, new RegExp(`Installed\\s+for\\s+copilot:\\s+${agents.length}\\s+agents,\\s+${skills.length}\\s+skills\\s+\\(0\\s+skipped existing\\)`));
  });

  it("runs when invoked through a symlinked bin path", (): void => {
    // Arrange
    const binLinkPath: string = path.join(tempDir, "fabysagents");
    fs.symlinkSync(BIN_PATH, binLinkPath);

    // Act
    const stdout: string = execFileSync(process.execPath, [binLinkPath, "--tool", "copilot"], {
      cwd: tempDir,
      encoding: "utf8"
    });

    // Assert
    assert.match(stdout, /Installed for copilot:/);
    assert.ok(fs.existsSync(path.join(tempDir, ".github", "agents")));
  });

  it("overwrites agents on re-run", (): void => {
    // Arrange
    runInstaller(tempDir, ["--tool", "copilot"]);
    const agentPath: string = path.join(tempDir, ".github", "agents", expectedAgentFiles[0]);
    const originalAgentContent: string = fs.readFileSync(agentPath, "utf8");

    fs.writeFileSync(agentPath, "MODIFIED AGENT CONTENT\n");

    // Act
    runInstaller(tempDir, ["--tool", "copilot"]);

    // Assert
    assert.strictEqual(fs.readFileSync(agentPath, "utf8"), originalAgentContent);
  });

  it("preserves project-specific skills and refreshes shared skills on re-run", (): void => {
    // Arrange
    runInstaller(tempDir, ["--tool", "copilot"]);
    const customSkillContents: Map<string, string> = new Map([
      ["dev/SKILL.md", "---\nname: dev\n---\nStale workflow instructions.\n"],
      ["exploration/SKILL.md", "---\nname: custom-exploration\n---\nPrefer ripgrep and skip generated directories.\n"],
      ["test/SKILL.md", "---\nname: custom-test\n---\nRun the repository test workflow.\n"],
      ["fabys-exploration/SKILL.md", "---\nname: fabys-exploration\n---\nStale shared exploration rules.\n"]
    ]);

    for (const [relativePath, content] of customSkillContents) {
      fs.writeFileSync(path.join(tempDir, ".github", "skills", relativePath), content);
    }

    // Act
    runInstaller(tempDir, ["--tool", "copilot"]);

    // Assert
    assert.strictEqual(fs.readFileSync(path.join(tempDir, ".github", "skills", "dev", "SKILL.md"), "utf8"), skills.find((skill) => skill.relativePath === "dev/SKILL.md")!.render("copilot"));
    assert.strictEqual(fs.readFileSync(path.join(tempDir, ".github", "skills", "exploration", "SKILL.md"), "utf8"), customSkillContents.get("exploration/SKILL.md"));
    assert.strictEqual(fs.readFileSync(path.join(tempDir, ".github", "skills", "test", "SKILL.md"), "utf8"), customSkillContents.get("test/SKILL.md"));
    assert.strictEqual(
      fs.readFileSync(path.join(tempDir, ".github", "skills", "fabys-exploration", "SKILL.md"), "utf8"),
      skills.find((skill) => skill.relativePath === "fabys-exploration/SKILL.md")!.render("copilot")
    );
  });

  it("force overwrites selected project skills on re-run", (): void => {
    // Arrange
    runInstaller(tempDir, ["--tool", "copilot"]);
    const customLintContent = "---\nname: lint\n---\nCustom lint workflow.\n";
    const customExplorationContent = "---\nname: exploration\n---\nCustom exploration workflow.\n";

    fs.writeFileSync(path.join(tempDir, ".github", "skills", "lint", "SKILL.md"), customLintContent);
    fs.writeFileSync(path.join(tempDir, ".github", "skills", "exploration", "SKILL.md"), customExplorationContent);

    // Act
    runInstaller(tempDir, ["--force", "--tool", "copilot"]);

    // Assert
    assert.strictEqual(
      fs.readFileSync(path.join(tempDir, ".github", "skills", "lint", "SKILL.md"), "utf8"),
      skills.find((skill) => skill.relativePath === "lint/SKILL.md")!.render("copilot")
    );
    assert.strictEqual(
      fs.readFileSync(path.join(tempDir, ".github", "skills", "exploration", "SKILL.md"), "utf8"),
      skills.find((skill) => skill.relativePath === "exploration/SKILL.md")!.render("copilot")
    );
  });

  it("exits with code 0", (): void => {
    // Arrange
    const executeInstaller: () => string = () => runInstaller(tempDir, ["--tool", "copilot"]);

    // Act
    const runInstallScript: () => string = executeInstaller;

    // Assert
    assert.doesNotThrow(runInstallScript);
  });

  describe("install --tool opencode", () => {
    it("fresh install writes agents and skills into .opencode/", (): void => {
      // Arrange
      const targetOpenCodePath: string = path.join(tempDir, ".opencode");

      // Act
      runInstaller(tempDir, ["--tool", "opencode"]);

      // Assert
      assert.deepStrictEqual(collectRelativeFiles(path.join(targetOpenCodePath, "agents")), expectedOpenCodeAgentFiles);
      assert.deepStrictEqual(collectRelativeFiles(path.join(targetOpenCodePath, "skills")), expectedSkillFiles);

      for (const relativePath of expectedOpenCodeAgentFiles) {
        assertStartsWithYamlFrontmatter(path.join(targetOpenCodePath, "agents", relativePath));
      }

      for (const entry of skills) {
        assert.strictEqual(fs.readFileSync(path.join(targetOpenCodePath, "skills", entry.relativePath), "utf8"), entry.render("opencode"));
      }

      assert.ok(!fs.existsSync(path.join(targetOpenCodePath, "prompts")));
      assert.ok(!fs.existsSync(path.join(targetOpenCodePath, "commands")));
    });

    it("agent filenames use .md extension", (): void => {
      // Arrange
      const targetOpenCodePath: string = path.join(tempDir, ".opencode");

      // Act
      runInstaller(tempDir, ["--tool", "opencode"]);

      // Assert
      const installedAgentFiles: string[] = collectRelativeFiles(path.join(targetOpenCodePath, "agents"));

      for (const relativePath of installedAgentFiles) {
        assert.match(relativePath, /\.md$/);
        assert.ok(!relativePath.endsWith(".agent.md"));
      }
    });

    it("at least one agent has opencode frontmatter", (): void => {
      // Arrange
      const targetOpenCodePath: string = path.join(tempDir, ".opencode");

      // Act
      runInstaller(tempDir, ["--tool", "opencode"]);

      // Assert
      const installedAgentFiles: string[] = collectRelativeFiles(path.join(targetOpenCodePath, "agents"));
      const agentHeaders: string[] = installedAgentFiles.map((relativePath) => readAgentHeader(path.join(targetOpenCodePath, "agents", relativePath)));

      assert.ok(agentHeaders.some((header) => OPENCODE_MODEL_PATTERN.test(header)));
    });

    it("stdout matches format like Installed for opencode:", (): void => {
      // Act
      const stdout: string = runInstaller(tempDir, ["--tool", "opencode"]);

      // Assert
      assert.match(stdout, new RegExp(`Installed\\s+for\\s+opencode:\\s+${agents.length}\\s+agents,\\s+${skills.length}\\s+skills\\s+\\(0\\s+skipped existing\\)`));
    });

    it("agents are overwritten on re-run", (): void => {
      // Arrange
      const targetOpenCodePath: string = path.join(tempDir, ".opencode");

      runInstaller(tempDir, ["--tool", "opencode"]);
      const installedAgentFiles: string[] = collectRelativeFiles(path.join(targetOpenCodePath, "agents"));
      const agentPath: string = path.join(targetOpenCodePath, "agents", installedAgentFiles[0]);
      const originalAgentContent: string = fs.readFileSync(agentPath, "utf8");

      fs.writeFileSync(agentPath, "MODIFIED OPENCODE AGENT CONTENT\n");

      // Act
      runInstaller(tempDir, ["--tool", "opencode"]);

      // Assert
      assert.strictEqual(fs.readFileSync(agentPath, "utf8"), originalAgentContent);
      assert.match(readAgentHeader(agentPath), OPENCODE_MODEL_PATTERN);
    });

    it("skills are preserved on re-run", (): void => {
      // Arrange
      const targetOpenCodePath: string = path.join(tempDir, ".opencode");

      runInstaller(tempDir, ["--tool", "opencode"]);
      const skillPath: string = path.join(targetOpenCodePath, "skills", "test-engineering", "SKILL.md");
      const customSkillContent: string =
        "---\nname: test-engineering\ndescription: Project-specific test engineering skill\ncompatibility: opencode\n---\nKeep the existing red-phase workflow.\n";

      fs.writeFileSync(skillPath, customSkillContent);

      // Act
      runInstaller(tempDir, ["--tool", "opencode"]);

      // Assert
      assert.strictEqual(fs.readFileSync(skillPath, "utf8"), customSkillContent);
    });
  });

  describe("install --tool claude", () => {
    it("fresh install writes agents and skills into .claude/", (): void => {
      // Arrange
      const targetClaudePath: string = path.join(tempDir, ".claude");

      // Act
      runInstaller(tempDir, ["--tool", "claude"]);

      // Assert
      assert.deepStrictEqual(collectRelativeFiles(path.join(targetClaudePath, "agents")), expectedClaudeAgentFiles);
      assert.deepStrictEqual(collectRelativeFiles(path.join(targetClaudePath, "skills")), expectedSkillFiles);

      for (const relativePath of expectedClaudeAgentFiles) {
        assertStartsWithYamlFrontmatter(path.join(targetClaudePath, "agents", relativePath));
      }

      for (const entry of skills) {
        assert.strictEqual(fs.readFileSync(path.join(targetClaudePath, "skills", entry.relativePath), "utf8"), entry.render("claude"));
      }
    });

    it("claude skill headers use only supported metadata keys", (): void => {
      // Arrange
      const targetClaudePath: string = path.join(tempDir, ".claude");

      // Act
      runInstaller(tempDir, ["--tool", "claude"]);

      // Assert
      for (const entry of skills) {
        const skillPath: string = path.join(targetClaudePath, "skills", entry.relativePath);

        assertSupportedFrontmatterKeys(readFrontmatterKeys(skillPath), SUPPORTED_CLAUDE_SKILL_FRONTMATTER_KEYS);
      }
    });

    it("agent filenames use .md extension", (): void => {
      // Arrange
      const targetClaudePath: string = path.join(tempDir, ".claude");

      // Act
      runInstaller(tempDir, ["--tool", "claude"]);

      // Assert
      const installedAgentFiles: string[] = collectRelativeFiles(path.join(targetClaudePath, "agents"));

      for (const relativePath of installedAgentFiles) {
        assert.match(relativePath, /\.md$/);
        assert.ok(!relativePath.endsWith(".agent.md"));
      }
    });

    it("at least one agent has claude frontmatter", (): void => {
      // Arrange
      const targetClaudePath: string = path.join(tempDir, ".claude");

      // Act
      runInstaller(tempDir, ["--tool", "claude"]);

      // Assert
      const installedAgentFiles: string[] = collectRelativeFiles(path.join(targetClaudePath, "agents"));
      const agentHeaders: string[] = installedAgentFiles.map((relativePath) => readAgentHeader(path.join(targetClaudePath, "agents", relativePath)));

      assert.ok(agentHeaders.some((header) => CLAUDE_MODEL_PATTERN.test(header)));
    });

    it("stdout matches format like Installed for claude:", (): void => {
      // Act
      const stdout: string = runInstaller(tempDir, ["--tool", "claude"]);

      // Assert
      assert.match(stdout, new RegExp(`Installed\\s+for\\s+claude:\\s+${agents.length}\\s+agents,\\s+${skills.length}\\s+skills\\s+\\(0\\s+skipped existing\\)`));
    });

    it("agents are overwritten on re-run", (): void => {
      // Arrange
      const targetClaudePath: string = path.join(tempDir, ".claude");

      runInstaller(tempDir, ["--tool", "claude"]);
      const installedAgentFiles: string[] = collectRelativeFiles(path.join(targetClaudePath, "agents"));
      const agentPath: string = path.join(targetClaudePath, "agents", installedAgentFiles[0]);
      const originalAgentContent: string = fs.readFileSync(agentPath, "utf8");

      fs.writeFileSync(agentPath, "MODIFIED CLAUDE AGENT CONTENT\n");

      // Act
      runInstaller(tempDir, ["--tool", "claude"]);

      // Assert
      assert.strictEqual(fs.readFileSync(agentPath, "utf8"), originalAgentContent);
      assert.match(readAgentHeader(agentPath), CLAUDE_MODEL_PATTERN);
    });

    it("fabys skills are refreshed on re-run", (): void => {
      // Arrange
      const targetClaudePath: string = path.join(tempDir, ".claude");

      runInstaller(tempDir, ["--tool", "claude"]);
      const skillPath: string = path.join(targetClaudePath, "skills", "fabys-questions", "SKILL.md");
      const customSkillContent: string = "---\nname: fabys-questions\ndescription: Project-specific questions skill\nuser-invocable: false\n---\nAsk only when the answer changes scope.\n";

      fs.writeFileSync(skillPath, customSkillContent);

      // Act
      runInstaller(tempDir, ["--tool", "claude"]);

      // Assert
      assert.strictEqual(fs.readFileSync(skillPath, "utf8"), skills.find((skill) => skill.relativePath === "fabys-questions/SKILL.md")!.render("claude"));
    });
  });

  describe("install --tool errors", () => {
    it("--tool invalid exits non-zero", (): void => {
      // Arrange
      const args: string[] = ["--tool", "invalid"];

      // Act
      const result = runInstallerProcess(tempDir, args);

      // Assert
      assert.notStrictEqual(result.status, 0);
      assert.match(result.stderr, /invalid tool|--tool/i);
    });

    it("non-TTY without --tool defaults to copilot", (): void => {
      // Arrange
      const targetGithubPath: string = path.join(tempDir, ".github");

      // Act
      const stdout: string = runInstaller(tempDir);

      // Assert
      assert.ok(fs.existsSync(path.join(targetGithubPath, "agents")));
      assert.ok(!fs.existsSync(path.join(tempDir, ".opencode")));
      assert.match(stdout, /Installed\s+for\s+copilot:/);
    });
  });
});

function runInstaller(cwd: string, args: string[] = []): string {
  return execFileSync(process.execPath, [BIN_PATH, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function runInstallerProcess(cwd: string, args: string[] = []) {
  return spawnSync(process.execPath, [BIN_PATH, ...args], {
    cwd,
    encoding: "utf8"
  });
}

function readAgentHeader(filePath: string): string {
  const fileContent: string = fs.readFileSync(filePath, "utf8");
  const headerMatch = /^---\n([\s\S]*?)\n---\n/.exec(fileContent);

  if (!headerMatch) {
    throw new Error(`Expected YAML frontmatter in ${filePath}`);
  }

  return headerMatch[1];
}

function readFrontmatterKeys(filePath: string): string[] {
  return readAgentHeader(filePath)
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        throw new Error(`Expected frontmatter key/value line in ${filePath}: ${line}`);
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

function assertStartsWithYamlFrontmatter(filePath: string): void {
  const fileContent: string = fs.readFileSync(filePath, "utf8");

  assert.match(fileContent, /^---\n/);
  assert.doesNotThrow(() => readAgentHeader(filePath));
}

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
