# Baby Tracker 后端实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建 Baby Tracker 的 Node.js 后端 API，支持用户认证、宝宝管理、记录 CRUD、语音解析、寄语、照片、统计等全部接口。

**Architecture:** Fastify + TypeScript + Prisma + PostgreSQL。路由按资源分文件，services 层封装业务逻辑（LLM 解析、文件存储），middleware 处理 JWT 认证和权限校验。

**Tech Stack:** Node.js 22, TypeScript, Fastify, Prisma ORM, PostgreSQL, @anthropic-ai/sdk, sharp, bcrypt, jsonwebtoken

**Spec:** `docs/superpowers/specs/2026-03-23-baby-tracker-design.md`

---

## File Structure

```
baby-tracker-server/
├── package.json
├── tsconfig.json
├── .env.example
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app.ts                          # Fastify 应用入口，注册插件和路由
│   ├── server.ts                       # 启动服务器
│   ├── config.ts                       # 环境变量配置
│   ├── middleware/
│   │   └── auth.ts                     # JWT 认证 + 权限校验 preHandler
│   ├── routes/
│   │   ├── auth.ts                     # 注册、登录、刷新 token
│   │   ├── babies.ts                   # 宝宝 CRUD + 邀请
│   │   ├── records.ts                  # 记录 CRUD + 语音解析
│   │   ├── messages.ts                 # 寄语 CRUD + 音频
│   │   ├── photos.ts                   # 照片上传/列表/删除
│   │   └── stats.ts                    # 统计接口
│   └── services/
│       ├── llm.ts                      # Claude API 语音文本解析
│       └── storage.ts                  # 文件存储（本地磁盘）
└── tests/
    ├── helpers/
    │   └── setup.ts                    # 测试数据库 setup/teardown
    ├── auth.test.ts
    ├── babies.test.ts
    ├── records.test.ts
    ├── voice.test.ts
    ├── messages.test.ts
    ├── photos.test.ts
    └── stats.test.ts
```

---

### Task 1: 项目初始化

**Files:**
- Create: `baby-tracker-server/package.json`
- Create: `baby-tracker-server/tsconfig.json`
- Create: `baby-tracker-server/.env.example`
- Create: `baby-tracker-server/src/app.ts`
- Create: `baby-tracker-server/src/server.ts`
- Create: `baby-tracker-server/src/config.ts`

- [ ] **Step 1: 创建项目目录并初始化**

```bash
mkdir -p /Users/bytedance/baby-tracker/baby-tracker-server
cd /Users/bytedance/baby-tracker/baby-tracker-server
pnpm init
```

- [ ] **Step 2: 安装依赖**

```bash
cd /Users/bytedance/baby-tracker/baby-tracker-server
pnpm add fastify @fastify/cors @fastify/multipart @fastify/static @prisma/client bcrypt jsonwebtoken @anthropic-ai/sdk sharp dotenv
pnpm add -D typescript @types/node @types/bcrypt @types/jsonwebtoken prisma tsx vitest @types/sharp
```

- [ ] **Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: 创建 .env.example**

```
DATABASE_URL="postgresql://user:password@localhost:5432/baby_tracker"
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
UPLOAD_DIR="./uploads"
PORT=3000
```

- [ ] **Step 5: 创建 src/config.ts**

```typescript
import { config } from "dotenv";
config();

export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
  UPLOAD_DIR: process.env.UPLOAD_DIR || "./uploads",
  PORT: parseInt(process.env.PORT || "3000", 10),
};
```

- [ ] **Step 6: 创建 src/app.ts**

```typescript
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  });

  app.get("/api/health", async () => ({ status: "ok" }));

  return app;
}
```

- [ ] **Step 7: 创建 src/server.ts**

```typescript
import { buildApp } from "./app.js";
import { env } from "./config.js";

async function start() {
  const app = await buildApp();
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
}

start();
```

- [ ] **Step 8: 添加 package.json scripts**

