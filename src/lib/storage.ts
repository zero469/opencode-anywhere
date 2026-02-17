import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import type { StateStorage } from "zustand/middleware";

// Capacitor Preferences storage adapter for Zustand persist
// Uses native storage on iOS/Android, falls back to localStorage on web
export const capacitorStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (Capacitor.isNativePlatform()) {
      // Try native storage first
      const { value } = await Preferences.get({ key: name });
      if (value !== null) {
        return value;
      }

      // Migration: check localStorage for old data (pre-Capacitor Preferences)
      if (typeof localStorage !== "undefined") {
        const oldValue = localStorage.getItem(name);
        if (oldValue !== null) {
          // Migrate to native storage
          await Preferences.set({ key: name, value: oldValue });
          // Clean up old storage
          localStorage.removeItem(name);
          return oldValue;
        }
      }
      return null;
    }
    // Web fallback
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
