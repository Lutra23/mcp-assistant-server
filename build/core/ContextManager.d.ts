import { Context, ContextManager, ContextUpdateParams, HistoryEntry } from '../types/interfaces.js';
export declare class DefaultContextManager implements ContextManager {
    private contextStore;
    private toolStats;
    constructor();
    getContext(taskId: string): Context;
    updateContext(taskId: string, params: ContextUpdateParams): Promise<Context>;
    getRelevantHistory(taskId: string, limit?: number): Promise<HistoryEntry[]>;
    trackToolUsage(taskId: string, toolUsage: {
        name: string;
        inputs?: any;
        outputs?: any;
        success?: boolean;
    }): Promise<void>;
    updateToolStats(toolName: string, success: boolean): Promise<void>;
    private createDefaultEnvironment;
    getToolStatistics(): {
        name: string;
        usageCount: number;
        successRate: number;
        lastUsed: Date;
    }[];
    clearContext(taskId: string): boolean;
}
