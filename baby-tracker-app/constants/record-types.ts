import { RecordType } from "@/types";
import { Colors } from "./theme";

export interface RecordTypeConfig {
  label: string;
  icon: string;
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
