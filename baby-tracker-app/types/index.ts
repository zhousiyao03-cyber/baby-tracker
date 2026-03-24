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
