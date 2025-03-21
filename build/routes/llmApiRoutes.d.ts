import { Router } from 'express';
import { LLMApiController } from '../controllers/LLMApiController.js';
/**
 * 创建LLM API路由
 * @param controller LLM API控制器实例
 * @returns Express路由实例
 */
export declare function createLLMApiRoutes(controller: LLMApiController): Router;
