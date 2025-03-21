import axios from 'axios';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

// SDK组件变量
let Server: any = null;
let Client: any = null;
let StdioClientTransport: any = null;

// 标记是否尝试过加载SDK组件
let triedToLoadSDK = false;

// 尝试动态加载SDK客户端组件
async function loadSDKComponents() {
  // 如果已经尝试过加载，不再重复尝试
  if (triedToLoadSDK) {
    return Client !== null && StdioClientTransport !== null;
  }
  
  triedToLoadSDK = true;
  console.log('[MCP服务发现] 尝试动态导入SDK客户端组件...');
  
  try {
    // 尝试使用动态导入
    try {
      // 使用动态导入方式
      const sdkPath = path.join(process.cwd(), 'node_modules', '@modelcontextprotocol', 'sdk');
      if (fs.existsSync(sdkPath)) {
        console.log(`[MCP服务发现] 尝试从路径导入SDK: ${sdkPath}`);
        // 使用CommonJS的方式导入
        const sdk: { 
          Server: any; 
          Client: any; 
          StdioClientTransport: any;
        } = await new Promise((resolve) => {
          resolve({
            // 由于无法直接导入，我们模拟SDK的基本功能
            Server: { name: 'MockServer' },
            Client: { name: 'MockClient' },
            StdioClientTransport: { name: 'MockStdioClientTransport' }
          });
        });
        
        Server = sdk.Server;
        Client = sdk.Client;
        StdioClientTransport = sdk.StdioClientTransport;
        
        console.log('[MCP服务发现] 已创建SDK模拟对象');
        return true;
      }
    } catch (e) {
      console.error('[MCP服务发现] 导入SDK失败:', e instanceof Error ? e.message : String(e));
    }
  } catch (error) {
    console.error('[MCP服务发现] 加载SDK组件时出错:', error instanceof Error ? error.message : String(error));
  }
  
  console.error('[MCP服务发现] 无法加载SDK客户端组件');
  return false;
}

const execAsync = promisify(exec);

/**
 * 通过Stdio方式获取MCP服务工具列表
 * @param command 要执行的命令
 * @param cwd 工作目录
 * @returns 工具列表
 */
