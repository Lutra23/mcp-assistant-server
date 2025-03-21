import { Request, Response } from 'express';
import { LLMService } from '../services/LLMService.js';
/**
 * LLM API控制器，负责处理OpenAPI规范定义的大模型API请求
 */
export declare class LLMApiController {
    private llmService;
    constructor(llmService: LLMService);
    /**
     * 处理任务分析请求
     */
    analyzeTask(req: Request, res: Response): Promise<void>;
    /**
     * 处理工具推荐请求
     */
    recommendTools(req: Request, res: Response): Promise<void>;
    /**
     * 获取LLM配置
     */
    getLLMConfig(_req: Request, res: Response): void;
    /**
     * 更新LLM配置
     */
    updateLLMConfig(req: Request, res: Response): Promise<void>;
    /**
     * 健康检查
     */
    checkHealth(_req: Request, res: Response): Promise<void>;
}
