import { api, API_BASE_URL } from "./api";
import { Message } from "@/types";

export async function createMessage(
  babyId: string,
  params: {
    textContent?: string;
    audioUri?: string;
    audioDurationSeconds?: number;
    recordedAt?: string;
  }
): Promise<Message> {
  const formData = new FormData();
  if (params.textContent) {
    formData.append("textContent", params.textContent);
  }
  if (params.audioUri) {
    const filename = params.audioUri.split("/").pop() || "audio.m4a";
    formData.append("audio", {
      uri: params.audioUri,
      name: filename,
      type: "audio/m4a",
    } as unknown as Blob);
  }
  if (params.audioDurationSeconds !== undefined) {
    formData.append(
      "audioDurationSeconds",
      String(params.audioDurationSeconds)
    );
  }
  if (params.recordedAt) {
    formData.append("recordedAt", params.recordedAt);
  }

  const { data } = await api.post(`/api/babies/${babyId}/messages`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getMessages(babyId: string): Promise<Message[]> {
  const { data } = await api.get(`/api/babies/${babyId}/messages`);
  return data;
}

export function getAudioUrl(messageId: string): string {
  return `${API_BASE_URL}/api/messages/${messageId}/audio`;
}
