import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BabyRecord } from "@/types";
import { RECORD_TYPE_MAP } from "@/constants/record-types";
import { Colors, Spacing, FontSize } from "@/constants/theme";
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
