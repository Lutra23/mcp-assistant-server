/**
 * MCP服务发现示例客户端
 * 
 * 此示例演示如何使用MCP Assistant Server的服务发现功能来:
 * 1. 发现可用的MCP服务和工具
 * 2. 调用发现的外部MCP工具
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio/index.js';
import { HttpClientTransport } from '@modelcontextprotocol/sdk/client/http/index.js';

async function main() {
  try {
    // 创建与MCP Assistant Server的连接
    // 方式1: 使用Stdio传输 (直接启动服务器进程)
    const stdioTransport = new StdioClientTransport({ 
      command: 'node build/index.js'
    });
    const stdioClient = new Client(stdioTransport);
    
    // 方式2: 使用HTTP传输 (连接到已运行的服务器)
    // const httpTransport = new HttpClientTransport({ 
    //   url: 'http://localhost:3000'
    // });
    // const httpClient = new Client(httpTransport);
    
    // 选择使用的客户端
    const client = stdioClient;
    
    // 初始化连接
    console.log('正在连接到MCP Assistant Server...');
    await client.initialize();
    console.log('连接成功');
    
    // 1. 发现可用的MCP工具
    console.log('\n===== 发现可用的MCP工具 =====');
    const discoveryResult = await client.callTool('discover_mcp_tools', {
      refresh: true  // 强制刷新服务发现
    });
    
    console.log(`发现了 ${discoveryResult.count} 个外部工具`);
    console.log('可用的外部工具:');
    
    // 显示发现的工具信息
    discoveryResult.externalTools.forEach(tool => {
      console.log(`- ${tool.name} (来自: ${tool.serviceName})`);
      console.log(`  描述: ${tool.description}`);
      console.log(`  传输类型: ${tool.transportType}`);
      console.log('');
    });
    
    // 2. 调用外部工具示例
    if (discoveryResult.externalTools.length > 0) {
      const exampleTool = discoveryResult.externalTools[0];
      console.log(`\n===== 调用外部工具: ${exampleTool.name} =====`);
      
      try {
        // 根据工具类型准备适当的参数
        // 注意: 这里需要根据实际工具调整参数
        const toolParams = {};
        
        if (exampleTool.name.includes('file') || exampleTool.name.includes('read')) {
          toolParams.path = './README.md';
        } else if (exampleTool.name.includes('search')) {
          toolParams.query = 'example query';
        }
        
        // 调用外部工具
        const result = await client.callTool('call_external_tool', {
          toolName: exampleTool.name,
          serviceName: exampleTool.serviceName,
          params: toolParams
        });
        
        console.log('工具调用结果:');
        console.log(result);
      } catch (error) {
        console.error(`调用工具 ${exampleTool.name} 失败:`, error.message);
      }
    }
    
    // 3. 使用MCP Assistant Server的本地工具
    console.log('\n===== 使用本地工具 =====');
    
    // 分析任务示例
    const taskResult = await client.callTool('analyze_task', {
      description: '在CSV文件中查找并提取所有包含"产品"关键词的记录'
    });
    
    console.log('任务分析结果:');
    console.log(taskResult);
    
    // 获取推荐工具
    const toolsResult = await client.callTool('recommend_tools', {
      taskId: taskResult.taskId
    });
    
    console.log('\n工具推荐结果:');
    console.log(toolsResult);
    
    // 关闭连接
    await client.disconnect();
    console.log('\n连接已关闭');
    
  } catch (error) {
    console.error('发生错误:', error);
  }
}

// 运行示例
main().catch(console.error); 