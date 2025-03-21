export class LLMService {
    apiKey;
    apiEndpoint;
    modelName;
    maxTokens;
    temperature;
    constructor(config) {
        this.apiKey = config.apiKey;
        this.apiEndpoint = config.apiEndpoint || 'https://api.ppinfra.com/v3';
        this.modelName = config.modelName || 'DeepSeek: DeepSeek R1 (Community)';
        this.maxTokens = config.maxTokens || 1024;
        this.temperature = config.temperature || 0.6;
        // 记录当前配置（但不显示API密钥）
        console.log('LLM服务配置:', {
            apiEndpoint: this.apiEndpoint,
            modelName: this.modelName,
            maxTokens: this.maxTokens,
            temperature: this.temperature,
            apiKeyAvailable: !!this.apiKey
        });
        // 在初始化时进行一次基本测试
        this.testAPIConfig();
    }
    // 测试API配置是否有效
    async testAPIConfig() {
        try {
            console.log('正在测试LLM API配置...');
            const apiUrl = this.apiEndpoint;
            console.log('测试API URL:', apiUrl);
            // 发送一个简单的请求来测试连接
            const response = await fetch(`${apiUrl}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            console.log('API测试响应状态:', response.status);
            if (response.ok) {
                const data = await response.json();
                console.log('API测试成功，可用模型:', JSON.stringify(data).substring(0, 200) + '...');
            }
            else {
                console.error('API测试失败，状态码:', response.status);
                console.error('错误信息:', await response.text());
            }
        }
        catch (error) {
            console.error('API测试出错:', error);
        }
    }
}
//# sourceMappingURL=LLMService.js.map