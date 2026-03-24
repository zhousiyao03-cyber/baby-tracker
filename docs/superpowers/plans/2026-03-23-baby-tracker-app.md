# Baby Tracker React Native (Expo) 应用实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个以语音输入为核心的跨平台婴儿成长日志 React Native App，对接已完成的 Fastify 后端 API。

**Architecture:** Expo Router 文件系统路由 + 4 Tab 导航（首页/统计/寄语/我的）+ 中央浮动记录按钮。API 层封装所有后端请求，JWT token 存储在 SecureStore 中，语音识别使用 expo-speech-recognition 调用原生引擎。

**Tech Stack:** React Native (Expo SDK 53)、TypeScript、Expo Router v4、expo-speech-recognition、expo-av、expo-image-picker、expo-secure-store、react-native-chart-kit、zustand（状态管理）

**设计文档:** `docs/superpowers/specs/2026-03-23-baby-tracker-design.md`

**后端 API 基础地址:** `http://localhost:3000`（开发环境）

---

## 文件结构

```
baby-tracker-app/
├── app/                              # Expo Router 文件系统路由
│   ├── _layout.tsx                   # 根布局（AuthProvider + 路由守卫）
│   ├── (auth)/                       # 认证页面组
│   │   ├── _layout.tsx               # 认证布局（无 Tab）
│   │   ├── login.tsx                 # 登录页
│   │   └── register.tsx              # 注册页
│   ├── (tabs)/                       # 主 Tab 布局
│   │   ├── _layout.tsx               # Tab 导航配置（4 Tab + 中央按钮）
│   │   ├── index.tsx                 # 首页（今日总览）
│   │   ├── stats.tsx                 # 统计趋势
│   │   ├── messages.tsx              # 父母寄语
│   │   └── profile.tsx               # 我的设置
│   ├── record/                       # 记录相关页面
│   │   ├── manual.tsx                # 手动记录表单
│   │   └── confirm.tsx               # 语音解析确认
│   ├── baby/                         # 宝宝管理页面
│   │   ├── create.tsx                # 创建宝宝档案
│   │   └── join.tsx                  # 通过邀请码加入
│   └── photo/                        # 照片相关
│       └── view.tsx                  # 照片查看（全屏）
├── components/                       # 可复用组件
│   ├── DailySummary.tsx              # 每日小结宫格
│   ├── Timeline.tsx                  # 时间线流水
│   ├── TimelineItem.tsx              # 时间线单条记录
│   ├── RecordSheet.tsx               # 记录面板（语音+文字+快捷按钮）
│   ├── VoiceButton.tsx               # 语音大按钮（按住说话）
│   ├── QuickButtons.tsx              # 快捷记录按钮宫格
│   ├── RecordCard.tsx                # 解析结果确认卡片
│   ├── MessageItem.tsx               # 寄语单条展示
│   ├── StatChart.tsx                 # 统计图表组件
│   └── EmptyState.tsx                # 空状态提示
├── services/                         # API 和设备服务
│   ├── api.ts                        # axios 实例 + 请求/响应拦截器
│   ├── auth-api.ts                   # 认证 API（register/login/refresh）
│   ├── baby-api.ts                   # 宝宝管理 API
│   ├── record-api.ts                 # 记录 CRUD + 语音解析 API
│   ├── message-api.ts                # 寄语 API
│   ├── photo-api.ts                  # 照片上传/列表 API
│   └── stats-api.ts                  # 统计 API
├── stores/                           # 状态管理
│   ├── auth-store.ts                 # 认证状态（token, user, baby）
│   └── record-store.ts               # 当前记录状态（语音解析结果暂存）
├── hooks/                            # 自定义 hooks
│   ├── use-speech.ts                 # 语音识别 hook
│   └── use-audio.ts                  # 音频录制/播放 hook
├── constants/                        # 常量定义
│   ├── theme.ts                      # 主题色、圆角、阴影等
│   └── record-types.ts               # 记录类型定义 + 图标 + 颜色映射
├── types/                            # TypeScript 类型
│   └── index.ts                      # 所有接口和类型定义
├── app.json                          # Expo 配置
├── package.json
└── tsconfig.json
```

---

## Task 1: 项目初始化与依赖安装

**Files:**
- Create: `baby-tracker-app/` 整个项目目录
- Create: `baby-tracker-app/app.json`
- Create: `baby-tracker-app/package.json`
- Create: `baby-tracker-app/tsconfig.json`

- [ ] **Step 1: 创建 Expo 项目**

```bash
cd /Users/bytedance/baby-tracker
npx create-expo-app@latest baby-tracker-app --template blank-typescript
```

- [ ] **Step 2: 安装核心依赖**

```bash
cd /Users/bytedance/baby-tracker/baby-tracker-app
pnpm add expo-router expo-speech-recognition expo-av expo-image-picker expo-secure-store
pnpm add axios zustand
pnpm add react-native-chart-kit react-native-svg
pnpm add react-native-safe-area-context react-native-screens expo-status-bar expo-constants expo-linking
pnpm add date-fns
pnpm add @expo/vector-icons
```

- [ ] **Step 3: 配置 Expo Router**

修改 `app.json`，添加 scheme 和 router 插件：

```json
{
  "expo": {
    "name": "Baby Tracker",
    "slug": "baby-tracker",
    "scheme": "baby-tracker",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#FFF5F5"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.babytracker.app",
      "infoPlist": {
        "NSSpeechRecognitionUsageDescription": "需要语音识别权限来记录宝宝日常",
        "NSMicrophoneUsageDescription": "需要麦克风权限来录制语音"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFF5F5"
      },
      "package": "com.babytracker.app",
      "permissions": ["RECORD_AUDIO"]
    },
    "plugins": [
      "expo-router",
      [
        "expo-speech-recognition",
        {
          "microphonePermission": "需要麦克风权限来录制语音",
          "speechRecognitionPermission": "需要语音识别权限来记录宝宝日常"
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": "需要麦克风权限来录制语音寄语"
        }
      ],
      "expo-secure-store"
    ]
  }
}
```

- [ ] **Step 4: 配置 TypeScript**

确认 `tsconfig.json` 包含正确配置：

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 5: 验证项目能启动**

```bash
cd /Users/bytedance/baby-tracker/baby-tracker-app
npx expo start
```

预期：Expo 开发服务器启动，无编译错误。

- [ ] **Step 6: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/
git commit -m "feat(app): 初始化 Expo 项目，安装核心依赖"
```

---

## Task 2: TypeScript 类型定义与常量

**Files:**
- Create: `baby-tracker-app/types/index.ts`
- Create: `baby-tracker-app/constants/theme.ts`
- Create: `baby-tracker-app/constants/record-types.ts`

- [ ] **Step 1: 定义所有 TypeScript 类型**

```typescript
// types/index.ts

// ===== 用户 =====
export interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// ===== 宝宝 =====
export type Gender = "male" | "female" | "unknown";
export type BabyMemberRole = "admin" | "member";

export interface Baby {
  id: string;
  name: string;
  gender: Gender;
  birthDate: string;
  avatarUrl?: string;
  createdAt: string;
  role?: BabyMemberRole;
}

// ===== 记录 =====
export type RecordType =
  | "feeding_breast"
  | "feeding_formula"
  | "poop"
  | "pee"
  | "sleep"
  | "bath"
  | "temperature"
  | "weight"
  | "jaundice"
  | "daily_change";

export interface FeedingBreastData {
  duration_minutes: number;
  side: "left" | "right" | "both";
}

export interface FeedingFormulaData {
  amount_ml: number;
}

export interface PoopData {
  color: string;
  texture: string;
}

export interface SleepData {
  end_time: string;
}

export interface BathData {
  duration_minutes?: number;
  water_temp?: number;
}

export interface TemperatureData {
  value: number;
  method: "ear" | "forehead" | "armpit";
}

export interface WeightData {
  value_g: number;
}

export interface JaundiceData {
  value: number;
  position: "forehead" | "chest";
}

export interface DailyChangeData {
  description: string;
}

export type RecordData =
  | FeedingBreastData
  | FeedingFormulaData
  | PoopData
  | Record<string, never>
  | SleepData
  | BathData
  | TemperatureData
  | WeightData
  | JaundiceData
  | DailyChangeData;

export interface BabyRecord {
  id: string;
  babyId: string;
  userId: string;
  type: RecordType;
  recordedAt: string;
  data: RecordData;
  note?: string;
  createdAt: string;
  user?: { id: string; nickname: string; avatarUrl?: string };
  photos?: Photo[];
}

export interface ParsedRecord {
  type: RecordType;
  recordedAt: string;
  data: RecordData;
  note?: string;
}

// ===== 每日小结 =====
export interface DailySummary {
  date: string;
  formulaTotalMl: number;
  formulaCount: number;
  breastTotalMinutes: number;
  breastCount: number;
  poopCount: number;
  peeCount: number;
  sleepTotalHours: number;
  sleepCount: number;
  bathCount: number;
  latestTemperature?: number;
  latestWeight?: number;
  latestJaundice?: number;
}

// ===== 寄语 =====
export interface Message {
  id: string;
  babyId: string;
  userId: string;
  textContent?: string;
  audioUrl?: string;
  audioDurationSeconds?: number;
  recordedAt: string;
  createdAt: string;
  user: { id: string; nickname: string; avatarUrl?: string };
  photos: Photo[];
}

// ===== 照片 =====
export interface Photo {
  id: string;
  babyId: string;
  userId: string;
  recordId?: string;
  messageId?: string;
  url: string;
  thumbnailUrl: string;
  uploadedAt: string;
}

// ===== 统计 =====
export interface FeedingStat {
  date: string;
  formulaMl: number;
  formulaCount: number;
  breastMinutes: number;
  breastCount: number;
}

export interface WeightStat {
  date: string;
  recordedAt: string;
  valueG: number;
}