在 package.json 中添加：
```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 9: 验证项目启动**

```bash
cd /Users/bytedance/baby-tracker/baby-tracker-server
pnpm dev
# 期望：服务器启动在 port 3000
# 访问 http://localhost:3000/api/health 返回 {"status":"ok"}
```

- [ ] **Step 10: Commit**

```bash
git add baby-tracker-server/
git commit -m "feat(server): initialize Fastify + TypeScript project"
```

---

### Task 2: Prisma Schema 与数据库

**Files:**
- Create: `baby-tracker-server/prisma/schema.prisma`

- [ ] **Step 1: 创建 Prisma Schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Gender {
  male
  female
  unknown
}

enum BabyMemberRole {
  admin
  member
}

enum RecordType {
  feeding_breast
  feeding_formula
  poop
  pee
  sleep
  bath
  temperature
  weight
  jaundice
  daily_change
}

model User {
  id            String        @id @default(uuid()) @db.Uuid
  email         String        @unique
  passwordHash  String        @map("password_hash")
  nickname      String
  avatarUrl     String?       @map("avatar_url")
  createdAt     DateTime      @default(now()) @map("created_at")

  babyMembers   BabyMember[]
  records       Record[]
  messages      Message[]
  photos        Photo[]

  @@map("users")
}

model Baby {
  id            String        @id @default(uuid()) @db.Uuid
  name          String
  gender        Gender        @default(unknown)
  birthDate     DateTime      @map("birth_date") @db.Date
  avatarUrl     String?       @map("avatar_url")
  createdAt     DateTime      @default(now()) @map("created_at")

  members       BabyMember[]
  records       Record[]
  messages      Message[]
  photos        Photo[]

  @@map("babies")
}

model BabyMember {
  babyId        String        @map("baby_id") @db.Uuid
  userId        String        @map("user_id") @db.Uuid
  role          BabyMemberRole @default(member)
  inviteCode    String?       @unique @map("invite_code")
  joinedAt      DateTime      @default(now()) @map("joined_at")

  baby          Baby          @relation(fields: [babyId], references: [id], onDelete: Cascade)
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([babyId, userId])
  @@map("baby_members")
}

model Record {
  id            String        @id @default(uuid()) @db.Uuid
  babyId        String        @map("baby_id") @db.Uuid
  userId        String        @map("user_id") @db.Uuid
  type          RecordType
  recordedAt    DateTime      @map("recorded_at")
  data          Json          @default("{}")
  note          String?
  createdAt     DateTime      @default(now()) @map("created_at")

  baby          Baby          @relation(fields: [babyId], references: [id], onDelete: Cascade)
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  photos        Photo[]

  @@index([babyId, recordedAt])
  @@map("records")
}

model Message {
  id                    String    @id @default(uuid()) @db.Uuid
  babyId                String    @map("baby_id") @db.Uuid
  userId                String    @map("user_id") @db.Uuid
  textContent           String?   @map("text_content")
  audioUrl              String?   @map("audio_url")
  audioDurationSeconds  Float?    @map("audio_duration_seconds")
  recordedAt            DateTime  @map("recorded_at")
  createdAt             DateTime  @default(now()) @map("created_at")

  baby                  Baby      @relation(fields: [babyId], references: [id], onDelete: Cascade)
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  photos                Photo[]

  @@index([babyId, recordedAt])
  @@map("messages")
}

model Photo {
  id              String    @id @default(uuid()) @db.Uuid
  babyId          String    @map("baby_id") @db.Uuid
  userId          String    @map("user_id") @db.Uuid
  recordId        String?   @map("record_id") @db.Uuid
  messageId       String?   @map("message_id") @db.Uuid
  url             String
  thumbnailUrl    String    @map("thumbnail_url")
  uploadedAt      DateTime  @default(now()) @map("uploaded_at")

  baby            Baby      @relation(fields: [babyId], references: [id], onDelete: Cascade)
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  record          Record?   @relation(fields: [recordId], references: [id], onDelete: SetNull)
  message         Message?  @relation(fields: [messageId], references: [id], onDelete: SetNull)

  @@index([babyId, uploadedAt])
  @@map("photos")
}
```

- [ ] **Step 2: 生成 Prisma Client 并迁移**

```bash
cd /Users/bytedance/baby-tracker/baby-tracker-server
# 确保 PostgreSQL 已运行且 DATABASE_URL 配置正确
cp .env.example .env
# 编辑 .env 填入实际数据库连接信息
npx prisma migrate dev --name init
```

Run: `npx prisma migrate dev --name init`
Expected: Migration 成功，数据库表创建完毕

- [ ] **Step 3: Commit**

```bash
git add baby-tracker-server/prisma/
git commit -m "feat(server): add Prisma schema with all data models"
```

---

### Task 3: JWT 认证中间件

**Files:**
- Create: `baby-tracker-server/src/middleware/auth.ts`
- Test: `baby-tracker-server/tests/helpers/setup.ts`

- [ ] **Step 1: 创建测试 helper**

```typescript
// tests/helpers/setup.ts
import { buildApp } from "../../src/app.js";
import { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";

export const prisma = new PrismaClient();

export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  return app;
}

export async function cleanDb() {
  await prisma.photo.deleteMany();
  await prisma.message.deleteMany();
  await prisma.record.deleteMany();
  await prisma.babyMember.deleteMany();
  await prisma.baby.deleteMany();
  await prisma.user.deleteMany();
}
```

- [ ] **Step 2: 创建 auth 中间件**

```typescript
// src/middleware/auth.ts
import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../config.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing token" });
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    request.userId = payload.userId;
  } catch {
    return reply.status(401).send({ error: "Invalid token" });
  }
}

export async function requireBabyAccess(
  request: FastifyRequest<{ Params: { babyId: string } }>,
  reply: FastifyReply
) {
  const member = await prisma.babyMember.findUnique({
    where: {
      babyId_userId: {
        babyId: request.params.babyId,
        userId: request.userId,
      },
    },
  });

  if (!member) {
    return reply.status(403).send({ error: "No access to this baby" });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add baby-tracker-server/src/middleware/ baby-tracker-server/tests/
git commit -m "feat(server): add JWT auth middleware and test helpers"
```

