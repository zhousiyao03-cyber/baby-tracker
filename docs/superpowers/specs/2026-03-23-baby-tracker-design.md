# Baby Tracker — 婴儿成长日志 App 设计文档

## 概述

一款以语音输入为核心的 iOS 婴儿成长日志 App，帮助新手父母快速记录宝宝日常（喂奶、大小便、睡眠、体温等），并提供每日小结、成长趋势图表和父母寄语功能。

**目标用户**：新生儿（0-12个月）父母，双人协作记录。

**核心理念**：带娃时单手操作，语音优先，一句话记录多件事。

## 技术架构

```
┌─────────────────────────┐
│    iOS App (SwiftUI)     │
│  - UI 界面               │
│  - Apple Speech 转文字    │
│  - 音频录制/播放          │
│  - 照片拍摄/选择          │
└──────────┬──────────────┘
           │ HTTPS (REST API)
           ▼
┌─────────────────────────┐
│   Node.js 后端            │
│  - Fastify + TypeScript   │
│  - JWT 认证               │
│  - Claude API 语义解析     │
│  - 照片缩略图生成 (sharp)  │
│  - 文件上传处理            │
└─────┬───────────┬───────┘
      │           │
      ▼           ▼
┌──────────┐ ┌───────────┐
│PostgreSQL │ │ 文件存储    │
│ 结构化数据 │ │ (本地/S3)  │
│           │ │ 语音、照片  │
└──────────┘ └───────────┘
```

## 技术选型

| 层级 | 选型 | 理由 |
|------|------|------|
| iOS 框架 | SwiftUI | 声明式 UI，原生体验最佳 |
| 语音转文字 | Apple Speech Framework | 免费、离线可用 |
| 语义解析 | Claude API | 一句话提取多条结构化记录 |
| 后端框架 | Fastify + TypeScript | 高性能、类型安全 |
| 数据库 | PostgreSQL + Prisma ORM | 关系型、ORM 方便 |
| 认证 | JWT | 无状态、移动端友好 |
| 文件存储 | 本地磁盘（后续可切 S3） | 先简单跑起来 |
| 音频格式 | AAC / m4a | iOS 原生支持，文件小 |
| 图片处理 | sharp (Node.js) | 生成缩略图，高性能 |

## 数据模型

### User（用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| email | String | 登录邮箱 |
| password_hash | String | 密码哈希 |
| nickname | String | 昵称 |
| avatar_url | String? | 头像 |
| created_at | DateTime | 创建时间 |

### Baby（宝宝）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | String | 名字 |
| gender | Enum | 性别 |
| birth_date | Date | 出生日期 |
| avatar_url | String? | 头像 |
| created_at | DateTime | 创建时间 |

### BabyMember（宝宝-用户关联）

| 字段 | 类型 | 说明 |
|------|------|------|
| baby_id | UUID | 外键 → Baby |
| user_id | UUID | 外键 → User |
| role | Enum | admin / member |
| joined_at | DateTime | 加入时间 |

### Record（记录）

统一记录表，用 type + JSONB 区分不同类型。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| baby_id | UUID | 外键 → Baby |
| user_id | UUID | 外键 → User（记录人） |
| type | Enum | 记录类型 |
| recorded_at | DateTime | 实际发生时间 |
| data | JSONB | 类型特有字段 |
| note | String? | 备注 |
| created_at | DateTime | 创建时间 |

**type 枚举及 data 字段结构**：

- `feeding_breast`：亲喂 — `{ duration_minutes, side: "left" | "right" | "both" }`
- `feeding_formula`：配方奶 — `{ amount_ml }`
- `poop`：大便 — `{ color, texture }`
- `pee`：小便 — `{}`
- `sleep`：睡眠 — `{ end_time }`（`recorded_at` 作为入睡时间，`end_time` 为醒来时间）
- `bath`：洗澡 — `{ duration_minutes, water_temp? }`
- `temperature`：体温 — `{ value, method: "ear" | "forehead" | "armpit" }`
- `weight`：体重 — `{ value_g }`
- `jaundice`：黄疸 — `{ value, position: "forehead" | "chest" }`
- `daily_change`：今日变化 — `{ description }`

### Message（父母寄语）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| baby_id | UUID | 外键 → Baby |
| user_id | UUID | 外键 → User |
| text_content | String? | 文字内容 |
| audio_url | String? | 语音文件路径 |
| audio_duration_seconds | Float? | 语音时长 |
| recorded_at | DateTime | 记录时间 |

### Photo（照片）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| baby_id | UUID | 外键 → Baby |
| user_id | UUID | 外键 → User |
| record_id | UUID? | 外键 → Record（可选，两者均为空表示独立照片） |
| message_id | UUID? | 外键 → Message（可选，两者均为空表示独立照片） |
| url | String | 原图路径 |
| thumbnail_url | String | 缩略图路径 |
| uploaded_at | DateTime | 上传时间 |

## API 设计

### 认证

