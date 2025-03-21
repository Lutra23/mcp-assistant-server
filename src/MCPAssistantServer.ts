import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DefaultTaskAnalyzer } from './core/TaskAnalyzer.js';
import { DefaultContextManager } from './core/ContextManager.js';
import { DefaultToolRecommender } from './core/ToolRecommender.js';
import { Context, Task } from './types/interfaces.js';
import { LLMService } from './services/LLMService.js';
import { MCPDiscoveryService } from './services/MCPDiscoveryService.js';
import { z } from 'zod';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import os from 'os';
import express, { Request, Response } from 'express';
import { LLMApiController } from './controllers/LLMApiController.js';
import { createLLMApiRoutes } from './routes/llmApiRoutes.js';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义服务器选项类型
interface ServerOptions {
  useLLM?: boolean;
  llmConfig?: {
    apiKey: string;
    apiEndpoint: string;
    modelName: string;
    maxTokens: number;
    temperature: number;
  };
}

// 服务器能力配置
const serverCapabilities = {
  protocol: { version: '0.1.0' },
  server: {
    name: 'mcp-assistant-server',
    version: '1.0.0',
    supportedTransports: ['stdio', 'socket']
  },
  tools: {}
};

// 定义工具列表
const toolDefinitions = {
  'analyze_task': {
    name: 'analyze_task',
    description: '分析任务并提取关键信息',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: '任务描述'
        },
        context: {
          type: 'string',
          description: '上下文信息',
          optional: true
        }
      },
      required: ['description']
    }
  },
  'recommend_tools': {
    name: 'recommend_tools',
    description: '根据任务推荐适用的工具',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: '任务ID'
        },
        useHybridRecommendation: {
          type: 'boolean',
          description: '是否使用混合推荐（大模型+规则）',
          optional: true
        }
      },
      required: ['taskId']
    }
  },
  'update_context': {
    name: 'update_context',
    description: '更新上下文信息',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: '任务ID'
        },
        toolUsage: {
          type: 'object',
          description: '工具使用记录',
          optional: true
        },
        feedback: {
          type: 'string',
          description: '用户反馈',
          optional: true
        }
      },
      required: ['taskId']
    }
  },
  'get_capabilities': {
    name: 'get_capabilities',
    description: '获取服务器支持的所有工具',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  'discover_mcp_tools': {
    name: 'discover_mcp_tools',
    description: '发现并列出所有可用的MCP工具',
    inputSchema: {
      type: 'object',
      properties: {
        refresh: {
          type: 'boolean',
          description: '是否刷新工具列表',
          optional: true
        }
      }
    }
  },
  'call_external_tool': {
    name: 'call_external_tool',
    description: '调用外部MCP服务的工具',
    inputSchema: {
      type: 'object',
      properties: {
        toolName: {
          type: 'string',
          description: '工具名称'
        },
        serviceName: {
          type: 'string',
          description: '服务名称'
        },
        params: {
          type: 'object',
          description: '调用参数'
        }
      },
      required: ['toolName', 'serviceName', 'params']
    }
  },
  'llm_analyze': {
    name: 'llm_analyze',
    description: '使用大模型进行高级任务分析',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: '任务描述'
        },
        context: {
          type: 'string',
          description: '上下文信息',
          optional: true
        },
        analysisType: {
          type: 'string',
          description: '分析类型（comprehensive/focused）',
          optional: true
        }
      },
      required: ['description']
    }
  }
};

export class MCPAssistantServer {
  private server: Server;
  private taskAnalyzer: DefaultTaskAnalyzer;
  private toolRecommender: DefaultToolRecommender;
  private contextManager: DefaultContextManager;
  private llmService: LLMService | null = null;
  private discoveryService: MCPDiscoveryService;
  private tasks: Map<string, Task> = new Map();
  private useLLM: boolean = false;
  private transport: StdioServerTransport;
  private httpServer: http.Server | null = null;
  private port: number = 3000;
  private host: string = 'localhost';
  // 服务名称映射表 (别名 -> 完整名称)
  private serviceNameMap: Map<string, string> = new Map();

