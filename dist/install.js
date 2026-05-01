import fs from "node:fs";
import path from "node:path";
import { agents as agentTemplates, skills as skillTemplates } from "./templates/index.js";
export const optionalProjectSkills = [
    {
        name: "exploration",
        description: "Search priorities, exclusions, and discovery hints"
    },
    {
        name: "planning",
        description: "Planning constraints, phase structure, and quality bars"
    },
    {
        name: "implementation",
        description: "Architecture, coding standards, and validation requirements"
    },
    {
        name: "review",
        description: "Review rules that override generic heuristics"
    },
    {
        name: "test-engineering",
        description: "Coverage expectations, mocking boundaries, and test conventions"
    },
    {
        name: "test-consolidation",
        description: "Merge boundaries and structure preservation rules"
    }
];
const FABYS_SKILL_PREFIX = "fabys-";
const WORKFLOW_SKILL_NAMES = new Set(["dev", "impl", "rapid", "tdd"]);
const MANDATORY_PROJECT_SKILL_NAMES = new Set(["lint", "test"]);
const OPTIONAL_PROJECT_SKILL_NAMES = new Set(optionalProjectSkills.map(({ name }) => name));
const RETIRED_AGENT_FILES = ["fabys-analyst.agent.md"];
export function install({ targetBase, tool, force = false, selectedProjectSkills, agentModels }) {
    fs.mkdirSync(targetBase, { recursive: true });
    const selectedOptionalProjectSkills = normalizeSelectedProjectSkills(selectedProjectSkills);
    const renderContext = { models: agentModels };
    const renameAgent = usesMarkdownAgentFilenames(tool) ? (filename) => filename.replace(".agent.md", ".md") : undefined;
    const agents = writeTemplates({
        entries: agentTemplates,
        renderContext,
        targetDir: path.join(targetBase, "agents"),
        tool,
        overwrite: true,
        renameFile: renameAgent
    });
    removeRetiredAgentFiles({
        relativePaths: RETIRED_AGENT_FILES,
        targetDir: path.join(targetBase, "agents"),
        renameFile: renameAgent
    });
    const fabysSkills = writeTemplates({
        entries: filterTemplates(skillTemplates, (entry) => isFabysSkill(getSkillName(entry))),
        renderContext,
        targetDir: path.join(targetBase, "skills"),
        tool,
        overwrite: true
    });
    const workflowSkills = writeTemplates({
        entries: filterTemplates(skillTemplates, (entry) => WORKFLOW_SKILL_NAMES.has(getSkillName(entry))),
        renderContext,
        targetDir: path.join(targetBase, "skills"),
        tool,
        overwrite: true
    });
    const mandatoryProjectSkills = writeTemplates({
        entries: filterTemplates(skillTemplates, (entry) => MANDATORY_PROJECT_SKILL_NAMES.has(getSkillName(entry))),
        renderContext,
        targetDir: path.join(targetBase, "skills"),
        tool,
        overwrite: force
    });
    const selectedOptionalSkills = writeTemplates({
        entries: filterTemplates(skillTemplates, (entry) => selectedOptionalProjectSkills.has(getSkillName(entry))),
        renderContext,
        targetDir: path.join(targetBase, "skills"),
        tool,
        overwrite: force
    });
    const skillsResult = combineWriteResults(fabysSkills, workflowSkills, mandatoryProjectSkills, selectedOptionalSkills);
    return {
        agents: agents.written,
        skillsWritten: skillsResult.written,
        skillsSkipped: skillsResult.skipped
    };
}
function usesMarkdownAgentFilenames(tool) {
    return tool === "opencode" || tool === "claude";
}
function combineWriteResults(...results) {
    return results.reduce((combined, result) => ({
        written: combined.written + result.written,
        skipped: combined.skipped + result.skipped
    }), { written: 0, skipped: 0 });
}
function filterTemplates(entries, predicate) {
    return entries.filter(predicate);
}
function getSkillName(entry) {
    return entry.relativePath.split("/")[0];
}
function isFabysSkill(skillName) {
    return skillName.startsWith(FABYS_SKILL_PREFIX);
}
function normalizeSelectedProjectSkills(selectedProjectSkills) {
    if (selectedProjectSkills === undefined) {
        return new Set(optionalProjectSkills.map(({ name }) => name));
    }
    const normalizedSelection = new Set();
    const invalidSelections = [];
    for (const skillName of selectedProjectSkills) {
        if (OPTIONAL_PROJECT_SKILL_NAMES.has(skillName)) {
            normalizedSelection.add(skillName);
            continue;
        }
        if (!MANDATORY_PROJECT_SKILL_NAMES.has(skillName)) {
            invalidSelections.push(skillName);
        }
    }
    if (invalidSelections.length > 0) {
        throw new Error(`Invalid project skill selection: ${invalidSelections.join(", ")}. Use only supported project-specific skill names.`);
    }
    return normalizedSelection;
}
function writeTemplates({ entries, renderContext, targetDir, tool, overwrite, renameFile }) {
    let written = 0;
    let skipped = 0;
    for (const entry of entries) {
        const filename = renameFile ? renameFile(entry.relativePath) : entry.relativePath;
        const targetPath = path.join(targetDir, filename);
        const renderedContent = entry.render(tool, renderContext);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        if (!overwrite && fs.existsSync(targetPath)) {
            skipped += 1;
            continue;
        }
        fs.writeFileSync(targetPath, renderedContent);
        written += 1;
    }
    return { written, skipped };
}
function removeRetiredAgentFiles({ relativePaths, targetDir, renameFile }) {
    for (const relativePath of relativePaths) {
        const filename = renameFile ? renameFile(relativePath) : relativePath;
        const targetPath = path.join(targetDir, filename);
        if (fs.existsSync(targetPath)) {
            fs.rmSync(targetPath);
        }
    }
}
//# sourceMappingURL=install.js.map