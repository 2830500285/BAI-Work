# 开发流程

[English](./DEVELOPMENT.md)

这份文档定义了本仓库的开发协作方式，重点说明默认分支、PR 流程和发布验证。

## 开发基线

- `main` 是当前开发与发布分支。
- 对于稍大一些的改动，建议使用短期功能分支。
- 原生发布验证覆盖 Mac Intel x64、Mac Apple Silicon arm64 和 Windows x64。
- 各平台产物必须在匹配架构的 GitHub-hosted runner 上构建并完成启动冒烟。

## 推荐流程

1. 先同步本地仓库。
2. 切换到 `main`。
3. 拉取 `main` 最新代码。
4. 如有需要，从 `main` 拉出功能分支开展开发。
5. 在本地完成实现并做好校验。
6. 如需评审，提交 PR 回到 `main`。
7. 在通过评审和检查后合并。

## 示例命令

### 同步 `main`

```bash
git checkout main
git pull origin main
```

### 从 `main` 拉功能分支

```bash
git checkout main
git pull origin main
git checkout -b feat/short-description
```

### 推送分支

```bash
git push origin feat/short-description
```

## PR 前必须做的校验

至少执行：

```bash
npm run typecheck
npm run build
npm run test
```

如果改动影响运行时行为或 UI，额外建议执行：

```bash
npm run dev
```

涉及打包时，按目标平台执行：

```bash
npm run dist:mac:dir
npm run dist:mac:arm64
npm run dist:win
```

Mac 与 Windows 发布工作流还会验证可执行文件架构、BAI Code 包内资源、
离线 wheel 安装，以及成品应用的 `/health` 启动冒烟。

## PR 质量标准

一个合格的 PR 应当：

- 目标明确，只围绕一个主要主题
- 易于审阅
- 有明确的校验结果支撑
- 行为变更时同步更新文档

PR 描述建议至少包含：

- 改了什么
- 为什么要改
- 如何验证
- 如果涉及 UI，附上视频或 GIF
- 如果涉及项目逻辑，列出新增或更新的单元测试

## 改动范围标准

推荐：

- 一个 PR 聚焦一个主题
- 尽量减少无关格式化改动
- 非必要不要顺手做大范围重构

避免：

- 没有解释就把文档、重构、功能改动混在一起
- 大范围行为变化却没有文档说明
- 对高风险改动绕过正常评审流程

## 本地化标准

如果修改了用户可见文案：

- 尽量同步更新中英文内容
- 保持文档和 UI 用词一致

## 文档标准

当改动影响以下内容时，应同步更新文档：

- 安装或初始化方式
- 命令使用方式
- 运行时要求
- 分支策略
- 发布流程
- 贡献者协作方式

## 发布说明

发布命令：

- `npm run dist:mac`：Mac Intel DMG/ZIP 产物
- `npm run dist:mac:arm64`：Mac Apple Silicon DMG/ZIP 产物
- `npm run dist:win`：Windows x64 NSIS 安装器

权威发布验证分别由 `.github/workflows/release.yml`、
`release-mac-arm64.yml` 和 `release-windows.yml` 在原生 runner 上执行。

## 分支命名建议

示例：

- `feat/runtime-settings`
- `fix/connection-probe`
- `docs/bilingual-readme`
- `refactor/chat-store`

## 维护者说明

如果后续仓库调整受保护分支、强制 Reviewer、自动化测试门禁或跨平台发布目标，应同步更新本文件，保持与真实仓库规则一致。
