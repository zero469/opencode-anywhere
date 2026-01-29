"use client";

import { useEffect, useRef } from "react";
import { useAppStore, startFallbackCheck, stopFallbackCheck } from "@/store";
import { subscribeToEvents, getConfig } from "@/lib/opencode";

export function useSSE() {
  const { config, status, handleSSEEvent, selectedDevice, deviceEncryptionKeys, refreshCurrentSession } = useAppStore();
  const eventSourceRef = useRef<{ close: () => void } | null>(null);

  useEffect(() => {
    const currentConfig = config || getConfig();
    if (!currentConfig?.baseUrl || !status.connected) {
      return;
    }

    const getCurrentSessionId = () => useAppStore.getState().currentSessionId;
    
    const deviceInfo = selectedDevice ? {
      subdomain: selectedDevice.subdomain,
      authUser: selectedDevice.auth_user,
      authPassword: selectedDevice.auth_password,
      encryptionKey: deviceEncryptionKeys[selectedDevice.id],
    } : undefined;

    const handleReconnect = () => {
      refreshCurrentSession();
    };

    eventSourceRef.current = subscribeToEvents(currentConfig, handleSSEEvent, getCurrentSessionId, deviceInfo, handleReconnect);
    startFallbackCheck();

    return () => {
      eventSourceRef.current?.close();
      stopFallbackCheck();
    };
  }, [config, status.connected, handleSSEEvent, selectedDevice, deviceEncryptionKeys, refreshCurrentSession]);
}