export interface JaundiceStat {
  date: string;
  recordedAt: string;
  value: number;
  position: string;
}

export interface SleepStat {
  date: string;
  totalHours: number;
  count: number;
}
```

- [ ] **Step 2: 定义主题常量**

```typescript
// constants/theme.ts

export const Colors = {
  // 主色调 — 温馨粉色系
  primary: "#FF8FA3",
  primaryLight: "#FFB3C1",
  primaryDark: "#E05A7A",

  // 背景
  background: "#FFF5F5",
  surface: "#FFFFFF",
  surfaceSecondary: "#FFF0F0",

  // 文字
  textPrimary: "#2D2D2D",
  textSecondary: "#8E8E93",
  textLight: "#C7C7CC",

  // 标记色 — 爸爸蓝、妈妈粉
  dadBlue: "#5AC8FA",
  momPink: "#FF6B8A",

  // 记录类型色
  feeding: "#FFB347",
  poop: "#A0522D",
  pee: "#87CEEB",
  sleep: "#9B59B6",
  bath: "#3498DB",
  temperature: "#E74C3C",
  weight: "#2ECC71",
  jaundice: "#F1C40F",
  dailyChange: "#1ABC9C",

  // 功能色
  success: "#34C759",
  warning: "#FF9500",
  error: "#FF3B30",
  border: "#E5E5EA",
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
};
```

- [ ] **Step 3: 定义记录类型映射**

```typescript
// constants/record-types.ts

import { RecordType } from "@/types";
import { Colors } from "./theme";

export interface RecordTypeConfig {
  label: string;
  icon: string;           // @expo/vector-icons MaterialCommunityIcons name
  color: string;
  unit?: string;
}

export const RECORD_TYPE_MAP: Record<RecordType, RecordTypeConfig> = {
  feeding_formula: {
    label: "配方奶",
    icon: "baby-bottle-outline",
    color: Colors.feeding,
    unit: "ml",
  },
  feeding_breast: {
    label: "亲喂",
    icon: "mother-nurse",
    color: Colors.feeding,
    unit: "分钟",
  },
  poop: {
    label: "大便",
    icon: "emoticon-poop",
    color: Colors.poop,
  },
  pee: {
    label: "小便",
    icon: "water",
    color: Colors.pee,
  },
  sleep: {
    label: "睡眠",
    icon: "sleep",
    color: Colors.sleep,
  },
  bath: {
    label: "洗澡",
    icon: "bathtub-outline",
    color: Colors.bath,
  },
  temperature: {
    label: "体温",
    icon: "thermometer",
    color: Colors.temperature,
    unit: "°C",
  },
  weight: {
    label: "体重",
    icon: "scale-bathroom",
    color: Colors.weight,
    unit: "g",
  },
  jaundice: {
    label: "黄疸",
    icon: "sun-thermometer",
    color: Colors.jaundice,
  },
  daily_change: {
    label: "今日变化",
    icon: "note-text-outline",
    color: Colors.dailyChange,
  },
};

// 快捷按钮顺序（4x3 宫格，含拍照）
export const QUICK_BUTTON_ORDER: (RecordType | "photo")[] = [
  "feeding_formula",
  "feeding_breast",
  "poop",
  "pee",
  "sleep",
  "bath",
  "temperature",
  "weight",
  "jaundice",
  "daily_change",
  "photo",
];
```

- [ ] **Step 4: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/types/ baby-tracker-app/constants/
git commit -m "feat(app): 添加 TypeScript 类型定义和主题常量"
```

---

## Task 3: API 服务层

**Files:**
- Create: `baby-tracker-app/services/api.ts`
- Create: `baby-tracker-app/services/auth-api.ts`
- Create: `baby-tracker-app/services/baby-api.ts`
- Create: `baby-tracker-app/services/record-api.ts`
- Create: `baby-tracker-app/services/message-api.ts`
- Create: `baby-tracker-app/services/photo-api.ts`
- Create: `baby-tracker-app/services/stats-api.ts`

- [ ] **Step 1: 创建 axios 实例与拦截器**

```typescript
// services/api.ts

import axios from "axios";
import * as SecureStore from "expo-secure-store";

const API_BASE_URL = __DEV__
  ? "http://localhost:3000"
  : "https://api.baby-tracker.com";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// 请求拦截器：自动附加 JWT token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：自动刷新过期 token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");
        const { data } = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
          refreshToken,
        });
        await SecureStore.setItemAsync("accessToken", data.accessToken);
        await SecureStore.setItemAsync("refreshToken", data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        // refresh 也失败了，清除 token，让 auth store 处理跳转
        await SecureStore.deleteItemAsync("accessToken");
        await SecureStore.deleteItemAsync("refreshToken");
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

// 文件上传用的基础 URL（供图片/音频 URL 拼接）
export { API_BASE_URL };
```

- [ ] **Step 2: 创建认证 API**

```typescript
// services/auth-api.ts

import { api } from "./api";
import { AuthResponse } from "@/types";

export async function register(
  email: string,
  password: string,
  nickname: string
): Promise<AuthResponse> {
  const { data } = await api.post("/api/auth/register", {
    email,
    password,
    nickname,
  });
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await api.post("/api/auth/login", { email, password });
  return data;
}

export async function refreshToken(token: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const { data } = await api.post("/api/auth/refresh", {
    refreshToken: token,
  });
  return data;
}
```

- [ ] **Step 3: 创建宝宝管理 API**

```typescript
// services/baby-api.ts

import { api } from "./api";
import { Baby, Gender } from "@/types";

export async function createBaby(params: {
  name: string;
  gender?: Gender;
  birthDate: string;
}): Promise<Baby> {
  const { data } = await api.post("/api/babies", params);
  return data;
}

export async function getBabies(): Promise<Baby[]> {
  const { data } = await api.get("/api/babies");
  return data;
}

export async function updateBaby(
  babyId: string,
  params: Partial<{ name: string; gender: Gender; birthDate: string }>
): Promise<Baby> {
  const { data } = await api.put(`/api/babies/${babyId}`, params);
  return data;
}

export async function createInvite(babyId: string): Promise<string> {
  const { data } = await api.post(`/api/babies/${babyId}/invite`);
  return data.inviteCode;
}

export async function joinByInvite(inviteCode: string): Promise<Baby> {
  const { data } = await api.post("/api/babies/join", { inviteCode });
  return data;
}
```

- [ ] **Step 4: 创建记录 API**

```typescript
// services/record-api.ts

import { api } from "./api";
import { BabyRecord, ParsedRecord, DailySummary, RecordType, RecordData } from "@/types";

export async function createRecord(
  babyId: string,
  params: {
    type: RecordType;
    recordedAt: string;
    data?: RecordData;
    note?: string;
  }
): Promise<BabyRecord> {
  const { data } = await api.post(`/api/babies/${babyId}/records`, params);
  return data;
}

export async function getRecords(
  babyId: string,
  date?: string
): Promise<BabyRecord[]> {
  const params = date ? { date } : {};
  const { data } = await api.get(`/api/babies/${babyId}/records`, { params });
  return data;
}

export async function getDailySummary(
  babyId: string,
  date: string
): Promise<DailySummary> {
  const { data } = await api.get(`/api/babies/${babyId}/records/summary`, {
    params: { date },
  });
  return data;
}

export async function updateRecord(
  recordId: string,
  params: Partial<{
    type: RecordType;
    recordedAt: string;
    data: RecordData;
    note: string;
  }>
): Promise<BabyRecord> {
  const { data } = await api.put(`/api/records/${recordId}`, params);
  return data;
}

export async function deleteRecord(recordId: string): Promise<void> {
  await api.delete(`/api/records/${recordId}`);
}

export async function parseVoiceText(
  babyId: string,
  text: string
): Promise<ParsedRecord[]> {
  const { data } = await api.post(`/api/babies/${babyId}/records/voice`, {
    text,
  });
  return data.parsed;
}

export async function confirmVoiceRecords(
  babyId: string,
  records: ParsedRecord[]
): Promise<BabyRecord[]> {
  const { data } = await api.post(
    `/api/babies/${babyId}/records/voice/confirm`,
    { records }
  );
  return data;
}
```

- [ ] **Step 5: 创建寄语 API**

```typescript
// services/message-api.ts

import { api, API_BASE_URL } from "./api";
import { Message } from "@/types";

export async function createMessage(
  babyId: string,
  params: {
    textContent?: string;
    audioUri?: string;
    audioDurationSeconds?: number;
    recordedAt?: string;
  }
): Promise<Message> {
  const formData = new FormData();
  if (params.textContent) {
    formData.append("textContent", params.textContent);
  }
  if (params.audioUri) {
    const filename = params.audioUri.split("/").pop() || "audio.m4a";
    formData.append("audio", {
      uri: params.audioUri,
      name: filename,
      type: "audio/m4a",
    } as unknown as Blob);
  }
  if (params.audioDurationSeconds !== undefined) {
    formData.append(
      "audioDurationSeconds",
      String(params.audioDurationSeconds)
    );
  }
  if (params.recordedAt) {
    formData.append("recordedAt", params.recordedAt);
  }

  const { data } = await api.post(`/api/babies/${babyId}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getMessages(babyId: string): Promise<Message[]> {
  const { data } = await api.get(`/api/babies/${babyId}/messages`);
  return data;
}

export function getAudioUrl(messageId: string): string {
  return `${API_BASE_URL}/api/messages/${messageId}/audio`;
}
```

- [ ] **Step 6: 创建照片 API**

```typescript
// services/photo-api.ts

import { api } from "./api";
import { Photo } from "@/types";

