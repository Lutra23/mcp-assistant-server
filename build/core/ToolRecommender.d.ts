import { Task, MCPTool, ToolRecommendation, ToolRecommender, Context } from '../types/interfaces.js';
import { LLMService } from '../services/LLMService.js';
export declare class DefaultToolRecommender implements ToolRecommender {
    private llmService;
    private useLLM;
    constructor(config?: {
        useLLM?: boolean;
        llmService?: LLMService | null;
    });
    recommendTools(task: Task, context: Context): Promise<ToolRecommendation>;
    matchToolCapabilities(task: Task): Promise<MCPTool[]>;
    optimizeSequence(task: Task, tools: MCPTool[], context: Context): Promise<string[]>;
    generateReasoning(task: Task, tools: MCPTool[], sequence: string[], context: Context): Promise<string>;
}
