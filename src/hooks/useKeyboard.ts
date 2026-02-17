import { useEffect, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

let keyboardHeight = 0;
let pendingHeight: number | null = null;
let rafId: number | null = null;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return keyboardHeight;
}

function notify() {
  listeners.forEach(l => l());
}

// Batch keyboard height updates using requestAnimationFrame
// This prevents multiple synchronous layout recalculations during keyboard animation
function scheduleUpdate(newHeight: number) {
  pendingHeight = newHeight;
  
  if (rafId !== null) {
    return; // Already scheduled
  }
  
  rafId = requestAnimationFrame(() => {
    rafId = null;
    if (pendingHeight !== null && pendingHeight !== keyboardHeight) {
      keyboardHeight = pendingHeight;
      pendingHeight = null;
      notify();
    }
  });
}

let initialized = false;

function initKeyboardListeners() {
  if (initialized || !Capacitor.isNativePlatform()) return;
  initialized = true;
  
  Keyboard.addListener("keyboardWillShow", (info) => {
    scheduleUpdate(info.keyboardHeight);
  });

  Keyboard.addListener("keyboardWillHide", () => {
    scheduleUpdate(0);
  });
}

// Pre-warm keyboard plugin on app start to avoid first-input delay
export function preWarmKeyboard() {
  if (!Capacitor.isNativePlatform()) return;
  initKeyboardListeners();
}

export function useKeyboard() {
  useEffect(() => {
    initKeyboardListeners();
  }, []);
  
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
