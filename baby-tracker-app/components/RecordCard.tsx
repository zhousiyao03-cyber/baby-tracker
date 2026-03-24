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
