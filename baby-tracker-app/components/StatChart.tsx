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
          decimalPlaces: 1,
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
