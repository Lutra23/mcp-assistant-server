#!/usr/bin/env node

/**
 * MCP服务发现测试脚本
 * 
 * 此脚本用于测试MCP服务发现功能，检查当前环境中可用的MCP服务
 * 不依赖MCP Assistant Server，可独立运行
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 服务发现配置
const CONFIG = {
  registryDir: path.join(os.homedir(), '.mcp', 'services'),
  registryFile: 'registry.json',
  configFile: path.resolve(__dirname, '..', 'mcp-config.json')
};

// 服务发现结果
const discoveredServices = {
  fromRegistry: [],
  fromProcess: [],
  fromConfig: []
};

/**
 * 检查和创建服务注册目录
 */
function ensureRegistryDir() {
  if (!fs.existsSync(CONFIG.registryDir)) {
    console.log(`创建服务注册目录: ${CONFIG.registryDir}`);
    fs.mkdirSync(CONFIG.registryDir, { recursive: true });
    return false;
  }
  return true;
}

/**
 * 从注册表文件发现服务
 */
async function discoverFromRegistry() {
  const registryPath = path.join(CONFIG.registryDir, CONFIG.registryFile);
  
  if (!fs.existsSync(registryPath)) {
    console.log(`注册表文件不存在: ${registryPath}`);
    return;
  }
  
  try {
    const registryData = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(registryData);
    
    if (Array.isArray(registry.services)) {
      discoveredServices.fromRegistry = registry.services;
      console.log(`从注册表发现了 ${registry.services.length} 个服务`);
    }
  } catch (error) {
    console.error(`读取注册表文件失败: ${error.message}`);
  }
}

/**
 * 从进程列表发现MCP服务
 */
async function discoverFromProcessList() {
  return new Promise((resolve) => {
    // 查找可能的MCP服务进程
    const cmd = process.platform === 'win32' 
      ? 'tasklist' 
      : 'ps aux | grep -i mcp';
    
    exec(cmd, (error, stdout) => {
      if (error) {
        console.error(`进程查询失败: ${error.message}`);
        return resolve();
      }
      
      // 简单的启发式匹配，实际实现可能需要更复杂的逻辑
      const mcpProcesses = stdout
        .split('\n')
        .filter(line => 
          line.includes('mcp') && 
          !line.includes('grep') &&
          !line.includes('test-discovery')
        );
      
      // 这里只是一个示例，真实环境下需要更精确地提取服务信息
      const services = mcpProcesses.map(process => {
        // 尝试提取服务名称和端口
        const match = process.match(/(\w+-mcp).*?(\d{4})/);
        if (match) {
          return {
            name: match[1],
            endpoint: `http://localhost:${match[2]}`,
            transport: 'http',
            description: `从进程发现的MCP服务 (PID: ${process.match(/\d+/)?.[0] || 'unknown'})`
          };
        }
        return null;
      }).filter(Boolean);
      
      discoveredServices.fromProcess = services;
      console.log(`从进程列表发现了 ${services.length} 个可能的MCP服务`);
      resolve();
    });
  });
}

/**
 * 从配置文件发现服务
 */
async function discoverFromConfigFile() {
  if (!fs.existsSync(CONFIG.configFile)) {
    console.log(`配置文件不存在: ${CONFIG.configFile}`);
    return;
  }
  
  try {
    const configData = fs.readFileSync(CONFIG.configFile, 'utf8');
    const config = JSON.parse(configData);
    
    if (Array.isArray(config.externalServices)) {
      discoveredServices.fromConfig = config.externalServices;
      console.log(`从配置文件发现了 ${config.externalServices.length} 个服务`);
    }
  } catch (error) {
    console.error(`读取配置文件失败: ${error.message}`);
  }
}

/**
 * 测试服务连接
 */
async function testServiceConnections() {
  // 合并所有发现的服务
  const allServices = [
    ...discoveredServices.fromRegistry,
    ...discoveredServices.fromProcess,
    ...discoveredServices.fromConfig
  ];
  
  // 去重
  const uniqueServices = [];
  const serviceMap = new Map();
  
  allServices.forEach(service => {
    if (!serviceMap.has(service.name)) {
      serviceMap.set(service.name, service);
      uniqueServices.push(service);
    }
  });
  
  console.log(`\n===== 测试服务连接 (${uniqueServices.length} 个服务) =====`);
  
  // 测试每个服务的连接
  for (const service of uniqueServices) {
    console.log(`\n测试服务: ${service.name}`);
    console.log(`  - 端点: ${service.endpoint}`);
    console.log(`  - 传输类型: ${service.transport}`);
    
    if (service.transport === 'http' || service.transport === 'https') {
      try {
        await testHTTPConnection(service.endpoint);
        console.log(`  - 状态: ✅ 可连接`);
      } catch (error) {
        console.log(`  - 状态: ❌ 无法连接 (${error.message})`);
      }
    } else {
      console.log(`  - 状态: ❓ 未知 (不支持测试 ${service.transport} 传输类型)`);
    }
  }
}

/**
 * 测试HTTP连接
 */
function testHTTPConnection(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 3000 }, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`HTTP状态码: ${res.statusCode}`));
      }
      res.resume(); // 消费响应数据以释放内存
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('连接超时'));
    });
  });
}

/**
 * 主函数
 */
async function main() {
  console.log('===== MCP服务发现测试 =====\n');
  
  // 确保注册目录存在
  const registryExists = ensureRegistryDir();
  if (!registryExists) {
    console.log('注册目录新创建，尚无服务注册');
  }
  
  // 从各种来源发现服务
  await discoverFromRegistry();
  await discoverFromProcessList();
  await discoverFromConfigFile();
  
  // 测试服务连接
  await testServiceConnections();
  
  console.log('\n===== 测试完成 =====');
}

// 运行主函数
main().catch(error => {
  console.error('测试过程中发生错误:', error);
}); 