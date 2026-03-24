import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "@/stores/auth-store";
import { ActivityIndicator, View } from "react-native";
import { Colors } from "@/constants/theme";

export default function RootLayout() {
  const { isAuthenticated, isLoading, restoreSession, currentBaby } =
    useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      if (!currentBaby) {
        router.replace("/baby/create");
      } else {
        router.replace("/(tabs)");
      }
    }
  }, [isAuthenticated, isLoading, segments, currentBaby]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="record/manual"
          options={{ presentation: "modal", headerShown: true, title: "手动记录" }}
        />
        <Stack.Screen
          name="record/confirm"
          options={{ presentation: "modal", headerShown: true, title: "确认记录" }}
        />
        <Stack.Screen
          name="baby/create"
          options={{ headerShown: true, title: "添加宝宝" }}
        />
        <Stack.Screen
          name="baby/join"
          options={{ headerShown: true, title: "加入宝宝" }}
        />
      </Stack>
    </>
  );
}
