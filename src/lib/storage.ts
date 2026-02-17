import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { StateStorage } from "zustand/middleware";

// Capacitor Preferences storage adapter for Zustand persist
// Uses native storage on iOS/Android, falls back to localStorage on web
export const capacitorStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key: name });
      return value;
    }
    return typeof localStorage !== "undefined" ? localStorage.getItem(name) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key: name, value });
    } else if (typeof localStorage !== "undefined") {
      localStorage.setItem(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
      await Preferences.remove({ key: name });
    } else if (typeof localStorage !== "undefined") {
      localStorage.removeItem(name);
    }
  },
};