  constructor(options?: ServerOptions) {
    // 创建传输层
    this.transport = new StdioServerTransport();
    
    // 创建MCP服务器
    this.server = new Server(
      {
        name: 'mcp-assistant-server',
        version: '1.0.0'
      }, 
      { 
        capabilities: serverCapabilities 
      }
    );
    
    // 判断是否使用大模型
    this.useLLM = options?.useLLM || false;
    
    // 如果需要使用大模型，初始化LLM服务
    if (this.useLLM && options?.llmConfig) {
      console.log('[MCP服务器初始化] 初始化LLM服务，配置:', {
        apiEndpoint: options.llmConfig.apiEndpoint,
        modelName: options.llmConfig.modelName,
        maxTokens: options.llmConfig.maxTokens,
        temperature: options.llmConfig.temperature
      });
      try {
        this.llmService = new LLMService(options.llmConfig);
        console.log('[MCP服务器初始化] LLM服务初始化成功');
      } catch (error) {
        console.error('[MCP服务器初始化] LLM服务初始化失败:', error);
        this.useLLM = false;
      }
    }
    
    // 初始化MCP服务发现
    this.discoveryService = new MCPDiscoveryService();
    
    // 初始化核心组件
    this.taskAnalyzer = new DefaultTaskAnalyzer({
      useLLM: this.useLLM,
      llmService: this.llmService
    });
    
    this.toolRecommender = new DefaultToolRecommender({
      useLLM: this.useLLM,
      llmService: this.llmService
    });
    
    this.contextManager = new DefaultContextManager();
    
    // 注册请求处理器
    this.registerRequestHandlers();
  }

  // 初始化服务器
  async initialize(): Promise<void> {
    console.log('[MCP服务器初始化] 开始初始化...');
    
    // 加载配置文件
    const config = this.loadLocalConfig();
    
    // 初始化服务名称映射表
    if (config && config.serviceAliases) {
      this.initServiceNameMap(config);
    }
    
    // 如果没有LLM服务并且配置要求使用，创建LLM服务
    if (!this.llmService && config && config.useLLM) {
      await this.initializeLLMService(config);
    }
    
    // 启动HTTP服务器
    console.log('[MCP服务器初始化] 启动HTTP服务器...');
    await this.startHttpServer();
    
    // 注册自身为MCP服务
    console.log('[MCP服务器初始化] 注册自身为MCP服务...');
    await this.registerSelfAsService();
    
    // 初始化MCP服务发现
    console.log('[MCP服务器初始化] 初始化MCP服务发现...');
    await this.discoveryService.initialize();
    
    // 添加MCP传输层和启动服务器
    await this.server.connect(this.transport);
    
    console.log('[MCP Assistant Server] 启动成功');
    console.log('[MCP Assistant Server] 大模型支持:', this.useLLM ? '已启用' : '已禁用');
    console.log('[MCP Assistant Server] 使用的LLM服务状态:', {
      '服务存在': !!this.llmService,
      'useLLM标志': this.useLLM
    });
  }

