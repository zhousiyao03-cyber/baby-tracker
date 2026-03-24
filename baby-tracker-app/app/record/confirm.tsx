import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import { useRecordStore } from "@/stores/record-store";
import * as recordApi from "@/services/record-api";
import RecordCard from "@/components/RecordCard";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

export default function ConfirmScreen() {
  const { currentBaby } = useAuthStore();
  const { parsedRecords, originalText, removeParsedRecord, clearParsed } =
    useRecordStore();
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    if (!currentBaby || parsedRecords.length === 0) return;
    setSaving(true);
    try {
      await recordApi.confirmVoiceRecords(currentBaby.id, parsedRecords);
      clearParsed();
      router.back();
    } catch {
      Alert.alert("保存失败", "请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    clearParsed();
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.originalBox}>
          <Text style={styles.originalLabel}>原始输入</Text>
          <Text style={styles.originalText}>"{originalText}"</Text>
        </View>

        <Text style={styles.sectionTitle}>
          识别出 {parsedRecords.length} 条记录
        </Text>
        {parsedRecords.map((record, index) => (
          <RecordCard
            key={index}
            record={record}
            index={index}
            onRemove={removeParsedRecord}
          />
        ))}

        {parsedRecords.length === 0 && (
          <Text style={styles.emptyText}>所有记录已移除</Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            (saving || parsedRecords.length === 0) && styles.buttonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={saving || parsedRecords.length === 0}
        >
          <Text style={styles.confirmText}>
            {saving ? "保存中..." : "确认保存"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  originalBox: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  originalLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  originalText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: Spacing.xl,
  },
  footer: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  cancelText: { fontSize: FontSize.md, color: Colors.textSecondary },
  confirmButton: {
    flex: 2,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  confirmText: { fontSize: FontSize.md, color: "#FFF", fontWeight: "600" },
});
