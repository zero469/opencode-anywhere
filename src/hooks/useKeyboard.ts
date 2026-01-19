import { useEffect, useRef, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";

let keyboardHeight = 0;
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

let initialized = false;

function initKeyboardListeners() {
  if (initialized || !Capacitor.isNativePlatform()) return;
  initialized = true;
  
  Keyboard.addListener("keyboardWillShow", (info) => {
    keyboardHeight = info.keyboardHeight;
    notify();
  });

  Keyboard.addListener("keyboardWillHide", () => {
    keyboardHeight = 0;
    notify();
  });
}

export function useKeyboard() {
  useEffect(() => {
    initKeyboardListeners();
  }, []);
  
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
