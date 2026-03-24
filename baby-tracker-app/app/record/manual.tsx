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

    const data: Record<string, unknown> = {};
    for (const field of fields) {
      const val = values[field.key]?.trim();
      if (!val && field.key !== "end_time" && field.key !== "duration_minutes" && field.key !== "water_temp") {
        Alert.alert("提示", `请填写${field.label}`);
        return;
      }
      if (val) {
        if (field.keyboard === "numeric" || field.keyboard === "decimal-pad") {
          data[field.key] = Number(val);
        } else if (field.key === "end_time" && val) {
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
