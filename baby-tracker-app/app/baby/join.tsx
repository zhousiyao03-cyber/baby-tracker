import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import * as babyApi from "@/services/baby-api";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";

export default function JoinBabyScreen() {
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { loadBabies, setCurrentBaby } = useAuthStore();
  const router = useRouter();

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert("提示", "请输入邀请码");
      return;
    }
    setLoading(true);
    try {
      const baby = await babyApi.joinByInvite(inviteCode.trim());
      setCurrentBaby(baby);
      await loadBabies();
      router.replace("/(tabs)");
    } catch {
      Alert.alert("加入失败", "邀请码无效或已使用");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>通过邀请码加入</Text>
      <Text style={styles.desc}>输入家人分享的邀请码，一起记录宝宝成长</Text>

      <TextInput
        style={styles.input}
        placeholder="请输入8位邀请码"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="none"
        maxLength={8}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleJoin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "加入中..." : "加入"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  heading: {
    fontSize: FontSize.xl,
    fontWeight: "bold",
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  desc: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: "center",
    letterSpacing: 4,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontSize: FontSize.lg, fontWeight: "600" },
});
