declare module '@modelcontextprotocol/sdk' {
  export interface RequestMeta {
    _meta?: {
      [key: string]: unknown;
      progressToken?: string | number;
    };
  }

  export interface Request<P = unknown> {
    method: string;
    params?: P & RequestMeta;
    [key: string]: unknown;
  }

  export interface Response<R = unknown> {
    method: string;
    params?: R & RequestMeta;
    [key: string]: unknown;
  }

  export interface ServerInfo {
    name: string;
    version: string;
    [key: string]: unknown;
  }

  export interface ServerCapabilities {
    tools?: Record<string, {
      description: string;
      inputSchema?: Record<string, unknown>;
    }>;
    resources?: Record<string, unknown>;
    [key: string]: unknown;
  }

  export interface ServerConfig {
    name: string;
    version: string;
    [key: string]: unknown;
  }

  export class Server<
    TReq extends Request = Request,
    TRes extends Response = Response,
    TCap extends ServerCapabilities = ServerCapabilities
  > {
    constructor(config: ServerConfig, capabilities: TCap);
    
    setRequestHandler<P = unknown, R = unknown>(
      method: string | { method: string } | import('zod').ZodObject<any, any, any, any>,
      handler: (request: Request<P>) => Promise<R>
    ): void;

    callTool<P = unknown, R = unknown>(
      name: string,
      args: P
    ): Promise<R>;

    connect(transport: unknown): Promise<void>;
    close(): Promise<void>;

    onerror: (error: Error) => void;
  }

  export class StdioServerTransport {
    constructor();
    connect(): Promise<void>;
    close(): Promise<void>;
  }
}

declare module '@modelcontextprotocol/sdk/server/index.js' {
  export * from '@modelcontextprotocol/sdk';
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export { StdioServerTransport } from '@modelcontextprotocol/sdk';
}

declare module '@modelcontextprotocol/sdk/server/types.js' {
  export * from '@modelcontextprotocol/sdk';
}

// 保留以前的声明以兼容已编译的文件
declare module '@modelcontextprotocol/sdk/dist/esm/server/index.js' {
  export * from '@modelcontextprotocol/sdk';
}

declare module '@modelcontextprotocol/sdk/dist/esm/server/stdio.js' {
  export { StdioServerTransport } from '@modelcontextprotocol/sdk';
}

declare module '@modelcontextprotocol/sdk/dist/esm/server/types.js' {
  export * from '@modelcontextprotocol/sdk';
}