---

### Task 4: 认证路由（注册/登录/刷新）

**Files:**
- Create: `baby-tracker-server/src/routes/auth.ts`
- Create: `baby-tracker-server/tests/auth.test.ts`

- [ ] **Step 1: 编写认证测试**

```typescript
// tests/auth.test.ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createTestApp, cleanDb, prisma } from "./helpers/setup.js";

describe("Auth API", () => {
  let app: Awaited<ReturnType<typeof createTestApp>>;

  beforeEach(async () => {
    app = await createTestApp();
    await cleanDb();
  });

  afterAll(async () => {
    await cleanDb();
    await prisma.$disconnect();
  });

  it("POST /api/auth/register - creates user and returns tokens", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "test@example.com",
        password: "password123",
        nickname: "TestUser",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
    expect(body.user.email).toBe("test@example.com");
  });

  it("POST /api/auth/register - rejects duplicate email", async () => {
    const payload = {
      email: "test@example.com",
      password: "password123",
      nickname: "TestUser",
    };
    await app.inject({ method: "POST", url: "/api/auth/register", payload });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload,
    });
    expect(res.statusCode).toBe(409);
  });

  it("POST /api/auth/login - returns tokens for valid credentials", async () => {
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "test@example.com",
        password: "password123",
        nickname: "TestUser",
      },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "test@example.com", password: "password123" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeDefined();
  });

  it("POST /api/auth/login - rejects invalid password", async () => {
    await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "test@example.com",
        password: "password123",
        nickname: "TestUser",
      },
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { email: "test@example.com", password: "wrong" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /api/auth/refresh - returns new access token", async () => {
    const regRes = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      payload: {
        email: "test@example.com",
        password: "password123",
        nickname: "TestUser",
      },
    });
    const { refreshToken } = JSON.parse(regRes.body);
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/refresh",
      payload: { refreshToken },
    });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).accessToken).toBeDefined();
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

```bash
cd /Users/bytedance/baby-tracker/baby-tracker-server
pnpm test -- tests/auth.test.ts
```
Expected: FAIL — routes not implemented

- [ ] **Step 3: 实现认证路由**

```typescript
// src/routes/auth.ts
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { env } from "../config.js";

const prisma = new PrismaClient();

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, env.JWT_SECRET, {
    expiresIn: "7d",
  });
  const refreshToken = jwt.sign({ userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: "30d",
  });
  return { accessToken, refreshToken };
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (request, reply) => {
    const { email, password, nickname } = request.body as {
      email: string;
      password: string;
      nickname: string;
    };

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, nickname },
    });

    const tokens = generateTokens(user.id);
    return reply.status(201).send({
      ...tokens,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    });
  });

  app.post("/api/auth/login", async (request, reply) => {
    const { email, password } = request.body as {
      email: string;
      password: string;
    };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const tokens = generateTokens(user.id);
    return reply.send({
      ...tokens,
      user: { id: user.id, email: user.email, nickname: user.nickname },
    });
  });

  app.post("/api/auth/refresh", async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string };

    try {
      const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
        userId: string;
      };
      const tokens = generateTokens(payload.userId);
      return reply.send(tokens);
    } catch {
      return reply.status(401).send({ error: "Invalid refresh token" });
    }
  });
}
```

- [ ] **Step 4: 在 app.ts 中注册路由**

在 `src/app.ts` 中添加：
```typescript
import { authRoutes } from "./routes/auth.js";
// 在 buildApp 函数中注册
await app.register(authRoutes);
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pnpm test -- tests/auth.test.ts
```
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add baby-tracker-server/src/routes/auth.ts baby-tracker-server/tests/auth.test.ts baby-tracker-server/src/app.ts
git commit -m "feat(server): add auth routes - register, login, refresh"
```

---

### Task 5: 宝宝管理路由

**Files:**
- Create: `baby-tracker-server/src/routes/babies.ts`
- Create: `baby-tracker-server/tests/babies.test.ts`

- [ ] **Step 1: 编写宝宝管理测试**

测试覆盖：创建宝宝、获取列表、更新信息、生成邀请码、通过邀请码加入。
每个测试先注册用户获取 token，再操作。

- [ ] **Step 2: 运行测试确认失败**

```bash
pnpm test -- tests/babies.test.ts
```

- [ ] **Step 3: 实现宝宝管理路由**

