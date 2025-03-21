export declare enum TaskType {
    FileOperation = "FileOperation",
    CodeAnalysis = "CodeAnalysis",
    SystemOperation = "SystemOperation",
    DataProcessing = "DataProcessing",
    WebSearch = "WebSearch",
    DatabaseOperation = "DatabaseOperation",
    APIInteraction = "APIInteraction",
    DocumentProcess = "DocumentProcess",
    ImageProcess = "ImageProcess",
    NaturalLanguageProcess = "NaturalLanguageProcess",
    Unknown = "Unknown"
}
export interface Task {
    id?: string;
    description: string;
    type: TaskType;
    keywords: string[];
    complexity: number;
    entities?: string[];
    subTasks?: string[];
    priority?: number;
    estimatedDuration?: number;
    domain?: string;
}
export interface MCPTool {
    name: string;
    description: string;
    capabilities: string[];
}
export interface ToolRecommendation {
    tools: MCPTool[];
    sequence: string[];
    reasoning: string;
}
export interface Environment {
    workingDirectory: string;
    availableTools: MCPTool[];
    systemInfo: {
        os: string;
        shell: string;
    };
}
export interface HistoryEntry {
    timestamp: number;
    action: string;
    result?: any;
}
export interface Context {
    currentTask?: Task;
    history: HistoryEntry[];
    environment: Environment;
}
export interface ContextUpdateParams {
    toolUsage?: {
        name: string;
        inputs?: any;
        outputs?: any;
        success?: boolean;
    };
    feedback?: string;
}
export interface TaskAnalyzer {
    analyzeTask(description: string, context?: string): Promise<Task>;
    extractKeywords(description: string): Promise<string[]>;
    determineComplexity(description: string): Promise<number>;
    classifyTaskType(description: string): Promise<TaskType>;
    identifyEntities(description: string): Promise<string[]>;
    splitIntoSubTasks(description: string): Promise<string[]>;
    determinePriority(description: string): Promise<number>;
    estimateTaskDuration(description: string, complexity: number): Promise<number>;
    identifyDomain(description: string): Promise<string>;
}
export interface ToolRecommender {
    recommendTools(task: Task, context: Context): Promise<ToolRecommendation>;
}
export interface ContextManager {
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
}
export interface LLMServiceConfig {
    apiKey: string;
    apiEndpoint: string;
    modelName: string;
    maxTokens: number;
    temperature: number;
}
