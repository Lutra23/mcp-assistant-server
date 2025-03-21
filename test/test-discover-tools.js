#!/usr/bin/env node

/**
 * MCP工具发现和外部工具调用测试脚本
 */

import { Client } from '@modelcontextprotocol/sdk';
import { StdioClientTransport } from '@modelcontextprotocol/sdk';
import { HttpClientTransport } from '@modelcontextprotocol/sdk';

// 配置
const config = {
  useHttp: true, // 设置为true使用HTTP，false使用Stdio
  httpEndpoint: 'http://localhost:3000', // HTTP端点
  stdioCommand: 'node build/index.js', // Stdio命令
  serverDir: '/home/zous/Cline/MCP/mcp-assistant-server' // 服务器目录
};

/**
 * 测试发现MCP工具
 */
async function testDiscoverTools(client) {
  console.log('\n----- 测试发现MCP工具 -----');
  
  try {
    // 调用discover_mcp_tools工具
    const result = await client.callTool('discover_mcp_tools', {
      refresh: true // 刷新工具列表
    });
    
    console.log(`发现了 ${result.content[0].text ? JSON.parse(result.content[0].text).count : 0} 个外部工具`);
    
    if (result.content[0].text) {
      const data = JSON.parse(result.content[0].text);
      if (data.externalTools && data.externalTools.length > 0) {
        console.log('发现的外部工具:');
        data.externalTools.forEach((tool, index) => {
          console.log(`  ${index + 1}. ${tool.name} (服务: ${tool.service || tool.serviceName})`);
        });
      }
    }
    
    return result;
  } catch (error) {
    console.error('测试发现MCP工具失败:', error);
    throw error;
  }
}

/**
 * 测试调用外部工具
 */
async function testCallExternalTool(client, serviceName, toolName, params) {
  console.log(`\n----- 测试调用外部工具: ${toolName}@${serviceName} -----`);
  
  try {
    // 调用外部工具
    const result = await client.callTool('call_external_tool', {
      serviceName,
      toolName,
      params
    });
    
    console.log('工具调用结果:');
    if (result.content[0].text) {
      try {
        const data = JSON.parse(result.content[0].text);
        console.log(JSON.stringify(data, null, 2));
      } catch {
        console.log(result.content[0].text);
      }
    } else {
      console.log(result);
    }
    
    return result;
  } catch (error) {
    console.error(`测试调用外部工具 ${toolName}@${serviceName} 失败:`, error.message);
  }
}

/**
 * 测试sequentialthinking工具
 */
async function testSequentialThinking(client) {
  console.log('\n----- 测试Sequential Thinking工具 -----');
  
  const params = {
    thought: "如何优化TypeScript代码性能是一个重要话题",
    thoughtNumber: 1,
    totalThoughts: 3,
    nextThoughtNeeded: true
  };
  
  return testCallExternalTool(client, 'sequentialthinking', 'sequentialthinking', params);
}

/**
 * 主函数
 */
async function main() {
  let client;
  let transport;
  
  try {
    console.log('----- MCP工具发现和外部工具调用测试 -----');
    console.log(`使用传输: ${config.useHttp ? 'HTTP' : 'Stdio'}`);
    
    // 创建传输层
    if (config.useHttp) {
      transport = new HttpClientTransport({
        url: config.httpEndpoint
      });
      console.log(`HTTP端点: ${config.httpEndpoint}`);
    } else {
      transport = new StdioClientTransport({
        command: config.stdioCommand,
        cwd: config.serverDir
      });
      console.log(`Stdio命令: ${config.stdioCommand}`);
    }
    
    // 创建客户端
    client = new Client(transport);
    
    // 初始化连接
    console.log('连接到MCP服务器...');
    await client.initialize();
    console.log('连接成功');
    
    // 测试发现MCP工具
    const discoveryResult = await testDiscoverTools(client);
    
    // 如果发现了工具，尝试调用sequentialthinking工具
    await testSequentialThinking(client);
    
    console.log('\n----- 测试完成 -----');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    // 关闭连接
    if (client) {
      try {
        await client.disconnect();
        console.log('连接已关闭');
      } catch (error) {
        console.error('关闭连接失败:', error);
      }
    }
  }
}

// 运行主函数
main().catch(console.error); 