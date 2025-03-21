import { Context, ContextManager, ContextUpdateParams, Environment, HistoryEntry } from '../types/interfaces.js';

export class DefaultContextManager implements ContextManager {
  private contextStore: Map<string, Context> = new Map();
  private toolStats: Map<string, { usageCount: number, successCount: number, lastUsed: number }> = new Map();

  constructor() {}

  // 获取任务上下文
  getContext(taskId: string): Context {
    // 如果上下文不存在，则创建新的
    if (!this.contextStore.has(taskId)) {
      const initialContext: Context = {
        history: [],
        environment: this.createDefaultEnvironment()
      };
      this.contextStore.set(taskId, initialContext);
    }
    
    return this.contextStore.get(taskId)!;
  }

  // 更新任务上下文
  async updateContext(taskId: string, params: ContextUpdateParams): Promise<Context> {
    const context = this.getContext(taskId);
    
    // 添加工具使用记录到历史
    if (params.toolUsage) {
      const entry: HistoryEntry = {
        timestamp: Date.now(),
        action: `使用工具: ${params.toolUsage.name}`,
        result: {
          inputs: params.toolUsage.inputs,
          outputs: params.toolUsage.outputs,
          success: params.toolUsage.success
        }
      };
      
      context.history.push(entry);
      
      // 更新工具使用统计
      this.updateToolStats(params.toolUsage.name, params.toolUsage.success ?? true);
    }
    
    // 添加用户反馈到历史
    if (params.feedback) {
      const entry: HistoryEntry = {
        timestamp: Date.now(),
        action: '用户反馈',
        result: params.feedback
      };
      
      context.history.push(entry);
    }
    
    // 更新上下文存储
    this.contextStore.set(taskId, context);
    
    return context;
  }

  // 获取相关历史记录
  async getRelevantHistory(taskId: string, limit?: number): Promise<HistoryEntry[]> {
    const context = this.getContext(taskId);
    
    // 获取历史记录并按时间戳排序，最新的在前
    const history = [...context.history].sort((a, b) => b.timestamp - a.timestamp);
    
    // 如果指定了限制，则返回最近的n条记录
    return limit ? history.slice(0, limit) : history;
  }

  // 跟踪工具使用
  async trackToolUsage(taskId: string, toolUsage: { name: string; inputs?: any; outputs?: any; success?: boolean }): Promise<void> {
    // 创建上下文更新参数
    const updateParams: ContextUpdateParams = {
      toolUsage
    };
    
    // 更新上下文
    await this.updateContext(taskId, updateParams);
  }

  // 更新工具统计
  async updateToolStats(toolName: string, success: boolean): Promise<void> {
    // 获取当前统计数据
    const currentStats = this.toolStats.get(toolName) || { 
      usageCount: 0, 
      successCount: 0,
      lastUsed: 0 
    };
    
    // 更新统计数据
    this.toolStats.set(toolName, {
      usageCount: currentStats.usageCount + 1,
      successCount: success ? currentStats.successCount + 1 : currentStats.successCount,
      lastUsed: Date.now()
    });
  }
  
  // 创建默认环境
  private createDefaultEnvironment(): Environment {
    return {
      workingDirectory: process.cwd(),
      availableTools: [],
      systemInfo: {
        os: process.platform,
        shell: process.env.SHELL || ''
      }
    };
  }
  
  // 用于调试或统计分析的方法
  getToolStatistics(): { name: string, usageCount: number, successRate: number, lastUsed: Date }[] {
    return Array.from(this.toolStats.entries()).map(([name, stats]) => ({
      name,
      usageCount: stats.usageCount,
      successRate: stats.usageCount > 0 ? stats.successCount / stats.usageCount : 0,
      lastUsed: new Date(stats.lastUsed)
    }));
  }
  
  // 清除任务上下文
  clearContext(taskId: string): boolean {
    return this.contextStore.delete(taskId);
  }
}