  // 初始化LLM服务
  private async initializeLLMService(config: any): Promise<void> {
    try {
      console.log('[MCP服务器初始化] 初始化LLM服务');
      
      // 检查必要的配置
      if (!config || !config.llmApiKey) {
        console.warn('[MCP服务器初始化] 缺少LLM API密钥，禁用LLM功能');
        this.useLLM = false;
        return;
      }
      
      // 检查API端点配置
      if (!config.llmApiEndpoint) {
        console.warn('[MCP服务器初始化] 未指定LLM API端点，LLM功能可能无法正常工作');
      }
      
      // 检查模型名称配置
      if (!config.llmModelName) {
        console.warn('[MCP服务器初始化] 未指定LLM模型名称，LLM功能可能无法正常工作');
      }
      
      // 记录完整的LLM配置（不包括API密钥）
      console.log('[MCP服务器初始化] LLM配置:', {
        apiEndpoint: config.llmApiEndpoint,
        modelName: config.llmModelName,
        maxTokens: config.llmMaxTokens,
        temperature: config.llmTemperature
      });
      
      // 识别API类型
      let apiType = 'unknown';
      if (config.llmApiEndpoint) {
        if (config.llmApiEndpoint.includes('siliconflow.cn')) {
          apiType = 'SiliconFlow';
        } else if (config.llmApiEndpoint.includes('ppinfra.com')) {
          apiType = 'DeepSeek';
        } else if (config.llmApiEndpoint.includes('openai.com')) {
          apiType = 'OpenAI';
        } else if (config.llmApiEndpoint.includes('anthropic.com')) {
          apiType = 'Anthropic';
        }
      }
      console.log(`[MCP服务器初始化] 已识别API类型: ${apiType}`);
      
      // 初始化LLM服务，不使用硬编码默认值
      this.llmService = new LLMService({
        apiKey: config.llmApiKey,
        apiEndpoint: config.llmApiEndpoint,
        modelName: config.llmModelName,
        maxTokens: config.llmMaxTokens || 1024,
        temperature: config.llmTemperature || 0.6
      });
      
      // 更新分析器和推荐器
      this.taskAnalyzer = new DefaultTaskAnalyzer({
        useLLM: true,
        llmService: this.llmService
      });
      
      this.toolRecommender = new DefaultToolRecommender({
        useLLM: true,
        llmService: this.llmService
      });
      
      console.log('[MCP服务器初始化] LLM服务初始化成功');
    } catch (error) {
      console.error('[MCP服务器初始化] LLM服务初始化失败:', error);
      this.useLLM = false;
    }
  }

  // 初始化服务名称映射
  private initServiceNameMap(config: any): void {
    // 清空现有映射
    this.serviceNameMap.clear();
    
    // 添加一些标准服务名称映射（即使配置中没有）
    const standardServices = [
      { name: 'sequentialthinking-mcp', aliases: ['sequentialthinking', 'sequential-thinking', 'thinking'] },
      { name: 'filesystem-mcp', aliases: ['filesystem', 'fs'] },
      { name: 'github-mcp', aliases: ['github', 'gh'] },
      { name: 'playwright-mcp', aliases: ['playwright', 'pw', 'browser'] },
      { name: 'mcp-assistant-server', aliases: ['assistant', 'mcp-assistant'] }
    ];
    
    // 添加标准映射
    for (const service of standardServices) {
      // 添加完整名称 -> 完整名称
      this.serviceNameMap.set(service.name, service.name);
      
      // 添加别名 -> 完整名称
      for (const alias of service.aliases) {
        this.serviceNameMap.set(alias, service.name);
      }
    }
    
    // 从配置文件添加映射
    if (config && config.externalServices && Array.isArray(config.externalServices)) {
      for (const service of config.externalServices) {
        if (service.name) {
          // 添加完整名称 -> 完整名称
          this.serviceNameMap.set(service.name, service.name);
          
          // 对于像"sequentialthinking-mcp"这样的名称，添加简短别名映射
          if (service.name.includes('-mcp')) {
            const shortName = service.name.replace('-mcp', '');
            this.serviceNameMap.set(shortName, service.name);
          }
          
          // 为"xxx-yyy-mcp"形式的名称添加两种简化形式
          const parts = service.name.split('-');
          if (parts.length > 2 && parts[parts.length - 1] === 'mcp') {
            // 完整名称不含mcp的版本
            const nameWithoutMcp = parts.slice(0, -1).join('-');
            this.serviceNameMap.set(nameWithoutMcp, service.name);
            
            // 只用第一部分作为别名
            this.serviceNameMap.set(parts[0], service.name);
          }
          
          // 如果配置中有自定义别名，添加它们
          if (service.aliases && Array.isArray(service.aliases)) {
            for (const alias of service.aliases) {
              if (typeof alias === 'string' && alias.trim()) {
                this.serviceNameMap.set(alias.trim(), service.name);
              }
            }
          }
        }
      }
    }
    
    console.log('[MCP服务器初始化] 服务名称映射表:', Object.fromEntries(this.serviceNameMap));
  }
  
