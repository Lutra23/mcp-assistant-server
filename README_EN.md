<div align="center">

# MCP Assistant Server

<p align="center">
  <img src="docs/images/logo.png" alt="MCP Assistant Server Logo" width="200"/>
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2016.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

_🤖 A powerful MCP server providing intelligent task analysis and tool recommendations_

English | [简体中文](./README.md)

</div>

## ✨ Features

- 🎯 **Intelligent Task Analysis** - Automatically analyze user tasks and extract key information
- 🔍 **Tool Recommendations** - Intelligently recommend the most suitable MCP tools based on task characteristics
- 🧠 **LLM Integration** - Integrate large language models for advanced analysis
- 🔄 **Context Management** - Intelligently maintain context information during task execution
- 🔌 **Tool Discovery** - Automatically discover and integrate available MCP tools
- 🚀 **High Performance** - Asynchronous processing for quick responses
- 📦 **Easy to Extend** - Modular design for easy extension

## 🚀 Quick Start

### Requirements

- Node.js >= 16.0.0
- npm >= 7.0.0

### Installation

```bash
# Clone repository
git clone https://github.com/Lutra23/mcp-assistant-server.git

# Enter project directory
cd mcp-assistant-server

# Install dependencies
npm install
```

### Configuration

1. Copy configuration file template:

```bash
cp mcp-config.json.example mcp-config.json
```

2. Modify `mcp-config.json` as needed:

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

### Running

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 📚 Usage Guide

### Basic Usage

```typescript
import { MCPAssistantServer } from 'mcp-assistant-server';

const server = new MCPAssistantServer({
  port: 3000,
  logLevel: 'info'
});

server.start();
```

### Examples

1. Task Analysis:

```typescript
const result = await server.analyzeTask({
  description: 'Get weather information and save to file',
  context: {
    location: 'Shanghai',
    format: 'json'
  }
});
```

2. Tool Recommendations:

```typescript
const tools = await server.recommendTools({
  taskId: 'task-123',
  useHybridRecommendation: true
});
```

## 🎯 Core Features

### Task Analyzer

Analyze user task descriptions and extract key information:

- Task type identification
- Parameter extraction
- Context correlation
- Dependency analysis

### Tool Recommendation System

Intelligently recommend tools based on task characteristics:

- Rule-based recommendations
- Hybrid recommendation algorithms
- Context awareness
- Historical data analysis

### Context Manager

Maintain context information during task execution:

- State tracking
- Data persistence
- Session management
- Error recovery

## 📦 Project Structure

```
src/
├── controllers/     # Controllers
│   └── LLMApiController.ts
├── core/           # Core functionality
│   ├── TaskAnalyzer.ts
│   ├── ToolRecommender.ts
│   └── ContextManager.ts
├── services/       # Services
│   ├── LLMService.ts
│   └── MCPDiscoveryService.ts
├── routes/         # Route definitions
│   └── llmApiRoutes.ts
└── types/          # Type definitions
    └── interfaces.ts
```

## 🔌 API Documentation

For detailed API documentation, please see [API Documentation](./docs/api.md).

## 🤝 Contributing

We welcome all forms of contributions, whether new features, documentation improvements, or issue feedback. See [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed update history.

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Thank you to all the developers who have contributed to this project!

<div align="center">

Made with ❤️ by [Lutra23](https://github.com/Lutra23)

</div>