import { Task, MCPTool, LLMServiceConfig } from '../types/interfaces.js';
interface LLMTaskAnalysisResult {
    taskType: string;
    keywords: string[];
    complexity: number;
    entities: string[];
    subTasks: string[];
    priority: number;
    estimatedDuration: number;
    domain: string;
}
interface LLMToolRecommendationResult {
    recommendedTools: string[];
    sequence: string[];
    reasoning: string;
}
export declare class LLMService {
    private config;
    /**
     * 构造函数
     * @param config LLM服务配置
     */
    constructor(config: LLMServiceConfig);
    /**
     * 获取LLM服务配置信息（隐藏敏感信息）
     */
    getConfig(): any;
    /**
     * 更新LLM配置
     * @param updateConfig 要更新的配置项
     */
    updateConfig(updateConfig: Partial<LLMServiceConfig>): void;
    /**
     * 测试与LLM API的连接
     * @returns 测试结果
     */
    testConnection(): Promise<boolean>;
    /**
     * 使用大模型分析任务
     * @param description 任务描述
     * @param context 上下文信息（可选）
     * @param analysisType 分析类型（可选）
     * @returns 分析结果
     */
    analyzeTask(description: string, context?: string, analysisType?: string): Promise<LLMTaskAnalysisResult>;
    /**
     * 使用大模型推荐工具
     * @param task 任务信息
     * @param availableTools 可用工具列表
     * @returns 推荐结果
     */
    recommendTools(task: Task, availableTools: MCPTool[]): Promise<LLMToolRecommendationResult>;
    /**
     * 生成任务分析提示
     * 优化版本：更简洁明确的提示，更快的响应
     */
    private generateTaskAnalysisPrompt;
    /**
     * 创建任务分析提示词
     */
    private createTaskAnalysisPrompt;
    /**
     * 创建工具推荐提示
     * 优化版本：更简洁明确的工具推荐提示
     */
    private createToolRecommendationPrompt;
    /**
     * 调用大模型API
     */
    private callLLM;
    /**
     * 解析任务分析响应
     * 优化版本：更健壮的响应解析
     */
    private parseTaskAnalysisResponse;
    /**
     * 确保数值在给定范围内
     */
    private ensureNumberInRange;
    /**
     * 解析工具推荐响应
     */
    private parseToolRecommendationResponse;
    /**
     * 从文本中提取工具列表
     */
    private extractToolsList;
    /**
     * 从多行文本中提取推荐理由
     */
    private extractToolsReasoning;
    /**
     * 获取模拟响应（仅用于开发/测试）
     */
    private getMockResponse;
    /**
     * 获取模拟任务分析结果（用于开发模式）
     */
    private getMockTaskAnalysis;
    private testAPIConnection;
}
export {};
