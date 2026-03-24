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
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import * as babyApi from "@/services/baby-api";
import { Gender } from "@/types";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

export default function CreateBabyScreen() {
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("unknown");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);
  const { loadBabies, setCurrentBaby } = useAuthStore();
  const router = useRouter();

  const handleCreate = async () => {
    if (!name.trim() || !birthDate.trim()) {
      Alert.alert("提示", "请填写宝宝名字和出生日期");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate.trim())) {
      Alert.alert("提示", "出生日期格式为 YYYY-MM-DD");
      return;
    }
    setLoading(true);
    try {
      const baby = await babyApi.createBaby({
        name: name.trim(),
        gender,
        birthDate: birthDate.trim(),
      });
      setCurrentBaby(baby);
      await loadBabies();
      router.replace("/(tabs)");
    } catch {
      Alert.alert("创建失败", "请重试");
    } finally {
      setLoading(false);
    }
  };

  const genderOptions: { value: Gender; label: string }[] = [
    { value: "male", label: "男宝" },
    { value: "female", label: "女宝" },
    { value: "unknown", label: "暂不设置" },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>添加宝宝档案</Text>

      <Text style={styles.label}>宝宝名字</Text>
      <TextInput
        style={styles.input}
        placeholder="宝宝的名字或小名"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>性别</Text>
      <View style={styles.genderRow}>
        {genderOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.genderButton,
              gender === opt.value && styles.genderButtonActive,
            ]}
            onPress={() => setGender(opt.value)}
          >
            <Text
              style={[
                styles.genderText,
                gender === opt.value && styles.genderTextActive,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>出生日期</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        value={birthDate}
        onChangeText={setBirthDate}
        keyboardType="numbers-and-punctuation"
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "创建中..." : "创建宝宝档案"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.push("/baby/join")}
      >
        <Text style={styles.linkText}>有邀请码？加入已有宝宝</Text>
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
  label: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  genderRow: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg },
  genderButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: Colors.surface,
  },
  genderButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceSecondary,
  },
  genderText: { fontSize: FontSize.md, color: Colors.textSecondary },
  genderTextActive: { color: Colors.primary, fontWeight: "600" },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontSize: FontSize.lg, fontWeight: "600" },
  linkButton: { marginTop: Spacing.lg, alignItems: "center" },
  linkText: { color: Colors.primary, fontSize: FontSize.md },
});