```typescript
// src/routes/babies.ts
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { authenticate, requireBabyAccess } from "../middleware/auth.js";

const prisma = new PrismaClient();

export async function babiesRoutes(app: FastifyInstance) {
  // 创建宝宝
  app.post(
    "/api/babies",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { name, gender, birthDate } = request.body as {
        name: string;
        gender?: string;
        birthDate: string;
      };

      const baby = await prisma.baby.create({
        data: {
          name,
          gender: (gender as any) || "unknown",
          birthDate: new Date(birthDate),
          members: {
            create: { userId: request.userId, role: "admin" },
          },
        },
      });

      return reply.status(201).send(baby);
    }
  );

  // 获取我的宝宝列表
  app.get(
    "/api/babies",
    { preHandler: [authenticate] },
    async (request) => {
      const members = await prisma.babyMember.findMany({
        where: { userId: request.userId },
        include: { baby: true },
      });
      return members.map((m) => ({ ...m.baby, role: m.role }));
    }
  );

  // 更新宝宝信息
  app.put(
    "/api/babies/:babyId",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const data = request.body as {
        name?: string;
        gender?: string;
        birthDate?: string;
        avatarUrl?: string;
      };

      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.gender) updateData.gender = data.gender;
      if (data.birthDate) updateData.birthDate = new Date(data.birthDate);
      if (data.avatarUrl) updateData.avatarUrl = data.avatarUrl;

      return prisma.baby.update({ where: { id: babyId }, data: updateData });
    }
  );

  // 生成邀请码
  app.post(
    "/api/babies/:babyId/invite",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const inviteCode = randomBytes(4).toString("hex"); // 8 字符

      await prisma.babyMember.update({
        where: { babyId_userId: { babyId, userId: request.userId } },
        data: { inviteCode },
      });

      return { inviteCode };
    }
  );

  // 通过邀请码加入
  app.post(
    "/api/babies/join",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { inviteCode } = request.body as { inviteCode: string };

      const member = await prisma.babyMember.findUnique({
        where: { inviteCode },
      });
      if (!member) {
        return reply.status(404).send({ error: "Invalid invite code" });
      }

      const existing = await prisma.babyMember.findUnique({
        where: {
          babyId_userId: { babyId: member.babyId, userId: request.userId },
        },
      });
      if (existing) {
        return reply.status(409).send({ error: "Already a member" });
      }

      await prisma.babyMember.create({
        data: {
          babyId: member.babyId,
          userId: request.userId,
          role: "member",
        },
      });

      const baby = await prisma.baby.findUnique({
        where: { id: member.babyId },
      });
      return reply.status(201).send(baby);
    }
  );
}
```

- [ ] **Step 4: 在 app.ts 中注册路由**

```typescript
import { babiesRoutes } from "./routes/babies.js";
await app.register(babiesRoutes);
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pnpm test -- tests/babies.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add baby-tracker-server/src/routes/babies.ts baby-tracker-server/tests/babies.test.ts baby-tracker-server/src/app.ts
git commit -m "feat(server): add baby management routes with invite system"
```

---

### Task 6: 记录 CRUD 路由

**Files:**
- Create: `baby-tracker-server/src/routes/records.ts`
- Create: `baby-tracker-server/tests/records.test.ts`

- [ ] **Step 1: 编写记录测试**

测试覆盖：创建记录（各类型）、按日期查询、获取每日小结、修改记录、删除记录。

- [ ] **Step 2: 运行测试确认失败**

- [ ] **Step 3: 实现记录路由**

