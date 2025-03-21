/**
 * MCP服务描述接口
 */
interface MCPServiceInfo {
    name: string;
    description: string;
    endpoint: string;
    transport: 'stdio' | 'socket' | 'http';
    aliases?: string[];
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
export declare class MCPDiscoveryService {
    private availableServices;
    private externalTools;
    private servicesDirectory;
    constructor(options?: {
        servicesDirectory?: string;
    });
    /**
     * 初始化
     */
    initialize(): Promise<void>;
    /**
     * 从注册表发现服务
     */
    private discoverFromRegistry;
    /**
     * 从进程列表发现服务
     */
    private discoverFromProcessList;
    /**
     * 从配置文件发现服务
     */
    private discoverFromConfigFile;
    /**
     * 从发现的服务中获取工具列表
     */
    private fetchToolsFromServices;
    /**
     * 通过HTTP获取服务工具列表
     */
    private fetchToolsViaHttp;
    /**
     * 获取所有可用的外部工具
     */
    getAvailableTools(): MCPExternalTool[];
    /**
     * 调用外部MCP服务的工具
     */
    callExternalTool(toolName: string, serviceName: string, params: any): Promise<any>;
    /**
     * 通过HTTP调用工具
     */
    private callToolViaHttp;
    /**
     * 通过Stdio调用工具
     */
    private callToolViaStdio;
    /**
     * 注册本地MCP服务
     */
    registerLocalService(serviceInfo: MCPServiceInfo): Promise<void>;
    /**
     * 确保服务目录存在
     */
    private ensureServicesDirectory;
}
export {};
