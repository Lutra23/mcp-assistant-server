# 贡献指南

感谢您考虑为 MCP Assistant Server 做出贡献！

## 开发流程

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的修改 (`git commit -m '添加一些特性'`)
4. 将您的修改推送到分支 (`git push origin feature/amazing-feature`)
5. 开启一个 Pull Request

## 提交 Pull Request

1. 确保您的代码符合项目的编码规范
2. 更新 README.md，描述重要的变动
3. 更新测试用例（如果适用）

## 编码规范

- 使用 TypeScript
- 遵循 ESLint 配置
- 保持代码简洁明了
- 添加必要的注释
- 编写单元测试

## 提交信息规范

提交信息格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

类型（type）：
- feat: 新特性
- fix: 修复 Bug
- docs: 文档修改
- style: 代码格式修改
- refactor: 代码重构
- test: 测试用例修改
- chore: 其他修改

## 报告 Bug

1. 检查 issue 列表中是否已存在相关问题
2. 使用 issue 模板提交新的 bug 报告
3. 提供详细的复现步骤
4. 如果可能，提供错误日志

## 提出新功能

1. 首先开一个 issue 讨论新功能
2. 说明新功能的使用场景
3. 描述具体的实现方案

## 开发环境设置

1. 安装依赖：
```bash
npm install
```

2. 运行测试：
```bash
npm test
```

3. 启动开发服务器：
```bash
npm run dev
```

## 许可证

通过提交 Pull Request，您同意您的贡献将根据项目的 MIT 许可证进行许可。