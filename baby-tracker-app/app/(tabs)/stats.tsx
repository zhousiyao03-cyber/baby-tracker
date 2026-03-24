import { useState, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";
import * as statsApi from "@/services/stats-api";
import { FeedingStat, WeightStat, JaundiceStat, SleepStat } from "@/types";
import StatChart from "@/components/StatChart";
import EmptyState from "@/components/EmptyState";
import { Colors, Spacing, FontSize } from "@/constants/theme";
import { format } from "date-fns";

export default function StatsScreen() {
  const { currentBaby } = useAuthStore();
  const [days, setDays] = useState(7);
  const [feeding, setFeeding] = useState<FeedingStat[]>([]);
  const [weight, setWeight] = useState<WeightStat[]>([]);
  const [jaundice, setJaundice] = useState<JaundiceStat[]>([]);
  const [sleep, setSleep] = useState<SleepStat[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    if (!currentBaby) return;
    try {
      const [f, w, j, s] = await Promise.all([
        statsApi.getFeedingStats(currentBaby.id, days),
        statsApi.getWeightStats(currentBaby.id, days),
        statsApi.getJaundiceStats(currentBaby.id, days),
        statsApi.getSleepStats(currentBaby.id, days),
      ]);
      setFeeding(f);
      setWeight(w);
      setJaundice(j);
      setSleep(s);
    } catch (err) {
      console.error("加载统计失败:", err);
    }
  }, [currentBaby, days]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const dayOptions = [7, 14, 30];

  const hasData =
    feeding.length > 0 ||
    weight.length > 0 ||
    jaundice.length > 0 ||
    sleep.length > 0;

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
      <View style={styles.periodRow}>
        {dayOptions.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.periodButton, days === d && styles.periodActive]}
            onPress={() => setDays(d)}
          >
            <Text
              style={[
                styles.periodText,
                days === d && styles.periodTextActive,
              ]}
            >
              {d}天
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!hasData ? (
        <EmptyState
          icon="chart-line"
          title="暂无统计数据"
          subtitle="记录几天后这里会出现趋势图"
        />
      ) : (
        <>
          {feeding.length > 0 && (
            <StatChart
              title="配方奶量趋势"
              labels={feeding.map((f) => format(new Date(f.date), "M/d"))}
              data={feeding.map((f) => f.formulaMl)}
              unit="ml"
              color={Colors.feeding}
            />
          )}

          {sleep.length > 0 && (
            <StatChart
              title="睡眠时长趋势"
              labels={sleep.map((s) => format(new Date(s.date), "M/d"))}
              data={sleep.map((s) => s.totalHours)}
              unit="h"
              color={Colors.sleep}
            />
          )}

          {weight.length > 0 && (
            <StatChart
              title="体重增长曲线"
              labels={weight.map((w) => format(new Date(w.date), "M/d"))}
              data={weight.map((w) => w.valueG)}
              unit="g"
              color={Colors.weight}
            />
          )}

          {jaundice.length > 0 && (
            <StatChart
              title="黄疸变化趋势"
              labels={jaundice.map((j) => format(new Date(j.date), "M/d"))}
              data={jaundice.map((j) => j.value)}
              unit=""
              color={Colors.jaundice}
            />
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md },
  periodRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  periodButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  periodTextActive: { color: "#FFF", fontWeight: "600" },
});
