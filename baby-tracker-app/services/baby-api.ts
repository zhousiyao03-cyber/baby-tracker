import { api } from "./api";
import { Baby, Gender } from "@/types";

export async function createBaby(params: {
  name: string;
  gender?: Gender;
  birthDate: string;
}): Promise<Baby> {
  const { data } = await api.post("/api/babies", params);
  return data;
}

export async function getBabies(): Promise<Baby[]> {
  const { data } = await api.get("/api/babies");
  return data;
}

export async function updateBaby(
  babyId: string,
  params: Partial<{ name: string; gender: Gender; birthDate: string }>
): Promise<Baby> {
  const { data } = await api.put(`/api/babies/${babyId}`, params);
  return data;
}

export async function createInvite(babyId: string): Promise<string> {
  const { data } = await api.post(`/api/babies/${babyId}/invite`);
  return data.inviteCode;
}

export async function joinByInvite(inviteCode: string): Promise<Baby> {
  const { data } = await api.post("/api/babies/join", { inviteCode });
  return data;
}