```typescript
// src/routes/records.ts
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireBabyAccess } from "../middleware/auth.js";

const prisma = new PrismaClient();

export async function recordsRoutes(app: FastifyInstance) {
  // 创建记录
  app.post(
    "/api/babies/:babyId/records",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request, reply) => {
      const { babyId } = request.params as { babyId: string };
      const { type, recordedAt, data, note } = request.body as {
        type: string;
        recordedAt: string;
        data?: any;
        note?: string;
      };

      const record = await prisma.record.create({
        data: {
          babyId,
          userId: request.userId,
          type: type as any,
          recordedAt: new Date(recordedAt),
          data: data || {},
          note,
        },
        include: { user: { select: { nickname: true } } },
      });

      return reply.status(201).send(record);
    }
  );

  // 按日期查询记录
  app.get(
    "/api/babies/:babyId/records",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { date } = request.query as { date?: string };

      const where: any = { babyId };
      if (date) {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        where.recordedAt = { gte: start, lt: end };
      }

      return prisma.record.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true } },
          photos: { select: { id: true, thumbnailUrl: true } },
        },
        orderBy: { recordedAt: "desc" },
      });
    }
  );

  // 每日小结
  app.get(
    "/api/babies/:babyId/records/summary",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { date } = request.query as { date: string };

      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);

      const records = await prisma.record.findMany({
        where: {
          babyId,
          recordedAt: { gte: start, lt: end },
        },
      });

      const summary: any = {
        date,
        feedingFormula: { count: 0, totalMl: 0 },
        feedingBreast: { count: 0, totalMinutes: 0 },
        poop: { count: 0, details: [] },
        pee: { count: 0 },
        sleep: { count: 0, totalHours: 0 },
        bath: { count: 0 },
        temperature: null,
        weight: null,
        jaundice: null,
        dailyChange: null,
      };

      for (const r of records) {
        const data = r.data as any;
        switch (r.type) {
          case "feeding_formula":
            summary.feedingFormula.count++;
            summary.feedingFormula.totalMl += data.amount_ml || 0;
            break;
          case "feeding_breast":
            summary.feedingBreast.count++;
            summary.feedingBreast.totalMinutes += data.duration_minutes || 0;
            break;
          case "poop":
            summary.poop.count++;
            summary.poop.details.push({ color: data.color, texture: data.texture });
            break;
          case "pee":
            summary.pee.count++;
            break;
          case "sleep":
            summary.sleep.count++;
            if (data.end_time) {
              const sleepStart = r.recordedAt.getTime();
              const sleepEnd = new Date(data.end_time).getTime();
              summary.sleep.totalHours += (sleepEnd - sleepStart) / 3600000;
            }
            break;
          case "bath":
            summary.bath.count++;
            break;
          case "temperature":
            summary.temperature = { value: data.value, method: data.method };
            break;
          case "weight":
            summary.weight = { value_g: data.value_g };
            break;
          case "jaundice":
            summary.jaundice = { value: data.value, position: data.position };
            break;
          case "daily_change":
            summary.dailyChange = data.description;
            break;
        }
      }

      return summary;
    }
  );

  // 修改记录
  app.put(
    "/api/records/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { type, recordedAt, data, note } = request.body as {
        type?: string;
        recordedAt?: string;
        data?: any;
        note?: string;
      };

      const record = await prisma.record.findUnique({ where: { id } });
      if (!record) {
        return reply.status(404).send({ error: "Record not found" });
      }

      // 校验用户有权限访问该宝宝
      const member = await prisma.babyMember.findUnique({
        where: { babyId_userId: { babyId: record.babyId, userId: request.userId } },
      });
      if (!member) {
        return reply.status(403).send({ error: "No access" });
      }

      const updateData: any = {};
      if (type) updateData.type = type;
      if (recordedAt) updateData.recordedAt = new Date(recordedAt);
      if (data) updateData.data = data;
      if (note !== undefined) updateData.note = note;

      return prisma.record.update({ where: { id }, data: updateData });
    }
  );

  // 删除记录
  app.delete(
    "/api/records/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const record = await prisma.record.findUnique({ where: { id } });
      if (!record) {
        return reply.status(404).send({ error: "Record not found" });
      }

      const member = await prisma.babyMember.findUnique({
        where: { babyId_userId: { babyId: record.babyId, userId: request.userId } },
      });
      if (!member) {
        return reply.status(403).send({ error: "No access" });
      }

      await prisma.record.delete({ where: { id } });
      return reply.status(204).send();
    }
  );
}
```

- [ ] **Step 4: 注册路由并运行测试**

```typescript
import { recordsRoutes } from "./routes/records.js";
await app.register(recordsRoutes);
```

```bash
pnpm test -- tests/records.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add baby-tracker-server/src/routes/records.ts baby-tracker-server/tests/records.test.ts baby-tracker-server/src/app.ts
git commit -m "feat(server): add record CRUD routes with daily summary"
```

---

### Task 7: 语音解析服务 + 路由

**Files:**
- Create: `baby-tracker-server/src/services/llm.ts`
- Create: `baby-tracker-server/tests/voice.test.ts`

- [ ] **Step 1: 编写语音解析测试**

测试覆盖：单条记录解析、多条记录解析、解析失败容错。
使用 mock 模拟 Claude API 响应。

- [ ] **Step 2: 运行测试确认失败**

- [ ] **Step 3: 实现 LLM 服务**

```typescript
// src/services/llm.ts
import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config.js";

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

interface ParsedRecord {
  type: string;
  recordedAt: string;
  data: Record<string, any>;
  note?: string;
}

export async function parseVoiceText(
  text: string,
  babyName: string,
  currentTime: string
): Promise<ParsedRecord[]> {
  const systemPrompt = `你是婴儿记录助手。从用户的语音文本中提取结构化的婴儿护理记录。

当前时间：${currentTime}
宝宝名字：${babyName}

支持的记录类型及 data 字段：
- feeding_breast：亲喂 — { duration_minutes: number, side: "left"|"right"|"both" }
- feeding_formula：配方奶 — { amount_ml: number }
- poop：大便 — { color: string, texture: string }
- pee：小便 — {}
- sleep：睡眠 — { end_time: "ISO时间" }（recordedAt 为入睡时间）
- bath：洗澡 — { duration_minutes?: number, water_temp?: number }
- temperature：体温 — { value: number, method: "ear"|"forehead"|"armpit" }
- weight：体重 — { value_g: number }
- jaundice：黄疸 — { value: number, position: "forehead"|"chest" }
- daily_change：今日变化 — { description: string }

规则：
- 对于"刚才""刚刚"等相对时间，使用当前时间
- 对于"三点""下午两点"等明确时间，转换为当天的 ISO 时间
- 一段文本可能包含多条记录
- 返回 JSON 数组，每条记录包含 type, recordedAt (ISO), data
- 如果无法识别任何记录，返回空数组 []
- 只返回 JSON，不要其他文字`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: text }],
  });

  const content = response.content[0];
  if (content.type !== "text") return [];

  try {
    const parsed = JSON.parse(content.text);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: 在 records.ts 中添加语音解析路由**

在 `src/routes/records.ts` 中添加：

```typescript
import { parseVoiceText } from "../services/llm.js";

