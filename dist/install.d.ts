import { type Tool } from "./templates/index.js";
export type { Tool, TemplateEntry } from "./templates/index.js";
export interface ProjectSkillChoice {
    name: string;
    description: string;
}
export declare const optionalProjectSkills: readonly [{
    readonly name: "exploration";
    readonly description: "Search priorities, exclusions, and discovery hints";
}, {
    readonly name: "planning";
    readonly description: "Planning constraints, phase structure, and quality bars";
}, {
    readonly name: "implementation";
    readonly description: "Architecture, coding standards, and validation requirements";
}, {
    readonly name: "review";
    readonly description: "Review rules that override generic heuristics";
}, {
    readonly name: "test-engineering";
    readonly description: "Coverage expectations, mocking boundaries, and test conventions";
}, {
    readonly name: "test-consolidation";
    readonly description: "Merge boundaries and structure preservation rules";
}];
export type OptionalProjectSkillName = (typeof optionalProjectSkills)[number]["name"];
export interface InstallOptions {
    targetBase: string;
    tool: Tool;
    force?: boolean;
    selectedProjectSkills?: readonly string[];
}
export interface InstallResult {
    agents: number;
    skillsWritten: number;
    skillsSkipped: number;
}
export declare function install({ targetBase, tool, force, selectedProjectSkills }: InstallOptions): InstallResult;
