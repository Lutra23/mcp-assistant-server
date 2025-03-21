import axios from 'axios';
import { Task, MCPTool, LLMServiceConfig } from '../types/interfaces.js';

interface LLMTaskAnalysisResult {
  taskType: string;
  keywords: string[];
  complexity: number; // 1-5
  entities: string[];
  subTasks: string[];
  priority: number; // 1-5
  estimatedDuration: number; // seconds
  domain: string;
}

interface LLMToolRecommendationResult {
  recommendedTools: string[]; // 工具名称列表
  sequence: string[]; // 工具调用顺序
  reasoning: string; // 推荐理由
}

export class LLMService {
  private config: LLMServiceConfig;
  
  /**
   * 构造函数
   * @param config LLM服务配置
   */
  constructor(config: LLMServiceConfig) {
    console.log('[LLM服务] 初始化中');
    
    // 检查必要的配置项
    if (!config.apiKey) {
      console.warn('[LLM服务] 警告: 未提供API密钥');
    }
    
    if (!config.apiEndpoint) {
      console.warn('[LLM服务] 警告: 未提供API端点，需要在配置文件中设置llmApiEndpoint');
      // 使用合理的默认值
      config.apiEndpoint = 'https://api.siliconflow.cn/v1';
      console.log(`[LLM服务] 使用默认API端点: ${config.apiEndpoint}`);
    }
    
    if (!config.modelName) {
      console.warn('[LLM服务] 警告: 未提供模型名称，需要在配置文件中设置llmModelName');
      // 根据API端点选择合适的默认模型
      if (config.apiEndpoint.includes('siliconflow.cn')) {
        config.modelName = 'THUDM/chatglm3-6b';
      } else if (config.apiEndpoint.includes('ppinfra.com')) {
        config.modelName = 'DeepSeek: DeepSeek R1 (Community)';
      } else if (config.apiEndpoint.includes('openai.com')) {
        config.modelName = 'gpt-3.5-turbo';
      } else {
        config.modelName = 'unknown-model';
      }
      console.log(`[LLM服务] 使用默认模型: ${config.modelName}`);
    }
    
    // 设置最大令牌数和温度的默认值
    if (!config.maxTokens) {
      config.maxTokens = 1024;
      console.log(`[LLM服务] 使用默认最大令牌数: ${config.maxTokens}`);
    }
    
    if (config.temperature === undefined) {
      config.temperature = 0.6;
      console.log(`[LLM服务] 使用默认温度: ${config.temperature}`);
    }
    
    // 保存配置
    this.config = config;
    
    // 记录初始化完成
    console.log('[LLM服务] 初始化完成，配置:', {
      apiEndpoint: this.config.apiEndpoint,
      modelName: this.config.modelName,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      apiKeyAvailable: !!this.config.apiKey
    });
    
    // 在启动时测试API连接
    this.testAPIConnection();
  }
  
  /**
   * 获取LLM服务配置信息（隐藏敏感信息）
   */
  public getConfig(): any {
    return {
      apiEndpoint: this.config.apiEndpoint,
      modelName: this.config.modelName,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      apiKey: this.config.apiKey ? '已配置' : '未配置'
    };
  }
  
  /**
   * 更新LLM配置
   * @param updateConfig 要更新的配置项
   */
  public updateConfig(updateConfig: Partial<LLMServiceConfig>): void {
    this.config = { ...this.config, ...updateConfig };
    console.log('[LLM服务] 配置已更新:', JSON.stringify({
      apiEndpoint: this.config.apiEndpoint,
      modelName: this.config.modelName,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      apiKeyAvailable: !!this.config.apiKey
    }));
  }
  
