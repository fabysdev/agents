export type Tool = "copilot" | "opencode";
export interface TemplateEntry {
    relativePath: string;
    render: (tool: Tool) => string;
}
export declare const agents: TemplateEntry[];
export declare const prompts: TemplateEntry[];
export declare const skills: TemplateEntry[];