export async function uploadPhoto(
  babyId: string,
  imageUri: string,
  options?: { recordId?: string; messageId?: string }
): Promise<Photo> {
  const formData = new FormData();
  const filename = imageUri.split("/").pop() || "photo.jpg";
  formData.append("file", {
    uri: imageUri,
    name: filename,
    type: "image/jpeg",
  } as unknown as Blob);

  let url = `/api/babies/${babyId}/photos`;
  const params = new URLSearchParams();
  if (options?.recordId) params.append("recordId", options.recordId);
  if (options?.messageId) params.append("messageId", options.messageId);
  const qs = params.toString();
  if (qs) url += `?${qs}`;

  const { data } = await api.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getPhotos(
  babyId: string,
  date?: string
): Promise<Photo[]> {
  const params = date ? { date } : {};
  const { data } = await api.get(`/api/babies/${babyId}/photos`, { params });
  return data;
}

export async function deletePhoto(photoId: string): Promise<void> {
  await api.delete(`/api/photos/${photoId}`);
}
```

- [ ] **Step 7: 创建统计 API**

```typescript
// services/stats-api.ts

import { api } from "./api";
import { FeedingStat, WeightStat, JaundiceStat, SleepStat } from "@/types";

export async function getFeedingStats(
  babyId: string,
  days = 7
): Promise<FeedingStat[]> {
  const { data } = await api.get(`/api/babies/${babyId}/stats/feeding`, {
    params: { days },
  });
  return data;
}

export async function getWeightStats(
  babyId: string,
  days = 30
): Promise<WeightStat[]> {
  const { data } = await api.get(`/api/babies/${babyId}/stats/weight`, {
    params: { days },
  });
  return data;
}

export async function getJaundiceStats(
  babyId: string,
  days = 14
): Promise<JaundiceStat[]> {
  const { data } = await api.get(`/api/babies/${babyId}/stats/jaundice`, {
    params: { days },
  });
  return data;
}

export async function getSleepStats(
  babyId: string,
  days = 7
): Promise<SleepStat[]> {
  const { data } = await api.get(`/api/babies/${babyId}/stats/sleep`, {
    params: { days },
  });
  return data;
}
```

- [ ] **Step 8: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/services/
git commit -m "feat(app): 实现全部 API 服务层（认证、宝宝、记录、寄语、照片、统计）"
```

---

## Task 4: 状态管理（Zustand Store）

**Files:**
- Create: `baby-tracker-app/stores/auth-store.ts`
- Create: `baby-tracker-app/stores/record-store.ts`

- [ ] **Step 1: 创建认证 store**

```typescript
// stores/auth-store.ts

import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User, Baby } from "@/types";
import * as authApi from "@/services/auth-api";
import * as babyApi from "@/services/baby-api";

interface AuthState {
  user: User | null;
  currentBaby: Baby | null;
  babies: Baby[];
  isLoading: boolean;
  isAuthenticated: boolean;

  // actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  loadBabies: () => Promise<void>;
  setCurrentBaby: (baby: Baby) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  currentBaby: null,
  babies: [],
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const result = await authApi.login(email, password);
    await SecureStore.setItemAsync("accessToken", result.accessToken);
    await SecureStore.setItemAsync("refreshToken", result.refreshToken);
    set({ user: result.user, isAuthenticated: true });
    await get().loadBabies();
  },

  register: async (email, password, nickname) => {
    const result = await authApi.register(email, password, nickname);
    await SecureStore.setItemAsync("accessToken", result.accessToken);
    await SecureStore.setItemAsync("refreshToken", result.refreshToken);
    set({ user: result.user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    set({
      user: null,
      currentBaby: null,
      babies: [],
      isAuthenticated: false,
    });
  },

  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) {
        set({ isLoading: false });
        return;
      }
      // token 存在，尝试加载宝宝列表来验证 token 有效性
      const babies = await babyApi.getBabies();
      // 如果走到这里说明 token 有效（或被拦截器自动刷新了）
      // 但我们没有单独的 /me 接口，先从 SecureStore 恢复最小用户信息
      const savedUser = await SecureStore.getItemAsync("user");
      const user = savedUser ? JSON.parse(savedUser) : null;
      const savedBabyId = await SecureStore.getItemAsync("currentBabyId");
      const currentBaby =
        babies.find((b) => b.id === savedBabyId) || babies[0] || null;
      set({
        user,
        babies,
        currentBaby,
        isAuthenticated: !!user,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  loadBabies: async () => {
    const babies = await babyApi.getBabies();
    const current = get().currentBaby;
    const currentBaby =
      babies.find((b) => b.id === current?.id) || babies[0] || null;
    set({ babies, currentBaby });
  },

  setCurrentBaby: (baby) => {
    SecureStore.setItemAsync("currentBabyId", baby.id);
    set({ currentBaby: baby });
  },
}));
```

注意：`login` 和 `register` 成功后需额外保存 user 信息到 SecureStore：

在 `login` 和 `register` 的末尾都需要加上：
```typescript
await SecureStore.setItemAsync("user", JSON.stringify(result.user));
```

- [ ] **Step 2: 创建记录 store（语音解析结果暂存）**

```typescript
// stores/record-store.ts

import { create } from "zustand";
import { ParsedRecord } from "@/types";

interface RecordState {
  // 语音/文字解析的临时结果
  parsedRecords: ParsedRecord[];
  originalText: string;

  setParsedRecords: (records: ParsedRecord[], text: string) => void;
  updateParsedRecord: (index: number, record: ParsedRecord) => void;
  removeParsedRecord: (index: number) => void;
  clearParsed: () => void;
}

export const useRecordStore = create<RecordState>((set, get) => ({
  parsedRecords: [],
  originalText: "",

  setParsedRecords: (records, text) =>
    set({ parsedRecords: records, originalText: text }),

  updateParsedRecord: (index, record) => {
    const records = [...get().parsedRecords];
    records[index] = record;
    set({ parsedRecords: records });
  },

  removeParsedRecord: (index) => {
    const records = get().parsedRecords.filter((_, i) => i !== index);
    set({ parsedRecords: records });
  },

  clearParsed: () => set({ parsedRecords: [], originalText: "" }),
}));
```

- [ ] **Step 3: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/stores/
git commit -m "feat(app): 实现 zustand 状态管理（认证 store + 记录 store）"
```

---

## Task 5: 根布局与认证路由守卫

**Files:**
- Create: `baby-tracker-app/app/_layout.tsx`
- Create: `baby-tracker-app/app/(auth)/_layout.tsx`
- Create: `baby-tracker-app/app/(auth)/login.tsx`
- Create: `baby-tracker-app/app/(auth)/register.tsx`

- [ ] **Step 1: 创建根布局（路由守卫）**

```tsx
// app/_layout.tsx

import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/stores/auth-store";
import { ActivityIndicator, View } from "react-native";
import { Colors } from "@/constants/theme";

export default function RootLayout() {
  const { isAuthenticated, isLoading, restoreSession, currentBaby } =
    useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // 已登录但还没有宝宝档案 → 跳转创建宝宝
      if (!currentBaby) {
        router.replace("/baby/create");
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, isLoading, segments, currentBaby]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="record/manual"
          options={{ presentation: "modal", headerShown: true, title: "手动记录" }}
        />
        <Stack.Screen
          name="record/confirm"
          options={{ presentation: "modal", headerShown: true, title: "确认记录" }}
        />
        <Stack.Screen
          name="baby/create"
          options={{ headerShown: true, title: "添加宝宝" }}
        />
        <Stack.Screen
          name="baby/join"
          options={{ headerShown: true, title: "加入宝宝" }}
        />
      </Stack>
    </>
  );
}
```

- [ ] **Step 2: 创建认证组布局**

```tsx
// app/(auth)/_layout.tsx

import { Stack } from "expo-router";
import { Colors } from "@/constants/theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    />
  );
}
```

- [ ] **Step 3: 创建登录页**

```tsx
// app/(auth)/login.tsx

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("提示", "请输入邮箱和密码");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "登录失败，请检查邮箱和密码";
      Alert.alert("登录失败", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Baby Tracker</Text>
        <Text style={styles.subtitle}>记录宝宝每一天的成长</Text>

        <TextInput
          style={styles.input}
          placeholder="邮箱"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="密码"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "登录中..." : "登录"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push("/(auth)/register")}
        >
          <Text style={styles.linkText}>还没有账号？立即注册</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "bold",
    color: Colors.primary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  linkText: {
    color: Colors.primary,
    fontSize: FontSize.md,
  },
});
```

- [ ] **Step 4: 创建注册页**

```tsx
// app/(auth)/register.tsx

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const router = useRouter();

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !nickname.trim()) {
      Alert.alert("提示", "请填写所有字段");
      return;
    }
    if (password.length < 6) {
      Alert.alert("提示", "密码至少6位");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, nickname.trim());
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "注册失败，请重试";
      Alert.alert("注册失败", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>创建账号</Text>
        <Text style={styles.subtitle}>开始记录宝宝的成长</Text>

        <TextInput
          style={styles.input}
          placeholder="昵称（如：宝宝妈妈）"
          value={nickname}
          onChangeText={setNickname}
          autoComplete="name"
        />
        <TextInput
          style={styles.input}
          placeholder="邮箱"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="密码（至少6位）"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "注册中..." : "注册"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.back()}
        >
          <Text style={styles.linkText}>已有账号？返回登录</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "bold",
    color: Colors.primary,
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: FontSize.lg,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },
  linkText: {
    color: Colors.primary,
    fontSize: FontSize.md,
  },
});
```

- [ ] **Step 5: 验证认证流程**

```bash
cd /Users/bytedance/baby-tracker/baby-tracker-app
npx expo start
```

预期：App 启动后自动跳转到登录页，输入注册信息后成功跳转。

- [ ] **Step 6: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/app/
git commit -m "feat(app): 实现根布局、认证路由守卫、登录注册页面"
```

---

## Task 6: 宝宝档案创建与加入页面

**Files:**
- Create: `baby-tracker-app/app/baby/create.tsx`
- Create: `baby-tracker-app/app/baby/join.tsx`

- [ ] **Step 1: 创建宝宝档案页**

