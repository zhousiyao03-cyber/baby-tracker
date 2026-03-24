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
