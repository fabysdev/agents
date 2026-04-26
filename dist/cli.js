#!/usr/bin/env node
import path from "node:path";
import { checkbox, select } from "@inquirer/prompts";
import { install, optionalProjectSkills } from "./install.js";
const TOOL_PROMPT = "Which AI tool do you use?";
const PROJECT_SKILL_PROMPT = "Select project-specific skills to install. lint and test are always installed.";
function isTool(value) {
    return value === "copilot" || value === "opencode" || value === "claude";
}
export function parseArgs(argv) {
    const toolIndex = argv.indexOf("--tool");
    const force = argv.includes("--force");
    if (toolIndex === -1) {
        return { force, tool: undefined };
    }
    const value = argv[toolIndex + 1];
    if (value === undefined) {
        throw new Error('--tool requires a value: "copilot", "opencode", or "claude"');
    }
    if (!isTool(value)) {
        throw new Error(`Invalid tool: ${value}. Use "copilot", "opencode", or "claude".`);
    }
    return { force, tool: value };
}
export async function promptForTool(options = {}) {
    const prompt = options.selectPrompt ?? select;
    return prompt({
        message: TOOL_PROMPT,
        choices: [
            {
                name: "GitHub Copilot",
                value: "copilot",
                description: "Install agents and skills under .github/"
            },
            {
                name: "OpenCode",
                value: "opencode",
                description: "Install agents and skills under .opencode/"
            },
            {
                name: "Claude Code",
                value: "claude",
                description: "Install agents and skills under .claude/"
            }
        ],
        pageSize: 3
    }, {
        clearPromptOnDone: true,
        input: options.input ?? process.stdin,
        output: options.output ?? process.stdout
    });
}
export async function determineTool(argv, options = {}) {
    const { tool } = parseArgs(argv);
    if (tool !== undefined) {
        return tool;
    }
    const input = (options.input ?? process.stdin);
    const output = (options.output ?? process.stdout);
    if (input.isTTY === true && output.isTTY === true) {
        return promptForTool({
            input,
            output,
            selectPrompt: options.selectPrompt
        });
    }
    return "copilot";
}
export async function promptForProjectSkills(options = {}) {
    const prompt = options.checkboxPrompt ?? checkbox;
    const selectedSkills = await prompt({
        message: PROJECT_SKILL_PROMPT,
        choices: optionalProjectSkills.map((skill) => ({
            name: skill.name,
            value: skill.name,
            description: skill.description,
            checked: true
        })),
        pageSize: optionalProjectSkills.length
    }, {
        clearPromptOnDone: true,
        input: options.input ?? process.stdin,
        output: options.output ?? process.stdout
    });
    return [...selectedSkills];
}
export async function determineProjectSkills(options = {}) {
    const input = (options.input ?? process.stdin);
    const output = (options.output ?? process.stdout);
    if (input.isTTY === true && output.isTTY === true) {
        return promptForProjectSkills({
            checkboxPrompt: options.checkboxPrompt,
            input,
            output
        });
    }
    return optionalProjectSkills.map(({ name }) => name);
}
export async function runCli() {
    const { force } = parseArgs(process.argv);
    const tool = await determineTool(process.argv);
    const selectedProjectSkills = await determineProjectSkills();
    const targetBase = path.join(process.cwd(), getTargetDirectory(tool));
    const result = install({ force, selectedProjectSkills, targetBase, tool });
    process.stdout.write(`Installed for ${tool}: ${result.agents} agents, ${result.skillsWritten} skills (${result.skillsSkipped} skipped existing)\n`);
}
function getTargetDirectory(tool) {
    switch (tool) {
        case "copilot":
            return ".github";
        case "opencode":
            return ".opencode";
        case "claude":
            return ".claude";
    }
}
if (import.meta.main) {
    runCli().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Error: ${message}\n`);
        process.exit(1);
    });
}
//# sourceMappingURL=cli.js.map