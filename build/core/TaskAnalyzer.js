import { TaskType } from '../types/interfaces.js';
export class DefaultTaskAnalyzer {
    llmService = null;
    useLLM = false;
    constructor(config) {
        // 判断是否使用大模型进行分析
        this.useLLM = config?.useLLM || false;
        // 如果提供了LLM服务实例，直接使用
        if (this.useLLM && config?.llmService) {
            this.llmService = config.llmService;
        }
    }
    // 分析任务，返回结构化数据
    async analyzeTask(description, context) {
        // 尝试使用大模型分析
        if (this.useLLM && this.llmService) {
            try {
                console.log('使用大模型分析任务...');
                const llmResult = await this.llmService.analyzeTask(description, context);
                // 将LLM返回的任务类型映射到TaskType枚举
                const taskType = this.mapLLMTaskType(llmResult.taskType);
                return {
                    description,
                    type: taskType,
                    keywords: llmResult.keywords || [],
                    complexity: llmResult.complexity || 3,
                    entities: llmResult.entities || [],
                    subTasks: llmResult.subTasks || [],
                    priority: llmResult.priority || 3,
                    estimatedDuration: llmResult.estimatedDuration || 300,
                    domain: llmResult.domain || '通用'
                };
            }
            catch (error) {
                console.error('大模型分析失败，回退到本地分析:', error);
                // 如果大模型分析失败，回退到本地分析
            }
        }
        // 本地分析
        // 提取关键词
        const keywords = await this.extractKeywords(description);
        // 确定任务类型
        const taskType = await this.classifyTaskType(description);
        // 确定任务复杂度
        const complexity = await this.determineComplexity(description);
        // 识别实体
        const entities = await this.identifyEntities(description);
        // 分解子任务
        const subTasks = await this.splitIntoSubTasks(description);
        // 确定优先级
        const priority = await this.determinePriority(description);
        // 估计时间
        const estimatedDuration = await this.estimateTaskDuration(description, complexity);
        // 识别领域
        const domain = await this.identifyDomain(description);
        // 构建并返回任务对象
        return {
            description,
            type: taskType,
            keywords,
            complexity,
            entities,
            subTasks,
            priority,
            estimatedDuration,
            domain
        };
    }
    // 从任务描述中提取关键词
    async extractKeywords(description) {
        // 简单的关键词提取逻辑：拆分句子并过滤常见词
        const commonWords = ['的', '地', '得', '和', '与', '或', '在', '是', '有', '这', '那', '我', '你', '他', '她', '它', '们'];
        // 分词和过滤处理
        const words = description
            .toLowerCase()
            .replace(/[.,?!;:'"(){}[\]]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 1 && !commonWords.includes(word));
        // 去重
        const uniqueWords = Array.from(new Set(words));
        // 返回前10个关键词（如果有）
        return uniqueWords.slice(0, 10);
    }
    // 确定任务复杂度（1-5）
    async determineComplexity(description) {
        // 简单的复杂度评估逻辑
        // 统计描述长度、子句数量、专业词汇等指标
        // 基于描述长度的基本评分
        let score = 1;
        // 描述越长，可能越复杂
        if (description.length > 200)
            score += 1;
        if (description.length > 500)
            score += 1;
        // 子句数量（简单估计）
        const sentenceCount = description.split(/[.。!！?？;；]/).filter(s => s.trim().length > 0).length;
        if (sentenceCount > 3)
            score += 1;
        if (sentenceCount > 7)
            score += 1;
        // 专业词汇检测（简单示例）
        const technicalTerms = ['代码', '算法', '数据库', 'API', '函数', '类', '对象', '服务器', '网络', '协议', '框架', '集成'];
        const hasTechnicalTerms = technicalTerms.some(term => description.includes(term));
        if (hasTechnicalTerms)
            score += 1;
        // 确保分数在1-5范围内
        return Math.max(1, Math.min(5, score));
    }
    // 分类任务类型
    async classifyTaskType(description) {
        // 简单的任务类型分类逻辑
        const typePatterns = [
            { type: TaskType.FileOperation, patterns: ['文件', '读取', '写入', '保存', '删除', '移动', '复制', '重命名'] },
            { type: TaskType.CodeAnalysis, patterns: ['代码', '分析', '重构', '优化', '类', '函数', '方法', '变量', '接口', '框架'] },
            { type: TaskType.SystemOperation, patterns: ['系统', '命令', '终端', '进程', '服务', '安装', '卸载', '配置', '部署'] },
            { type: TaskType.DataProcessing, patterns: ['数据', '处理', '转换', '格式化', '解析', '提取', 'JSON', 'XML', 'CSV'] },
            { type: TaskType.WebSearch, patterns: ['搜索', '查询', '网页', '互联网', '浏览器', 'Google', '百度', '必应'] },
            { type: TaskType.DatabaseOperation, patterns: ['数据库', 'SQL', '查询', 'MongoDB', 'MySQL', 'Redis', '表', '字段'] },
            { type: TaskType.APIInteraction, patterns: ['API', '接口', '请求', '响应', 'REST', 'HTTP', 'GET', 'POST', 'PUT', 'DELETE'] },
            { type: TaskType.DocumentProcess, patterns: ['文档', 'PDF', 'Word', 'Excel', '表格', '文本', '提取', '生成报表'] },
            { type: TaskType.ImageProcess, patterns: ['图像', '图片', '照片', '绘图', '处理', '裁剪', '调整', '滤镜', '特效'] },
            { type: TaskType.NaturalLanguageProcess, patterns: ['语言', '文本', '分析', '摘要', '翻译', '语义', '情感分析', '情感倾向'] }
        ];
        // 遍历每种类型的模式，检查描述是否匹配
        for (const { type, patterns } of typePatterns) {
            if (patterns.some(pattern => description.includes(pattern))) {
                return type;
            }
        }
        // 默认类型
        return TaskType.Unknown;
    }
    // 识别任务中的实体
    async identifyEntities(description) {
        // 简单的实体识别逻辑
        const entities = [];
        // 识别文件路径
        const filePathRegex = /[a-zA-Z0-9_\-\/\.]+\.(js|ts|py|java|c|cpp|h|html|css|json|xml|yaml|yml|md|txt|pdf|doc|docx|xls|xlsx|csv)/g;
        const filePaths = description.match(filePathRegex) || [];
        entities.push(...filePaths);
        // 识别URL
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = description.match(urlRegex) || [];
        entities.push(...urls);
        // 识别API端点
        const apiRegex = /\/api\/[a-zA-Z0-9_\-\/]+/g;
        const apis = description.match(apiRegex) || [];
        entities.push(...apis);
        // 识别数据库表名（简单示例）
        const tableRegex = /表\s*[""']?([a-zA-Z0-9_]+)[""']?/g;
        let match;
        while ((match = tableRegex.exec(description)) !== null) {
            if (match[1])
                entities.push(match[1]);
        }
        // 去重并返回
        return Array.from(new Set(entities));
    }
    // 将任务分解为子任务
    async splitIntoSubTasks(description) {
        // 简单的子任务分解逻辑
        const subTasks = [];
        // 按序号分解
        const numberedListRegex = /[0-9]+[\.\)]\s*([^\n;。]+)[;。\n]/g;
        let match;
        while ((match = numberedListRegex.exec(description)) !== null) {
            if (match[1] && match[1].trim().length > 0) {
                subTasks.push(match[1].trim());
            }
        }
        // 按步骤/首先/然后等词分解
        const stepKeywords = ['首先', '然后', '接着', '之后', '最后', '第一步', '第二步', '第三步'];
        for (const keyword of stepKeywords) {
            const regex = new RegExp(`${keyword}[，,]?\\s*([^\\n;。]+)[;。\\n]`, 'g');
            while ((match = regex.exec(description)) !== null) {
                if (match[1] && match[1].trim().length > 0) {
                    subTasks.push(match[1].trim());
                }
            }
        }
        // 如果没有明确的子任务标记，尝试按句子拆分（简单示例）
        if (subTasks.length === 0) {
            const sentences = description.split(/[.。!！?？;；]/).filter(s => s.trim().length > 0);
            if (sentences.length > 1) {
                // 只有当有多个句子时才考虑按句子拆分
                subTasks.push(...sentences.map(s => s.trim()));
            }
        }
        return subTasks;
    }
    // 确定任务优先级（1-5）
    async determinePriority(description) {
        // 简单的优先级确定逻辑
        let priority = 3; // 默认中等优先级
        // 紧急词汇检测
        const urgentKeywords = ['紧急', '立即', '马上', '尽快', '高优先级', '重要', '关键', '不能等'];
        const hasUrgentKeywords = urgentKeywords.some(keyword => description.includes(keyword));
        if (hasUrgentKeywords)
            priority += 2;
        // 低优先级词汇检测
        const lowPriorityKeywords = ['低优先级', '不着急', '有空', '闲时', '可延后', '次要'];
        const hasLowPriorityKeywords = lowPriorityKeywords.some(keyword => description.includes(keyword));
        if (hasLowPriorityKeywords)
            priority -= 2;
        // 确保优先级在1-5范围内
        return Math.max(1, Math.min(5, priority));
    }
    // 估计任务完成时间（秒）
    async estimateTaskDuration(description, complexity) {
        // 简单的任务时间估计逻辑
        // 基础时间（秒）基于复杂度估计
        const baseTime = complexity * 300; // 每级复杂度5分钟
        // 子任务数量影响
        const subTasks = await this.splitIntoSubTasks(description);
        const subTaskFactor = Math.max(1, subTasks.length * 0.5);
        // 任务类型影响
        const taskType = await this.classifyTaskType(description);
        let typeFactor = 1;
        switch (taskType) {
            case TaskType.CodeAnalysis:
            case TaskType.DataProcessing:
            case TaskType.DatabaseOperation:
                typeFactor = 1.5; // 这些类型通常需要更多时间
                break;
            case TaskType.WebSearch:
            case TaskType.FileOperation:
                typeFactor = 0.8; // 这些类型通常需要较少时间
                break;
            default:
                typeFactor = 1;
        }
        // 计算估计时间
        const estimatedTime = baseTime * typeFactor * subTaskFactor;
        return Math.round(estimatedTime);
    }
    // 识别任务领域
    async identifyDomain(description) {
        // 简单的领域识别逻辑
        const domainPatterns = [
            { domain: '前端开发', patterns: ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular', '页面', '组件', 'UI', 'UX'] },
            { domain: '后端开发', patterns: ['服务器', 'API', '后端', '数据库', 'Node.js', 'Spring', 'Django', 'Express'] },
            { domain: '数据科学', patterns: ['数据分析', '机器学习', '统计', '预测', '模型', 'Python', 'R', 'pandas', 'scikit-learn'] },
            { domain: '系统运维', patterns: ['部署', '服务器', '配置', 'Linux', 'Docker', 'Kubernetes', '监控', '日志'] },
            { domain: '网络安全', patterns: ['安全', '漏洞', '加密', '防火墙', '入侵', '攻击', '保护', '风险'] },
            { domain: '移动开发', patterns: ['Android', 'iOS', '移动应用', 'App', '手机', '平板', 'Swift', 'Kotlin'] },
            { domain: '桌面应用', patterns: ['桌面应用', 'Windows', 'MacOS', 'Electron', 'WPF', 'Qt', '界面'] },
            { domain: '游戏开发', patterns: ['游戏', 'Unity', 'Unreal', '3D', '玩家', '关卡', '引擎'] },
            { domain: '自然语言处理', patterns: ['NLP', '自然语言', '文本分析', '情感分析', '语言模型', '分词', '命名实体'] },
            { domain: '图像处理', patterns: ['图像', '计算机视觉', 'CV', '识别', '检测', '分割', 'OpenCV'] }
        ];
        // 遍历每个领域的模式，检查描述是否匹配
        for (const { domain, patterns } of domainPatterns) {
            if (patterns.some(pattern => description.toLowerCase().includes(pattern.toLowerCase()))) {
                return domain;
            }
        }
        // 默认领域
        return '通用';
    }
    // 将大模型返回的任务类型映射到TaskType枚举
    mapLLMTaskType(llmTaskType) {
        // 尝试直接映射
        const typeMap = {
            'FileOperation': TaskType.FileOperation,
            'CodeAnalysis': TaskType.CodeAnalysis,
            'SystemOperation': TaskType.SystemOperation,
            'DataProcessing': TaskType.DataProcessing,
            'WebSearch': TaskType.WebSearch,
            'DatabaseOperation': TaskType.DatabaseOperation,
            'APIInteraction': TaskType.APIInteraction,
            'DocumentProcess': TaskType.DocumentProcess,
            'ImageProcess': TaskType.ImageProcess,
            'NaturalLanguageProcess': TaskType.NaturalLanguageProcess
        };
        if (llmTaskType in typeMap) {
            return typeMap[llmTaskType];
        }
        // 如果没有直接匹配，尝试模糊匹配
        for (const [key, value] of Object.entries(typeMap)) {
            if (llmTaskType.includes(key) || key.includes(llmTaskType)) {
                return value;
            }
        }
        // 默认返回Unknown
        return TaskType.Unknown;
    }
}
//# sourceMappingURL=TaskAnalyzer.js.map