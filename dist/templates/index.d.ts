export type Tool = "copilot" | "opencode" | "claude";
export interface TemplateEntry {
    relativePath: string;
    render: (tool: Tool) => string;
}
export declare const agents: TemplateEntry[];
export declare const allAgents: TemplateEntry[];
export declare const skills: TemplateEntry[];
