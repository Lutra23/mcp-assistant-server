interface ServerOptions {
    useLLM?: boolean;
    llmConfig?: {
        apiKey: string;
        apiEndpoint: string;
        modelName: string;
        maxTokens: number;
        temperature: number;
    };
}
export declare class MCPAssistantServer {
    private server;
    private taskAnalyzer;
    private toolRecommender;
    private contextManager;
    private llmService;
    private discoveryService;
    private tasks;
    private useLLM;
    private transport;
    private httpServer;
    private port;
    private host;
    private serviceNameMap;
    constructor(options?: ServerOptions);
    initialize(): Promise<void>;
    private initializeLLMService;
    private initServiceNameMap;
    private startHttpServer;
    private handleListTools;
    private handleCallTool;
    private registerRequestHandlers;
    private handleAnalyzeTask;
    private handleRecommendTools;
    private handleUpdateContext;
    private handleGetCapabilities;
    private handleLLMAnalyze;
    private registerSelfAsService;
    private handleDiscoverMCPTools;
    private handleCallExternalTool;
    private loadLocalConfig;
    shutdown(): Promise<void>;
}
export {};