  // 启动HTTP服务器
  private async startHttpServer(): Promise<void> {
    const app = express();
    
    // 使用JSON中间件
    app.use(express.json());
    
    // 定义根路由
    app.get('/', (_req: Request, res: Response) => {
      res.send({
        name: 'MCP Assistant Server',
        version: '1.0.0',
        status: 'running',
        llm: {
          enabled: this.useLLM,
          model: this.llmService ? this.llmService.getConfig().modelName : 'none'
        }
      });
    });
    
    // 获取配置
    const config = this.loadLocalConfig();
    const apiConfig = config?.api || { enableSwaggerUI: true, basePath: '/api/v1' };
    
    // 加载并解析OpenAPI规范文件
    try {
      if (apiConfig.enableSwaggerUI !== false) {
        const openApiPath = path.join(__dirname, '../src/openapi/llm-api.yaml');
        console.log(`[HTTP] 尝试从路径加载OpenAPI规范: ${openApiPath}`);
        
        // 检查文件是否存在
        if (fs.existsSync(openApiPath)) {
          const openApiSpec = YAML.load(openApiPath);
          app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
          console.log('[HTTP] OpenAPI文档已配置，可访问 /api-docs 查看');
        } else {
          console.error(`[HTTP] OpenAPI规范文件不存在: ${openApiPath}`);
        }
      }
    } catch (error) {
      console.error('[HTTP] 加载OpenAPI规范文件失败:', error);
    }
    
    // 如果启用了LLM，注册LLM API路由
    if (this.useLLM && this.llmService) {
      const basePath = apiConfig.basePath || '/api/v1';
      console.log(`[HTTP] 使用API基础路径: ${basePath}`);
      
      const llmApiController = new LLMApiController(this.llmService);
      app.use(`${basePath}/llm`, createLLMApiRoutes(llmApiController));
      console.log('[HTTP] LLM API路由已注册');
    } else {
      console.log('[HTTP] LLM未启用或服务不可用，跳过LLM API路由注册');
    }
    
    // 处理MCP协议请求
    app.post('/', async (req: Request, res: Response) => {
      try {
        console.log('[HTTP] 收到POST请求，请求体:', JSON.stringify(req.body));
        const { method, params } = req.body;
        console.log(`[HTTP] 解析请求体，method: ${method}, params:`, JSON.stringify(params));
        
        // 模拟MCP服务器处理请求
        let result;
        if (method === 'list_tools') {
          console.log('[HTTP] 处理list_tools请求');
          result = await this.handleListTools();
        } else if (method === 'call_tool' || method === 'tools/call') {
          console.log(`[HTTP] 处理工具调用请求，方法: ${method}`);
          try {
            // 尝试使用CallToolRequestSchema验证
            console.log('[HTTP] 尝试使用CallToolRequestSchema验证请求');
            const callToolRequest = CallToolRequestSchema.parse(req.body);
            console.log('[HTTP] 验证成功，处理工具调用');
            // 如果验证通过，使用标准格式处理
            result = await this.handleCallTool(callToolRequest.params);
          } catch (validationError) {
            console.log('[HTTP] 验证失败:', validationError);
            // 如果验证失败但method是'call_tool'，尝试使用兼容格式处理
            if (method === 'call_tool' && params && params.name) {
              console.log('[HTTP] 使用兼容格式处理call_tool请求');
              // 将旧格式参数转换为新格式
              result = await this.handleCallTool({
                name: params.name,
                arguments: params.params || params.arguments || {}
              });
            } else {
              // 其他验证错误直接抛出
              console.log('[HTTP] 无法使用兼容格式处理，抛出验证错误');
              throw validationError;
            }
          }
        } else {
          console.log(`[HTTP] 不支持的方法: ${method}`);
          throw new Error(`不支持的方法: ${method}`);
        }
        
        console.log('[HTTP] 处理结果:', result);
        res.json(result);
      } catch (error) {
        console.error('[HTTP] 处理请求出错:', error);
        res.status(400).json({
          error: `请求处理失败: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    });
    
    // 启动HTTP服务器
    try {
      // 首先尝试监听默认端口
      this.httpServer = app.listen(this.port, this.host, () => {
        console.log(`[HTTP] 服务器运行在 http://${this.host}:${this.port}`);
      });
    } catch (error) {
      console.error(`[HTTP] 端口 ${this.port} 已被占用，尝试使用另一个端口`);
      
      // 尝试其他端口
      for (let tryPort = this.port + 1; tryPort < this.port + 10; tryPort++) {
        try {
          console.log(`[HTTP] 尝试使用端口 ${tryPort}`);
          this.port = tryPort;
          this.httpServer = app.listen(this.port, this.host, () => {
            console.log(`[HTTP] 服务器运行在 http://${this.host}:${this.port}`);
          });
          break;
        } catch (err) {
          console.error(`[HTTP] 端口 ${tryPort} 也被占用`);
        }
      }
    }
  }
  
  // 处理HTTP工具列表请求
  private async handleListTools(): Promise<any> {
    return {
      tools: Object.values(toolDefinitions)
    };
  }
  
  // 处理HTTP工具调用请求
  private async handleCallTool(params: any): Promise<any> {
    console.log('[handleCallTool] 接收到参数:', JSON.stringify(params));
    
    // 兼容旧版和新版参数结构
    const name = params.name;
    const args = params.arguments || params.params || {};
    
    console.log(`[HTTP] 调用工具: ${name}, 参数:`, JSON.stringify(args));
    
    try {
      switch (name) {
        case 'analyze_task':
          return await this.handleAnalyzeTask(args);
        case 'recommend_tools':
          return await this.handleRecommendTools(args);
        case 'update_context':
          return await this.handleUpdateContext(args);
        case 'get_capabilities':
          return await this.handleGetCapabilities(args);
        case 'discover_mcp_tools':
          return await this.handleDiscoverMCPTools(args);
        case 'call_external_tool':
          return await this.handleCallExternalTool(args);
        case 'llm_analyze':
          return await this.handleLLMAnalyze(args);
        default:
          throw new Error(`未知工具: ${name}`);
      }
    } catch (error) {
      console.error(`[HTTP] 处理${name}请求失败:`, error);
      throw error;
    }
  }

  // 注册请求处理器
  private registerRequestHandlers(): void {
    // 设置错误处理
    this.server.onerror = (error: Error) => {
      console.error('[MCP Assistant Server Error]', error);
    };
    
    // 注册工具列表请求处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: Object.values(toolDefinitions)
      };
    });
    
