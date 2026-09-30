"use client";

import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: AuthUser | null;
  /** `null` while first load is in flight; `false` once resolved as signed-out. */
  loaded: boolean;
  setUser: (u: AuthUser | null) => void;
  setLoaded: (v: boolean) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loaded: false,
  setUser: (user) => set({ user, loaded: true }),
  setLoaded: (loaded) => set({ loaded }),
}));
