import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User, Baby } from "@/types";
import * as authApi from "@/services/auth-api";
import * as babyApi from "@/services/baby-api";

interface AuthState {
  user: User | null;
  currentBaby: Baby | null;
  babies: Baby[];
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  loadBabies: () => Promise<void>;
  setCurrentBaby: (baby: Baby) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  currentBaby: null,
  babies: [],
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const result = await authApi.login(email, password);
    await SecureStore.setItemAsync("accessToken", result.accessToken);
    await SecureStore.setItemAsync("refreshToken", result.refreshToken);
    await SecureStore.setItemAsync("user", JSON.stringify(result.user));
    set({ user: result.user, isAuthenticated: true });
    await get().loadBabies();
  },

  register: async (email, password, nickname) => {
    const result = await authApi.register(email, password, nickname);
    await SecureStore.setItemAsync("accessToken", result.accessToken);
    await SecureStore.setItemAsync("refreshToken", result.refreshToken);
    await SecureStore.setItemAsync("user", JSON.stringify(result.user));
    set({ user: result.user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("accessToken");
    await SecureStore.deleteItemAsync("refreshToken");
    await SecureStore.deleteItemAsync("user");
    await SecureStore.deleteItemAsync("currentBabyId");
    set({
      user: null,
      currentBaby: null,
      babies: [],
      isAuthenticated: false,
    });
  },

  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      if (!token) {
        set({ isLoading: false });
        return;
      }
      const savedUser = await SecureStore.getItemAsync("user");
      const user = savedUser ? JSON.parse(savedUser) : null;
      if (!user) {
        set({ isLoading: false });
        return;
      }
      const babies = await babyApi.getBabies();
      const savedBabyId = await SecureStore.getItemAsync("currentBabyId");
      const currentBaby =
        babies.find((b) => b.id === savedBabyId) || babies[0] || null;
      set({
        user,
        babies,
        currentBaby,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  loadBabies: async () => {
    const babies = await babyApi.getBabies();
    const current = get().currentBaby;
    const currentBaby =
      babies.find((b) => b.id === current?.id) || babies[0] || null;
    set({ babies, currentBaby });
  },

  setCurrentBaby: (baby) => {
    SecureStore.setItemAsync("currentBabyId", baby.id);
    set({ currentBaby: baby });
  },
}));
