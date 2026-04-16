import fs from "node:fs";
import path from "node:path";

import {agents as agentTemplates, skills as skillTemplates, type TemplateEntry} from "./templates/index.js";

export type {Tool, TemplateEntry} from "./templates/index.js";

export interface InstallOptions {
  targetBase: string;
  tool: "copilot" | "opencode";
}

export interface InstallResult {
  agents: number;
  skillsWritten: number;
  skillsSkipped: number;
}

export function install({targetBase, tool}: InstallOptions): InstallResult {
  fs.mkdirSync(targetBase, {recursive: true});

  const renameAgent = tool === "opencode" ? (filename: string): string => filename.replace(".agent.md", ".md") : undefined;

  const agents = writeTemplates({
    entries: agentTemplates,
    targetDir: path.join(targetBase, "agents"),
    tool,
    overwrite: true,
    renameFile: renameAgent
  });

  const skillsResult = writeTemplates({
    entries: skillTemplates,
    targetDir: path.join(targetBase, "skills"),
    tool,
    overwrite: false
  });

  return {
    agents: agents.written,
    skillsWritten: skillsResult.written,
    skillsSkipped: skillsResult.skipped
  };
}

interface WriteTemplatesOptions {
  entries: TemplateEntry[];
  targetDir: string;
  tool: "copilot" | "opencode";
  overwrite: boolean;
  renameFile?: (filename: string) => string;
}

function writeTemplates({entries, targetDir, tool, overwrite, renameFile}: WriteTemplatesOptions): {written: number; skipped: number} {
  let written = 0;
  let skipped = 0;

  for (const entry of entries) {
    const filename = renameFile ? renameFile(entry.relativePath) : entry.relativePath;
    const targetPath = path.join(targetDir, filename);

    fs.mkdirSync(path.dirname(targetPath), {recursive: true});

    if (!overwrite && fs.existsSync(targetPath)) {
      skipped += 1;
      continue;
    }

    fs.writeFileSync(targetPath, entry.render(tool));
    written += 1;
  }

  return {written, skipped};
}
