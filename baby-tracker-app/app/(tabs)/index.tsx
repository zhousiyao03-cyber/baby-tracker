import { useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  RefreshControl,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import * as recordApi from "@/services/record-api";
import { BabyRecord, DailySummary as DailySummaryType } from "@/types";
import DailySummary from "@/components/DailySummary";
import Timeline from "@/components/Timeline";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function HomeScreen() {
  const { currentBaby } = useAuthStore();
  const [records, setRecords] = useState<BabyRecord[]>([]);
  const [summary, setSummary] = useState<DailySummaryType | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");

  const loadData = useCallback(async () => {
    if (!currentBaby) return;
    try {
      const [recordsData, summaryData] = await Promise.all([
        recordApi.getRecords(currentBaby.id, today),
        recordApi.getDailySummary(currentBaby.id, today),
      ]);
      setRecords(recordsData);
      setSummary(summaryData);
    } catch (err) {
      console.error("加载数据失败:", err);
    }
  }, [currentBaby, today]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const todayDisplay = format(new Date(), "M月d日 EEEE", { locale: zhCN });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.babyName}>{currentBaby?.name || "宝宝"}</Text>
        <Text style={styles.date}>{todayDisplay}</Text>
      </View>

      {summary && <DailySummary summary={summary} />}
      <Timeline records={records} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  header: { marginBottom: Spacing.md },
  babyName: {
    fontSize: FontSize.xxl,
    fontWeight: "bold",
    color: Colors.textPrimary,
  },
  date: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
