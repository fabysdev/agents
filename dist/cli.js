#!/usr/bin/env node
import path from "node:path";
import { createInterface } from "node:readline";
import { install } from "./install.js";
const TOOL_PROMPT = "Which AI tool do you use?\n  1. GitHub Copilot\n  2. OpenCode\n> ";
const INVALID_TOOL_PROMPT = `Invalid selection. Enter 1, 2, copilot, or opencode.\n${TOOL_PROMPT}`;
export function parseArgs(argv) {
    const toolIndex = argv.indexOf("--tool");
    if (toolIndex === -1) {
        return { tool: undefined };
    }
    const value = argv[toolIndex + 1];
    if (value === undefined) {
        throw new Error('--tool requires a value: "copilot" or "opencode"');
    }
    if (value !== "copilot" && value !== "opencode") {
        throw new Error(`Invalid tool: ${value}. Use "copilot" or "opencode".`);
    }
    return { tool: value };
}
export async function promptForTool() {
    const readline = createInterface({
        input: process.stdin,
        output: process.stdout
    });
    try {
        const firstSelection = parseToolSelection(await askQuestion(readline, TOOL_PROMPT));
        if (firstSelection !== undefined) {
            return firstSelection;
        }
        const secondSelection = parseToolSelection(await askQuestion(readline, INVALID_TOOL_PROMPT));
        return secondSelection ?? "copilot";
    }
    finally {
        readline.close();
    }
}
export async function determineTool(argv) {
    const { tool } = parseArgs(argv);
    if (tool !== undefined) {
        return tool;
    }
    if (process.stdin.isTTY === true) {
        return promptForTool();
    }
    return "copilot";
}
export async function runCli() {
    const tool = await determineTool(process.argv);
    const targetBase = path.join(process.cwd(), tool === "copilot" ? ".github" : ".opencode");
    const result = install({ targetBase, tool });
    process.stdout.write(`Installed for ${tool}: ${result.agents} agents, ${result.skillsWritten} skills (${result.skillsSkipped} skipped existing)\n`);
}
function askQuestion(readline, prompt) {
    return new Promise((resolve) => {
        readline.question(prompt, resolve);
    });
}
function parseToolSelection(value) {
    const normalizedValue = value.trim().toLowerCase();
    if (normalizedValue === "1" || normalizedValue === "copilot") {
        return "copilot";
    }
    if (normalizedValue === "2" || normalizedValue === "opencode") {
        return "opencode";
    }
    return undefined;
}
if (import.meta.main) {
    runCli().catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Error: ${message}\n`);
        process.exit(1);
    });
}
//# sourceMappingURL=cli.js.map