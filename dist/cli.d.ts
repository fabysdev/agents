#!/usr/bin/env node
import { type Tool } from "./install.js";
export declare function parseArgs(argv: string[]): {
    tool?: Tool;
};
export declare function promptForTool(): Promise<Tool>;
export declare function determineTool(argv: string[]): Promise<Tool>;
export declare function runCli(): Promise<void>;
