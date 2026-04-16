export type { Tool, TemplateEntry } from "./templates/index.js";
export interface InstallOptions {
    targetBase: string;
    tool: "copilot" | "opencode";
}
export interface InstallResult {
    agents: number;
    skillsWritten: number;
    skillsSkipped: number;
}
export declare function install({ targetBase, tool }: InstallOptions): InstallResult;
