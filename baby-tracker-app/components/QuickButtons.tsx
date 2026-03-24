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
