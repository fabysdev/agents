import fs from "node:fs";
import path from "node:path";
import { agents as agentTemplates, prompts as promptTemplates, skills as skillTemplates, } from "./templates/index.js";
export function install({ targetBase, tool }) {
    fs.mkdirSync(targetBase, { recursive: true });
    const renameAgent = tool === "opencode"
        ? (filename) => filename.replace(".agent.md", ".md")
        : undefined;
    const renamePrompt = tool === "opencode"
        ? (filename) => filename.replace(".prompt.md", ".md")
        : undefined;
    const agents = writeTemplates({
        entries: agentTemplates,
        targetDir: path.join(targetBase, "agents"),
        tool,
        overwrite: true,
        renameFile: renameAgent,
    });
    const prompts = writeTemplates({
        entries: promptTemplates,
        targetDir: path.join(targetBase, tool === "copilot" ? "prompts" : "commands"),
        tool,
        overwrite: true,
        renameFile: renamePrompt,
    });
    const skillsResult = writeTemplates({
        entries: skillTemplates,
        targetDir: path.join(targetBase, "skills"),
        tool,
        overwrite: false,
    });
    return {
        agents: agents.written,
        prompts: prompts.written,
        skillsWritten: skillsResult.written,
        skillsSkipped: skillsResult.skipped,
    };
}
function writeTemplates({ entries, targetDir, tool, overwrite, renameFile, }) {
    let written = 0;
    let skipped = 0;
    for (const entry of entries) {
        const filename = renameFile
            ? renameFile(entry.relativePath)
            : entry.relativePath;
        const targetPath = path.join(targetDir, filename);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        if (!overwrite && fs.existsSync(targetPath)) {
            skipped += 1;
            continue;
        }
        fs.writeFileSync(targetPath, entry.render(tool));
        written += 1;
    }
    return { written, skipped };
}
//# sourceMappingURL=install.js.map