```
POST   /api/auth/register          注册
POST   /api/auth/login              登录 → 返回 JWT
POST   /api/auth/refresh            刷新 token
```

### 宝宝管理

```
POST   /api/babies                  创建宝宝档案
GET    /api/babies                  获取我的宝宝列表
PUT    /api/babies/:id              更新宝宝信息
POST   /api/babies/:id/invite       邀请家人（生成邀请码）
POST   /api/babies/join             通过邀请码加入
```

### 记录

```
POST   /api/babies/:id/records              手动创建记录
POST   /api/babies/:id/records/voice         语音/文字 → LLM 解析 → 返回预览（不保存）
POST   /api/babies/:id/records/voice/confirm  用户确认后批量保存解析结果
GET    /api/babies/:id/records?date=xxx      按日期查询记录
GET    /api/babies/:id/records/summary       每日小结（汇总统计）
PUT    /api/records/:id                      修改记录
DELETE /api/records/:id                      删除记录
```

### 父母寄语

```
POST   /api/babies/:id/messages             创建寄语（文字+音频+照片）
GET    /api/babies/:id/messages              寄语列表
GET    /api/messages/:id/audio               获取语音文件
```

### 照片

```
POST   /api/babies/:id/photos               上传照片
GET    /api/babies/:id/photos                照片列表（可按日期筛选）
DELETE /api/photos/:id                       删除照片
```

### 统计

```
GET    /api/babies/:id/stats/feeding         喂奶统计（日均量、趋势）
GET    /api/babies/:id/stats/weight          体重增长曲线
GET    /api/babies/:id/stats/jaundice        黄疸趋势
GET    /api/babies/:id/stats/sleep           睡眠规律
```

## 语音解析流程

1. 用户按下语音按钮，Apple Speech Framework 实时转文字
2. 用户松手，转写文字发送至后端 `POST /records/voice`
3. 后端构造 Prompt 调 Claude API，提取结构化数据：
   - 输入："刚才三点喝了130毫升奶，然后拉了一次臭臭，黄绿色糊状的"
   - 输出：JSON 数组，包含 feeding_formula 和 poop 两条记录
4. 后端返回解析结果，App 展示确认卡片
5. 用户确认后批量保存
6. 容错：LLM 解析失败时回退到手动输入界面

文字输入走同样的解析流程。

## iOS App 界面结构

### Tab 结构（4 Tab + 中央语音按钮）

1. **首页** — 今日总览
   - 每日小结宫格（配方奶总量/次数、亲喂时长/次数、大便次数、小便次数、睡眠时长、洗澡、体温、体重、黄疸）
   - 今日变化卡片
   - 时间线流水（按时间倒序，标注记录人）
2. **统计** — 成长趋势
   - 体重增长曲线
   - 喂奶量趋势
   - 黄疸变化
   - 睡眠规律
   - 按周/月查看
3. **寄语** — 给宝宝的话
   - 时间线展示文字、语音、照片
   - 标注爸爸/妈妈
4. **我的** — 设置与管理
   - 宝宝档案
   - 家庭成员管理（邀请码）
   - 数据导出
   - 账号设置

### 记录入口（中央浮动按钮点击后弹出）

视觉层次从上到下：

1. **语音大按钮**（最突出）— 居中 88pt 圆形按钮，渐变色 + 阴影
2. **文字输入框**（次要）— "不方便说话？"引导语
3. **快捷按钮宫格**（补充）— 4x3 全部展开：配方奶、亲喂、大便、小便、睡眠、洗澡、体温、体重、黄疸、今日变化、拍照

### UI 风格

- 温馨可爱：柔和粉/黄色调、圆角卡片、可爱图标
- 爸爸记录用蓝色圆点标识，妈妈记录用粉色圆点标识

## 项目结构

### iOS App

```
BabyTracker/
├── App/
│   └── BabyTrackerApp.swift
├── Models/
├── Views/
│   ├── Home/
│   ├── Stats/
│   ├── Messages/
│   ├── Profile/
│   └── Record/
├── Services/
│   ├── SpeechService.swift
│   ├── AudioRecorder.swift
│   ├── PhotoService.swift
│   └── APIService.swift
└── Utils/
```

### Node.js 后端

```
baby-tracker-server/
├── src/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── babies.ts
│   │   ├── records.ts
│   │   ├── messages.ts
│   │   ├── photos.ts
│   │   └── stats.ts
│   ├── services/
│   │   ├── llm.ts
│   │   └── storage.ts
│   ├── models/
│   ├── middleware/
│   └── app.ts
├── prisma/
│   └── schema.prisma
└── package.json
```

## 多人协作

- 每个用户独立账号，通过邀请码加入宝宝
- BabyMember 角色区分：admin（创建者）可管理成员，member 可记录和查看
- 每条记录带 user_id，标识记录人

## 未来扩展方向

- Web 前端（复用同一套后端 API）
- Android 版本
- 推送通知（喂奶提醒等）
- 数据导出为 PDF 成长报告
- App Store 上架
