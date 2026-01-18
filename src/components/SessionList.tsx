"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store";
import { usePWA } from "@/hooks/usePWA";
import type { Session } from "@/types";

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function SessionItem({ session, isActive, onClick }: { session: Session; isActive: boolean; onClick: () => void }) {
  const timeValue = session.time?.updated || session.time?.created || 0;
  const dirName = session.directory?.split('/').pop() || '';
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-colors ${
        isActive
          ? "bg-blue-600/20 border border-blue-500/50"
          : "bg-zinc-800/50 hover:bg-zinc-800 border border-transparent"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white truncate flex-1">
          {session.title || "Untitled Session"}
        </span>
        {timeValue > 0 && (
          <span className="text-xs text-zinc-500 ml-2">
            {formatTime(timeValue)}
          </span>
        )}
      </div>
      {dirName && (
        <div className="text-xs text-zinc-500 mt-1 truncate">
          {dirName}
        </div>
      )}
    </button>
  );
}

export function SessionList({ onClose }: { onClose?: () => void }) {
  const { sessions, currentSessionId, selectSession, createSession, refreshSessions, disconnect, isLoading } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const { isInstallable, install } = usePWA();

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setNotificationPermission(result);
    }
  };

  const handleSelect = async (id: string) => {
    if (isLoading) return;
    await selectSession(id);
    onClose?.();
  };

  const handleNewSession = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await createSession();
      onClose?.();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white">Sessions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => refreshSessions()}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleNewSession}
            disabled={isCreating}
            className={`p-2 transition-colors ${isCreating ? "text-zinc-600 cursor-not-allowed" : "text-zinc-400 hover:text-white"}`}
            title="New Session"
          >
            {isCreating ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sessions.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">No sessions yet</p>
        ) : (
          sessions.map((session) => (
            <SessionItem
              key={session.id}
              session={session}
              isActive={session.id === currentSessionId}
              onClick={() => handleSelect(session.id)}
            />
          ))
        )}
      </div>

      <div className="p-4 border-t border-zinc-800 space-y-2">
        {isInstallable && (
          <button
            onClick={install}
            className="w-full py-2 px-4 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Install App
          </button>
        )}
        {notificationPermission === "default" && (
          <button
            onClick={requestNotificationPermission}
            className="w-full py-2 px-4 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-700/50 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            Enable Notifications
          </button>
        )}
        {notificationPermission === "granted" && (
          <div className="text-xs text-zinc-500 text-center py-1">
            Notifications enabled
          </div>
        )}
        <button
          onClick={disconnect}
          className="w-full py-2 px-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
