# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 仓库概览

这个仓库包含两个独立的 PNPM 项目：
- `baby-tracker-app/`：基于 Expo + React Native 的移动端应用，使用 Expo Router 做文件路由。
- `baby-tracker-server/`：基于 Fastify + Prisma + PostgreSQL 的后端 API。

仓库根目录没有统一的 workspace 脚本层。开发命令需要分别在 app 或 server 子目录中执行。

## 常用命令

### App（`baby-tracker-app`）

```bash
cd baby-tracker-app
pnpm install
pnpm start
pnpm ios
pnpm android
pnpm web
```

说明：
- `pnpm start` 启动 Expo 开发服务器。
- `pnpm ios` / `pnpm android` 通过 Expo 触发原生运行。
- 当前 app 的 `package.json` **没有**定义 lint/test 脚本，不要假设这些命令存在。

### Server（`baby-tracker-server`）

```bash
cd baby-tracker-server
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm test
pnpm test:watch
```

常用单测命令：

```bash
cd baby-tracker-server
pnpm test tests/records.test.ts
pnpm vitest run tests/records.test.ts
pnpm vitest run tests/records.test.ts -t "creates a feeding_formula record and returns 201"
```

Prisma 和数据库相关文件位于 `baby-tracker-server/prisma/`。在运行后端测试或服务前，先检查 `.env.example` 和本地 `.env`。

## 高层架构

### 后端架构

Fastify 应用在 `baby-tracker-server/src/app.ts` 中组装：
- 注册通用插件（`@fastify/cors`、`@fastify/multipart`、`@fastify/static`）
- 确保上传目录存在
- 挂载 `src/routes/` 下的各领域路由

`baby-tracker-server/src/server.ts` 只是进程入口；真正的运行时/测试组合根是 `src/app.ts` 里的 `buildApp()`。

后端结构：
- `src/routes/`：按领域划分的 HTTP 接口（`auth`、`babies`、`records`、`photos`、`messages`、`stats`）
- `src/middleware/auth.ts`：JWT 认证和宝宝成员权限校验
- `src/services/`：LLM 解析、文件存储、图片处理等带副作用的逻辑
- `src/lib/prisma.ts`：共享 Prisma Client
- `prisma/schema.prisma`：数据模型和枚举定义的唯一事实来源
- `tests/`：基于 Fastify injection 的集成风格 API 测试

### 数据模型

Prisma schema 描述的不是单用户模型，而是“家庭/协作式”育儿记录：
- `User`
- `Baby`
- `BabyMember`：连接用户与宝宝，并携带角色、邀请码
- `Record`：结构化事件记录
- `Message`：文字/音频寄语
- `Photo`：可挂到记录或寄语上的照片

关键领域约束：`Record.type` 是枚举，而具体负载放在 `Record.data` 这个 JSON 字段里。很多前后端逻辑都依赖“按记录类型约定 JSON 结构”的方式，而不是拆成独立表。

当前代码中的典型约定：
- 奶粉喂养使用 `data.amount_ml`
- 母乳喂养使用 `data.duration_minutes`
- 睡眠使用 `data.end_time`
- 体重使用 `data.value_g`
- 黄疸使用 `data.value` 和 `data.position`

只要改动记录相关行为，就要同时确认后端聚合逻辑和前端表单/展示逻辑仍然使用同一套 JSON key。

### Records 主流程

`records` 是当前系统的核心能力，跨越多层：
- 后端路由：`baby-tracker-server/src/routes/records.ts`
- 统计聚合：`baby-tracker-server/src/routes/stats.ts`
- 前端 API 封装：`baby-tracker-app/services/record-api.ts`
- 前端状态：`baby-tracker-app/stores/record-store.ts`
- 前端录入/确认 UI：如 `components/RecordSheet.tsx`

后端目前支持三类记录流程：
- 直接创建 / 修改 / 删除
- 按日期查询列表 + 每日汇总
- 语音解析预览 + 确认保存

语音解析特意拆成两步：
1. `/api/babies/:babyId/records/voice`：把文本解析成候选记录，但**不落库**。
2. `/api/babies/:babyId/records/voice/confirm`：把用户确认后的结果通过事务批量保存。

### Messages / Photos 流程

`baby-tracker-server/src/routes/messages.ts` 负责处理 multipart 提交的文字与可选音频，通过 `src/services/storage.ts` 保存文件，并在读取音频前再次做成员权限校验。

上传文件通过 Fastify static 基于配置的上传目录暴露。如果修改上传或存储逻辑，要一起检查文件访问路由和前端对 URL 的假设。

### 前端架构

前端使用 Expo Router 的文件路由。`baby-tracker-app/app/_layout.tsx` 是全局入口，负责认证态恢复和宝宝选择后的跳转守卫。

路由分组：
- `app/(auth)/`：登录 / 注册流程
- `app/(tabs)/`：登录后的主界面
- `app/baby/`：创建宝宝 / 加入宝宝流程
- `app/record/`：手动记录和语音确认等模态流程

状态管理使用 Zustand，比较轻量但集中：
- `stores/auth-store.ts`：会话恢复、token 持久化、当前宝宝、宝宝列表加载
- `stores/record-store.ts`：记录相关 UI 状态

前端通过 `baby-tracker-app/services/` 下的轻量 service 模块访问后端。
模式是：
- `services/api.ts`：维护共享 Axios 实例、base URL、鉴权头注入、refresh token 重试逻辑
- 各领域 API 文件（`auth-api.ts`、`baby-api.ts`、`record-api.ts` 等）只做接口封装

重要环境假设：`services/api.ts` 当前把开发环境地址写死为 `http://localhost:3001`。如果本地真机或模拟器联调失败，优先检查这里。

### 测试策略

后端测试位于 `baby-tracker-server/tests/`，是当前最主要的回归保障。它们是偏 API 层的集成测试，覆盖 auth、babies、records、messages、photos、stats、voice 等主流程。

测试按接口领域组织，而不是按底层函数组织。修改后端行为时，优先先看并补对应领域测试。

移动端目前自动化测试支撑较少。仓库快照里有一个未跟踪的 app 侧测试文件（`baby-tracker-app/services/api-base-url.test.ts`），但 app 的 `package.json` 里还没有接好测试脚本。

## 项目特定建议

- 修改行为前，优先按 `server route -> app service -> store -> screen/component` 的链路顺着看一遍。
- 任何记录 schema 或统计逻辑的调整，都要同时检查 `src/routes/records.ts`、`src/routes/stats.ts` 以及前端对应的 service / type / UI 用法。
- 认证或会话问题通常分散在 `baby-tracker-app/stores/auth-store.ts` 和 `baby-tracker-app/services/api.ts` 两处：前者负责恢复会话，后者负责刷新 token。
- 修改后端时，优先补或改 `baby-tracker-server/tests/` 中对应的集成测试，而不是只写孤立单元测试。
- 不要假设这是一个有统一根命令的 monorepo；当前结构更像两个独立子项目放在同一个仓库中。