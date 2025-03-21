import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
const execAsync = promisify(exec);
/**
 * 通过Stdio方式获取MCP服务工具列表
 * @param command 要执行的命令
 * @param cwd 工作目录
 * @returns 工具列表
 */
export async function fetchToolsViaStdio(command, cwd = process.cwd()) {
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
        }
        catch (e) {
            // 忽略清理错误
        }
        // 解析结果
        if (stdout.trim()) {
            try {
                const toolsData = JSON.parse(stdout.trim());
                if (toolsData.tools && Array.isArray(toolsData.tools)) {
                    return toolsData.tools;
                }
            }
            catch (e) {
                const errorMessage = e instanceof Error ? e.message : String(e);
                console.error(`[MCP服务发现] 解析工具列表JSON失败: ${errorMessage}`);
            }
        }
        return []; // 返回空列表
    }
    catch (error) {
        // 清理临时文件
        try {
            fs.unlinkSync(callerPath);
            fs.rmdirSync(tempDir);
        }
        catch (e) {
            // 忽略清理错误
        }
        console.error(`[MCP服务发现] 通过Stdio获取工具列表失败: ${error instanceof Error ? error.message : String(error)}`);
        return []; // 错误时返回空列表
    }
}
//# sourceMappingURL=fetchToolsViaStdio.js.map