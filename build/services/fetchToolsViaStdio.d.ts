/**
 * 通过Stdio方式获取MCP服务工具列表
 * @param command 要执行的命令
 * @param cwd 工作目录
 * @returns 工具列表
 */
export declare function fetchToolsViaStdio(command: string, cwd?: string): Promise<any[]>;
