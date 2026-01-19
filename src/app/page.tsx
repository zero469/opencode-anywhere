"use client";

import { useSyncExternalStore, useEffect } from "react";
import { useAppStore } from "@/store";
import { useSSE } from "@/hooks/useSSE";
import { useKeyboard } from "@/hooks/useKeyboard";
import { AuthForm } from "@/components/AuthForm";
import { DeviceList } from "@/components/DeviceList";
import { SessionList } from "@/components/SessionList";
import { MessageList } from "@/components/MessageList";
import { MessageInput } from "@/components/MessageInput";
import { PermissionDialog } from "@/components/PermissionDialog";
import { requestNotificationPermission } from "@/lib/notifications";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

function ChatView() {
  const { currentSessionId, deselectDevice, clearCurrentSession, refreshCurrentSession } = useAppStore();
  const sessions = useAppStore((state) => state.sessions);
  const status = useAppStore((state) => state.status);
  const selectedDevice = useAppStore((state) => state.selectedDevice);
  const keyboardHeight = useKeyboard();

  useSSE();
  
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        const state = useAppStore.getState();
        if (state.currentSessionId) {
          console.log("[appStateChange] Refreshing session:", state.currentSessionId);
          state.refreshCurrentSession();
        }
      }
    });
    
    return () => {
      listener.then(l => l.remove());
    };
  }, []);

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  const handleBack = () => {
    if (currentSessionId) {
      clearCurrentSession();
    } else {
      deselectDevice();
    }
  };

  return (
    <div 
      className="flex h-screen bg-zinc-950 overflow-hidden" 
      style={{ 
        paddingTop: 'var(--safe-area-top)', 
        paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 'var(--safe-area-bottom)' 
      }}
    >
      <div className="fixed top-0 left-0 right-0 bg-zinc-900 z-50" style={{ height: 'var(--safe-area-top)' }} />
      
      <aside className="hidden lg:flex lg:flex-col w-72 bg-zinc-900 border-r border-zinc-800" style={{ paddingTop: 'var(--safe-area-top)' }}>
        <SessionList />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-3">
             <button onClick={handleBack} className="p-2 text-zinc-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
                 <h1 className="text-lg font-semibold text-white truncate">
                  {currentSession?.title || selectedDevice?.name || "OpenCode"}
                </h1>
                <span className="text-xs text-zinc-400">{currentSession ? "Chat" : "Sessions"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status.connected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-xs text-zinc-500">
              {status.connected ? `v${status.serverVersion}` : "Offline"}
            </span>
          </div>
        </header>
        
        {currentSessionId ? (
          <>
            <MessageList keyboardHeight={keyboardHeight} />
            <MessageInput />
          </>
        ) : (
          <div className="flex-grow p-4 overflow-y-auto">
             <SessionList />
          </div>
        )}
      </main>

      <PermissionDialog />
    </div>
  );
}


const emptySubscribe = () => () => {};
const getServerSnapshot = () => false;
const getClientSnapshot = () => true;

function ConnectingView() {
  const selectedDevice = useAppStore((state) => state.selectedDevice);
  const deselectDevice = useAppStore((state) => state.deselectDevice);
  return (
     <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4" />
        <p className="text-lg">Connecting to {selectedDevice?.name}...</p>
        <p className="text-sm text-zinc-400 mb-6">{selectedDevice?.subdomain}</p>
        <button 
          onClick={deselectDevice}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-md text-sm"
        >
          Cancel
        </button>
     </div>
  )
}

export default function Home() {
  const relayToken = useAppStore((state) => state.relayToken);
  const selectedDevice = useAppStore((state) => state.selectedDevice);
  const status = useAppStore((state) => state.status);
  const config = useAppStore((state) => state.config);
  const fetchDevices = useAppStore((state) => state.fetchDevices);
  const selectDevice = useAppStore((state) => state.selectDevice);

  const hydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    if (hydrated) {
      requestNotificationPermission();
    }
  }, [hydrated]);

  useEffect(() => {
    if (hydrated && relayToken) {
      fetchDevices();
    }
  }, [hydrated, relayToken, fetchDevices]);

  // Re-connect when we have a selected device but no config (after app restart)
  useEffect(() => {
    if (hydrated && relayToken && selectedDevice && !config) {
      selectDevice(selectedDevice);
    }
  }, [hydrated, relayToken, selectedDevice, config, selectDevice]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!relayToken) {
    return <AuthForm />;
  }

  if (!selectedDevice) {
    return <DeviceList />;
  }

  if (!status.connected) {
    return <ConnectingView />;
  }

  return <ChatView />;
}
