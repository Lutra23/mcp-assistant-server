import { Router } from 'express';
/**
 * 创建LLM API路由
 * @param controller LLM API控制器实例
 * @returns Express路由实例
 */
export function createLLMApiRoutes(controller) {
    const router = Router();
    // 任务分析路由
    router.post('/analyze-task', (req, res) => controller.analyzeTask(req, res));
    // 兼容性路由 - 与analyze-task相同功能
    router.post('/analyze', (req, res) => controller.analyzeTask(req, res));
    // 工具推荐路由
    router.post('/recommend-tools', (req, res) => controller.recommendTools(req, res));
    // 配置管理路由
    router.get('/config', (req, res) => controller.getLLMConfig(req, res));
    router.put('/config', (req, res) => controller.updateLLMConfig(req, res));
    // 健康检查路由
    router.get('/health', (req, res) => controller.checkHealth(req, res));
    return router;
}
//# sourceMappingURL=llmApiRoutes.js.map