import { Task, TaskType, TaskAnalyzer } from '../types/interfaces.js';
import { LLMService } from '../services/LLMService.js';
export declare class DefaultTaskAnalyzer implements TaskAnalyzer {
    private llmService;
    private useLLM;
    constructor(config?: {
        useLLM?: boolean;
        llmService?: LLMService | null;
    });
    analyzeTask(description: string, context?: string): Promise<Task>;
    extractKeywords(description: string): Promise<string[]>;
    determineComplexity(description: string): Promise<number>;
    classifyTaskType(description: string): Promise<TaskType>;
    identifyEntities(description: string): Promise<string[]>;
    splitIntoSubTasks(description: string): Promise<string[]>;
    determinePriority(description: string): Promise<number>;
    estimateTaskDuration(description: string, complexity: number): Promise<number>;
    identifyDomain(description: string): Promise<string>;
    private mapLLMTaskType;
}
export type { TaskAnalyzer };