```tsx
// app/baby/create.tsx

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import * as babyApi from "@/services/baby-api";
import { Gender } from "@/types";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

export default function CreateBabyScreen() {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("unknown");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { loadBabies, setCurrentBaby } = useAuthStore();
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim() || !birthDate.trim()) {
      Alert.alert("提示", "请填写宝宝名字和出生日期");
      return;
    }
    // 简单日期格式验证 YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
      Alert.alert("提示", "出生日期格式为 YYYY-MM-DD");
      return;
    }
    setLoading(true);
    try {
      const baby = await babyApi.createBaby({
        name: name.trim(),
        gender,
        birthDate: birthDate.trim(),
      });
      setCurrentBaby(baby);
      await loadBabies();
      router.replace("/(tabs)");
    } catch {
      Alert.alert("创建失败", "请重试");
    } finally {
      setLoading(false);
    }
  };

  const genderOptions: { value: Gender; label: string }[] = [
    { value: "male", label: "男宝" },
    { value: "female", label: "女宝" },
    { value: "unknown", label: "暂不设置" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.heading}>添加宝宝档案</Text>

      <Text style={styles.label}>宝宝名字</Text>
      <TextInput
        style={styles.input}
        placeholder="宝宝的名字或小名"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>性别</Text>
      <View style={styles.genderRow}>
        {genderOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.genderButton,
              gender === opt.value && styles.genderButtonActive,
            ]}
            onPress={() => setGender(opt.value)}
          >
            <Text
              style={[
                styles.genderText,
                gender === opt.value && styles.genderTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>出生日期</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={birthDate}
        onChangeText={setBirthDate}
        keyboardType="numbers-and-punctuation"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "创建中..." : "创建宝宝档案"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.push("/baby/join")}
      >
        <Text style={styles.linkText}>有邀请码？加入已有宝宝</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  heading: {
    fontSize: FontSize.xl,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  genderRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  genderButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  genderButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceSecondary,
  },
  genderText: { fontSize: FontSize.md, color: Colors.textSecondary },
  genderTextActive: { color: Colors.primary, fontWeight: "600" },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontSize: FontSize.lg, fontWeight: "600" },
  linkButton: { marginTop: Spacing.lg, alignItems: "center" },
  linkText: { color: Colors.primary, fontSize: FontSize.md },
});
```

- [ ] **Step 2: 创建加入宝宝页**

```tsx
// app/baby/join.tsx

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import * as babyApi from "@/services/baby-api";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

export default function JoinBabyScreen() {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { loadBabies, setCurrentBaby } = useAuthStore();
  const router = useRouter();

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("提示", "请输入邀请码");
      return;
    }
    setLoading(true);
    try {
      const baby = await babyApi.joinByInvite(inviteCode.trim());
      setCurrentBaby(baby);
      await loadBabies();
      router.replace("/(tabs)");
    } catch {
      Alert.alert("加入失败", "邀请码无效或已使用");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>通过邀请码加入</Text>
      <Text style={styles.desc}>输入家人分享的邀请码，一起记录宝宝成长</Text>

      <TextInput
        style={styles.input}
        placeholder="请输入8位邀请码"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="none"
        maxLength={8}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleJoin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "加入中..." : "加入"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  heading: {
    fontSize: FontSize.xl,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  desc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: "center",
    letterSpacing: 4,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontSize: FontSize.lg, fontWeight: "600" },
});
```

- [ ] **Step 3: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/app/baby/
git commit -m "feat(app): 实现宝宝档案创建和邀请码加入页面"
```

---

## Task 7: Tab 导航布局

**Files:**
- Create: `baby-tracker-app/app/(tabs)/_layout.tsx`
- Create: `baby-tracker-app/components/EmptyState.tsx`

- [ ] **Step 1: 创建 Tab 布局（4 Tab + 中央记录按钮）**

```tsx
// app/(tabs)/_layout.tsx

import { Tabs } from "expo-router";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Spacing } from "@/constants/theme";
import { useState } from "react";
import RecordSheet from "@/components/RecordSheet";

