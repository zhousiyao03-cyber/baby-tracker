import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Share,
} from "react-native";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/auth-store";
import * as babyApi from "@/services/baby-api";
import { Colors, Spacing, BorderRadius, FontSize } from "@/constants/theme";
import { format, differenceInDays } from "date-fns";

export default function ProfileScreen() {
  const { user, currentBaby, babies, logout, setCurrentBaby } = useAuthStore();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const router = useRouter();

  const babyAge = currentBaby?.birthDate
    ? differenceInDays(new Date(), new Date(currentBaby.birthDate))
    : null;

  const handleInvite = async () => {
    if (!currentBaby) return;
    try {
      const code = await babyApi.createInvite(currentBaby.id);
      setInviteCode(code);
      await Share.share({
        message: `邀请你一起记录宝宝${currentBaby.name}的成长！邀请码: ${code}`,
      });
    } catch {
      Alert.alert("生成失败", "请重试");
    }
  };

  const handleLogout = () => {
    Alert.alert("退出登录", "确定要退出吗？", [
      { text: "取消", style: "cancel" },
      {
        text: "退出",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  interface MenuItem {
    icon: string;
    label: string;
    onPress: () => void;
    color?: string;
  }

  const menuItems: MenuItem[] = [
    {
      icon: "baby-face-outline",
      label: "宝宝档案",
      onPress: () => router.push("/baby/create"),
    },
    {
      icon: "account-plus",
      label: "邀请家人",
      onPress: handleInvite,
    },
    {
      icon: "swap-horizontal",
      label: "切换宝宝",
      onPress: () => {
        if (babies.length <= 1) {
          Alert.alert("提示", "暂无其他宝宝");
          return;
        }
        const next = babies.find((b) => b.id !== currentBaby?.id);
        if (next) setCurrentBaby(next);
      },
    },
    {
      icon: "link-plus",
      label: "加入宝宝（邀请码）",
      onPress: () => router.push("/baby/join"),
    },
    {
      icon: "logout",
      label: "退出登录",
      onPress: handleLogout,
      color: Colors.error,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <MaterialCommunityIcons
            name="account-circle"
            size={60}
            color={Colors.primaryLight}
          />
        </View>
        <Text style={styles.nickname}>{user?.nickname || "用户"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {currentBaby && (
        <View style={styles.babyCard}>
          <Text style={styles.babyName}>{currentBaby.name}</Text>
          <Text style={styles.babyInfo}>
            {currentBaby.birthDate &&
              `出生于 ${format(new Date(currentBaby.birthDate), "yyyy年M月d日")}`}
            {babyAge !== null && ` · 第${babyAge}天`}
          </Text>
        </View>
      )}

      {inviteCode && (
        <View style={styles.inviteBox}>
          <Text style={styles.inviteLabel}>邀请码</Text>
          <Text style={styles.inviteCode}>{inviteCode}</Text>
          <Text style={styles.inviteHint}>分享给家人即可一起记录</Text>
        </View>
      )}

      <View style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.menuItem,
              index < menuItems.length - 1 && styles.menuItemBorder,
            ]}
            onPress={item.onPress}
          >
            <MaterialCommunityIcons
              name={item.icon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={22}
              color={item.color || Colors.textPrimary}
            />
            <Text style={[styles.menuLabel, item.color && { color: item.color }]}>
              {item.label}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={Colors.textLight}
            />
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  userCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
  },
  avatar: { marginBottom: Spacing.sm },
  nickname: {
    fontSize: FontSize.xl,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  email: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  babyCard: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  babyName: {
    fontSize: FontSize.lg,
    fontWeight: "600",
    color: Colors.primary,
  },
  babyInfo: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  inviteBox: {
    backgroundColor: Colors.surfaceSecondary,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  inviteLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  inviteCode: {
    fontSize: FontSize.xxl,
    fontWeight: "bold",
    color: Colors.primary,
    letterSpacing: 4,
    marginVertical: Spacing.sm,
  },
  inviteHint: { fontSize: FontSize.xs, color: Colors.textLight },
  menuCard: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuLabel: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
});
