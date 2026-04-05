# Baby Tracker - 婴儿成长日志

[English](./README.md) | [中文](./README_CN.md)

一款以语音输入为核心的跨平台（iOS + Android）婴儿成长日志 App。帮助新手父母快速记录宝宝日常（喂奶、大小便、睡眠、体温等），并提供每日小结、成长趋势图表和父母寄语功能。

## 功能特性

- **语音优先** - 一句话记录多件事，AI（LLM）自动解析自然语言为结构化记录
- **全面追踪** - 配方奶/亲喂、大便、小便、睡眠、洗澡、体温、体重、黄疸、每日变化
- **今日小结** - 一目了然查看当天所有护理活动
- **成长统计** - 喂养趋势、体重曲线、睡眠规律、黄疸追踪，图表展示
- **家庭协作** - 通过邀请码邀请家人加入，所有人共享同一份数据
- **父母寄语** - 给宝宝留下文字或语音寄语（时光胶囊）
- **照片记录** - 为记录或寄语附加照片

## 技术栈

```
前端（移动端）                  后端（API 服务）
---------------------          --------------------
React Native (Expo)            Fastify + TypeScript
Expo Router（文件路由）          Prisma ORM
expo-speech-recognition        PostgreSQL
expo-audio                     JWT 认证
Zustand（状态管理）              OpenAI 兼容 LLM API
TypeScript                     sharp（图片处理）
```

## 项目结构

```
baby-tracker/
  baby-tracker-app/          # 移动端应用（Expo + React Native）
    app/                     # 页面（Expo Router 文件路由）
      (auth)/                # 登录 / 注册
      (tabs)/                # 主 Tab：首页、统计、寄语、我的
      baby/                  # 创建宝宝 / 加入宝宝
      record/                # 手动记录 & 语音确认
    components/              # 可复用 UI 组件
    services/                # API 请求模块
    stores/                  # Zustand 状态管理
    hooks/                   # 自定义 Hook（语音识别、音频）
    types/                   # TypeScript 类型定义

  baby-tracker-server/       # 后端 API 服务
    src/
      routes/                # REST 接口（auth, babies, records, stats, messages, photos）
      middleware/             # JWT 认证 & 宝宝访问权限控制
      services/              # LLM 解析、文件存储、图片处理
      lib/                   # 共享 Prisma 客户端
    prisma/                  # 数据库 Schema
    tests/                   # 集成测试 & E2E 测试（Vitest）
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm
- PostgreSQL
- iOS 模拟器或 Android 模拟器（或通过 Expo Go 连接真机）

### 后端启动

```bash
cd baby-tracker-server
cp .env.example .env
# 编辑 .env，填入数据库连接和 API 密钥

pnpm install
pnpm exec prisma db push
pnpm dev
```

默认运行在 `http://localhost:3001`。

### 环境变量（后端）

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `JWT_SECRET` | Access Token 签名密钥 |
| `JWT_REFRESH_SECRET` | Refresh Token 签名密钥 |
| `OPENAI_API_KEY` | LLM 语音解析 API Key |
| `OPENAI_BASE_URL` | LLM API 地址（OpenAI 兼容） |
| `UPLOAD_DIR` | 文件上传目录（默认 `./uploads`） |
| `PORT` | 服务端口（默认 `3001`） |

### 前端启动

```bash
cd baby-tracker-app
pnpm install
pnpm start          # 启动 Expo 开发服务器
pnpm ios            # 在 iOS 模拟器运行
pnpm android        # 在 Android 模拟器运行
```

> **注意**：开发环境下 App 默认连接 `http://localhost:3001`。如果在真机上测试，需要修改 `services/api.ts` 中的 base URL。

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 注册 |
| POST | `/api/auth/login` | 登录 |
| POST | `/api/auth/refresh` | 刷新 Token |
| POST | `/api/babies` | 创建宝宝 |
| GET | `/api/babies` | 获取宝宝列表 |
| PUT | `/api/babies/:id` | 更新宝宝信息 |
| POST | `/api/babies/:id/invite` | 生成邀请码 |
| POST | `/api/babies/join` | 通过邀请码加入 |
| POST | `/api/babies/:babyId/records` | 创建记录 |
| GET | `/api/babies/:babyId/records` | 查询记录（可选 `?date=`） |
| GET | `/api/babies/:babyId/records/summary` | 每日小结 |
| PUT | `/api/records/:id` | 修改记录 |
| DELETE | `/api/records/:id` | 删除记录 |
| POST | `/api/babies/:babyId/records/voice` | 文本解析（LLM 预览） |
| POST | `/api/babies/:babyId/records/voice/confirm` | 确认保存解析结果 |
| GET | `/api/babies/:babyId/stats/feeding` | 喂养统计 |
| GET | `/api/babies/:babyId/stats/weight` | 体重曲线 |
| GET | `/api/babies/:babyId/stats/sleep` | 睡眠规律 |
| GET | `/api/babies/:babyId/stats/jaundice` | 黄疸趋势 |
| POST | `/api/babies/:babyId/messages` | 创建寄语（multipart） |
| GET | `/api/babies/:babyId/messages` | 寄语列表 |
| POST | `/api/babies/:babyId/photos` | 上传照片 |
| GET | `/api/babies/:babyId/photos` | 照片列表 |

## 测试

### 后端测试

```bash
cd baby-tracker-server
pnpm test              # 运行全部测试
pnpm test:watch        # 监听模式
pnpm vitest run tests/records.test.ts   # 运行单个测试文件
```

测试套件包含 128 个测试，覆盖：
- 认证（注册、登录、Token 刷新、边界情况）
- 宝宝管理（增删改查、邀请/加入流程）
- 记录（全部 10 种记录类型、增删改查、每日小结）
- 统计（喂养、体重、睡眠、黄疸聚合）
- 语音解析（LLM 集成，mock 测试）
- 寄语与照片（multipart 上传、权限控制）
- E2E 工作流（完整家庭协作场景）
- 访问控制（成员隔离、认证强制）

## 许可证

MIT
