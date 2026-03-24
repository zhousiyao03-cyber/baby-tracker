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
