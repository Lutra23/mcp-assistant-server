<div align="center">

# MCP Assistant Server

<p align="center">
  <img src="docs/images/logo.png" alt="MCP Assistant Server Logo" width="200"/>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

_🤖 一个强大的 MCP 服务器，提供智能任务分析和工具推荐功能_

[English](./README_EN.md) | 简体中文

</div>

## ✨ 特性

- 🎯 **智能任务分析** - 自动分析用户任务，提取关键信息
- 🔍 **工具推荐** - 基于任务特点智能推荐最适合的 MCP 工具
- 🧠 **LLM 集成** - 集成大语言模型进行高级分析
- 🔄 **上下文管理** - 智能维护任务执行过程中的上下文信息
- 🔌 **工具发现** - 自动发现和集成可用的 MCP 工具
- 🚀 **高性能** - 异步处理，快速响应
- 📦 **易扩展** - 模块化设计，便于扩展

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 7.0.0

### 安装

```bash
# 克隆仓库
git clone https://github.com/Lutra23/mcp-assistant-server.git

# 进入项目目录
cd mcp-assistant-server

# 安装依赖
npm install
```

### 配置

1. 复制配置文件模板：

```bash
cp mcp-config.json.example mcp-config.json
```

2. 根据需要修改 `mcp-config.json` 配置：

```json
{
  "port": 3000,
  "logLevel": "info",
  "llm": {
    "provider": "openai",
    "apiKey": "your-api-key"
  }
}
```

### 运行

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 📚 使用指南

### 基础用法

```typescript
import { MCPAssistantServer } from 'mcp-assistant-server';

const server = new MCPAssistantServer({
  port: 3000,
  logLevel: 'info'
});

server.start();
```

### 示例

1. 任务分析：

```typescript
const result = await server.analyzeTask({
  description: '获取天气信息并保存到文件',
  context: {
    location: '上海',
    format: 'json'
  }
});
```

2. 工具推荐：

```typescript
const tools = await server.recommendTools({
  taskId: 'task-123',
  useHybridRecommendation: true
});
```

## 🎯 核心功能

### 任务分析器

分析用户输入的任务描述，提取关键信息：

- 任务类型识别
- 参数提取
- 上下文关联
- 依赖分析

### 工具推荐系统

根据任务特点智能推荐工具：

- 基于规则的推荐
- 混合推荐算法
- 上下文感知
- 历史数据分析

### 上下文管理器

维护任务执行过程中的上下文信息：

- 状态追踪
- 数据持久化
- 会话管理
- 错误恢复

## 📦 项目结构

```
src/
├── controllers/     # 控制器层
│   └── LLMApiController.ts
├── core/           # 核心功能实现
│   ├── TaskAnalyzer.ts
│   ├── ToolRecommender.ts
│   └── ContextManager.ts
├── services/       # 服务层
│   ├── LLMService.ts
│   └── MCPDiscoveryService.ts
├── routes/         # 路由定义
│   └── llmApiRoutes.ts
└── types/          # 类型定义
    └── interfaces.ts
```

## 🔌 API 文档

详细的 API 文档请查看 [API 文档](./docs/api.md)。

## 🤝 贡献指南

我们欢迎所有形式的贡献，无论是新功能、文档改进还是问题反馈。详情请查看 [贡献指南](CONTRIBUTING.md)。

## 📄 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解详细的更新历史。

## 📝 开源协议

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 了解详情。

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者们！

<div align="center">

Made with ❤️ by [Lutra23](https://github.com/Lutra23)

</div>