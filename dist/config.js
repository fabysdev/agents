import fs from "node:fs";
import path from "node:path";
import { optionalProjectSkills } from "./install.js";
import { agents } from "./templates/index.js";
export const FABYS_AGENTS_CONFIG_FILENAME = ".fabysagents.json";
const VALID_AGENT_NAMES = new Set(agents.map((entry) => entry.relativePath.replace(/\.agent\.md$/, "")));
const VALID_OPTIONAL_SKILL_NAMES = new Set(optionalProjectSkills.map(({ name }) => name));
const VALID_TOOL_NAMES = new Set(["copilot", "opencode", "claude"]);
export function loadFabysAgentConfig({ cwd, configLocation }) {
    const { configPath, requireConfigFile, projectRoot } = resolveConfigTarget({ configLocation, cwd });
    if (!fs.existsSync(configPath)) {
        if (!requireConfigFile) {
            return { config: {}, projectRoot };
        }
        throw new Error(`Config file not found: ${configPath}`);
    }
    const stat = fs.statSync(configPath);
    if (!stat.isFile()) {
        throw new Error(`Config path is not a file: ${configPath}`);
    }
    const rawConfig = fs.readFileSync(configPath, "utf8");
    let parsedConfig;
    try {
        parsedConfig = JSON.parse(rawConfig);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Invalid JSON in ${configPath}: ${message}`, { cause: error });
    }
    return {
        config: normalizeFabysAgentConfig(parsedConfig, configPath),
        projectRoot
    };
}
export function resolveConfiguredProjectSkills(configuredSkills) {
    return optionalProjectSkills.flatMap(({ name }) => (configuredSkills[name] === false ? [] : [name]));
}
export function resolveToolConfig(config, tool) {
    return config[tool] ?? {};
}
function resolveConfigTarget({ cwd, configLocation }) {
    if (configLocation === undefined) {
        return {
            configPath: path.join(cwd, FABYS_AGENTS_CONFIG_FILENAME),
            requireConfigFile: false,
            projectRoot: cwd
        };
    }
    const resolvedLocation = path.resolve(cwd, configLocation);
    const looksLikeFile = path.extname(resolvedLocation) === ".json" || path.basename(resolvedLocation) === FABYS_AGENTS_CONFIG_FILENAME;
    if (looksLikeFile) {
        return {
            configPath: resolvedLocation,
            requireConfigFile: true,
            projectRoot: path.dirname(resolvedLocation)
        };
    }
    return {
        configPath: path.join(resolvedLocation, FABYS_AGENTS_CONFIG_FILENAME),
        requireConfigFile: false,
        projectRoot: resolvedLocation
    };
}
function normalizeFabysAgentConfig(value, configPath) {
    if (!isPlainObject(value)) {
        throw new Error(`Expected ${configPath} to contain a JSON object.`);
    }
    const unknownKeys = Object.keys(value).filter((key) => !VALID_TOOL_NAMES.has(key));
    if (unknownKeys.length > 0) {
        throw new Error(`Unsupported config keys in ${configPath}: ${unknownKeys.join(", ")}. Use only "copilot", "opencode", and "claude".`);
    }
    const normalizedConfig = {};
    for (const tool of VALID_TOOL_NAMES) {
        const toolConfig = value[tool];
        if (toolConfig !== undefined) {
            normalizedConfig[tool] = normalizeToolConfig(tool, toolConfig, configPath);
        }
    }
    return normalizedConfig;
}
function normalizeToolConfig(tool, value, configPath) {
    if (!isPlainObject(value)) {
        throw new Error(`Expected "${tool}" in ${configPath} to be an object with optional "models" and "skills" objects.`);
    }
    const allowedToolKeys = new Set(["models", "skills"]);
    const unknownKeys = Object.keys(value).filter((key) => !allowedToolKeys.has(key));
    if (unknownKeys.length > 0) {
        throw new Error(`Unsupported ${tool} config keys in ${configPath}: ${unknownKeys.join(", ")}. Use only "models" and "skills".`);
    }
    const normalizedConfig = {};
    if (value.models !== undefined) {
        normalizedConfig.models = normalizeModelsConfig(value.models, configPath, tool);
    }
    if (value.skills !== undefined) {
        normalizedConfig.skills = normalizeSkillsConfig(value.skills, configPath, tool);
    }
    return normalizedConfig;
}
function normalizeModelsConfig(value, configPath, tool) {
    if (!isPlainObject(value)) {
        throw new Error(`Expected "models" for ${tool} in ${configPath} to be an object keyed by agent name.`);
    }
    const normalizedModels = {};
    for (const [agentName, configuredModel] of Object.entries(value)) {
        if (!VALID_AGENT_NAMES.has(agentName)) {
            throw new Error(`Unsupported agent model override in ${configPath}: ${agentName}.`);
        }
        if (typeof configuredModel !== "string") {
            throw new Error(`Expected model override for ${agentName} in ${configPath} to be a string.`);
        }
        const normalizedModel = configuredModel.trim();
        if (normalizedModel.length === 0) {
            throw new Error(`Expected model override for ${agentName} in ${configPath} to be a non-empty string.`);
        }
        if (normalizedModel.includes("\n") || normalizedModel.includes("\r")) {
            throw new Error(`Expected model override for ${agentName} in ${configPath} to stay on a single line.`);
        }
        normalizedModels[agentName] = normalizedModel;
    }
    return normalizedModels;
}
function normalizeSkillsConfig(value, configPath, tool) {
    if (!isPlainObject(value)) {
        throw new Error(`Expected "skills" for ${tool} in ${configPath} to be an object keyed by optional skill name.`);
    }
    const normalizedSkills = {};
    for (const [skillName, enabled] of Object.entries(value)) {
        if (!isOptionalProjectSkillName(skillName)) {
            throw new Error(`Unsupported project skill in ${configPath}: ${skillName}.`);
        }
        if (typeof enabled !== "boolean") {
            throw new Error(`Expected project skill flag for ${skillName} in ${configPath} to be a boolean.`);
        }
        normalizedSkills[skillName] = enabled;
    }
    return normalizedSkills;
}
function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isOptionalProjectSkillName(value) {
    return VALID_OPTIONAL_SKILL_NAMES.has(value);
}
//# sourceMappingURL=config.js.map