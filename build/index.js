#!/usr/bin/env node
import { MCPAssistantServer } from './MCPAssistantServer.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import fs from 'fs';
import path from 'path';
// 读取配置文件（如果存在）
function loadConfig() {
    const configPath = path.join(process.cwd(), 'mcp-config.json');
    try {
        if (fs.existsSync(configPath)) {
            const configContent = fs.readFileSync(configPath, 'utf-8');
            const config = JSON.parse(configContent);
            console.log('已加载配置文件:', configPath);
            return config;
        }
    }
    catch (error) {
        console.warn('读取配置文件失败，将使用默认配置:', error);
    }
    return {};
}
async function main() {
    try {
        // 设置环境变量
        const isDevelopment = process.env.NODE_ENV === 'development';
        if (!process.env.NODE_ENV) {
            process.env.NODE_ENV = isDevelopment ? 'development' : 'production';
        }
        console.log(`[MCP助手服务器] 环境: ${process.env.NODE_ENV}`);
        const config = loadConfig();
        // 输出配置信息（隐藏敏感数据）
        console.log('[MCP助手服务器] 配置信息:', {
            useLLM: config.useLLM,
            llmApiEndpoint: config.llmApiEndpoint,
            llmModelName: config.llmModelName,
            llmApiKeyAvailable: !!config.llmApiKey && config.llmApiKey.trim() !== ''
        });
        // 创建服务器传输层
        const transport = new StdioServerTransport();
        // 确定是否使用大模型
        const useLLM = process.env.USE_LLM === 'true' || config.useLLM === true;
        // 大模型配置
        const llmConfig = useLLM ? {
            apiKey: process.env.LLM_API_KEY || config.llmApiKey || '',
            apiEndpoint: process.env.LLM_API_ENDPOINT || config.llmApiEndpoint || 'https://api.openai.com/v1',
            modelName: process.env.LLM_MODEL_NAME || config.llmModelName || 'gpt-3.5-turbo',
            maxTokens: parseInt(process.env.LLM_MAX_TOKENS || config.llmMaxTokens || '1024', 10),
            temperature: parseFloat(process.env.LLM_TEMPERATURE || config.llmTemperature || '0.7')
        } : undefined;
        // 检查大模型配置
        if (useLLM && (!llmConfig?.apiKey || llmConfig.apiKey.trim() === '')) {
            console.warn('警告: 启用了大模型，但未提供API密钥。推荐设置环境变量LLM_API_KEY或在配置文件中添加llmApiKey。');
            console.warn('将禁用大模型功能。');
        }
        // 创建并初始化MCP服务器
        const server = new MCPAssistantServer({
            useLLM: useLLM && llmConfig?.apiKey && llmConfig.apiKey.trim() !== '',
            llmConfig
        });
        // 初始化服务器
        await server.initialize();
        // 处理退出信号
        process.on('SIGINT', async () => {
            try {
                await server.shutdown();
                process.exit(0);
            }
            catch (error) {
                console.error('关闭服务器时发生错误:', error);
                process.exit(1);
            }
        });
        process.on('SIGTERM', async () => {
            try {
                await server.shutdown();
                process.exit(0);
            }
            catch (error) {
                console.error('关闭服务器时发生错误:', error);
                process.exit(1);
            }
        });
        console.log('MCP助手服务器运行中...');
        console.log(`大模型支持: ${useLLM && llmConfig?.apiKey && llmConfig.apiKey.trim() !== '' ? '已启用' : '已禁用'}`);
        if (useLLM && llmConfig?.apiKey && llmConfig.apiKey.trim() !== '') {
            console.log(`使用模型: ${llmConfig.modelName}`);
            console.log(`API端点: ${llmConfig.apiEndpoint}`);
        }
    }
    catch (error) {
        console.error('启动MCP助手服务器失败:', error);
        process.exit(1);
    }
}
main().catch(console.error);
//# sourceMappingURL=index.js.map