// 语音解析 — 返回预览
app.post(
  "/api/babies/:babyId/records/voice",
  { preHandler: [authenticate, requireBabyAccess] },
  async (request) => {
    const { babyId } = request.params as { babyId: string };
    const { text } = request.body as { text: string };

    const baby = await prisma.baby.findUnique({ where: { id: babyId } });
    const currentTime = new Date().toISOString();
    const parsed = await parseVoiceText(text, baby!.name, currentTime);

    return { parsed };
  }
);

// 确认保存解析结果
app.post(
  "/api/babies/:babyId/records/voice/confirm",
  { preHandler: [authenticate, requireBabyAccess] },
  async (request, reply) => {
    const { babyId } = request.params as { babyId: string };
    const { records: recordsData } = request.body as {
      records: Array<{
        type: string;
        recordedAt: string;
        data: any;
        note?: string;
      }>;
    };

    const created = await prisma.$transaction(
      recordsData.map((r) =>
        prisma.record.create({
          data: {
            babyId,
            userId: request.userId,
            type: r.type as any,
            recordedAt: new Date(r.recordedAt),
            data: r.data,
            note: r.note,
          },
        })
      )
    );

    return reply.status(201).send(created);
  }
);
```

- [ ] **Step 5: 运行测试确认通过**

```bash
pnpm test -- tests/voice.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add baby-tracker-server/src/services/llm.ts baby-tracker-server/src/routes/records.ts baby-tracker-server/tests/voice.test.ts
git commit -m "feat(server): add voice text parsing with Claude API"
```

---

### Task 8: 文件存储服务

**Files:**
- Create: `baby-tracker-server/src/services/storage.ts`

- [ ] **Step 1: 实现本地文件存储**

```typescript
// src/services/storage.ts
import { mkdir, writeFile, unlink } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { env } from "../config.js";

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

export async function saveFile(
  buffer: Buffer,
  originalName: string,
  subdir: string
): Promise<string> {
  const dir = join(env.UPLOAD_DIR, subdir);
  await ensureDir(dir);

  const ext = extname(originalName);
  const filename = `${randomUUID()}${ext}`;
  const filepath = join(dir, filename);
  await writeFile(filepath, buffer);

  return `/${subdir}/${filename}`;
}

export async function savePhoto(
  buffer: Buffer,
  originalName: string
): Promise<{ url: string; thumbnailUrl: string }> {
  const url = await saveFile(buffer, originalName, "photos");

  // 生成缩略图
  const dir = join(env.UPLOAD_DIR, "photos", "thumbs");
  await ensureDir(dir);

  const ext = extname(originalName);
  const thumbFilename = `${randomUUID()}${ext}`;
  const thumbPath = join(dir, thumbFilename);

  await sharp(buffer).resize(300, 300, { fit: "cover" }).toFile(thumbPath);

  const thumbnailUrl = `/photos/thumbs/${thumbFilename}`;
  return { url, thumbnailUrl };
}

export async function deleteFile(filepath: string): Promise<void> {
  const fullPath = join(env.UPLOAD_DIR, filepath);
  try {
    await unlink(fullPath);
  } catch {
    // 文件不存在忽略
  }
}
```

- [ ] **Step 2: 在 app.ts 中注册静态文件服务**

```typescript
import fastifyStatic from "@fastify/static";
import { join } from "path";
import { env } from "./config.js";

// 在 buildApp 中添加
await app.register(fastifyStatic, {
  root: join(process.cwd(), env.UPLOAD_DIR),
  prefix: "/uploads/",
});
```

注意：需要安装 `pnpm add @fastify/static`

- [ ] **Step 3: Commit**

```bash
git add baby-tracker-server/src/services/storage.ts baby-tracker-server/src/app.ts
git commit -m "feat(server): add file storage service with thumbnail generation"
```

---

### Task 9: 照片路由

**Files:**
- Create: `baby-tracker-server/src/routes/photos.ts`
- Create: `baby-tracker-server/tests/photos.test.ts`

- [ ] **Step 1: 编写照片测试**

测试覆盖：上传照片、获取照片列表、删除照片。

- [ ] **Step 2: 运行测试确认失败**

- [ ] **Step 3: 实现照片路由**

```typescript
// src/routes/photos.ts
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireBabyAccess } from "../middleware/auth.js";
import { savePhoto, deleteFile } from "../services/storage.js";

const prisma = new PrismaClient();