    // 注册工具调用请求处理器
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      
      console.log(`收到工具请求: ${name}`, args);
      
      try {
        switch (name) {
          case 'analyze_task':
            return await this.handleAnalyzeTask(args);
          case 'recommend_tools':
            return await this.handleRecommendTools(args);
          case 'update_context':
            return await this.handleUpdateContext(args);
          case 'get_capabilities':
            return await this.handleGetCapabilities(args);
          case 'discover_mcp_tools':
            return await this.handleDiscoverMCPTools(args);
          case 'call_external_tool':
            return await this.handleCallExternalTool(args);
          case 'llm_analyze':
            return await this.handleLLMAnalyze(args);
          default:
            throw new Error(`未知工具: ${name}`);
        }
      } catch (error) {
        console.error(`处理${name}请求失败:`, error);
        throw error;
      }
    });
  }
  
  // 处理分析任务请求
  private async handleAnalyzeTask(params: any): Promise<any> {
    const { description, context } = params;
    
    if (!description) {
      throw new Error('缺少任务描述');
    }
    
    const task = await this.taskAnalyzer.analyzeTask(description, context);
    
    // 生成唯一ID并保存任务
    const taskId = `task_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    task.id = taskId;
    this.tasks.set(taskId, task);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ taskId, task }, null, 2)
        }
      ]
    };
  }
  
  // 处理推荐工具请求
  private async handleRecommendTools(params: any): Promise<any> {
    const { taskId, useHybridRecommendation } = params;
    
    // 获取任务
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`未找到ID为${taskId}的任务`);
    }
    
    // 使用自定义选项
    if (useHybridRecommendation !== undefined && this.useLLM !== useHybridRecommendation) {
      // 临时修改大模型使用设置
      const originalUseLLM = this.useLLM;
      try {
        this.useLLM = useHybridRecommendation;
        // 临时创建新的推荐器
        const tempRecommender = new DefaultToolRecommender({
          useLLM: useHybridRecommendation,
          llmService: this.llmService
        });
        
        // 获取上下文
        const context = this.contextManager.getContext(taskId);
        
        // 推荐工具
        const recommendation = await tempRecommender.recommendTools(task, context);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ recommendation }, null, 2)
            }
          ]
        };
      } finally {
        // 恢复原始设置
        this.useLLM = originalUseLLM;
      }
    }
    
    // 获取上下文
    const context = this.contextManager.getContext(taskId);
    
    // 推荐工具
    const recommendation = await this.toolRecommender.recommendTools(task, context);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ recommendation }, null, 2)
        }
      ]
    };
  }
  
  // 处理更新上下文请求
  private async handleUpdateContext(params: any): Promise<any> {
    const { taskId, toolUsage, feedback } = params;
    
    // 获取任务
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`未找到ID为${taskId}的任务`);
    }
    
    // 更新上下文
    const updatedContext = await this.contextManager.updateContext(taskId, {
      toolUsage,
      feedback
    });
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ context: updatedContext }, null, 2)
        }
      ]
    };
  }
  
  // 处理获取服务器能力请求
  private async handleGetCapabilities(params: any): Promise<any> {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ tools: Object.values(toolDefinitions) }, null, 2)
        }
      ]
    };
  }
  
  // 处理大模型高级分析请求
  private async handleLLMAnalyze(params: any): Promise<any> {
    console.log('[handleLLMAnalyze] 接收到参数:', JSON.stringify(params, null, 2));
    
    try {
      // 确保params是对象
      if (!params || typeof params !== 'object') {
        throw new Error(`参数格式错误，期望对象，收到 ${typeof params}`);
      }
      
      const { description, context, analysisType } = params;
      
      if (!description) {
        throw new Error('缺少任务描述(description)字段');
      }
      
      // 记录详细的请求参数和服务状态
      console.log('[LLM分析] 详细请求参数:');
      console.log(`- 描述: "${description.substring(0, 100)}${description.length > 100 ? '...' : ''}"`);
      console.log(`- 上下文: ${context ? '已提供' : '未提供'}`);
      console.log(`- 分析类型: ${analysisType || '默认'}`);
      
      console.log('[LLM分析] 服务状态检查:', { 
        useLLM: this.useLLM, 
        llmServiceExists: !!this.llmService,
        llmServiceInitialized: this.llmService ? '已初始化' : '未初始化',
        llmConfigParams: this.llmService ? {
          apiEndpoint: this.llmService.getConfig().apiEndpoint,
          modelName: this.llmService.getConfig().modelName,
          apiKeyAvailable: !!this.llmService.getConfig().apiKey
        } : '无配置'
      });
      
      if (!this.useLLM || !this.llmService) {
        // 尝试重新初始化LLM服务
        try {
          console.log('[LLM分析] LLM服务不可用，尝试重新初始化...');
          const config = this.loadLocalConfig();
          console.log('[LLM分析] 从配置文件加载的配置:', {
            useLLM: config.useLLM,
            llmApiEndpoint: config.llmApiEndpoint,
            llmModelName: config.llmModelName,
            llmApiKeyAvailable: !!config.llmApiKey
          });
          
          if (config && config.useLLM && config.llmApiKey) {
            console.log('[LLM分析] 尝试重新初始化LLM服务');
            this.useLLM = true;
            this.llmService = new LLMService({
              apiKey: config.llmApiKey,
              apiEndpoint: config.llmApiEndpoint || 'https://api.ppinfra.com/v3',
              modelName: config.llmModelName || 'DeepSeek: DeepSeek R1 (Community)',
              maxTokens: config.llmMaxTokens || 1024,
              temperature: config.llmTemperature || 0.3
            });
            console.log('[LLM分析] LLM服务重新初始化完成');
          } else {
            console.error('[LLM分析] 配置不完整，无法初始化LLM服务');
            throw new Error('无法初始化LLM服务，配置不完整');
          }
        } catch (initError: any) {
          console.error('[LLM分析] 初始化失败:', initError);
          throw new Error(`LLM服务初始化失败: ${initError.message}`);
        }
      }
      
      // 调用LLM分析
      try {
        console.log('[LLM分析] 调用LLM服务开始');
        console.log('[LLM分析] 调用analyzeTask方法，参数:');
        console.log('- description:', description.substring(0, 100) + (description.length > 100 ? '...' : ''));
        console.log('- context:', context ? '已提供' : '未提供');
        console.log('- analysisType:', analysisType || '默认');
        
        const result = await this.llmService.analyzeTask(description, context, analysisType);
        console.log('[LLM分析] 分析完成，结果类型:', typeof result);
        
        // 记录结果摘要
        if (result) {
          console.log('[LLM分析] 结果摘要:');
          if (typeof result === 'object') {
            const keys = Object.keys(result);
            console.log(`- 结果包含 ${keys.length} 个键: ${keys.join(', ')}`);
          } else {
            console.log(`- 结果类型: ${typeof result}`);
            console.log(`- 结果长度: ${String(result).length} 字符`);
          }
        } else {
          console.log('[LLM分析] 返回结果为空');
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error('[handleLLMAnalyze] 处理异常:', error);
        // 记录更详细的错误信息
        if (error instanceof Error) {
          console.error('[handleLLMAnalyze] 错误名称:', error.name);
          console.error('[handleLLMAnalyze] 错误消息:', error.message);
          console.error('[handleLLMAnalyze] 错误栈:', error.stack);
        }
        throw error;
      }
    } catch (error) {
      console.error('[handleLLMAnalyze] 处理异常:', error);
      throw error;
    }
  }
  
  // 将自身注册为MCP服务
  private async registerSelfAsService(): Promise<void> {
    try {
      await this.discoveryService.registerLocalService({
        name: 'mcp-assistant-server',
        description: 'MCP助手服务器',
        endpoint: `http://${this.host}:${this.port}`,
        transport: 'http',
        aliases: ['assistant', 'mcp-assistant']
      });
    } catch (error) {
      console.error('[MCP Assistant Server] 注册自身为服务失败:', error);
      // 不抛出错误，允许服务继续启动
    }
  }
  
  // 处理发现MCP工具请求
  private async handleDiscoverMCPTools(params: any): Promise<any> {
    const { refresh } = params;
    
    if (refresh) {
      // 重新初始化服务发现
      await this.discoveryService.initialize();
    }
    
    // 获取所有可用的外部工具
    const externalTools = this.discoveryService.getAvailableTools();
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ 
            externalTools,
            count: externalTools.length
          }, null, 2)
        }
      ]
    };
  }
  
  // 处理调用外部工具请求
  private async handleCallExternalTool(params: any): Promise<any> {
    const { toolName, serviceName: originalServiceName, params: toolParams } = params;
    
    if (!toolName || !originalServiceName) {
      throw new Error('缺少工具名称或服务名称');
    }
    
    // 使用服务名称映射解析实际服务名称
    let serviceName = originalServiceName;
    if (this.serviceNameMap.has(originalServiceName)) {
      serviceName = this.serviceNameMap.get(originalServiceName) as string;
      console.log(`[外部工具调用] 服务名称映射: ${originalServiceName} -> ${serviceName}`);
    }
    
    // 调用外部工具
    try {
      const result = await this.discoveryService.callExternalTool(toolName, serviceName, toolParams);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error: any) {
      console.error(`[外部工具调用] 调用失败: ${toolName}@${serviceName}`, error);
      
      // 检查是否找不到服务
      if (error.message && error.message.includes('未找到MCP服务')) {
        const availableServices = Array.from(this.serviceNameMap.keys())
          .filter(key => this.serviceNameMap.get(key) === this.serviceNameMap.get(key)); // 只获取主要名称
        
        console.log(`[外部工具调用] 可用服务: ${JSON.stringify([...new Set(Array.from(this.serviceNameMap.values()))])}`);
        
        // 返回更有用的错误信息，包括可用的服务列表
        throw new Error(`未找到MCP服务: ${serviceName}。

可用服务列表:
${[...new Set(Array.from(this.serviceNameMap.values()))].map(name => `- ${name}`).join('\n')}

请检查服务名称拼写或确保该服务已启动。`);
      }
      
      throw error;
    }
  }
  
  // 加载本地配置文件
  private loadLocalConfig(): any {
    try {
      // 尝试多个可能的配置文件路径
      const possiblePaths = [
        path.join(process.cwd(), 'mcp-config.json'),
        path.join(__dirname, '..', 'mcp-config.json'),
        path.join(os.homedir(), '.mcp', 'config.json')
      ];
      
      for (const configPath of possiblePaths) {
        if (fs.existsSync(configPath)) {
          console.log('加载配置文件:', configPath);
          const configContent = fs.readFileSync(configPath, 'utf-8');
          try {
            return JSON.parse(configContent);
          } catch (parseError) {
            console.error(`配置文件 ${configPath} 解析失败:`, parseError);
          }
        }
      }
      
      console.warn('未找到配置文件，尝试加载示例配置');
      const examplePath = path.join(process.cwd(), 'mcp-config.json.example');
      if (fs.existsSync(examplePath)) {
        const exampleContent = fs.readFileSync(examplePath, 'utf-8');
        try {
          const exampleConfig = JSON.parse(exampleContent);
          console.log('已加载示例配置文件');
          return exampleConfig;
        } catch (parseError) {
          console.error('示例配置文件解析失败:', parseError);
        }
      }
      
      console.warn('找不到任何可用的配置文件');
    } catch (error) {
      console.warn('读取配置文件失败:', error);
    }
    
    return null;
  }

  // 关闭服务器
  async shutdown(): Promise<void> {
    try {
      console.log('[MCP Assistant Server] 正在关闭...');
      
      // 关闭HTTP服务器
      if (this.httpServer) {
        await new Promise<void>((resolve) => {
          this.httpServer?.close(() => resolve());
        });
      }
      
      // 关闭传输层
      if (this.transport) {
        await this.server.close();
      }
      
      console.log('[MCP Assistant Server] 已关闭');
    } catch (error) {
      console.error('[MCP Assistant Server] 关闭失败:', error);
      throw error;
    }
  }
}