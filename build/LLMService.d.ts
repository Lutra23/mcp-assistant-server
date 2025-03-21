export declare class LLMService {
    private apiKey;
    private apiEndpoint;
    private modelName;
    private maxTokens;
    private temperature;
    constructor(config: {
        apiKey: string;
        apiEndpoint?: string;
        modelName?: string;
        maxTokens?: number;
        temperature?: number;
    });
    private testAPIConfig;
}
