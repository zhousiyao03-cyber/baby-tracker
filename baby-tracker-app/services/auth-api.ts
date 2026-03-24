import { api } from "./api";
import { AuthResponse } from "@/types";

export async function register(
  email: string,
  password: string,
  nickname: string
): Promise<AuthResponse> {
  const { data } = await api.post("/api/auth/register", {
    email,
    password,
    nickname,
  });
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await api.post("/api/auth/login", { email, password });
  return data;
}

export async function refreshToken(token: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const { data } = await api.post("/api/auth/refresh", {
    refreshToken: token,
  });
  return data;
}
