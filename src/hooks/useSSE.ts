"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store";
import { subscribeToEvents, getConfig } from "@/lib/opencode";

export function useSSE() {
  const { config, status, handleSSEEvent } = useAppStore();
  const eventSourceRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    const currentConfig = config || getConfig();
    if (!currentConfig?.baseUrl || !status.connected) {
      return;
    }

    eventSourceRef.current = subscribeToEvents(currentConfig, handleSSEEvent);

    return () => {
      eventSourceRef.current?.close();
    };
  }, [config, status.connected, handleSSEEvent]);
}
