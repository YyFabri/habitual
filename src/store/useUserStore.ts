import { create } from "zustand";
import type { User } from "@/types/types";

interface UserState {
    user: User | null;
    isLoading: boolean;
    isAuthReady: boolean;

    setUser: (user: User | null) => void;
    setLoading: (loading: boolean) => void;
    setAuthReady: (ready: boolean) => void;
    clearUser: () => void;
}

export const useUserStore = create<UserState>((set) => ({
    user: null,
    isLoading: true,
    isAuthReady: false,

    setUser: (user) => set({ user, isLoading: false }),
    setLoading: (isLoading) => set({ isLoading }),
    setAuthReady: (isAuthReady) => set({ isAuthReady }),
    clearUser: () => set({ user: null, isLoading: false }),
}));
