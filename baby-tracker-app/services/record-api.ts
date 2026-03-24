import { api } from "./api";
import { BabyRecord, ParsedRecord, DailySummary, RecordType, RecordData } from "@/types";

export async function createRecord(
  babyId: string,
  params: {
    type: RecordType;
    recordedAt: string;
    data?: RecordData;
    note?: string;
  }
): Promise<BabyRecord> {
  const { data } = await api.post(`/api/babies/${babyId}/records`, params);
  return data;
}

export async function getRecords(
  babyId: string,
  date?: string
): Promise<BabyRecord[]> {
  const params = date ? { date } : {};
  const { data } = await api.get(`/api/babies/${babyId}/records`, { params });
  return data;
}

export async function getDailySummary(
  babyId: string,
  date: string
): Promise<DailySummary> {
  const { data } = await api.get(`/api/babies/${babyId}/records/summary`, {
    params: { date },
  });
  return data;
}

export async function updateRecord(
  recordId: string,
  params: Partial<{
    type: RecordType;
    recordedAt: string;
    data: RecordData;
    note: string;
  }>
): Promise<BabyRecord> {
  const { data } = await api.put(`/api/records/${recordId}`, params);
  return data;
}

export async function deleteRecord(recordId: string): Promise<void> {
  await api.delete(`/api/records/${recordId}`);
}

export async function parseVoiceText(
  babyId: string,
  text: string
): Promise<ParsedRecord[]> {
  const { data } = await api.post(`/api/babies/${babyId}/records/voice`, {
    text,
  });
  return data.parsed;
}

export async function confirmVoiceRecords(
  babyId: string,
  records: ParsedRecord[]
): Promise<BabyRecord[]> {
  const { data } = await api.post(
    `/api/babies/${babyId}/records/voice/confirm`,
    { records }
  );
  return data;
}
