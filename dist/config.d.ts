import { type OptionalProjectSkillName } from "./install.js";
import { type Tool } from "./templates/index.js";
export declare const FABYS_AGENTS_CONFIG_FILENAME = ".fabysagents.json";
export interface FabysAgentConfig {
    copilot?: FabysAgentToolConfig;
    opencode?: FabysAgentToolConfig;
    claude?: FabysAgentToolConfig;
}
export interface FabysAgentToolConfig {
    models?: Readonly<Record<string, string>>;
    skills?: Readonly<Partial<Record<OptionalProjectSkillName, boolean>>>;
}
export interface LoadFabysAgentConfigOptions {
    cwd: string;
    configLocation?: string;
}
export interface LoadedFabysAgentConfig {
    config: FabysAgentConfig;
    projectRoot: string;
}
export declare function loadFabysAgentConfig({ cwd, configLocation }: LoadFabysAgentConfigOptions): LoadedFabysAgentConfig;
export declare function resolveConfiguredProjectSkills(configuredSkills: Readonly<Partial<Record<OptionalProjectSkillName, boolean>>>): OptionalProjectSkillName[];
export declare function resolveToolConfig(config: FabysAgentConfig, tool: Tool): FabysAgentToolConfig;