export default function TabLayout() {
  const [showRecordSheet, setShowRecordSheet] = useState(false);

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textLight,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            height: 88,
            paddingBottom: 24,
          },
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "首页",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: "统计",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="chart-line"
                size={size}
                color={color}
              />
            ),
          }}
        />
        {/* 中央占位，实际按钮浮动在上方 */}
        <Tabs.Screen
          name="record-placeholder"
          options={{
            tabBarButton: () => (
              <View style={styles.centerButtonWrapper}>
                <TouchableOpacity
                  style={styles.centerButton}
                  onPress={() => setShowRecordSheet(true)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name="plus"
                    size={32}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            ),
          }}
          listeners={{ tabPress: (e) => e.preventDefault() }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: "寄语",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="heart-outline"
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "我的",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="account"
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tabs>

      {showRecordSheet && (
        <RecordSheet onClose={() => setShowRecordSheet(false)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  centerButtonWrapper: {
    position: "relative",
    top: -20,
    alignItems: "center",
    justifyContent: "center",
    width: 64,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
```

注意：需要创建一个 `app/(tabs)/record-placeholder.tsx` 空占位文件：

```tsx
// app/(tabs)/record-placeholder.tsx
export default function RecordPlaceholder() {
  return null;
}
```

- [ ] **Step 2: 创建空状态组件**

```tsx
// components/EmptyState.tsx

import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize } from "@/constants/theme";

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={64}
        color={Colors.textLight}
      />
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl * 2,
  },
  title: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
    textAlign: "center",
  },
});
```

- [ ] **Step 3: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/app/\(tabs\)/ baby-tracker-app/components/EmptyState.tsx
git commit -m "feat(app): 实现 Tab 导航布局，包含中央浮动记录按钮"
```

---

## Task 8: 记录面板组件（RecordSheet — 语音+文字+快捷按钮）

**Files:**
- Create: `baby-tracker-app/components/RecordSheet.tsx`
- Create: `baby-tracker-app/components/VoiceButton.tsx`
- Create: `baby-tracker-app/components/QuickButtons.tsx`
- Create: `baby-tracker-app/hooks/use-speech.ts`

- [ ] **Step 1: 创建语音识别 hook**

```typescript
// hooks/use-speech.ts

import { useState, useCallback, useRef } from "react";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

interface UseSpeechReturn {
  isListening: boolean;
  transcript: string;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useSpeech(): UseSpeechReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const transcriptRef = useRef("");

  useSpeechRecognitionEvent("start", () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent("end", () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const text = event.results[0]?.transcript || "";
    transcriptRef.current = text;
    setTranscript(text);
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.warn("Speech recognition error:", event.error);
    setIsListening(false);
  });

  const start = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      throw new Error("需要语音识别权限");
    }
    transcriptRef.current = "";
    setTranscript("");
    ExpoSpeechRecognitionModule.start({
      lang: "zh-CN",
      interimResults: true,
      continuous: true,
    });
  }, []);

  const stop = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const reset = useCallback(() => {
    transcriptRef.current = "";
    setTranscript("");
  }, []);

  return { isListening, transcript, start, stop, reset };
}
```

- [ ] **Step 2: 创建语音大按钮组件**

```tsx
// components/VoiceButton.tsx

import { useRef } from "react";
import {
  Animated,
  TouchableWithoutFeedback,
  Text,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, FontSize } from "@/constants/theme";

interface VoiceButtonProps {
  isListening: boolean;
  onPressIn: () => void;
  onPressOut: () => void;
  transcript: string;
}

export default function VoiceButton({
  isListening,
  onPressIn,
  onPressOut,
  transcript,
}: VoiceButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
    onPressIn();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
    onPressOut();
  };

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.button,
            isListening && styles.buttonActive,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <MaterialCommunityIcons
            name={isListening ? "microphone" : "microphone-outline"}
            size={40}
            color="#FFFFFF"
          />
        </Animated.View>
      </TouchableWithoutFeedback>
      <Text style={styles.hint}>
        {isListening
          ? transcript || "正在聆听..."
          : "按住说话，松手识别"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  button: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  buttonActive: {
    backgroundColor: Colors.primaryDark,
  },
  hint: {
    marginTop: 12,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
  },
});
```

- [ ] **Step 3: 创建快捷按钮宫格组件**

```tsx
// components/QuickButtons.tsx

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { QUICK_BUTTON_ORDER, RECORD_TYPE_MAP } from "@/constants/record-types";
import { RecordType } from "@/types";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

interface QuickButtonsProps {
  onPress: (type: RecordType | "photo") => void;
}

export default function QuickButtons({ onPress }: QuickButtonsProps) {
  return (
    <View style={styles.grid}>
      {QUICK_BUTTON_ORDER.map((type) => {
        const isPhoto = type === "photo";
        const config = isPhoto
          ? { label: "拍照", icon: "camera", color: Colors.primary }
          : RECORD_TYPE_MAP[type];

        return (
          <TouchableOpacity
            key={type}
            style={styles.button}
            onPress={() => onPress(type)}
            activeOpacity={0.7}
          >
            <View
              style={[styles.iconCircle, { backgroundColor: config.color + "20" }]}
            >
              <MaterialCommunityIcons
                name={config.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                size={24}
                color={config.color}
              />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {config.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
  },
  button: {
    width: "23%",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
  },
});
```

- [ ] **Step 4: 创建记录面板组件（整合语音+文字+快捷按钮）**

```tsx
// components/RecordSheet.tsx

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSpeech } from "@/hooks/use-speech";
import { useAuthStore } from "@/stores/auth-store";
import { useRecordStore } from "@/stores/record-store";
import * as recordApi from "@/services/record-api";
import VoiceButton from "./VoiceButton";
import QuickButtons from "./QuickButtons";
import { RecordType } from "@/types";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";
import * as ImagePicker from "expo-image-picker";
import * as photoApi from "@/services/photo-api";

interface RecordSheetProps {
  onClose: () => void;
}

export default function RecordSheet({ onClose }: RecordSheetProps) {
  const [textInput, setTextInput] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const { isListening, transcript, start, stop, reset } = useSpeech();
  const { currentBaby } = useAuthStore();
  const { setParsedRecords } = useRecordStore();
  const router = useRouter();

  const babyId = currentBaby?.id;

  const handleVoicePressIn = async () => {
    try {
      await start();
    } catch (err) {
      Alert.alert("提示", "无法启动语音识别，请检查权限设置");
    }
  };

  const handleVoicePressOut = async () => {
    stop();
    // 等待最终识别结果后发送解析
    setTimeout(() => {
      const text = transcript;
      if (text.trim()) {
        handleParseText(text);
      }
    }, 500);
  };

  const handleTextSubmit = () => {
    if (textInput.trim()) {
      handleParseText(textInput.trim());
    }
  };

  const handleParseText = async (text: string) => {
    if (!babyId) return;
    setIsParsing(true);
    try {
      const parsed = await recordApi.parseVoiceText(babyId, text);
      if (parsed.length === 0) {
        Alert.alert("提示", "未能识别出记录内容，请重试或手动输入");
        return;
      }
      setParsedRecords(parsed, text);
      reset();
      setTextInput("");
      onClose();
      router.push("/record/confirm");
    } catch {
      Alert.alert("解析失败", "请重试或使用手动输入");
    } finally {
      setIsParsing(false);
    }
  };

  const handleQuickPress = (type: RecordType | "photo") => {
    if (type === "photo") {
      handleTakePhoto();
      return;
    }
    onClose();
    router.push({ pathname: "/record/manual", params: { type } });
  };

  const handleTakePhoto = async () => {
    if (!babyId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      try {
        await photoApi.uploadPhoto(babyId, result.assets[0].uri);
        Alert.alert("上传成功", "照片已保存");
        onClose();
      } catch {
        Alert.alert("上传失败", "请重试");
      }
    }
  };

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* 拖拽条 */}
          <View style={styles.handle} />

          {/* 关闭按钮 */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={Colors.textSecondary}
            />
          </TouchableOpacity>

          {/* 语音大按钮 */}
          <View style={styles.voiceSection}>
            <VoiceButton
              isListening={isListening}
              onPressIn={handleVoicePressIn}
              onPressOut={handleVoicePressOut}
              transcript={transcript}
            />
          </View>

          {/* 解析中指示器 */}
          {isParsing && (
            <View style={styles.parsingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.parsingText}>正在解析...</Text>
            </View>
          )}

          {/* 文字输入框 */}
          <View style={styles.textSection}>
            <Text style={styles.textHint}>不方便说话？</Text>
            <View style={styles.textInputRow}>
              <TextInput
                style={styles.textInput}
                placeholder="输入记录内容..."
                value={textInput}
                onChangeText={setTextInput}
                returnKeyType="send"
                onSubmitEditing={handleTextSubmit}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !textInput.trim() && styles.sendButtonDisabled,
                ]}
                onPress={handleTextSubmit}
                disabled={!textInput.trim() || isParsing}
              >
                <MaterialCommunityIcons
                  name="send"
                  size={20}
                  color="#FFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* 快捷按钮宫格 */}
          <View style={styles.quickSection}>
            <QuickButtons onPress={handleQuickPress} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: 40,
    paddingHorizontal: Spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  closeButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.md,
    padding: Spacing.xs,
    zIndex: 10,
  },
  voiceSection: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  parsingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  parsingText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  textSection: {
    marginBottom: Spacing.lg,
  },
  textHint: {
    fontSize: FontSize.sm,
    color: Colors.textLight,
    marginBottom: Spacing.sm,
  },
  textInputRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textLight,
  },
  quickSection: {
    paddingTop: Spacing.sm,
  },
});
```

- [ ] **Step 5: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/components/RecordSheet.tsx baby-tracker-app/components/VoiceButton.tsx baby-tracker-app/components/QuickButtons.tsx baby-tracker-app/hooks/use-speech.ts
git commit -m "feat(app): 实现记录面板（语音按钮+文字输入+快捷按钮宫格）"
```

---

## Task 9: 首页 — 每日小结 + 时间线

**Files:**
- Create: `baby-tracker-app/app/(tabs)/index.tsx`
- Create: `baby-tracker-app/components/DailySummary.tsx`
- Create: `baby-tracker-app/components/Timeline.tsx`
- Create: `baby-tracker-app/components/TimelineItem.tsx`

- [ ] **Step 1: 创建每日小结宫格组件**

```tsx
// components/DailySummary.tsx

import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { DailySummary as DailySummaryType } from "@/types";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

interface Props {
  summary: DailySummaryType;
}

interface SummaryItem {
  icon: string;
  label: string;
  value: string;
  color: string;
}

export default function DailySummary({ summary }: Props) {
  const items: SummaryItem[] = [
    {
      icon: "baby-bottle-outline",
      label: "配方奶",
      value: summary.formulaCount > 0
        ? `${summary.formulaTotalMl}ml / ${summary.formulaCount}次`
        : "--",
      color: Colors.feeding,
    },
    {
      icon: "mother-nurse",
      label: "亲喂",
      value: summary.breastCount > 0
        ? `${summary.breastTotalMinutes}分钟 / ${summary.breastCount}次`
        : "--",
      color: Colors.feeding,
    },
    {
      icon: "emoticon-poop",
      label: "大便",
      value: summary.poopCount > 0 ? `${summary.poopCount}次` : "--",
      color: Colors.poop,
    },
    {
      icon: "water",
      label: "小便",
      value: summary.peeCount > 0 ? `${summary.peeCount}次` : "--",
      color: Colors.pee,
    },
    {
      icon: "sleep",
      label: "睡眠",
      value: summary.sleepTotalHours > 0
        ? `${summary.sleepTotalHours.toFixed(1)}小时 / ${summary.sleepCount}次`
        : "--",
      color: Colors.sleep,
    },
    {
      icon: "bathtub-outline",
      label: "洗澡",
      value: summary.bathCount > 0 ? `${summary.bathCount}次` : "--",
      color: Colors.bath,
    },
    {
      icon: "thermometer",
      label: "体温",
      value: summary.latestTemperature
        ? `${summary.latestTemperature}°C`
        : "--",
      color: Colors.temperature,
    },
    {
      icon: "scale-bathroom",
      label: "体重",
      value: summary.latestWeight ? `${summary.latestWeight}g` : "--",
      color: Colors.weight,
    },
    {
      icon: "sun-thermometer",
      label: "黄疸",
      value: summary.latestJaundice
        ? `${summary.latestJaundice}`
        : "--",
      color: Colors.jaundice,
    },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>今日小结</Text>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.label} style={styles.cell}>
            <MaterialCommunityIcons
              name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={20}
              color={item.color}
            />
            <Text style={styles.cellLabel}>{item.label}</Text>
            <Text style={styles.cellValue} numberOfLines={1}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  cell: {
    width: "31%",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    alignItems: "center",
    gap: 2,
  },
  cellLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  cellValue: {
    fontSize: FontSize.sm,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
});
```

- [ ] **Step 2: 创建时间线项组件**

```tsx
// components/TimelineItem.tsx

import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BabyRecord } from "@/types";
import { RECORD_TYPE_MAP } from "@/constants/record-types";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";
import { format } from "date-fns";

interface Props {
  record: BabyRecord;
}

function getRecordDescription(record: BabyRecord): string {
  const data = record.data as Record<string, unknown>;
  switch (record.type) {
    case "feeding_formula":
      return `配方奶 ${data.amount_ml}ml`;
    case "feeding_breast": {
      const sideMap: Record<string, string> = { left: "左侧", right: "右侧", both: "双侧" };
      return `亲喂 ${data.duration_minutes}分钟（${sideMap[data.side as string] || data.side}）`;
    }
    case "poop":
      return `大便 — ${data.color} ${data.texture}`;
    case "pee":
      return "小便";
    case "sleep":
      return data.end_time
        ? `睡眠 ${format(new Date(record.recordedAt), "HH:mm")} - ${format(new Date(data.end_time as string), "HH:mm")}`
        : `入睡 ${format(new Date(record.recordedAt), "HH:mm")}`;
    case "bath":
      return `洗澡${data.duration_minutes ? ` ${data.duration_minutes}分钟` : ""}`;
    case "temperature":
      return `体温 ${data.value}°C`;
    case "weight":
      return `体重 ${data.value_g}g`;
    case "jaundice":
      return `黄疸 ${data.value}（${data.position === "forehead" ? "额头" : "胸口"}）`;
    case "daily_change":
      return `${data.description}`;
    default:
      return record.type;
  }
}

