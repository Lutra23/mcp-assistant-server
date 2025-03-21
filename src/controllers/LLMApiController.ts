import { Request, Response } from 'express';
import { LLMService } from '../services/LLMService.js';
import { Task, MCPTool, LLMServiceConfig } from '../types/interfaces.js';

/**
 * LLM API控制器，负责处理OpenAPI规范定义的大模型API请求
 */
export class LLMApiController {
  private llmService: LLMService;
  
  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }
  
  /**
   * 处理任务分析请求
   */
  public async analyzeTask(req: Request, res: Response): Promise<void> {
    try {
      const { description, context, analysisType } = req.body;
      
      // 参数验证
      if (!description || typeof description !== 'string') {
        res.status(400).json({
          code: 'INVALID_PARAMETER',
          message: '缺少必要参数"description"或类型错误'
        });
        return;
      }
      
      // 调用LLM服务
      const result = await this.llmService.analyzeTask(
        description,
        context,
        analysisType
      );
      
      // 返回结果
      res.status(200).json(result);
    } catch (error) {
      console.error('[LLM API] 任务分析失败:', error);
      res.status(500).json({
        code: 'TASK_ANALYSIS_FAILED',
        message: `任务分析失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * 处理工具推荐请求
   */
  public async recommendTools(req: Request, res: Response): Promise<void> {
    try {
      const { task, availableTools } = req.body;
      
      // 参数验证
      if (!task || !task.description || !task.type || !task.keywords || !task.complexity) {
        res.status(400).json({
          code: 'INVALID_PARAMETER',
          message: '缺少必要的任务信息'
        });
        return;
      }
      
      if (!availableTools || !Array.isArray(availableTools) || availableTools.length === 0) {
        res.status(400).json({
          code: 'INVALID_PARAMETER',
          message: '缺少可用工具列表或格式错误'
        });
        return;
      }
      
      // 调用LLM服务
      const result = await this.llmService.recommendTools(task, availableTools);
      
      // 返回结果
      res.status(200).json(result);
    } catch (error) {
      console.error('[LLM API] 工具推荐失败:', error);
      res.status(500).json({
        code: 'TOOL_RECOMMENDATION_FAILED',
        message: `工具推荐失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * 获取LLM配置
   */
  public getLLMConfig(_req: Request, res: Response): void {
    try {
      // 不返回敏感信息如apiKey
      const config = {
        apiEndpoint: this.llmService.getConfig().apiEndpoint,
        modelName: this.llmService.getConfig().modelName,
        maxTokens: this.llmService.getConfig().maxTokens,
        temperature: this.llmService.getConfig().temperature,
        apiKeyAvailable: !!this.llmService.getConfig().apiKey && this.llmService.getConfig().apiKey.trim() !== ''
      };
      
      res.status(200).json(config);
    } catch (error) {
      console.error('[LLM API] 获取配置失败:', error);
      res.status(500).json({
        code: 'GET_CONFIG_FAILED',
        message: `获取配置失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * 更新LLM配置
   */
  public async updateLLMConfig(req: Request, res: Response): Promise<void> {
    try {
      const { apiEndpoint, modelName, maxTokens, temperature, apiKey } = req.body;
      
      // 构建更新对象，只包含提供的字段
      const updateConfig: Partial<LLMServiceConfig> = {};
      
      if (apiEndpoint !== undefined) updateConfig.apiEndpoint = apiEndpoint;
      if (modelName !== undefined) updateConfig.modelName = modelName;
      if (maxTokens !== undefined) updateConfig.maxTokens = maxTokens;
      if (temperature !== undefined) updateConfig.temperature = temperature;
      if (apiKey !== undefined) updateConfig.apiKey = apiKey;
      
      // 参数验证
      if (maxTokens !== undefined && (typeof maxTokens !== 'number' || maxTokens < 1)) {
        res.status(400).json({
          code: 'INVALID_PARAMETER',
          message: 'maxTokens必须是大于0的数字'
        });
        return;
      }
      
      if (temperature !== undefined && (typeof temperature !== 'number' || temperature < 0 || temperature > 1)) {
        res.status(400).json({
          code: 'INVALID_PARAMETER',
          message: 'temperature必须是0到1之间的数字'
        });
        return;
      }
      
      // 更新配置
      this.llmService.updateConfig(updateConfig);
      
      // 返回更新后的配置（去除敏感信息）
      this.getLLMConfig(req, res);
    } catch (error) {
      console.error('[LLM API] 更新配置失败:', error);
      res.status(500).json({
        code: 'UPDATE_CONFIG_FAILED',
        message: `更新配置失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * 健康检查
   */
  public async checkHealth(_req: Request, res: Response): Promise<void> {
    try {
      // 执行简单的健康检查，例如检查配置是否有效
      const config = this.llmService.getConfig();
      const apiKeyAvailable = !!config.apiKey && config.apiKey.trim() !== '';
      
      if (!apiKeyAvailable) {
        res.status(200).json({
          status: 'degraded',
          message: 'API密钥未配置或无效'
        });
        return;
      }
      
      // 测试与API的连接
      try {
        // 简单的ping测试
        await this.llmService.testConnection();
        
        res.status(200).json({
          status: 'healthy',
          message: 'LLM服务运行正常'
        });
      } catch (error) {
        res.status(200).json({
          status: 'unhealthy',
          message: `无法连接到LLM API: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    } catch (error) {
      console.error('[LLM API] 健康检查失败:', error);
      res.status(500).json({
        code: 'HEALTH_CHECK_FAILED',
        message: `健康检查失败: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
} 