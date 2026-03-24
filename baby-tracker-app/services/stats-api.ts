import { api } from "./api";
import { FeedingStat, WeightStat, JaundiceStat, SleepStat } from "@/types";

export async function getFeedingStats(
  babyId: string,
  days = 7
): Promise<FeedingStat[]> {
  const { data } = await api.get(`/api/babies/${babyId}/stats/feeding`, {
    params: { days },
  });
  return data;
}

export async function getWeightStats(
  babyId: string,
  days = 30
): Promise<WeightStat[]> {
  const { data } = await api.get(`/api/babies/${babyId}/stats/weight`, {
    params: { days },
  });
  return data;
}

export async function getJaundiceStats(
  babyId: string,
  days = 14
): Promise<JaundiceStat[]> {
  const { data } = await api.get(`/api/babies/${babyId}/stats/jaundice`, {
    params: { days },
  });
  return data;
}

export async function getSleepStats(
  babyId: string,
  days = 7
): Promise<SleepStat[]> {
  const { data } = await api.get(`/api/babies/${babyId}/stats/sleep`, {
    params: { days },
  });
  return data;
}
