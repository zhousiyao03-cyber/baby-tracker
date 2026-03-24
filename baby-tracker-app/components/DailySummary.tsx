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