  /**
   * 测试与LLM API的连接
   * @returns 测试结果
   */
  public async testConnection(): Promise<boolean> {
    try {
      console.log(`[LLM服务] 测试连接到 ${this.config.apiEndpoint}...`);
      
      // 简单地测试连接，发送一个最小请求
      const prompt = '你好';
      const response = await this.callLLM(prompt);
      
      console.log(`[LLM服务] 连接测试成功，收到响应: ${response.substring(0, 20)}...`);
      return true;
    } catch (error) {
      console.error('[LLM服务] 连接测试失败:', error);
      throw new Error(`无法连接到LLM API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 使用大模型分析任务
   * @param description 任务描述
   * @param context 上下文信息（可选）
   * @param analysisType 分析类型（可选）
   * @returns 分析结果
   */
  async analyzeTask(description: string, context?: string, analysisType?: string): Promise<LLMTaskAnalysisResult> {
    console.log(`[LLM分析] 开始分析任务: "${description.substring(0, 50)}${description.length > 50 ? '...' : ''}"`);
    
    try {
      // 生成提示
      const prompt = this.generateTaskAnalysisPrompt(description, context, analysisType);
      console.log(`[LLM分析] 生成提示词完成，长度: ${prompt.length}字符`);
      
      // 检查API密钥是否有效
      if (!this.config.apiKey || this.config.apiKey.trim() === '') {
        console.error('[LLM分析] API密钥为空或无效');
        throw new Error('LLM API密钥不可用');
      }
      
      // 调用LLM API
      console.log(`[LLM分析] 调用LLM API...`);
      const response = await this.callLLM(prompt);
      console.log(`[LLM分析] 收到响应，长度: ${response.length}字符`);
      
      // 解析回复
      console.log(`[LLM分析] 解析响应...`);
      const result = this.parseTaskAnalysisResponse(response);
      console.log(`[LLM分析] 解析结果:`, JSON.stringify(result).substring(0, 200) + '...');
      
      return result;
    } catch (error) {
      console.error('[LLM分析] 错误:', error);
      
      // 开发模式：返回模拟数据
      if (process.env.NODE_ENV === 'development') {
        console.log('[LLM分析] 开发环境: 返回模拟分析结果');
        return this.getMockTaskAnalysis(description);
      }
      
      // 生产环境：抛出异常
      throw new Error(`LLM任务分析失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 使用大模型推荐工具
   * @param task 任务信息
   * @param availableTools 可用工具列表
   * @returns 推荐结果
   */
  async recommendTools(task: Task, availableTools: MCPTool[]): Promise<LLMToolRecommendationResult> {
    try {
      const prompt = this.createToolRecommendationPrompt(task, availableTools);
      const response = await this.callLLM(prompt);
      
      // 解析响应，提取结构化数据
      return this.parseToolRecommendationResponse(response);
    } catch (error) {
      console.error('LLM工具推荐失败:', error);
      throw new Error(`大模型推荐失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 生成任务分析提示
   * 优化版本：更简洁明确的提示，更快的响应
   */
  private generateTaskAnalysisPrompt(description: string, context?: string, analysisType?: string): string {
    // 决定分析深度
    const isComprehensive = analysisType === 'comprehensive';
    
    // 基础提示模板
    let prompt = `你是专业任务分析助手。请对以下任务进行${isComprehensive ? '全面详细' : '简洁'}分析。
必须直接输出JSON格式，不要有任何前言、解释或额外文字。

任务描述: ${description}`;

    // 如果有上下文，添加到提示中
    if (context) {
      prompt += `\n背景信息: ${context}`;
    }
    
    // 添加输出格式指导
    if (isComprehensive) {
      // 综合分析 - 提供详细要求
      prompt += `\n
规则:
1. 直接输出JSON，不添加任何解释
2. 所有字段必须填写有意义的内容
3. 子任务应该具体可执行，最多6个
4. 关键词最多5个
5. 复杂度和优先级范围为1-5

输出格式:
{
  "taskType": "任务类型(如CodeDevelopment/SystemDesign/Documentation等)",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "complexity": 复杂度评分(1-5),
  "entities": ["实体1", "实体2"],
  "subTasks": ["具体子任务1", "具体子任务2"],
  "priority": 优先级(1-5),
  "estimatedDuration": 估计完成时间(秒),
  "domain": "任务所属领域"
}`;
    } else {
      // 简洁分析 - 只要求基本字段
      prompt += `\n
规则:
1. 直接输出JSON，不添加任何解释
2. 只关注最重要的信息
3. 所有字段必须填写

输出格式:
{
  "taskType": "任务类型",
  "keywords": ["关键词1", "关键词2"],
  "complexity": 复杂度(1-5),
  "entities": ["主要实体"],
  "subTasks": ["主要子任务"],
  "priority": 优先级(1-5),
  "estimatedDuration": 时间(秒),
  "domain": "领域"
}`;
    }
    
    return prompt;
  }
  
  /**
   * 创建任务分析提示词
   */
  private createTaskAnalysisPrompt(description: string, context?: string): string {
    return `
你是一个任务分析助手，请分析以下任务描述并提取关键信息。

任务描述：${description}
${context ? `上下文信息：${context}` : ''}

请提供以下结构化信息：
1. 任务类型 (FileOperation/CodeAnalysis/SystemOperation/DataProcessing/WebSearch/DatabaseOperation/APIInteraction/DocumentProcess/ImageProcess/NaturalLanguageProcess)
2. 关键词列表（最多10个）
3. 复杂度评分（1-5，其中1最简单，5最复杂）
4. 识别的实体（如文件名、URL、API等）
5. 可能的子任务列表
6. 优先级（1-5，其中1最低，5最高）
7. 预计完成时间（秒）
8. 任务领域

请以JSON格式返回，键名分别为：taskType, keywords, complexity, entities, subTasks, priority, estimatedDuration, domain。
`;
  }
  
  /**
   * 创建工具推荐提示
   * 优化版本：更简洁明确的工具推荐提示
   */
  private createToolRecommendationPrompt(task: Task, availableTools: MCPTool[]): string {
    // 格式化工具列表，突出重点信息
    const toolsInfo = availableTools.map(tool => {
      return `- ${tool.name}: ${tool.description || '无描述'} ${tool.capabilities ? `[${tool.capabilities.join(', ')}]` : ''}`;
    }).join('\n');
    
    // 任务信息格式化
    const taskInfo = `
任务类型: ${task.type || '未指定'}
任务描述: ${task.description}
关键词: ${Array.isArray(task.keywords) ? task.keywords.join(', ') : '无关键词'}
复杂度: ${task.complexity || '未知'}
`;
    
    // 基于任务类型自定义提示
    let customPrompt = '';
    const taskType = (task.type || '').toLowerCase();
    
    if (taskType.includes('file') || taskType.includes('文件')) {
      customPrompt = '请特别关注文件操作相关的工具。';
    } else if (taskType.includes('code') || taskType.includes('编程')) {
      customPrompt = '请特别关注代码分析和开发相关的工具。';
    } else if (taskType.includes('data') || taskType.includes('数据')) {
      customPrompt = '请特别关注数据处理相关的工具。';
    }
    
    // 构建最终提示
    return `你是工具推荐助手，请为以下任务推荐最合适的工具。
直接返回JSON格式，不要有任何前言或解释。

## 任务信息
${taskInfo}

## 可用工具列表
${toolsInfo}

${customPrompt}

请按照下面的JSON格式返回推荐：
{
  "recommendedTools": ["工具1名称", "工具2名称"],
  "sequence": ["使用顺序的工具名称1", "使用顺序的工具名称2"],
  "reasoning": "推荐理由简述"
}

规则:
1. 只推荐真正必要的工具，不超过3个
2. 所有推荐工具必须来自可用工具列表
3. 按照使用顺序排列sequence数组
4. 不要添加任何JSON外的文字
`;
  }
  
  /**
   * 调用大模型API
   */
  private async callLLM(prompt: string): Promise<string> {
    try {
      console.log(`[LLM API] 发起请求至 ${this.config.apiEndpoint}，使用模型: ${this.config.modelName}`);
      console.log(`[LLM API调试] 请求URL: ${this.config.apiEndpoint}`);
      console.log(`[LLM API调试] 请求头: Authorization: Bearer ${this.config.apiKey ? this.config.apiKey.substring(0, 5) + '...' : '缺少'}`);
      
      // 调试API端点
      console.log(`[LLM API调试] API端点检查:`);
      console.log(`- 包含openai.com: ${this.config.apiEndpoint.includes('openai.com')}`);
      console.log(`- 包含anthropic.com: ${this.config.apiEndpoint.includes('anthropic.com')}`);
      console.log(`- 包含siliconflow.cn: ${this.config.apiEndpoint.includes('siliconflow.cn')}`);
      console.log(`- 包含ppinfra.com: ${this.config.apiEndpoint.includes('ppinfra.com')}`);

      let requestBody: any;
      let endpoint: string;
      let fullUrl: string;
      
      // 根据不同的API提供商选择不同的请求格式
      if (this.config.apiEndpoint.includes('openai.com')) {
        // OpenAI格式
        endpoint = `${this.config.apiEndpoint}/chat/completions`;
        requestBody = {
          model: this.config.modelName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        };
        
        console.log(`[LLM API调试] OpenAI格式请求体: ${JSON.stringify(requestBody).substring(0, 200)}...`);
        
        const response = await axios.post(
          endpoint,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`[LLM API调试] 响应状态: ${response.status}`);
        console.log(`[LLM API调试] 响应数据: ${JSON.stringify(response.data).substring(0, 200)}...`);
        
        return response.data.choices[0].message.content;
      } else if (this.config.apiEndpoint.includes('anthropic.com')) {
        // Anthropic Claude格式
        endpoint = this.config.apiEndpoint;
        requestBody = {
          model: this.config.modelName,
          prompt: `\n\nHuman: ${prompt}\n\nAssistant:`,
          max_tokens_to_sample: this.config.maxTokens,
          temperature: this.config.temperature
        };
        
        console.log(`[LLM API调试] Anthropic Claude格式请求体: ${JSON.stringify(requestBody).substring(0, 200)}...`);
        
        const response = await axios.post(
          endpoint,
          requestBody,
          {
            headers: {
              'x-api-key': this.config.apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`[LLM API调试] 响应状态: ${response.status}`);
        console.log(`[LLM API调试] 响应数据: ${JSON.stringify(response.data).substring(0, 200)}...`);
        
        return response.data.completion;
      } else if (this.config.apiEndpoint.includes('siliconflow.cn')) {
        // SiliconFlow格式 - 使用与OpenAI兼容的格式
        console.log(`[LLM API] 使用SiliconFlow API格式（类OpenAI兼容）`);
        
        // 使用配置的模型名称，不做修改
        let modelName = this.config.modelName;
        
        // SiliconFlow API的正确端点格式是 /chat/completions
        // 检查URL是否已经包含这个路径
        if (this.config.apiEndpoint.endsWith('/v1') || this.config.apiEndpoint.endsWith('/v1/')) {
          endpoint = `${this.config.apiEndpoint.replace(/\/+$/, '')}/chat/completions`;
        } else if (this.config.apiEndpoint.includes('/chat/completions')) {
          // URL已包含正确路径
          endpoint = this.config.apiEndpoint;
        } else {
          // 添加路径
          endpoint = `${this.config.apiEndpoint.replace(/\/+$/, '')}/chat/completions`;
        }
        
        fullUrl = endpoint; // 保存完整URL用于日志记录
        
        // 记录完整的请求URL
        console.log(`[LLM API调试] SiliconFlow 完整请求URL: ${fullUrl}`);
        console.log(`[LLM API调试] URL构建详情:`);
        console.log(`- 基础URL: ${this.config.apiEndpoint}`);
        console.log(`- 处理后的URL: ${endpoint}`);
        
        // 检查URL格式
        try {
          const urlObj = new URL(endpoint);
          console.log(`[LLM API调试] URL解析结果:`);
          console.log(`- 协议: ${urlObj.protocol}`);
          console.log(`- 主机: ${urlObj.hostname}`);
          console.log(`- 路径: ${urlObj.pathname}`);
          console.log(`- 完整: ${urlObj.href}`);
        } catch (error) {
          console.error(`[LLM API错误] URL格式无效: ${endpoint}`, error);
        }
        
        // 使用标准OpenAI兼容格式构建请求体
        requestBody = {
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        };
        
        // 完整打印请求信息
        console.log(`[LLM API调试] SiliconFlow完整请求信息:`);
        console.log(`URL: ${endpoint}`);
        console.log(`请求头:`);
        console.log(`- Content-Type: application/json`);
        console.log(`- Authorization: Bearer ${this.config.apiKey ? this.config.apiKey.substring(0, 5) + '...' : '缺少'}`);
        console.log(`请求体: ${JSON.stringify(requestBody, null, 2)}`);
        
        try {
          console.log(`[LLM API调试] 开始发送请求...`);
          
          // 构建完整请求选项对象用于日志记录
          const requestOptions = {
            method: 'POST',
            url: endpoint,
            headers: {
              'Authorization': `Bearer ${this.config.apiKey ? this.config.apiKey.substring(0, 5) + '...' : '缺少'}`,
              'Content-Type': 'application/json'
            },
            data: requestBody
          };
          console.log(`[LLM API调试] 完整请求选项: ${JSON.stringify(requestOptions, null, 2)}`);
          
          // 执行请求
          console.log(`[LLM API调试] 发送HTTP请求...`);
          const response = await axios.post(
            endpoint,
            requestBody,
            {
              headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
              },
              validateStatus: function (status) {
                // 不抛出HTTP错误，以便我们可以捕获并记录更详细的信息
                return true;
              }
            }
          );
          
          console.log(`[LLM API调试] 收到响应`);
          console.log(`[LLM API调试] 响应状态: ${response.status}`);
          console.log(`[LLM API调试] 响应状态文本: ${response.statusText}`);
          console.log(`[LLM API调试] 响应头: ${JSON.stringify(response.headers, null, 2)}`);
          
          // 打印完整响应体，但要注意可能很大
          try {
            console.log(`[LLM API调试] 响应数据: ${JSON.stringify(response.data, null, 2)}`);
          } catch (e) {
            console.log(`[LLM API调试] 响应数据太大或无法序列化，部分内容: ${JSON.stringify(response.data).substring(0, 1000)}`);
          }
          
          // 检查HTTP状态码
          if (response.status >= 400) {
            throw new Error(`HTTP错误: ${response.status} - ${response.statusText} - ${JSON.stringify(response.data)}`);
          }
          
          // 分析响应数据结构
          console.log(`[LLM API调试] 响应数据结构分析:`);
          console.log(`- 是否包含choices属性: ${response.data.hasOwnProperty('choices')}`);
          if (response.data.choices) {
            console.log(`- choices是否为数组: ${Array.isArray(response.data.choices)}`);
            console.log(`- choices数组长度: ${response.data.choices.length}`);
            if (response.data.choices.length > 0) {
              console.log(`- choices[0]的属性: ${Object.keys(response.data.choices[0]).join(', ')}`);
              if (response.data.choices[0].message) {
                console.log(`- message的属性: ${Object.keys(response.data.choices[0].message).join(', ')}`);
              }
            }
          }
          
          // 尝试从响应中提取内容，支持多种可能的结构
          let content = null;
          if (response.data.choices && response.data.choices.length > 0) {
            if (response.data.choices[0].message && response.data.choices[0].message.content) {
              // OpenAI格式
              content = response.data.choices[0].message.content;
            } else if (response.data.choices[0].text) {
              // 老版本格式
              content = response.data.choices[0].text;
            } else if (response.data.choices[0].content) {
              // 可能的替代格式
              content = response.data.choices[0].content;
            }
          } else if (response.data.response) {
            // 一些API直接返回response
            content = response.data.response;
          } else if (response.data.result) {
            // 一些API返回result
            content = response.data.result;
          } else if (response.data.output) {
            // 一些API返回output
            content = response.data.output;
          } else if (typeof response.data === 'string') {
            // 直接返回字符串
            content = response.data;
          }
          
          if (content === null) {
            console.error(`[LLM API错误] 无法从响应中提取内容，完整响应:`, response.data);
            throw new Error('无法从API响应中提取内容');
          }
          
          console.log(`[LLM API调试] 成功提取内容，长度: ${content.length}`);
          console.log(`[LLM API调试] 内容前300个字符: ${content.substring(0, 300)}`);
          
          return content;
        } catch (error: any) {
          console.error(`[LLM API] SiliconFlow API调用错误:`, error.message);
          
          // 详细记录错误信息
          console.error(`[LLM API错误] 详细错误信息:`);
          if (error.response) {
            // 服务器返回了错误响应
            console.error(`[LLM API错误] 响应状态: ${error.response.status}`);
            console.error(`[LLM API错误] 响应头: ${JSON.stringify(error.response.headers, null, 2)}`);
            console.error(`[LLM API错误] 响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
          } else if (error.request) {
            // 请求已发送但无响应
            console.error('[LLM API错误] 请求已发送但无响应:', error.request);
            console.error('[LLM API错误] 请求配置:', JSON.stringify(error.config, null, 2));
          } else {
            // 配置请求时发生错误
            console.error('[LLM API错误] 请求配置错误:', error.config);
            console.error('[LLM API错误] 错误栈:', error.stack);
          }
          
          throw error;
        }
      } else if (this.config.apiEndpoint.includes('ppinfra.com')) {
        // DeepSeek API 格式
        console.log(`[LLM API] 使用DeepSeek API格式`);
        endpoint = this.config.apiEndpoint;
        requestBody = {
          model: this.config.modelName,
          chat: [{
            role: 'user',
            content: prompt
          }],
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        };
        
        console.log(`[LLM API调试] DeepSeek API格式请求体: ${JSON.stringify(requestBody).substring(0, 200)}...`);
        
        const response = await axios.post(
          endpoint,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`[LLM API调试] 响应状态: ${response.status}`);
        console.log(`[LLM API调试] 响应数据: ${JSON.stringify(response.data).substring(0, 200)}...`);
        
        return response.data.choices[0].message.content;
      } else {
        // 通用格式（假设类似OpenAI）
        endpoint = this.config.apiEndpoint;
        requestBody = {
          model: this.config.modelName,
          prompt: prompt,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature
        };
        
        console.log(`[LLM API调试] 通用格式请求体: ${JSON.stringify(requestBody).substring(0, 200)}...`);
        
        const response = await axios.post(
          endpoint,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${this.config.apiKey}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`[LLM API调试] 响应状态: ${response.status}`);
        console.log(`[LLM API调试] 响应数据: ${JSON.stringify(response.data).substring(0, 200)}...`);
        
        return response.data.choices ? response.data.choices[0].text : response.data.result;
      }
    } catch (error) {
      console.error('调用LLM API失败:', error);
      
      // 开发环境中返回模拟响应
      if (process.env.NODE_ENV === 'development') {
        console.warn('[LLM API] 开发环境: 使用模拟响应...');
        return this.getMockResponse(prompt);
      }
      
      // 在生产环境中抛出异常
      console.error('[LLM API] 生产环境: API调用失败，无法继续');
      throw new Error(`LLM API调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 解析任务分析响应
   * 优化版本：更健壮的响应解析
   */
  private parseTaskAnalysisResponse(response: string): LLMTaskAnalysisResult {
    try {
      console.log(`[LLM解析] 开始解析响应，长度: ${response.length}`);
      
      // 尝试提取JSON部分
      let jsonStr = response.trim();
      
      // 查找可能的JSON开始位置（跳过可能的前导文本）
      const jsonStartIndex = jsonStr.indexOf('{');
      if (jsonStartIndex > 0) {
        console.log(`[LLM解析] 发现JSON起始位置: ${jsonStartIndex}，移除前导文本`);
        jsonStr = jsonStr.substring(jsonStartIndex);
      }
      
      // 查找可能的JSON结束位置（跳过可能的后续文本）
      const jsonEndIndex = jsonStr.lastIndexOf('}');
      if (jsonEndIndex > 0 && jsonEndIndex < jsonStr.length - 1) {
        console.log(`[LLM解析] 发现JSON结束位置: ${jsonEndIndex}，移除后续文本`);
        jsonStr = jsonStr.substring(0, jsonEndIndex + 1);
      }
      
      // 尝试解析JSON
      console.log(`[LLM解析] 提取的JSON字符串: ${jsonStr.substring(0, 100)}...`);
      const result = JSON.parse(jsonStr) as LLMTaskAnalysisResult;
      
      // 验证所需字段是否存在
      const requiredFields = ['taskType', 'keywords', 'complexity', 'entities', 'subTasks', 'priority', 'estimatedDuration', 'domain'];
      const missingFields = requiredFields.filter(field => !(field in result));
      
      if (missingFields.length > 0) {
        console.warn(`[LLM解析] 警告: 缺少必要字段: ${missingFields.join(', ')}`);
        
        // 填充缺失字段
        missingFields.forEach(field => {
          switch (field) {
            case 'taskType':
              result.taskType = '未知任务类型';
              break;
            case 'keywords':
              result.keywords = [];
              break;
            case 'complexity':
              result.complexity = 3; // 默认中等复杂度
              break;
            case 'entities':
              result.entities = [];
              break;
            case 'subTasks':
              result.subTasks = [];
              break;
            case 'priority':
              result.priority = 3; // 默认中等优先级
              break;
            case 'estimatedDuration':
              result.estimatedDuration = 300; // 默认5分钟
              break;
            case 'domain':
              result.domain = '通用';
              break;
          }
        });
      }
      
      // 对数组类型的字段进行检查，确保它们是数组
      if (!Array.isArray(result.keywords)) result.keywords = [];
      if (!Array.isArray(result.entities)) result.entities = [];
      if (!Array.isArray(result.subTasks)) result.subTasks = [];
      
      // 确保数值字段在合理范围内
      result.complexity = this.ensureNumberInRange(result.complexity, 1, 5);
      result.priority = this.ensureNumberInRange(result.priority, 1, 5);
      result.estimatedDuration = Math.max(1, result.estimatedDuration || 300);
      
      console.log(`[LLM解析] 成功解析任务分析结果`);
      return result;
    } catch (error) {
      console.error(`[LLM解析] 解析失败:`, error);
      console.error(`[LLM解析] 原始响应:`, response);
      
      // 返回默认结果
      return {
        taskType: 'Unknown',
        keywords: [],
        complexity: 3,
        entities: [],
        subTasks: [],
        priority: 3,
        estimatedDuration: 300,
        domain: '通用'
      };
    }
  }
  
  /**
   * 确保数值在给定范围内
   */
  private ensureNumberInRange(value: any, min: number, max: number): number {
    // 转换为数字
    const num = Number(value);
    
    // 检查是否为有效数字
    if (isNaN(num)) return Math.floor((min + max) / 2); // 返回中间值
    
    // 强制在范围内
    return Math.min(Math.max(num, min), max);
  }
  
  /**
   * 解析工具推荐响应
   */
  private parseToolRecommendationResponse(response: string): LLMToolRecommendationResult {
    try {
      // 先尝试解析JSON
      let jsonStr = response.trim();
      
      // 查找可能的JSON开始位置（跳过可能的前导文本）
      const jsonStartIndex = jsonStr.indexOf('{');
      if (jsonStartIndex > 0) {
        jsonStr = jsonStr.substring(jsonStartIndex);
      }
      
      // 查找可能的JSON结束位置（跳过可能的后续文本）
      const jsonEndIndex = jsonStr.lastIndexOf('}');
      if (jsonEndIndex > 0 && jsonEndIndex < jsonStr.length - 1) {
        jsonStr = jsonStr.substring(0, jsonEndIndex + 1);
      }
      
      try {
        const result = JSON.parse(jsonStr);
        
        return {
          recommendedTools: result.recommendedTools || [],
          sequence: result.sequence || [],
          reasoning: result.reasoning || ''
        };
      } catch (jsonError) {
        console.warn('无法解析JSON，尝试正则表达式提取', jsonError);
        
        // 如果无法解析JSON，尝试提取关键信息
        const recommendedTools = this.extractToolsList(response, /推荐工具[：:]\s*([^\n]+)/);
        const sequence = this.extractToolsList(response, /工具顺序[：:]\s*([^\n]+)/);
        const reasoning = this.extractToolsReasoning(response, /推荐理由[：:]\s*\n([\s\S]*?)(?:\n\n|\Z)/);
        
        return {
          recommendedTools: recommendedTools || [],
          sequence: sequence || recommendedTools || [],
          reasoning: reasoning || '无提供理由'
        };
      }
    } catch (error) {
      console.error('解析LLM工具推荐响应失败:', error);
      
      // 返回默认值
      return {
        recommendedTools: [],
        sequence: [],
        reasoning: '解析响应失败'
      };
    }
  }
  
  /**
   * 从文本中提取工具列表
   */
  private extractToolsList(text: string, pattern: RegExp): string[] {
    const match = text.match(pattern);
    if (!match || !match[1]) return [];
    
    return match[1].split(/[,，、]/).map(item => item.trim()).filter(Boolean);
  }
  
  /**
   * 从多行文本中提取推荐理由
   */
  private extractToolsReasoning(text: string, pattern: RegExp): string {
    const match = text.match(pattern);
    return match && match[1] ? match[1].trim() : '';
  }
  
  /**
   * 获取模拟响应（仅用于开发/测试）
   */
  private getMockResponse(prompt: string): string {
    // 根据提示词内容判断需要返回什么类型的模拟数据
    if (prompt.includes('任务分析助手')) {
      return `{
        "taskType": "FileOperation",
        "keywords": ["文件", "读取", "分析", "写入", "处理"],
        "complexity": 3,
        "entities": ["data.csv", "output.json"],
        "subTasks": ["读取CSV文件", "处理数据", "写入JSON文件"],
        "priority": 4,
        "estimatedDuration": 600,
        "domain": "数据处理"
      }`;
    } else if (prompt.includes('工具推荐助手')) {
      return `{
        "recommendedTools": ["file_read", "data_transform", "file_write"],
        "sequence": ["file_read", "data_transform", "file_write"],
        "reasoning": "首先需要读取文件，然后进行数据转换，最后将结果写入文件。这个顺序符合数据处理的标准流程。"
      }`;
    } else {
      return `{
        "result": "模拟响应",
        "message": "这是一个模拟的API响应，仅用于测试"
      }`;
    }
  }

  /**
   * 获取模拟任务分析结果（用于开发模式）
   */
  private getMockTaskAnalysis(description: string): LLMTaskAnalysisResult {
    console.log(`[LLM服务] 使用模拟数据`);
    
    // 基于任务描述生成一些模拟关键词
    const keywordMap: { [key: string]: string[] } = {
      'file': ['文件', '存储', 'I/O'],
      'code': ['代码', '编程', '开发'],
      'search': ['搜索', '查询', '数据'],
      'database': ['数据库', 'SQL', '存储'],
      'api': ['API', '接口', '服务'],
      'test': ['测试', '质量', '验证']
    };
    
    // 从描述中提取可能的关键词
    const keywords: string[] = [];
    Object.keys(keywordMap).forEach(key => {
      if (description.toLowerCase().includes(key)) {
        keywords.push(...keywordMap[key]);
      }
    });
    
    // 生成随机的复杂度和优先级
    const complexity = Math.floor(Math.random() * 5) + 1;
    const priority = Math.floor(Math.random() * 5) + 1;
    
    return {
      taskType: 'MockAnalysis',
      keywords: keywords.length > 0 ? keywords : ['模拟', '测试', '分析'],
      complexity: complexity,
      entities: ['模拟实体1', '模拟实体2'],
      subTasks: ['子任务1', '子任务2', '子任务3'],
      priority: priority,
      estimatedDuration: 300,
      domain: '模拟领域'
    };
  }

  // 测试API连接
  private async testAPIConnection() {
    try {
      console.log('[LLM服务] 测试API连接...');
      const response = await fetch(`${this.config.apiEndpoint}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[LLM服务] API连接成功，可用模型数量:', data.data.length);
        
        // 检查配置的模型是否在可用列表中
        const modelExists = data.data.some((model: any) => model.id === this.config.modelName);
        if (modelExists) {
          console.log(`[LLM服务] 已确认模型 "${this.config.modelName}" 可用`);
        } else {
          console.warn(`[LLM服务] 警告: 配置的模型 "${this.config.modelName}" 未在可用列表中找到`);
        }
      } else {
        console.error('[LLM服务] API连接测试失败:', response.status, await response.text());
      }
    } catch (error) {
      console.error('[LLM服务] API连接测试失败:', error);
    }
  }
} 