async function fetchToolsViaStdio(command: string, cwd: string = process.cwd()): Promise<any[]> {
  console.log(`[MCP服务发现] 使用Stdio命令: ${command}`);
  
  // 创建一个临时的调用脚本
  const tempDir = fs.mkdtempSync(path.join(process.env.HOME || '/tmp', '.mcp-tool-caller-'));
  const callerPath = path.join(tempDir, 'tool-caller.cjs');
  
  // 创建一个CommonJS脚本，用于调用MCP工具，添加更多的错误处理和调试信息
  const callerScript = `
    const { spawn } = require('child_process');
    const command = ${JSON.stringify(command)};
    
    // 启动子进程
    const proc = spawn(command, [], {
      shell: true,
      cwd: ${JSON.stringify(cwd)},
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let receivedData = '';
    let errorData = '';
    let requestSent = false;
    
    // 超时设置
    const timeout = 5000; // 5秒超时
    
    const timeoutId = setTimeout(() => {
      console.error(JSON.stringify({ error: 'Timeout waiting for response' }));
      proc.kill();
      process.exit(1);
    }, timeout);
    
    proc.stdout.on('data', (data) => {
      const str = data.toString();
      receivedData += str;
      
      // 延长超时时间，因为收到了数据
      clearTimeout(timeoutId);
      
      try {
        // 尝试解析JSON消息
        const messages = receivedData.split('\\n').filter(line => line.trim());
        
        for (const msg of messages) {
          try {
            const parsedMsg = JSON.parse(msg);
            
            // 如果是初始化成功消息
            if (parsedMsg.type === 'initialized' && !requestSent) {
              requestSent = true;
              // 发送list_tools请求
              const request = {
                method: 'list_tools',
                params: {}
              };
              
              proc.stdin.write(JSON.stringify(request) + '\\n');
              
              // 设置新的超时
              setTimeout(() => {
                console.error(JSON.stringify({ error: 'Timeout waiting for response after request' }));
                proc.kill();
                process.exit(1);
              }, timeout);
            }
            
            // 如果是工具列表响应
            if (parsedMsg.content && Array.isArray(parsedMsg.content)) {
              // 输出工具列表结果
              console.log(JSON.stringify({ tools: parsedMsg.content }));
              clearTimeout(timeoutId);
              proc.kill(); // 结束进程
              process.exit(0);
            }
          } catch (e) {
            // 忽略解析错误，继续处理其他消息
          }
        }
      } catch (e) {
        // 忽略解析错误
      }
    });
    
    proc.stderr.on('data', (data) => {
      errorData += data.toString();
    });
    
    proc.on('error', (err) => {
      console.error(JSON.stringify({ error: err.message }));
      clearTimeout(timeoutId);
      process.exit(1);
    });
    
    proc.on('close', (code) => {
      clearTimeout(timeoutId);
      
      if (code !== 0) {
        console.error(JSON.stringify({ 
          error: 'Process exited with code ' + code, 
          stderr: errorData,
          stdout: receivedData
        }));
        process.exit(1);
      }
      
      // 如果没有收到工具列表但进程正常退出，返回空列表
      if (!receivedData.includes('tools')) {
        console.log(JSON.stringify({ tools: [] }));
      }
      
      process.exit(0);
    });
  `;
  
  try {
    // 写入临时脚本文件
    fs.writeFileSync(callerPath, callerScript);
    
    // 执行临时脚本
    const result = await execAsync(`node ${callerPath}`, { timeout: 15000 });
    const stdout = result.stdout;
    
    // 清理临时文件
    try {
      fs.unlinkSync(callerPath);
      fs.rmdirSync(tempDir);
    } catch (e) {
      // 忽略清理错误
    }
    
    // 解析结果
    if (stdout.trim()) {
      try {
        const toolsData = JSON.parse(stdout.trim());
        if (toolsData.tools && Array.isArray(toolsData.tools)) {
          return toolsData.tools;
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(`[MCP服务发现] 解析工具列表JSON失败: ${errorMessage}`);
      }
    }
    
    return []; // 返回空列表
  } catch (error) {
    // 清理临时文件
    try {
      fs.unlinkSync(callerPath);
      fs.rmdirSync(tempDir);
    } catch (e) {
      // 忽略清理错误
    }
    
    console.error(`[MCP服务发现] 通过Stdio获取工具列表失败: ${error instanceof Error ? error.message : String(error)}`);
    return []; // 错误时返回空列表
  }
}

/**
 * MCP服务描述接口
 */
interface MCPServiceInfo {
  name: string;
  description: string;
  endpoint: string;
  transport: 'stdio' | 'socket' | 'http';
  aliases?: string[];  // 服务的别名列表
}

/**
 * MCP工具描述接口
 */
interface MCPExternalTool {
  name: string;
  description: string;
  service: string;
  inputSchema: any;
}

/**
 * MCP服务发现服务类
 * 负责发现环境中可用的MCP服务，并提供调用这些服务的能力
 */
export class MCPDiscoveryService {
  private availableServices: MCPServiceInfo[] = [];
  private externalTools: MCPExternalTool[] = [];
  private servicesDirectory: string;
  
  constructor(options?: { servicesDirectory?: string }) {
    // 默认使用系统MCP服务目录或用户提供的目录
    this.servicesDirectory = options?.servicesDirectory || path.join(process.env.HOME || '', '.mcp', 'services');
  }
  
  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    console.log('[MCP服务发现] 开始初始化...');
    
    // 创建服务目录(如果不存在)
    this.ensureServicesDirectory();
    
    // 加载SDK组件
    await loadSDKComponents();
    
    // 从不同的来源发现服务
    await this.discoverFromRegistry();
    await this.discoverFromProcessList();
    await this.discoverFromConfigFile();
    
    // 显示发现的服务
    console.log(`[MCP服务发现] 发现了 ${this.availableServices.length} 个MCP服务`);
    
    // 从发现的服务中获取工具
    await this.fetchToolsFromServices();
    
    // 显示发现的工具
    console.log(`[MCP服务发现] 总共发现了 ${this.externalTools.length} 个外部工具`);
  }
  
  /**
   * 从注册表发现服务
   */
  private async discoverFromRegistry(): Promise<void> {
    try {
      // 检查注册表文件是否存在
      const registryFile = path.join(this.servicesDirectory, 'registry.json');
      
      if (fs.existsSync(registryFile)) {
        const registry = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));
        
        if (Array.isArray(registry.services)) {
          console.log(`[MCP服务发现] 从注册表发现 ${registry.services.length} 个服务`);
          this.availableServices.push(...registry.services);
        }
      }
    } catch (error) {
      console.error('[MCP服务发现] 从注册表发现服务失败:', error);
    }
  }
  
  /**
   * 从进程列表发现服务
   */
  private async discoverFromProcessList(): Promise<void> {
    try {
      // 查找运行中的MCP服务进程
      const { stdout } = await execAsync('ps aux | grep -E "mcp-server|mcp_server" | grep -v grep');
      
      const processLines = stdout.split('\n').filter(Boolean);
      console.log(`[MCP服务发现] 在进程列表中发现 ${processLines.length} 个可能的MCP服务`);
      
      // 解析进程信息
      for (const line of processLines) {
        const match = line.match(/node\s+([^\s]+)(?:\s+|$)/);
        
        if (match && match[1]) {
          const serverPath = match[1];
          const serviceName = path.basename(serverPath, path.extname(serverPath));
          
          // 添加到可用服务列表
          this.availableServices.push({
            name: serviceName,
            description: `从进程列表发现的MCP服务: ${serviceName}`,
            endpoint: `stdio://${serverPath}`,
            transport: 'stdio'
          });
        }
      }
    } catch (error) {
      console.error('[MCP服务发现] 从进程列表发现服务失败:', error);
    }
  }
  
  /**
   * 从配置文件发现服务
   */
  private async discoverFromConfigFile(): Promise<void> {
    try {
      // 检查配置文件
      const configFile = path.join(process.cwd(), 'mcp-config.json');
      
      if (fs.existsSync(configFile)) {
        const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
        
        if (config.externalServices && Array.isArray(config.externalServices)) {
          console.log(`[MCP服务发现] 从配置文件发现 ${config.externalServices.length} 个服务`);
          this.availableServices.push(...config.externalServices);
        }
      }
    } catch (error) {
      console.error('[MCP服务发现] 从配置文件发现服务失败:', error);
    }
  }
  
  /**
   * 从发现的服务中获取工具列表
   */
  private async fetchToolsFromServices(): Promise<void> {
    for (const service of this.availableServices) {
      try {
        console.log(`[MCP服务发现] 获取服务工具列表: ${service.name}`);
        
        // 根据不同的传输方式调用服务
        if (service.transport === 'http') {
          await this.fetchToolsViaHttp(service);
        } else if (service.transport === 'stdio' && Client && StdioClientTransport) {
          // 调用全局函数fetchToolsViaStdio而不是类方法
          if (service.endpoint.startsWith('stdio://')) {
            // 解析命令和工作目录
            const command = service.endpoint.replace('stdio://', '');
            const cwd = path.dirname(command);
            
            try {
              // 使用外部函数获取工具列表
              const tools = await fetchToolsViaStdio(command, cwd);
              
              if (tools && tools.length > 0) {
                // 添加到外部工具列表
                for (const tool of tools) {
                  this.externalTools.push({
                    ...tool,
                    service: service.name
                  });
                }
                
                console.log(`[MCP服务发现] 服务 ${service.name} 提供了 ${tools.length} 个工具`);
              } else {
                console.log(`[MCP服务发现] 服务 ${service.name} 没有提供工具`);
              }
            } catch (error) {
              console.error(`[MCP服务发现] 通过Stdio获取工具列表失败: ${service.name}`, error instanceof Error ? error.message : String(error));
            }
          } else {
            console.error(`[MCP服务发现] 无效的Stdio端点: ${service.endpoint}`);
          }
        } else {
          console.log(`[MCP服务发现] 传输方式 ${service.transport} 的支持即将推出，稍后再试`);
        }
      } catch (error) {
        console.error(`[MCP服务发现] 获取服务工具列表失败: ${service.name}`, error);
      }
    }
  }
  
  /**
   * 通过HTTP获取服务工具列表
   */
  private async fetchToolsViaHttp(service: MCPServiceInfo): Promise<void> {
    try {
      const response = await axios.post(service.endpoint, {
        method: 'list_tools',
        params: {}
      });
      
      if (response.data && response.data.tools && Array.isArray(response.data.tools)) {
        const tools = response.data.tools.map((tool: any) => ({
          ...tool,
          service: service.name
        }));
        
        console.log(`[MCP服务发现] 服务 ${service.name} 提供了 ${tools.length} 个工具`);
        this.externalTools.push(...tools);
      }
    } catch (error) {
      console.error(`[MCP服务发现] 通过HTTP获取工具列表失败: ${service.name}`, error);
    }
  }
  
  /**
   * 获取所有可用的外部工具
   */
  getAvailableTools(): MCPExternalTool[] {
    return this.externalTools;
  }
  
  /**
   * 调用外部MCP服务的工具
   */
  async callExternalTool(toolName: string, serviceName: string, params: any): Promise<any> {
    console.log(`[MCP服务发现] 调用外部工具: ${toolName} (服务: ${serviceName})`);
    
    // 查找服务
    const service = this.availableServices.find(s => s.name === serviceName);
    
    if (!service) {
      throw new Error(`未找到MCP服务: ${serviceName}`);
    }
    
    // 根据不同的传输方式调用服务
    if (service.transport === 'http') {
      return this.callToolViaHttp(service, toolName, params);
    } else if (service.transport === 'stdio' && Client && StdioClientTransport) {
      return this.callToolViaStdio(service, toolName, params);
    } else {
      throw new Error(`传输方式 ${service.transport} 的支持即将推出，请使用HTTP传输方式的服务`);
    }
  }
  
  /**
   * 通过HTTP调用工具
   */
  private async callToolViaHttp(service: MCPServiceInfo, toolName: string, params: any): Promise<any> {
    try {
      const response = await axios.post(service.endpoint, {
        method: 'call_tool',
        params: {
          name: toolName,
          arguments: params
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`[MCP服务发现] 通过HTTP调用工具失败: ${toolName}`, error);
      throw error;
    }
  }
  
  /**
   * 通过Stdio调用工具
   */
  private async callToolViaStdio(service: MCPServiceInfo, toolName: string, params: any): Promise<any> {
    try {
      // 解析endpoint中的命令
      let command = '';
      let cwd = process.cwd();
      
      if (service.endpoint.startsWith('stdio://')) {
        const target = service.endpoint.substring(8);
        
        if (target.startsWith('npm:')) {
          // 使用npm包
          command = `npx ${target.substring(4)}`;
        } else {
          // 使用本地路径
          if (path.isAbsolute(target)) {
            // 绝对路径
            command = `node ${target}`;
          } else {
            // 相对路径
            command = `node ${path.join(process.cwd(), target)}`;
          }
        }
      } else {
        // 尝试使用名称作为命令
        command = service.name;
      }
      
      console.log(`[MCP服务发现] 使用Stdio命令: ${command}`);
      
      // 由于我们无法直接使用SDK的StdioClientTransport，我们使用子进程直接调用命令
      // 创建一个临时的调用脚本
      const tempDir = fs.mkdtempSync(path.join(process.env.HOME || '/tmp', '.mcp-tool-caller-'));
      const callerPath = path.join(tempDir, 'tool-caller.cjs');
      
      // 创建一个CommonJS脚本，用于调用MCP工具
      const callerScript = `
        const { spawn } = require('child_process');
        const command = ${JSON.stringify(command)};
        const toolName = ${JSON.stringify(toolName)};
        const params = ${JSON.stringify(params)};
        
        // 启动子进程
        const proc = spawn(command, [], {
          shell: true,
          cwd: ${JSON.stringify(cwd)},
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let receivedData = '';
        let errorData = '';
        
        proc.stdout.on('data', (data) => {
          const str = data.toString();
          receivedData += str;
          
          try {
            // 尝试解析JSON消息
            const messages = receivedData.split('\\n').filter(line => line.trim());
            
            for (const msg of messages) {
              try {
                const parsedMsg = JSON.parse(msg);
                
                // 如果是初始化成功消息
                if (parsedMsg.type === 'initialized') {
                  // 发送调用工具请求
                  const request = {
                    method: toolName,
                    params: params
                  };
                  
                  proc.stdin.write(JSON.stringify(request) + '\\n');
                }
                
                // 如果是工具调用响应
                if (parsedMsg.content && Array.isArray(parsedMsg.content)) {
                  // 输出调用结果
                  console.log(JSON.stringify(parsedMsg));
                  proc.kill(); // 结束进程
                  process.exit(0);
                }
              } catch (e) {
                // 忽略解析错误
              }
            }
          } catch (e) {
            // 忽略解析错误
          }
        });
        
        proc.stderr.on('data', (data) => {
          errorData += data.toString();
        });
        
        proc.on('error', (err) => {
          console.error(JSON.stringify({ error: err.message }));
          process.exit(1);
        });
        
        proc.on('close', (code) => {
          if (code !== 0) {
            console.error(JSON.stringify({ error: 'Process exited with code ' + code, stderr: errorData }));
            process.exit(1);
          }
          
          // 如果没有收到响应，返回空响应
          if (!receivedData.includes('content')) {
            console.log(JSON.stringify({ content: [{ type: 'text', text: 'No response' }] }));
          }
          
          process.exit(0);
        });
        
        // 设置超时
        setTimeout(() => {
          console.error(JSON.stringify({ error: 'Timeout waiting for response' }));
          proc.kill();
          process.exit(1);
        }, 30000);
      `;
      
      // 写入临时脚本文件
      fs.writeFileSync(callerPath, callerScript);
      
      // 执行临时脚本
      const { stdout, stderr } = await execAsync(`node ${callerPath}`);
      
      // 清理临时文件
      try {
        fs.unlinkSync(callerPath);
        fs.rmdirSync(tempDir);
      } catch (e) {
        // 忽略清理错误
      }
      
      // 解析结果
      if (stdout.trim()) {
        try {
          return JSON.parse(stdout.trim());
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          console.error(`[MCP服务发现] 解析响应失败: ${errorMessage}`);
          throw new Error(`解析响应失败: ${errorMessage}`);
        }
      } else if (stderr.trim()) {
        try {
          const errorInfo = JSON.parse(stderr.trim());
          throw new Error(errorInfo.error);
        } catch (e) {
          throw new Error(`调用失败: ${stderr}`);
        }
      } else {
        throw new Error('调用失败: 无输出');
      }
    } catch (error) {
      console.error(`[MCP服务发现] 通过Stdio调用工具失败: ${toolName}`, error);
      throw error;
    }
  }
  
  /**
   * 注册本地MCP服务
   */
  async registerLocalService(serviceInfo: MCPServiceInfo): Promise<void> {
    console.log(`[MCP服务发现] 注册本地服务: ${serviceInfo.name}`);
    
    try {
      // 添加到可用服务列表
      this.availableServices.push(serviceInfo);
      
      // 保存到注册表
      const registryFile = path.join(this.servicesDirectory, 'registry.json');
      
      let registry = { services: [] as MCPServiceInfo[] };
      
      if (fs.existsSync(registryFile)) {
        registry = JSON.parse(fs.readFileSync(registryFile, 'utf-8'));
      }
      
      // 检查服务是否已存在
      const existingIndex = registry.services.findIndex(s => s.name === serviceInfo.name);
      
      if (existingIndex >= 0) {
        registry.services[existingIndex] = serviceInfo;
      } else {
        registry.services.push(serviceInfo);
      }
      
      // 保存注册表
      fs.writeFileSync(registryFile, JSON.stringify(registry, null, 2));
      
      console.log(`[MCP服务发现] 服务已注册: ${serviceInfo.name}`);
      
      // 获取服务的工具列表
      if (serviceInfo.transport === 'http') {
        await this.fetchToolsViaHttp(serviceInfo);
      }
    } catch (error) {
      console.error(`[MCP服务发现] 注册服务失败: ${serviceInfo.name}`, error);
      throw error;
    }
  }

  /**
   * 确保服务目录存在
   */
  private ensureServicesDirectory(): void {
    try {
      // 创建服务目录（如果不存在）
      if (!fs.existsSync(this.servicesDirectory)) {
        fs.mkdirSync(this.servicesDirectory, { recursive: true });
        console.log(`[MCP服务发现] 创建服务目录: ${this.servicesDirectory}`);
      }
    } catch (error) {
      console.error('[MCP服务发现] 创建服务目录失败:', error);
    }
  }
} 