export default function TimelineItem({ record }: Props) {
  const config = RECORD_TYPE_MAP[record.type];
  const time = format(new Date(record.recordedAt), "HH:mm");
  const description = getRecordDescription(record);
  const nickname = record.user?.nickname || "未知";

  return (
    <View style={styles.container}>
      <View style={styles.timeCol}>
        <Text style={styles.time}>{time}</Text>
      </View>
      <View style={styles.iconCol}>
        <View style={[styles.dot, { backgroundColor: config.color }]}>
          <MaterialCommunityIcons
            name={config.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={16}
            color="#FFF"
          />
        </View>
        <View style={styles.line} />
      </View>
      <View style={styles.contentCol}>
        <Text style={styles.description}>{description}</Text>
        {record.note && <Text style={styles.note}>{record.note}</Text>}
        <Text style={styles.author}>{nickname}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    minHeight: 60,
  },
  timeCol: {
    width: 50,
    alignItems: "flex-end",
    paddingRight: Spacing.sm,
    paddingTop: 2,
  },
  time: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  iconCol: {
    width: 32,
    alignItems: "center",
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  contentCol: {
    flex: 1,
    paddingLeft: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: "500",
  },
  note: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  author: {
    fontSize: FontSize.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
});
```

- [ ] **Step 3: 创建时间线组件**

```tsx
// components/Timeline.tsx

import { View, Text, StyleSheet } from "react-native";
import { BabyRecord } from "@/types";
import TimelineItem from "./TimelineItem";
import EmptyState from "./EmptyState";
import { Colors, Spacing, FontSize } from "@/constants/theme";

interface Props {
  records: BabyRecord[];
}

export default function Timeline({ records }: Props) {
  if (records.length === 0) {
    return (
      <EmptyState
        icon="timeline-clock-outline"
        title="今天还没有记录"
        subtitle="按下中央按钮开始记录"
      />
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>时间线</Text>
      {records.map((record) => (
        <TimelineItem key={record.id} record={record} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
});
```

- [ ] **Step 4: 创建首页**

```tsx
// app/(tabs)/index.tsx

import { useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  RefreshControl,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import * as recordApi from "@/services/record-api";
import { BabyRecord, DailySummary as DailySummaryType } from "@/types";
import DailySummary from "@/components/DailySummary";
import Timeline from "@/components/Timeline";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function HomeScreen() {
  const { currentBaby } = useAuthStore();
  const [records, setRecords] = useState<BabyRecord[]>([]);
  const [summary, setSummary] = useState<DailySummaryType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    if (!currentBaby) return;
    try {
      const [recordsData, summaryData] = await Promise.all([
        recordApi.getRecords(currentBaby.id, today),
        recordApi.getDailySummary(currentBaby.id, today),
      ]);
      setRecords(recordsData);
      setSummary(summaryData);
    } catch (err) {
      console.error("加载数据失败:", err);
    }
  }, [currentBaby, today]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const todayDisplay = format(new Date(), "M月d日 EEEE", { locale: zhCN });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.babyName}>{currentBaby?.name || "宝宝"}</Text>
        <Text style={styles.date}>{todayDisplay}</Text>
      </View>

      {summary && <DailySummary summary={summary} />}
      <Timeline records={records} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  header: { marginBottom: Spacing.md },
  babyName: {
    fontSize: FontSize.xxl,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  date: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
```

- [ ] **Step 5: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/app/\(tabs\)/index.tsx baby-tracker-app/components/DailySummary.tsx baby-tracker-app/components/Timeline.tsx baby-tracker-app/components/TimelineItem.tsx
git commit -m "feat(app): 实现首页（每日小结宫格 + 时间线流水）"
```

---

## Task 10: 语音解析确认页 + 手动记录表单

**Files:**
- Create: `baby-tracker-app/app/record/confirm.tsx`
- Create: `baby-tracker-app/app/record/manual.tsx`
- Create: `baby-tracker-app/components/RecordCard.tsx`

- [ ] **Step 1: 创建解析结果确认卡片组件**

```tsx
// components/RecordCard.tsx

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { ParsedRecord } from "@/types";
import { RECORD_TYPE_MAP } from "@/constants/record-types";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";
import { format } from "date-fns";

interface Props {
  record: ParsedRecord;
  index: number;
  onRemove: (index: number) => void;
}

export default function RecordCard({ record, index, onRemove }: Props) {
  const config = RECORD_TYPE_MAP[record.type];
  const data = record.data as Record<string, unknown>;

  const details: string[] = [];
  Object.entries(data).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      details.push(`${key}: ${val}`);
    }
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconDot, { backgroundColor: config.color }]}>
          <MaterialCommunityIcons
            name={config.icon as keyof typeof MaterialCommunityIcons.glyphMap}
            size={18}
            color="#FFF"
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.type}>{config.label}</Text>
          <Text style={styles.time}>
            {format(new Date(record.recordedAt), "HH:mm")}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(index)}
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={24}
            color={Colors.textLight}
          />
        </TouchableOpacity>
      </View>
      {details.length > 0 && (
        <Text style={styles.details}>{details.join("  |  ")}</Text>
      )}
      {record.note && <Text style={styles.note}>{record.note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: { flexDirection: "row", alignItems: "center" },
  iconDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1, marginLeft: Spacing.sm },
  type: { fontSize: FontSize.md, fontWeight: "600", color: Colors.textPrimary },
  time: { fontSize: FontSize.sm, color: Colors.textSecondary },
  removeButton: { padding: Spacing.xs },
  details: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  note: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontStyle: "italic",
  },
});
```

- [ ] **Step 2: 创建语音解析确认页**

```tsx
// app/record/confirm.tsx

import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { useRecordStore } from "@/stores/record-store";
import * as recordApi from "@/services/record-api";
import RecordCard from "@/components/RecordCard";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

export default function ConfirmScreen() {
  const { currentBaby } = useAuthStore();
  const { parsedRecords, originalText, removeParsedRecord, clearParsed } =
    useRecordStore();
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    if (!currentBaby || parsedRecords.length === 0) return;
    setSaving(true);
    try {
      await recordApi.confirmVoiceRecords(currentBaby.id, parsedRecords);
      clearParsed();
      router.back();
    } catch {
      Alert.alert("保存失败", "请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    clearParsed();
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* 原始文本 */}
        <View style={styles.originalBox}>
          <Text style={styles.originalLabel}>原始输入</Text>
          <Text style={styles.originalText}>"{originalText}"</Text>
        </View>

        {/* 解析结果卡片列表 */}
        <Text style={styles.sectionTitle}>
          识别出 {parsedRecords.length} 条记录
        </Text>
        {parsedRecords.map((record, index) => (
          <RecordCard
            key={index}
            record={record}
            index={index}
            onRemove={removeParsedRecord}
          />
        ))}

        {parsedRecords.length === 0 && (
          <Text style={styles.emptyText}>所有记录已移除</Text>
        )}
      </ScrollView>

      {/* 底部按钮 */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (saving || parsedRecords.length === 0) && styles.buttonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={saving || parsedRecords.length === 0}
        >
          <Text style={styles.confirmText}>
            {saving ? "保存中..." : "确认保存"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  originalBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  originalLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  originalText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
  footer: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  cancelText: { fontSize: FontSize.md, color: Colors.textSecondary },
  confirmButton: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  confirmText: { fontSize: FontSize.md, color: "#FFF", fontWeight: "600" },
});
```

- [ ] **Step 3: 创建手动记录表单**

```tsx
// app/record/manual.tsx

import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import * as recordApi from "@/services/record-api";
import { RecordType } from "@/types";
import { RECORD_TYPE_MAP } from "@/constants/record-types";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

// 每种记录类型需要的输入字段
const FIELDS_BY_TYPE: Record<RecordType, { key: string; label: string; keyboard?: string; placeholder?: string }[]> = {
  feeding_formula: [{ key: "amount_ml", label: "奶量 (ml)", keyboard: "numeric", placeholder: "如：130" }],
  feeding_breast: [
    { key: "duration_minutes", label: "时长 (分钟)", keyboard: "numeric", placeholder: "如：15" },
    { key: "side", label: "侧 (left/right/both)", placeholder: "left, right, 或 both" },
  ],
  poop: [
    { key: "color", label: "颜色", placeholder: "如：黄色" },
    { key: "texture", label: "性状", placeholder: "如：糊状" },
  ],
  pee: [],
  sleep: [{ key: "end_time", label: "醒来时间 (HH:mm)", placeholder: "如：14:30，留空表示还在睡" }],
  bath: [
    { key: "duration_minutes", label: "时长 (分钟)", keyboard: "numeric", placeholder: "选填" },
    { key: "water_temp", label: "水温 (°C)", keyboard: "numeric", placeholder: "选填" },
  ],
  temperature: [
    { key: "value", label: "体温 (°C)", keyboard: "decimal-pad", placeholder: "如：36.5" },
    { key: "method", label: "测量方式 (ear/forehead/armpit)", placeholder: "ear, forehead, 或 armpit" },
  ],
  weight: [{ key: "value_g", label: "体重 (g)", keyboard: "numeric", placeholder: "如：5000" }],
  jaundice: [
    { key: "value", label: "黄疸值", keyboard: "decimal-pad", placeholder: "如：8.5" },
    { key: "position", label: "测量位置 (forehead/chest)", placeholder: "forehead 或 chest" },
  ],
  daily_change: [{ key: "description", label: "今日变化", placeholder: "记录宝宝今天的变化..." }],
};

export default function ManualRecordScreen() {
  const { type } = useLocalSearchParams<{ type: RecordType }>();
  const { currentBaby } = useAuthStore();
  const router = useRouter();

  const recordType = type as RecordType;
  const config = RECORD_TYPE_MAP[recordType];
  const fields = FIELDS_BY_TYPE[recordType] || [];

  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentBaby) return;

    // 构造 data 对象
    const data: Record<string, unknown> = {};
    for (const field of fields) {
      const val = values[field.key]?.trim();
      if (!val && field.key !== "end_time" && field.key !== "duration_minutes" && field.key !== "water_temp") {
        Alert.alert("提示", `请填写${field.label}`);
        return;
      }
      if (val) {
        // 数字字段转换
        if (field.keyboard === "numeric" || field.keyboard === "decimal-pad") {
          data[field.key] = Number(val);
        } else if (field.key === "end_time" && val) {
          // 将 HH:mm 转为今天的 ISO 字符串
          const [hours, minutes] = val.split(":");
          const endTime = new Date();
          endTime.setHours(Number(hours), Number(minutes), 0, 0);
          data[field.key] = endTime.toISOString();
        } else {
          data[field.key] = val;
        }
      }
    }

    setSaving(true);
    try {
      await recordApi.createRecord(currentBaby.id, {
        type: recordType,
        recordedAt: new Date().toISOString(),
        data,
        note: note.trim() || undefined,
      });
      router.back();
    } catch {
      Alert.alert("保存失败", "请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{config?.label || recordType}</Text>

      {fields.map((field) => (
        <View key={field.key} style={styles.fieldGroup}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            style={styles.input}
            placeholder={field.placeholder}
            value={values[field.key] || ""}
            onChangeText={(v) => setValues({ ...values, [field.key]: v })}
            keyboardType={(field.keyboard as never) || "default"}
          />
        </View>
      ))}

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>备注（选填）</Text>
        <TextInput
          style={[styles.input, styles.noteInput]}
          placeholder="添加备注..."
          value={note}
          onChangeText={setNote}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "保存中..." : "保存记录"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.lg },
  heading: {
    fontSize: FontSize.xl,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  fieldGroup: { marginBottom: Spacing.md },
  label: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noteInput: { height: 80, textAlignVertical: "top" },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontSize: FontSize.lg, fontWeight: "600" },
});
```

- [ ] **Step 4: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/app/record/ baby-tracker-app/components/RecordCard.tsx
git commit -m "feat(app): 实现语音解析确认页和手动记录表单"
```

---

## Task 11: 统计页面

**Files:**
- Create: `baby-tracker-app/app/(tabs)/stats.tsx`
- Create: `baby-tracker-app/components/StatChart.tsx`

- [ ] **Step 1: 创建统计图表组件**

```tsx
// components/StatChart.tsx

import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

interface Props {
  title: string;
  labels: string[];
  data: number[];
  unit: string;
  color: string;
}

const screenWidth = Dimensions.get("window").width - Spacing.md * 2;

export default function StatChart({ title, labels, data, unit, color }: Props) {
  if (data.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <LineChart
        data={{
          labels: labels.length > 7 ? labels.filter((_, i) => i % 2 === 0) : labels,
          datasets: [{ data: data.length > 0 ? data : [0] }],
        }}
        width={screenWidth - Spacing.md * 2}
        height={180}
        yAxisSuffix={unit}
        chartConfig={{
          backgroundColor: Colors.surface,
          backgroundGradientFrom: Colors.surface,
          backgroundGradientTo: Colors.surface,
          decimalCount: 1,
          color: () => color,
          labelColor: () => Colors.textSecondary,
          propsForDots: { r: "4", strokeWidth: "2", stroke: color },
          propsForBackgroundLines: { stroke: Colors.border },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  chart: { borderRadius: BorderRadius.md },
});
```

- [ ] **Step 2: 创建统计页面**

```tsx
// app/(tabs)/stats.tsx

import { useState, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import * as statsApi from "@/services/stats-api";
import { FeedingStat, WeightStat, JaundiceStat, SleepStat } from "@/types";
import StatChart from "@/components/StatChart";
import EmptyState from "@/components/EmptyState";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { format } from "date-fns";

export default function StatsScreen() {
  const { currentBaby } = useAuthStore();
  const [days, setDays] = useState(7);
  const [feeding, setFeeding] = useState<FeedingStat[]>([]);
  const [weight, setWeight] = useState<WeightStat[]>([]);
  const [jaundice, setJaundice] = useState<JaundiceStat[]>([]);
  const [sleep, setSleep] = useState<SleepStat[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    if (!currentBaby) return;
    try {
      const [f, w, j, s] = await Promise.all([
        statsApi.getFeedingStats(currentBaby.id, days),
        statsApi.getWeightStats(currentBaby.id, days),
        statsApi.getJaundiceStats(currentBaby.id, days),
        statsApi.getSleepStats(currentBaby.id, days),
      ]);
      setFeeding(f);
      setWeight(w);
      setJaundice(j);
      setSleep(s);
    } catch (err) {
      console.error("加载统计失败:", err);
    }
  }, [currentBaby, days]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const dayOptions = [7, 14, 30];

  const hasData =
    feeding.length > 0 ||
    weight.length > 0 ||
    jaundice.length > 0 ||
    sleep.length > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      {/* 时间范围选择 */}
      <View style={styles.periodRow}>
        {dayOptions.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.periodButton, days === d && styles.periodActive]}
            onPress={() => setDays(d)}
          >
            <Text
              style={[
                styles.periodText,
                days === d && styles.periodTextActive,
              ]}
            >
              {d}天
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!hasData ? (
        <EmptyState
          icon="chart-line"
          title="暂无统计数据"
          subtitle="记录几天后这里会出现趋势图"
        />
      ) : (
        <>
          {/* 喂奶统计 */}
          {feeding.length > 0 && (
            <StatChart
              title="配方奶量趋势"
              labels={feeding.map((f) => format(new Date(f.date), "M/d"))}
              data={feeding.map((f) => f.formulaMl)}
              unit="ml"
              color={Colors.feeding}
            />
          )}

          {/* 睡眠统计 */}
          {sleep.length > 0 && (
            <StatChart
              title="睡眠时长趋势"
              labels={sleep.map((s) => format(new Date(s.date), "M/d"))}
              data={sleep.map((s) => s.totalHours)}
              unit="h"
              color={Colors.sleep}
            />
          )}

          {/* 体重曲线 */}
          {weight.length > 0 && (
            <StatChart
              title="体重增长曲线"
              labels={weight.map((w) => format(new Date(w.date), "M/d"))}
              data={weight.map((w) => w.valueG)}
              unit="g"
              color={Colors.weight}
            />
          )}

          {/* 黄疸趋势 */}
          {jaundice.length > 0 && (
            <StatChart
              title="黄疸变化趋势"
              labels={jaundice.map((j) => format(new Date(j.date), "M/d"))}
              data={jaundice.map((j) => j.value)}
              unit=""
              color={Colors.jaundice}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  periodRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  periodButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  periodTextActive: { color: "#FFF", fontWeight: "600" },
});
```

- [ ] **Step 3: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/app/\(tabs\)/stats.tsx baby-tracker-app/components/StatChart.tsx
git commit -m "feat(app): 实现统计页面（喂奶、睡眠、体重、黄疸趋势图）"
```

---

## Task 12: 寄语页面

**Files:**
- Create: `baby-tracker-app/app/(tabs)/messages.tsx`
- Create: `baby-tracker-app/components/MessageItem.tsx`
- Create: `baby-tracker-app/hooks/use-audio.ts`

- [ ] **Step 1: 创建音频录制/播放 hook**

```typescript
// hooks/use-audio.ts

import { useState, useRef } from "react";
import { Audio } from "expo-av";

interface UseAudioReturn {
  // 录制
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ uri: string; duration: number }>;
  // 播放
  isPlaying: boolean;
  playAudio: (uri: string, headers?: Record<string, string>) => Promise<void>;
  stopPlaying: () => Promise<void>;
}

export function useAudio(): UseAudioReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) throw new Error("需要麦克风权限");

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setIsRecording(true);
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration((d) => d + 1);
    }, 1000);
  };

  const stopRecording = async () => {
    if (!recordingRef.current) throw new Error("No recording");
    if (timerRef.current) clearInterval(timerRef.current);

    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI()!;
    const duration = recordingDuration;
    recordingRef.current = null;
    setIsRecording(false);
    setRecordingDuration(0);

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    return { uri, duration };
  };

  const playAudio = async (uri: string, headers?: Record<string, string>) => {
    await stopPlaying();
    const { sound } = await Audio.Sound.createAsync(
      { uri, headers },
      { shouldPlay: true }
    );
    soundRef.current = sound;
    setIsPlaying(true);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setIsPlaying(false);
      }
    });
  };

  const stopPlaying = async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsPlaying(false);
  };

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    isPlaying,
    playAudio,
    stopPlaying,
  };
}
```

- [ ] **Step 2: 创建寄语项组件**

```tsx
// components/MessageItem.tsx

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Message } from "@/types";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";
import { format } from "date-fns";
import { getAudioUrl } from "@/services/message-api";
import * as SecureStore from "expo-secure-store";

interface Props {
  message: Message;
  isPlaying: boolean;
  onPlayAudio: (uri: string, headers: Record<string, string>) => void;
  onStopAudio: () => void;
}

export default function MessageItem({
  message,
  isPlaying,
  onPlayAudio,
  onStopAudio,
}: Props) {
  const date = format(new Date(message.recordedAt), "M月d日 HH:mm");
  const nickname = message.user?.nickname || "未知";

  const handlePlayAudio = async () => {
    if (isPlaying) {
      onStopAudio();
      return;
    }
    const token = await SecureStore.getItemAsync("accessToken");
    const audioUrl = getAudioUrl(message.id);
    onPlayAudio(audioUrl, { Authorization: `Bearer ${token || ""}` });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.author}>{nickname}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>

      {message.textContent && (
        <Text style={styles.text}>{message.textContent}</Text>
      )}

      {message.audioUrl && (
        <TouchableOpacity style={styles.audioRow} onPress={handlePlayAudio}>
          <MaterialCommunityIcons
            name={isPlaying ? "pause-circle" : "play-circle"}
            size={36}
            color={Colors.primary}
          />
          <Text style={styles.audioDuration}>
            {message.audioDurationSeconds
              ? `${Math.round(message.audioDurationSeconds)}秒`
              : "语音"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  author: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: Colors.primary,
  },
  date: { fontSize: FontSize.sm, color: Colors.textSecondary },
  text: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    backgroundColor: Colors.surfaceSecondary,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  audioDuration: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
});
```

- [ ] **Step 3: 创建寄语页面**

```tsx
// app/(tabs)/messages.tsx

import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import { useAudio } from "@/hooks/use-audio";
import * as messageApi from "@/services/message-api";
import { Message } from "@/types";
import MessageItem from "@/components/MessageItem";
import EmptyState from "@/components/EmptyState";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

export default function MessagesScreen() {
  const { currentBaby } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [sending, setSending] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    playAudio,
    stopPlaying,
  } = useAudio();

  const loadMessages = useCallback(async () => {
    if (!currentBaby) return;
    try {
      const data = await messageApi.getMessages(currentBaby.id);
      setMessages(data);
    } catch (err) {
      console.error("加载寄语失败:", err);
    }
  }, [currentBaby]);

  useFocusEffect(
    useCallback(() => {
      loadMessages();
    }, [loadMessages])
  );

  const handleSendText = async () => {
    if (!currentBaby || !textInput.trim()) return;
    setSending(true);
    try {
      await messageApi.createMessage(currentBaby.id, {
        textContent: textInput.trim(),
      });
      setTextInput("");
      await loadMessages();
    } catch {
      Alert.alert("发送失败", "请重试");
    } finally {
      setSending(false);
    }
  };

  const handleRecordToggle = async () => {
    if (!currentBaby) return;
    if (isRecording) {
      try {
        const { uri, duration } = await stopRecording();
        setSending(true);
        await messageApi.createMessage(currentBaby.id, {
          audioUri: uri,
          audioDurationSeconds: duration,
        });
        await loadMessages();
      } catch {
        Alert.alert("发送失败", "请重试");
      } finally {
        setSending(false);
      }
    } else {
      try {
        await startRecording();
      } catch {
        Alert.alert("提示", "无法录音，请检查权限");
      }
    }
  };

  const handlePlayAudio = (uri: string, headers: Record<string, string>) => {
    playAudio(uri, headers);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={88}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageItem
            message={item}
            isPlaying={playingId === item.id}
            onPlayAudio={(uri, headers) => {
              setPlayingId(item.id);
              handlePlayAudio(uri, headers);
            }}
            onStopAudio={() => {
              setPlayingId(null);
              stopPlaying();
            }}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            title="还没有寄语"
            subtitle="在下方写下对宝宝说的话"
          />
        }
      />

      {/* 底部输入栏 */}
      <View style={styles.inputBar}>
        {/* 录音按钮 */}
        <TouchableOpacity
          style={[styles.micButton, isRecording && styles.micButtonActive]}
          onPress={handleRecordToggle}
        >
          <MaterialCommunityIcons
            name={isRecording ? "stop" : "microphone"}
            size={24}
            color={isRecording ? "#FFF" : Colors.primary}
          />
        </TouchableOpacity>

        {isRecording ? (
          <Text style={styles.recordingText}>
            录音中... {recordingDuration}秒
          </Text>
        ) : (
          <>
            <TextInput
              style={styles.textInput}
              placeholder="写给宝宝的话..."
              value={textInput}
              onChangeText={setTextInput}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!textInput.trim() || sending) && styles.sendDisabled,
              ]}
              onPress={handleSendText}
              disabled={!textInput.trim() || sending}
            >
              <MaterialCommunityIcons
                name="send"
                size={20}
                color="#FFF"
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Spacing.md, flexGrow: 1 },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonActive: {
    backgroundColor: Colors.error,
  },
  recordingText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.error,
    fontWeight: "500",
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendDisabled: { backgroundColor: Colors.textLight },
});
```

- [ ] **Step 4: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/app/\(tabs\)/messages.tsx baby-tracker-app/components/MessageItem.tsx baby-tracker-app/hooks/use-audio.ts
git commit -m "feat(app): 实现寄语页面（文字+语音录制+播放）"
```

---

## Task 13: 个人中心页面

**Files:**
- Create: `baby-tracker-app/app/(tabs)/profile.tsx`

- [ ] **Step 1: 创建个人中心页面**

```tsx
// app/(tabs)/profile.tsx

import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import * as babyApi from "@/services/baby-api";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";
import { format, differenceInDays } from "date-fns";

export default function ProfileScreen() {
  const { user, currentBaby, babies, logout, setCurrentBaby } = useAuthStore();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const router = useRouter();

  const babyAge = currentBaby?.birthDate
    ? differenceInDays(new Date(), new Date(currentBaby.birthDate))
    : null;

  const handleInvite = async () => {
    if (!currentBaby) return;
    try {
      const code = await babyApi.createInvite(currentBaby.id);
      setInviteCode(code);
      await Share.share({
        message: `邀请你一起记录宝宝${currentBaby.name}的成长！邀请码: ${code}`,
      });
    } catch {
      Alert.alert("生成失败", "请重试");
    }
  };

  const handleLogout = () => {
    Alert.alert("退出登录", "确定要退出吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  interface MenuItem {
    icon: string;
    label: string;
    onPress: () => void;
    color?: string;
  }

  const menuItems: MenuItem[] = [
    {
      icon: "baby-face-outline",
      label: "宝宝档案",
      onPress: () => router.push("/baby/create"),
    },
    {
      icon: "account-plus",
      label: "邀请家人",
      onPress: handleInvite,
    },
    {
      icon: "swap-horizontal",
      label: "切换宝宝",
      onPress: () => {
        if (babies.length <= 1) {
          Alert.alert("提示", "暂无其他宝宝");
          return;
        }
        const next = babies.find((b) => b.id !== currentBaby?.id);
        if (next) setCurrentBaby(next);
      },
    },
    {
      icon: "link-plus",
      label: "加入宝宝（邀请码）",
      onPress: () => router.push("/baby/join"),
    },
    {
      icon: "logout",
      label: "退出登录",
      onPress: handleLogout,
      color: Colors.error,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* 用户信息卡片 */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons
            name="account-circle"
            size={60}
            color={Colors.primaryLight}
          />
        </View>
        <Text style={styles.nickname}>{user?.nickname || "用户"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* 宝宝信息 */}
      {currentBaby && (
        <View style={styles.babyCard}>
          <Text style={styles.babyName}>{currentBaby.name}</Text>
          <Text style={styles.babyInfo}>
            {currentBaby.birthDate &&
              `出生于 ${format(new Date(currentBaby.birthDate), "yyyy年M月d日")}`}
            {babyAge !== null && ` · 第${babyAge}天`}
          </Text>
        </View>
      )}

      {/* 邀请码显示 */}
      {inviteCode && (
        <View style={styles.inviteBox}>
          <Text style={styles.inviteLabel}>邀请码</Text>
          <Text style={styles.inviteCode}>{inviteCode}</Text>
          <Text style={styles.inviteHint}>分享给家人即可一起记录</Text>
        </View>
      )}

      {/* 菜单列表 */}
      <View style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.menuItem,
              index < menuItems.length - 1 && styles.menuItemBorder,
            ]}
            onPress={item.onPress}
          >
            <MaterialCommunityIcons
              name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={22}
              color={item.color || Colors.textPrimary}
            />
            <Text style={[styles.menuLabel, item.color && { color: item.color }]}>
              {item.label}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={Colors.textLight}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  userCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
  },
  avatar: { marginBottom: Spacing.sm },
  nickname: {
    fontSize: FontSize.xl,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  babyCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  babyName: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.primary,
  },
  babyInfo: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  inviteBox: {
    backgroundColor: Colors.surfaceSecondary,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  inviteLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  inviteCode: {
    fontSize: FontSize.xxl,
    fontWeight: "bold",
    color: Colors.primary,
    letterSpacing: 4,
    marginVertical: Spacing.sm,
  },
  inviteHint: { fontSize: FontSize.xs, color: Colors.textLight },
  menuCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
});
```

- [ ] **Step 2: 提交**

```bash
cd /Users/bytedance/baby-tracker
git add baby-tracker-app/app/\(tabs\)/profile.tsx
git commit -m "feat(app): 实现个人中心页面（用户信息、宝宝档案、邀请家人、退出登录）"
```

---

## Task 14: 端到端集成测试与调试

**Files:**
- 全部已有文件，确保各页面串联正常

- [ ] **Step 1: 确保后端服务运行**

```bash
# 确保 Docker PostgreSQL 运行
$HOME/.docker/bin/docker ps

# 启动后端
cd /Users/bytedance/baby-tracker/baby-tracker-server
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
pnpm dev
```

- [ ] **Step 2: 启动 Expo 开发服务器**

```bash
cd /Users/bytedance/baby-tracker/baby-tracker-app
export PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"
npx expo start
```

- [ ] **Step 3: 验证完整用户流程**

在 iOS 模拟器或 Expo Go 中逐步测试：

1. 注册新用户 → 成功后跳转创建宝宝页
2. 创建宝宝档案 → 成功后进入首页 Tab
3. 点击中央 + 按钮 → 弹出记录面板
4. 按住语音按钮说话 → 识别文字 → 发送解析 → 跳转确认页
5. 确认保存 → 返回首页，时间线和小结更新
6. 使用文字输入记录 → 同样流程
7. 使用快捷按钮 → 跳转手动表单 → 保存
8. 切换到统计 Tab → 查看趋势图
9. 切换到寄语 Tab → 发送文字寄语 → 录制语音寄语 → 播放
10. 切换到我的 Tab → 生成邀请码 → 退出登录

- [ ] **Step 4: 修复发现的问题**

根据测试结果修复 bug。常见问题检查清单：
- API base URL 在真机上需要使用局域网 IP 而不是 localhost
- 文件上传 FormData 格式是否正确
- 语音识别权限弹窗是否正常
- Tab 间切换数据是否刷新

- [ ] **Step 5: 提交最终修复**

```bash
cd /Users/bytedance/baby-tracker
git add -A
git commit -m "fix(app): 修复集成测试发现的问题"
```

---

## 总结

| Task | 内容 | 预估步骤 |
|------|------|---------|
| 1 | 项目初始化与依赖安装 | 6 |
| 2 | TypeScript 类型定义与常量 | 4 |
| 3 | API 服务层（7个文件） | 8 |
| 4 | 状态管理（Zustand Store） | 3 |
| 5 | 根布局与认证路由守卫 | 6 |
| 6 | 宝宝档案创建与加入 | 3 |
| 7 | Tab 导航布局 | 3 |
| 8 | 记录面板（语音+文字+快捷按钮） | 5 |
| 9 | 首页（每日小结+时间线） | 5 |
| 10 | 语音确认页+手动记录表单 | 4 |
| 11 | 统计页面 | 3 |
| 12 | 寄语页面 | 4 |
| 13 | 个人中心页面 | 2 |
| 14 | 端到端集成测试 | 5 |
