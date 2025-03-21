// 预定义的MCP工具列表
const PREDEFINED_TOOLS = [
    {
        name: 'file_read',
        description: '读取文件内容',
        capabilities: ['文件读取', '文本处理']
    },
    {
        name: 'file_write',
        description: '写入或修改文件内容',
        capabilities: ['文件写入', '文本处理']
    },
    {
        name: 'code_analysis',
        description: '分析代码结构和质量',
        capabilities: ['代码分析', '静态检查']
    },
    {
        name: 'data_fetch',
        description: '从外部API获取数据',
        capabilities: ['数据获取', '网络请求']
    },
    {
        name: 'data_transform',
        description: '转换和处理数据格式',
        capabilities: ['数据处理', '格式转换']
    },
    {
        name: 'search',
        description: '搜索文件或内容',
        capabilities: ['内容搜索', '信息检索']
    },
    {
        name: 'terminal',
        description: '执行终端命令',
        capabilities: ['命令执行', '系统操作']
    },
    // 新增工具
    {
        name: 'web_search',
        description: '执行网络搜索查询',
        capabilities: ['网络搜索', '信息检索', '外部数据']
    },
    {
        name: 'database_query',
        description: '执行数据库查询',
        capabilities: ['数据库操作', 'SQL', '数据检索']
    },
    {
        name: 'image_process',
        description: '处理和分析图像',
        capabilities: ['图像处理', '视觉分析', '多媒体']
    },
    {
        name: 'document_analysis',
        description: '分析文档内容和结构',
        capabilities: ['文档处理', '内容提取', '文本分析']
    },
    {
        name: 'api_call',
        description: '调用外部API服务',
        capabilities: ['API交互', '服务集成', '数据获取']
    }
];
export class DefaultToolRecommender {
    llmService = null;
    useLLM = false;
    constructor(config) {
        // 判断是否使用大模型进行推荐
        this.useLLM = config?.useLLM || false;
        // 如果提供了LLM服务实例，直接使用
        if (this.useLLM && config?.llmService) {
            this.llmService = config.llmService;
        }
    }
    async recommendTools(task, context) {
        // 获取可用工具列表
        const availableTools = context.environment.availableTools.length > 0
            ? context.environment.availableTools
            : PREDEFINED_TOOLS;
        // 使用大模型进行推荐
        if (this.useLLM && this.llmService) {
            try {
                console.log('使用大模型推荐工具...');
                const llmRecommendation = await this.llmService.recommendTools(task, availableTools);
                // 映射工具名称到工具对象
                const recommendedTools = llmRecommendation.recommendedTools
                    .map(name => availableTools.find(t => t.name === name))
                    .filter((tool) => tool !== undefined);
                return {
                    tools: recommendedTools,
                    sequence: llmRecommendation.sequence,
                    reasoning: llmRecommendation.reasoning
                };
            }
            catch (error) {
                console.error('大模型推荐失败，回退到规则推荐:', error);
                // 如果大模型推荐失败，回退到规则推荐
            }
        }
        // 规则推荐（作为备选或当不使用大模型时）
        // 匹配工具能力
        const tools = await this.matchToolCapabilities(task);
        // 优化工具序列
        const sequence = await this.optimizeSequence(task, tools, context);
        // 生成推荐理由
        const reasoning = await this.generateReasoning(task, tools, sequence, context);
        return {
            tools,
            sequence,
            reasoning
        };
    }
    async matchToolCapabilities(task) {
        // 本地基于关键词和任务类型匹配工具
        const keywordMatches = new Set();
        // 根据关键词匹配
        for (const keyword of task.keywords) {
            for (const tool of PREDEFINED_TOOLS) {
                if (tool.name.includes(keyword) ||
                    tool.description.includes(keyword) ||
                    tool.capabilities.some(cap => cap.includes(keyword))) {
                    keywordMatches.add(tool);
                }
            }
        }
        // 根据实体匹配
        if (task.entities) {
            for (const entity of task.entities) {
                for (const tool of PREDEFINED_TOOLS) {
                    if (tool.description.includes(entity) ||
                        tool.capabilities.some(cap => cap.includes(entity))) {
                        keywordMatches.add(tool);
                    }
                }
            }
        }
        // 根据任务类型匹配
        const typeMatches = new Set();
        switch (task.type) {
            case 'FileOperation':
                PREDEFINED_TOOLS.filter(t => t.name.includes('file') ||
                    t.capabilities.some(c => c.includes('文件'))).forEach(t => typeMatches.add(t));
                break;
            case 'CodeAnalysis':
                PREDEFINED_TOOLS.filter(t => t.name.includes('code') ||
                    t.capabilities.some(c => c.includes('代码'))).forEach(t => typeMatches.add(t));
                break;
            case 'SystemOperation':
                PREDEFINED_TOOLS.filter(t => t.name.includes('terminal') ||
                    t.capabilities.some(c => c.includes('系统') || c.includes('命令'))).forEach(t => typeMatches.add(t));
                break;
            case 'DataProcessing':
                PREDEFINED_TOOLS.filter(t => t.name.includes('data') ||
                    t.capabilities.some(c => c.includes('数据'))).forEach(t => typeMatches.add(t));
                break;
            case 'WebSearch':
                PREDEFINED_TOOLS.filter(t => t.name.includes('web') || t.name.includes('search') ||
                    t.capabilities.some(c => c.includes('搜索') || c.includes('网络'))).forEach(t => typeMatches.add(t));
                break;
            case 'DatabaseOperation':
                PREDEFINED_TOOLS.filter(t => t.name.includes('database') ||
                    t.capabilities.some(c => c.includes('数据库') || c.includes('SQL'))).forEach(t => typeMatches.add(t));
                break;
            case 'APIInteraction':
                PREDEFINED_TOOLS.filter(t => t.name.includes('api') ||
                    t.capabilities.some(c => c.includes('API') || c.includes('服务'))).forEach(t => typeMatches.add(t));
                break;
            case 'DocumentProcess':
                PREDEFINED_TOOLS.filter(t => t.name.includes('document') ||
                    t.capabilities.some(c => c.includes('文档') || c.includes('文本'))).forEach(t => typeMatches.add(t));
                break;
            case 'ImageProcess':
                PREDEFINED_TOOLS.filter(t => t.name.includes('image') ||
                    t.capabilities.some(c => c.includes('图像') || c.includes('视觉'))).forEach(t => typeMatches.add(t));
                break;
        }
        // 合并两种匹配结果
        const allMatches = [...keywordMatches, ...typeMatches];
        return Array.from(new Set(allMatches));
    }
    async optimizeSequence(task, tools, context) {
        // 获取工具名称
        const toolNames = tools.map(t => t.name);
        // 如果没有工具匹配，返回空序列
        if (toolNames.length === 0) {
            return [];
        }
        // 如果任务有子任务，可以基于子任务优化顺序
        if (task.subTasks && task.subTasks.length > 0) {
            // 此处可以实现基于子任务的复杂排序逻辑
            // 简单示例：保持原顺序
            return toolNames;
        }
        // 按任务类型优化序列
        switch (task.type) {
            case 'FileOperation':
                // 对于文件操作，通常先读取再写入
                const readTools = toolNames.filter(t => t.includes('read') || t.includes('search') || t.includes('analysis'));
                const writeTools = toolNames.filter(t => t.includes('write') || t.includes('create') || t.includes('edit'));
                const otherFileTools = toolNames.filter(t => !readTools.includes(t) && !writeTools.includes(t));
                return [...readTools, ...otherFileTools, ...writeTools];
            case 'DataProcessing':
                // 对于数据处理，通常先获取数据再转换
                const fetchTools = toolNames.filter(t => t.includes('fetch') || t.includes('get') || t.includes('read'));
                const transformTools = toolNames.filter(t => t.includes('transform') || t.includes('process') || t.includes('convert'));
                const otherDataTools = toolNames.filter(t => !fetchTools.includes(t) && !transformTools.includes(t));
                return [...fetchTools, ...transformTools, ...otherDataTools];
            case 'WebSearch':
                // 对于网络搜索，先搜索再处理
                const searchTools = toolNames.filter(t => t.includes('search') || t.includes('fetch'));
                const processTools = toolNames.filter(t => t.includes('process') || t.includes('analyze'));
                const otherWebTools = toolNames.filter(t => !searchTools.includes(t) && !processTools.includes(t));
                return [...searchTools, ...processTools, ...otherWebTools];
            default:
                // 对于其他类型，使用启发式规则进行排序
                // 例如：分析工具 -> 获取工具 -> 处理工具 -> 执行工具
                const analyzeTools = toolNames.filter(t => t.includes('analysis') || t.includes('check'));
                const acquireTools = toolNames.filter(t => (t.includes('get') || t.includes('fetch') || t.includes('read')) &&
                    !analyzeTools.includes(t));
                const processTools2 = toolNames.filter(t => (t.includes('process') || t.includes('transform')) &&
                    !analyzeTools.includes(t) && !acquireTools.includes(t));
                const executeTools = toolNames.filter(t => !analyzeTools.includes(t) && !acquireTools.includes(t) && !processTools2.includes(t));
                return [...analyzeTools, ...acquireTools, ...processTools2, ...executeTools];
        }
    }
    async generateReasoning(task, tools, sequence, context) {
        // 如果没有推荐工具，返回简短说明
        if (tools.length === 0) {
            return `未找到适合任务"${task.description}"的工具。`;
        }
        // 基于子任务生成更详细的推荐理由
        if (task.subTasks && task.subTasks.length > 0) {
            let reasoning = `基于任务"${task.description}"的分析，推荐使用以下工具序列：\n\n`;
            // 添加工具序列
            reasoning += `工具序列: ${sequence.join(' -> ')}\n\n`;
            // 添加子任务对应的工具
            reasoning += `子任务分解与工具映射：\n`;
            for (let i = 0; i < task.subTasks.length; i++) {
                const subTask = task.subTasks[i];
                // 简单映射：取序列中的第i个工具（如果存在）
                const tool = i < sequence.length ?
                    tools.find(t => t.name === sequence[i]) :
                    undefined;
                if (tool) {
                    reasoning += `- 子任务: "${subTask}"\n  推荐工具: ${tool.name} (${tool.description})\n  理由: 此工具适合处理${tool.capabilities.join('和')}相关的操作。\n\n`;
                }
                else {
                    reasoning += `- 子任务: "${subTask}"\n  无匹配工具\n\n`;
                }
            }
            // 添加整体评估
            reasoning += `综合评估：该任务的复杂度为${task.complexity}/5，优先级为${task.priority || 3}/5，预计需要${Math.round((task.estimatedDuration || 300) / 60)}分钟完成。任务所属领域: ${task.domain || '通用'}。`;
            return reasoning;
        }
        // 标准推荐理由
        let reasoning = `基于任务"${task.description}"的分析，推荐使用以下工具序列：${sequence.join(' -> ')}\n\n`;
        reasoning += `理由：\n`;
        for (const toolName of sequence) {
            const tool = tools.find(t => t.name === toolName);
            if (tool) {
                reasoning += `- ${tool.name}: ${tool.description}。此工具适合处理${tool.capabilities.join('和')}相关的操作。\n`;
            }
        }
        // 添加任务元数据
        reasoning += `\n任务元数据：\n`;
        reasoning += `- 类型: ${task.type}\n`;
        reasoning += `- 复杂度: ${task.complexity}/5\n`;
        reasoning += `- 优先级: ${task.priority || 3}/5\n`;
        reasoning += `- 预计时间: ${Math.round((task.estimatedDuration || 300) / 60)}分钟\n`;
        reasoning += `- 领域: ${task.domain || '通用'}\n`;
        // 添加整体协作说明
        reasoning += `\n这些工具的组合可以有效地完成${task.type}类型的任务。`;
        return reasoning;
    }
}
//# sourceMappingURL=ToolRecommender.js.map