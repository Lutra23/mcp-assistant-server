# API 文档

## 概述

MCP Assistant Server 提供了一系列 RESTful API，用于任务分析和工具推荐。

## Base URL

```
http://localhost:3000/api/v1
```

## 认证

所有 API 请求需要在 Header 中包含 API Key：

```
Authorization: Bearer your-api-key
```

## API 端点

### 1. 任务分析

#### 请求

```http
POST /analyze-task
Content-Type: application/json

{
  "description": "获取天气信息并保存到文件",
  "context": {
    "location": "上海",
    "format": "json"
  }
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "taskType": "DATA_FETCH_AND_SAVE",
    "parameters": {
      "location": "上海",
      "format": "json",
      "operation": "weather_fetch"
    },
    "requiredTools": [
      "weather-api",
      "file-system"
    ]
  }
}
```

### 2. 工具推荐

#### 请求

```http
POST /recommend-tools
Content-Type: application/json

{
  "taskId": "task-123",
  "useHybridRecommendation": true
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "recommendations": [
      {
        "toolName": "weather-api",
        "confidence": 0.95,
        "description": "天气数据获取工具"
      },
      {
        "toolName": "file-system",
        "confidence": 0.90,
        "description": "文件系统操作工具"
      }
    ]
  }
}
```

### 3. 上下文更新

#### 请求

```http
POST /update-context
Content-Type: application/json

{
  "taskId": "task-123",
  "toolUsage": {
    "toolName": "weather-api",
    "status": "success",
    "result": {
      "temperature": 25,
      "humidity": 60
    }
  }
}
```

#### 响应

```json
{
  "success": true,
  "data": {
    "contextUpdated": true,
    "nextRecommendation": {
      "toolName": "file-system",
      "parameters": {
        "operation": "write",
        "format": "json"
      }
    }
  }
}
```

## 错误处理

所有 API 错误响应都遵循以下格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述信息"
  }
}
```

### 错误代码

| 代码 | 描述 |
|------|------|
| AUTH_ERROR | 认证失败 |
| INVALID_PARAMS | 参数无效 |
| TASK_NOT_FOUND | 任务不存在 |
| INTERNAL_ERROR | 内部服务器错误 |

## 速率限制

API 请求限制为：

- 认证用户：100 请求/分钟
- 未认证用户：10 请求/分钟

超出限制将返回 429 Too Many Requests 状态码。