export async function photosRoutes(app: FastifyInstance) {
  // 上传照片
  app.post(
    "/api/babies/:babyId/photos",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request, reply) => {
      const { babyId } = request.params as { babyId: string };
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: "No file uploaded" });
      }

      const buffer = await data.toBuffer();
      const { url, thumbnailUrl } = await savePhoto(buffer, data.filename);

      const fields = data.fields as any;
      const recordId = fields?.recordId?.value || null;
      const messageId = fields?.messageId?.value || null;

      const photo = await prisma.photo.create({
        data: {
          babyId,
          userId: request.userId,
          recordId,
          messageId,
          url,
          thumbnailUrl,
        },
      });

      return reply.status(201).send(photo);
    }
  );

  // 照片列表
  app.get(
    "/api/babies/:babyId/photos",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { date } = request.query as { date?: string };

      const where: any = { babyId };
      if (date) {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 1);
        where.uploadedAt = { gte: start, lt: end };
      }

      return prisma.photo.findMany({
        where,
        orderBy: { uploadedAt: "desc" },
      });
    }
  );

  // 删除照片
  app.delete(
    "/api/photos/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const photo = await prisma.photo.findUnique({ where: { id } });
      if (!photo) {
        return reply.status(404).send({ error: "Photo not found" });
      }

      const member = await prisma.babyMember.findUnique({
        where: { babyId_userId: { babyId: photo.babyId, userId: request.userId } },
      });
      if (!member) {
        return reply.status(403).send({ error: "No access" });
      }

      await deleteFile(photo.url);
      await deleteFile(photo.thumbnailUrl);
      await prisma.photo.delete({ where: { id } });

      return reply.status(204).send();
    }
  );
}
```

- [ ] **Step 4: 注册路由并运行测试**

- [ ] **Step 5: Commit**

```bash
git add baby-tracker-server/src/routes/photos.ts baby-tracker-server/tests/photos.test.ts baby-tracker-server/src/app.ts
git commit -m "feat(server): add photo upload/list/delete routes"
```

---

### Task 10: 寄语路由

**Files:**
- Create: `baby-tracker-server/src/routes/messages.ts`
- Create: `baby-tracker-server/tests/messages.test.ts`

- [ ] **Step 1: 编写寄语测试**

测试覆盖：创建文字寄语、创建含音频寄语、获取列表、获取音频文件。

- [ ] **Step 2: 运行测试确认失败**

- [ ] **Step 3: 实现寄语路由**

```typescript
// src/routes/messages.ts
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireBabyAccess } from "../middleware/auth.js";
import { saveFile } from "../services/storage.js";
import { join } from "path";
import { env } from "../config.js";

const prisma = new PrismaClient();

export async function messagesRoutes(app: FastifyInstance) {
  // 创建寄语
  app.post(
    "/api/babies/:babyId/messages",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request, reply) => {
      const { babyId } = request.params as { babyId: string };

      const parts = request.parts();
      let textContent: string | null = null;
      let audioUrl: string | null = null;
      let audioDurationSeconds: number | null = null;
      let recordedAt = new Date();

      for await (const part of parts) {
        if (part.type === "field") {
          if (part.fieldname === "textContent") textContent = part.value as string;
          if (part.fieldname === "audioDurationSeconds")
            audioDurationSeconds = parseFloat(part.value as string);
          if (part.fieldname === "recordedAt")
            recordedAt = new Date(part.value as string);
        }
        if (part.type === "file" && part.fieldname === "audio") {
          const buffer = await part.toBuffer();
          audioUrl = await saveFile(buffer, part.filename, "audio");
        }
      }

      const message = await prisma.message.create({
        data: {
          babyId,
          userId: request.userId,
          textContent,
          audioUrl,
          audioDurationSeconds,
          recordedAt,
        },
        include: { user: { select: { id: true, nickname: true } } },
      });

      return reply.status(201).send(message);
    }
  );

  // 寄语列表
  app.get(
    "/api/babies/:babyId/messages",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };

      return prisma.message.findMany({
        where: { babyId },
        include: {
          user: { select: { id: true, nickname: true } },
          photos: { select: { id: true, thumbnailUrl: true } },
        },
        orderBy: { recordedAt: "desc" },
      });
    }
  );

  // 获取音频文件
  app.get(
    "/api/messages/:id/audio",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const message = await prisma.message.findUnique({ where: { id } });
      if (!message?.audioUrl) {
        return reply.status(404).send({ error: "Audio not found" });
      }

      const member = await prisma.babyMember.findUnique({
        where: { babyId_userId: { babyId: message.babyId, userId: request.userId } },
      });
      if (!member) {
        return reply.status(403).send({ error: "No access" });
      }

      return reply.sendFile(
        message.audioUrl,
        join(process.cwd(), env.UPLOAD_DIR)
      );
    }
  );
}
```

- [ ] **Step 4: 注册路由并运行测试**

- [ ] **Step 5: Commit**

```bash
git add baby-tracker-server/src/routes/messages.ts baby-tracker-server/tests/messages.test.ts baby-tracker-server/src/app.ts
git commit -m "feat(server): add message routes with audio support"
```

---

### Task 11: 统计路由

**Files:**
- Create: `baby-tracker-server/src/routes/stats.ts`
- Create: `baby-tracker-server/tests/stats.test.ts`

- [ ] **Step 1: 编写统计测试**

测试覆盖：喂奶统计、体重曲线、黄疸趋势、睡眠规律。
先插入一周的模拟数据，再验证统计结果。

- [ ] **Step 2: 运行测试确认失败**

- [ ] **Step 3: 实现统计路由**

```typescript
// src/routes/stats.ts
import { FastifyInstance } from "fastify";
import { PrismaClient } from "@prisma/client";
import { authenticate, requireBabyAccess } from "../middleware/auth.js";

