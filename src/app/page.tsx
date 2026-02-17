"use client";

import { useSyncExternalStore, useEffect } from "react";
import { useAppStore } from "@/store";
import { useSSE } from "@/hooks/useSSE";
import { useKeyboard, preWarmKeyboard } from "@/hooks/useKeyboard";
import { AuthForm } from "@/components/AuthForm";
import { DeviceList } from "@/components/DeviceList";
import { SessionList } from "@/components/SessionList";
import { MessageList } from "@/components/MessageList";
import { MessageInput } from "@/components/MessageInput";
import { PermissionDialog } from "@/components/PermissionDialog";
import { QuestionDialog } from "@/components/QuestionDialog";
import { TodoCard } from "@/components/TodoCard";
import { SplashScreen } from "@/components/SplashScreen";
import { requestNotificationPermission } from "@/lib/notifications";
import { APP_VERSION } from "@/lib/version";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

if (typeof window !== 'undefined') {
  preWarmKeyboard();
}

function ChatView() {
  const { currentSessionId, deselectDevice, clearCurrentSession } = useAppStore();
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
        state.onAppResume();
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
      className="flex h-screen overflow-hidden" 
      style={{ 
        backgroundColor: 'var(--background)',
        paddingTop: 'var(--safe-area-top)', 
        paddingBottom: keyboardHeight > 0 ? `${keyboardHeight}px` : 'var(--safe-area-bottom)',
        willChange: keyboardHeight > 0 ? 'padding-bottom' : 'auto'
      }}
    >
      <div className="fixed top-0 left-0 right-0 z-50" style={{ height: 'var(--safe-area-top)', backgroundColor: 'var(--background-panel)' }} />
      
      <aside className="hidden lg:flex lg:flex-col w-72 border-r" style={{ paddingTop: 'var(--safe-area-top)', backgroundColor: 'var(--background-panel)', borderColor: 'var(--border-subtle)' }}>
        <SessionList />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b" style={{ backgroundColor: 'var(--background-panel)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
             <button onClick={handleBack} className="p-2 hover:opacity-80" style={{ color: 'var(--foreground-muted)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div className="min-w-0">
                 <h1 className="text-lg font-semibold truncate" style={{ color: 'var(--foreground)' }}>
                  {currentSession?.title || selectedDevice?.name || "OpenCode"}
                </h1>
                <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>{currentSession ? "Chat" : "Sessions"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`w-2 h-2 rounded-full ${status.connected ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              {status.connected ? `v${APP_VERSION}` : "Offline"}
            </span>
          </div>
        </header>
        
        {currentSessionId ? (
          <>
            <TodoCard />
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
      <QuestionDialog />
    </div>
  );
}


const emptySubscribe = () => () => {};
const getServerSnapshot = () => false;
const getClientSnapshot = () => true;

const CONNECTION_STEP_LABELS: Record<string, string> = {
  idle: "Idle",
  connecting: "Connecting to server...",
  authenticating: "Authenticating...",
  loading_sessions: "Loading sessions...",
  ready: "Connected",
};

function ConnectingView() {
  const selectedDevice = useAppStore((state) => state.selectedDevice);
  const deselectDevice = useAppStore((state) => state.deselectDevice);
  const connectionStep = useAppStore((state) => state.connectionStep);
  const sessions = useAppStore((state) => state.sessions);
  const selectSession = useAppStore((state) => state.selectSession);
  const checkDeviceAndReconnect = useAppStore((state) => state.checkDeviceAndReconnect);
  
  const isOffline = connectionStep === "idle" && selectedDevice !== null;
  const isConnecting = connectionStep !== "idle" && connectionStep !== "ready";
  const stepLabel = isOffline ? "Device offline" : (CONNECTION_STEP_LABELS[connectionStep] || "Connecting...");
  const hasCachedSessions = sessions.length > 0;
  
  const handleReconnect = () => {
    checkDeviceAndReconnect();
  };
  
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}>
      <div className="fixed top-0 left-0 right-0 z-50" style={{ height: 'var(--safe-area-top)', backgroundColor: 'var(--background)' }} />
      
      <header className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <button onClick={deselectDevice} className="p-2 hover:opacity-80" style={{ color: 'var(--foreground-muted)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold">{selectedDevice?.name}</h1>
            <div className="flex items-center gap-2">
              {isOffline ? (
                <span className={`w-2 h-2 rounded-full bg-red-500`} />
              ) : (
                <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-blue-500" />
              )}
              <span className={`text-xs ${isOffline ? "text-red-400" : ""}`} style={isOffline ? undefined : { color: 'var(--foreground-muted)' }}>{stepLabel}</span>
            </div>
          </div>
        </div>
        {isOffline && (
          <button
            onClick={handleReconnect}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
          >
            Reconnect
          </button>
        )}
      </header>
      
      <main className="flex-grow overflow-y-auto p-4">
        {hasCachedSessions ? (
          <div className="space-y-2">
            <p className="text-xs mb-3" style={{ color: 'var(--foreground-muted)' }}>
              {isOffline ? "Cached sessions (device offline)" : "Recent sessions (cached)"}
            </p>
            {sessions.slice(0, 10).map((session) => (
              <button
                key={session.id}
                onClick={() => selectSession(session.id)}
                disabled={isOffline}
                className={`w-full text-left p-3 rounded-lg border ${isOffline ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
                style={{ backgroundColor: 'var(--background-panel)', borderColor: 'var(--border-subtle)' }}
              >
                <span className="text-sm font-medium truncate block">
                  {session.title || "Untitled Session"}
                </span>
                {session.directory && (
                  <span className="text-xs truncate block mt-1" style={{ color: 'var(--foreground-muted)' }}>
                    {session.directory.split('/').pop()}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full">
            {isOffline ? (
              <>
                <svg className="w-12 h-12 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656m-8.486 9.192a9 9 0 010-12.728m3.536 3.536a4 4 0 010 5.656" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6" />
                </svg>
                <p style={{ color: 'var(--foreground-muted)' }} className="mb-4">Device is offline</p>
                <button
                  onClick={handleReconnect}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Tap to reconnect
                </button>
              </>
            ) : (
              <>
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4" />
                <p style={{ color: 'var(--foreground-muted)' }}>{stepLabel}</p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function Home() {
  const relayToken = useAppStore((state) => state.relayToken);
  const selectedDevice = useAppStore((state) => state.selectedDevice);
  const status = useAppStore((state) => state.status);
  const config = useAppStore((state) => state.config);
  const selectDevice = useAppStore((state) => state.selectDevice);
  const deselectDevice = useAppStore((state) => state.deselectDevice);
  const devices = useAppStore((state) => state.devices);
  const devicesFetched = useAppStore((state) => state.devicesFetched);

  const hydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    if (hydrated) {
      requestNotificationPermission();
    }
  }, [hydrated]);

  // Re-connect when we have a selected device but no config (after app restart)
  // Wait for devices to be fetched first to check if persisted device is online
  useEffect(() => {
    if (hydrated && relayToken && selectedDevice && !config && devicesFetched) {
      // Check if persisted device is online in freshly fetched devices
      const freshDevice = devices.find(d => d.id === selectedDevice.id);
      
      if (freshDevice?.online) {
        // Device is online, connect with fresh device data
        selectDevice(freshDevice);
      } else {
        // Device is offline or not found, go to device list
        deselectDevice();
      }
    }
  }, [hydrated, relayToken, selectedDevice, config, devicesFetched, devices, selectDevice, deselectDevice]);

  if (!hydrated) {
    return <SplashScreen />;
  }

  if (!relayToken) {
    return <AuthForm />;
  }

  if (!selectedDevice) {
    return <DeviceList />;
  }

  // If we have a persisted selectedDevice but no config yet (app just started),
  // wait for devices to be fetched to verify device is online before showing ConnectingView
  // This prevents showing "Device offline" screen before we can redirect to device list
  if (!config && !devicesFetched) {
    return <SplashScreen />;
  }

  if (!status.connected) {
    return <ConnectingView />;
  }

  return <ChatView />;
}
