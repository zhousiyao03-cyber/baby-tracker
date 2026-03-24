import { api } from "./api";
import { Photo } from "@/types";

export async function uploadPhoto(
  babyId: string,
  imageUri: string,
  options?: { recordId?: string; messageId?: string }
): Promise<Photo> {
  const formData = new FormData();
  const filename = imageUri.split("/").pop() || "photo.jpg";
  formData.append("file", {
    uri: imageUri,
    name: filename,
    type: "image/jpeg",
  } as unknown as Blob);

  let url = `/api/babies/${babyId}/photos`;
  const params = new URLSearchParams();
  if (options?.recordId) params.append("recordId", options.recordId);
  if (options?.messageId) params.append("messageId", options.messageId);
  const qs = params.toString();
  if (qs) url += `?${qs}`;

  const { data } = await api.post(url, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getPhotos(
  babyId: string,
  date?: string
): Promise<Photo[]> {
  const params = date ? { date } : {};
  const { data } = await api.get(`/api/babies/${babyId}/photos`, { params });
  return data;
}

export async function deletePhoto(photoId: string): Promise<void> {
  await api.delete(`/api/photos/${photoId}`);
}