const prisma = new PrismaClient();

function getDateRange(period: string, days: number) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export async function statsRoutes(app: FastifyInstance) {
  // 喂奶统计
  app.get(
    "/api/babies/:babyId/stats/feeding",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { days = "7" } = request.query as { days?: string };
      const { start, end } = getDateRange("days", parseInt(days));

      const records = await prisma.record.findMany({
        where: {
          babyId,
          type: { in: ["feeding_formula", "feeding_breast"] },
          recordedAt: { gte: start, lte: end },
        },
        orderBy: { recordedAt: "asc" },
      });

      // 按天分组
      const dailyStats: Record<string, { formulaMl: number; formulaCount: number; breastMinutes: number; breastCount: number }> = {};

      for (const r of records) {
        const dateKey = r.recordedAt.toISOString().slice(0, 10);
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = { formulaMl: 0, formulaCount: 0, breastMinutes: 0, breastCount: 0 };
        }
        const data = r.data as any;
        if (r.type === "feeding_formula") {
          dailyStats[dateKey].formulaMl += data.amount_ml || 0;
          dailyStats[dateKey].formulaCount++;
        } else {
          dailyStats[dateKey].breastMinutes += data.duration_minutes || 0;
          dailyStats[dateKey].breastCount++;
        }
      }

      return { period: { start, end }, daily: dailyStats };
    }
  );

  // 体重曲线
  app.get(
    "/api/babies/:babyId/stats/weight",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };

      const records = await prisma.record.findMany({
        where: { babyId, type: "weight" },
        orderBy: { recordedAt: "asc" },
      });

      return records.map((r) => ({
        date: r.recordedAt.toISOString().slice(0, 10),
        valueG: (r.data as any).value_g,
      }));
    }
  );

  // 黄疸趋势
  app.get(
    "/api/babies/:babyId/stats/jaundice",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };

      const records = await prisma.record.findMany({
        where: { babyId, type: "jaundice" },
        orderBy: { recordedAt: "asc" },
      });

      return records.map((r) => ({
        date: r.recordedAt.toISOString().slice(0, 10),
        value: (r.data as any).value,
        position: (r.data as any).position,
      }));
    }
  );

  // 睡眠规律
  app.get(
    "/api/babies/:babyId/stats/sleep",
    { preHandler: [authenticate, requireBabyAccess] },
    async (request) => {
      const { babyId } = request.params as { babyId: string };
      const { days = "7" } = request.query as { days?: string };
      const { start, end } = getDateRange("days", parseInt(days));

      const records = await prisma.record.findMany({
        where: {
          babyId,
          type: "sleep",
          recordedAt: { gte: start, lte: end },
        },
        orderBy: { recordedAt: "asc" },
      });

      const dailyStats: Record<string, { totalHours: number; count: number }> = {};

      for (const r of records) {
        const dateKey = r.recordedAt.toISOString().slice(0, 10);
        if (!dailyStats[dateKey]) {
          dailyStats[dateKey] = { totalHours: 0, count: 0 };
        }
        dailyStats[dateKey].count++;
        const data = r.data as any;
        if (data.end_time) {
          const hours =
            (new Date(data.end_time).getTime() - r.recordedAt.getTime()) / 3600000;
          dailyStats[dateKey].totalHours += hours;
        }
      }

      return { period: { start, end }, daily: dailyStats };
    }
  );
}
```

- [ ] **Step 4: 注册路由并运行测试**

- [ ] **Step 5: Commit**

```bash
git add baby-tracker-server/src/routes/stats.ts baby-tracker-server/tests/stats.test.ts baby-tracker-server/src/app.ts
git commit -m "feat(server): add stats routes - feeding, weight, jaundice, sleep"
```

---

### Task 12: 最终集成测试 + 清理

**Files:**
- Modify: `baby-tracker-server/src/app.ts` (确认所有路由已注册)

- [ ] **Step 1: 确认 app.ts 注册了所有路由**

`src/app.ts` 最终应包含：
```typescript
import { authRoutes } from "./routes/auth.js";
import { babiesRoutes } from "./routes/babies.js";
import { recordsRoutes } from "./routes/records.js";
import { messagesRoutes } from "./routes/messages.js";
import { photosRoutes } from "./routes/photos.js";
import { statsRoutes } from "./routes/stats.js";

// 在 buildApp 中
await app.register(authRoutes);
await app.register(babiesRoutes);
await app.register(recordsRoutes);
await app.register(messagesRoutes);
await app.register(photosRoutes);
await app.register(statsRoutes);
```

- [ ] **Step 2: 运行全部测试**

```bash
cd /Users/bytedance/baby-tracker/baby-tracker-server
pnpm test
```
Expected: 全部 PASS

- [ ] **Step 3: 手动冒烟测试**

```bash
pnpm dev
# 注册 → 登录 → 创建宝宝 → 创建记录 → 查询小结
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(server): complete backend API - all routes integrated and tested"
```
