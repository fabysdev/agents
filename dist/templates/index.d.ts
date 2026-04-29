export type Tool = "copilot" | "opencode" | "claude";
export interface TemplateRenderContext {
    models?: Readonly<Record<string, string>>;
}
export interface TemplateEntry {
    relativePath: string;
    render: (tool: Tool, context?: TemplateRenderContext) => string;
}
export declare const agents: TemplateEntry[];
export declare const allAgents: TemplateEntry[];
export declare const skills: TemplateEntry[];
