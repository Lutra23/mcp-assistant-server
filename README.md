# MCP Assistant Server

MCP Assistant Server是一个基于Model Context Protocol的智能助手服务器，提供任务分析、工具推荐、上下文管理等功能。

## 功能特点

- **任务分析**：分析用户任务，提取关键词、任务类型、复杂度等信息
- **工具推荐**：根据任务特点推荐最合适的工具
- **上下文管理**：维护任务上下文，记录工具使用历史
- **大模型支持**：可选接入大型语言模型，提供更准确的任务分析和工具推荐
- **MCP服务发现**：自动发现并集成环境中的其他MCP服务和工具

## 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/mcp-assistant-server.git
cd mcp-assistant-server

# 安装依赖
npm install

# 构建项目
npm run build
```

## 配置

### 环境变量

- `USE_LLM`: 是否启用大模型支持 (true/false)
- `LLM_API_KEY`: 大模型API密钥
- `LLM_API_ENDPOINT`: 大模型API端点 (默认: https://api.openai.com/v1)
- `LLM_MODEL_NAME`: 大模型名称 (默认: gpt-3.5-turbo)
- `LLM_MAX_TOKENS`: 最大生成的token数 (默认: 1024)
- `LLM_TEMPERATURE`: 生成温度 (默认: 0.7)
- `NODE_ENV`: 环境类型 (development/production)

### 配置文件

创建`mcp-config.json`文件（参考`mcp-config.json.example`）：

```json
{
  "useLLM": true,
  "llmApiKey": "your-api-key-here",
  "llmApiEndpoint": "https://api.openai.com/v1",
  "llmModelName": "gpt-3.5-turbo",
  "llmMaxTokens": 1024,
  "llmTemperature": 0.7,
  "server": {
    "port": 3000,
    "host": "localhost",
    "logLevel": "info"
  },
  "externalServices": [
    {
      "name": "filesystem-mcp",
      "description": "文件系统操作服务",
      "endpoint": "http://localhost:3001",
      "transport": "http"
    }
  ]
}
```

## 使用方法

### 启动服务器

```bash
# 不使用大模型启动
npm start

# 使用大模型启动
USE_LLM=true LLM_API_KEY=your-api-key npm start
```

### 使用StdioTransport连接

客户端可以通过stdio与服务器通信：

```javascript
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';

const transport = new StdioClientTransport({ 
  command: 'node build/index.js'
});
const client = new Client(transport);

// 初始化
await client.initialize();

// 使用工具
const result = await client.callTool('analyze_task', {
  description: '创建一个简单的网页，包含一个标题和一个按钮'
});
```

## API参考

### 核心工具

#### analyze_task

分析任务并提取关键信息。

**输入**:
- `description` (string): 任务描述
- `context` (string, 可选): 上下文信息

**输出**:
- `taskId`: 任务ID
- `task`: 任务详情，包括类型、关键词、复杂度等

#### recommend_tools

根据任务推荐适用的工具。

**输入**:
- `taskId` (string): 任务ID
- `useHybridRecommendation` (boolean, 可选): 是否使用混合推荐

**输出**:
- `recommendation`: 推荐的工具列表及理由

#### update_context

更新任务上下文。

**输入**:
- `taskId` (string): 任务ID
- `toolUsage` (object, 可选): 工具使用记录
- `feedback` (string, 可选): 用户反馈

**输出**:
- `context`: 更新后的上下文

#### get_capabilities

获取服务器支持的所有工具。

**输入**: 无

**输出**:
- `tools`: 工具列表

#### llm_analyze

使用大模型进行高级任务分析。

**输入**:
- `description` (string): 任务描述
- `context` (string, 可选): 上下文信息
- `analysisType` (string, 可选): 分析类型

**输出**:
- 分析结果对象

### MCP服务发现工具

#### discover_mcp_tools

发现并列出所有可用的MCP工具。

**输入**:
- `refresh` (boolean, 可选): 是否刷新工具列表

**输出**:
- `externalTools`: 发现的外部工具列表
- `count`: 工具数量

#### call_external_tool

调用外部MCP服务的工具。

**输入**:
- `toolName` (string): 工具名称
- `serviceName` (string): 服务名称
- `params` (object): 调用参数

**输出**:
- 工具执行结果

## MCP服务集成

MCP Assistant Server可以集成环境中的其他MCP服务，实现工具的自动发现和调用。服务发现通过以下方式进行：

1. **服务注册表**：检查`~/.mcp/services/registry.json`文件
2. **进程发现**：自动检测运行中的MCP服务进程
3. **配置文件**：从`mcp-config.json`的`externalServices`配置项读取

发现的服务可以通过`discover_mcp_tools`工具列出，并通过`call_external_tool`工具调用。

### 注册新服务

可以通过以下方式注册新的MCP服务：

1. 在`mcp-config.json`的`externalServices`数组中添加服务信息
2. 手动修改`~/.mcp/services/registry.json`文件
3. 使用`registerLocalService` API注册服务

## 贡献指南

欢迎贡献代码、报告问题或提出改进建议。请遵循以下步骤：

1. Fork仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 授权协议

本项目基于MIT协议开源 - 详见 [LICENSE](LICENSE) 文件 