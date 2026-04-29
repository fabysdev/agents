#!/usr/bin/env node
import { type FabysAgentToolConfig } from "./config.js";
import { type OptionalProjectSkillName, type Tool } from "./install.js";
interface PromptContext {
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
    clearPromptOnDone?: boolean;
}
interface PromptChoice<TValue extends string> {
    name: string;
    value: TValue;
    description: string;
}
interface SelectPromptConfig<TValue extends string> {
    message: string;
    choices: Array<PromptChoice<TValue>>;
    pageSize?: number;
}
interface CheckboxPromptConfig<TValue extends string> {
    message: string;
    choices: Array<{
        name: string;
        value: TValue;
        description: string;
        checked?: boolean;
    }>;
    pageSize?: number;
}
type SelectPrompt<TValue extends string> = (config: SelectPromptConfig<TValue>, context?: PromptContext) => Promise<TValue>;
type CheckboxPrompt<TValue extends string> = (config: CheckboxPromptConfig<TValue>, context?: PromptContext) => Promise<ReadonlyArray<TValue>>;
export declare function parseArgs(argv: string[]): {
    configLocation?: string;
    force: boolean;
    tool?: Tool;
};
export declare function promptForTool(options?: {
    selectPrompt?: SelectPrompt<Tool>;
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
}): Promise<Tool>;
export declare function determineTool(argv: string[], options?: {
    selectPrompt?: SelectPrompt<Tool>;
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
}): Promise<Tool>;
export declare function promptForProjectSkills(options?: {
    checkboxPrompt?: CheckboxPrompt<OptionalProjectSkillName>;
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
}): Promise<OptionalProjectSkillName[]>;
export declare function determineProjectSkills(options?: {
    checkboxPrompt?: CheckboxPrompt<OptionalProjectSkillName>;
    configuredSkills?: FabysAgentToolConfig["skills"];
    input?: NodeJS.ReadableStream;
    output?: NodeJS.WritableStream;
}): Promise<OptionalProjectSkillName[]>;
export declare function runCli(): Promise<void>;
export {};
