"use client";

import { useState, useSyncExternalStore } from "react";
import { useAppStore } from "@/store";
import { useSSE } from "@/hooks/useSSE";
import { ConnectionForm } from "@/components/ConnectionForm";
import { SessionList } from "@/components/SessionList";
import { MessageList } from "@/components/MessageList";
import { MessageInput } from "@/components/MessageInput";
import { PermissionDialog } from "@/components/PermissionDialog";

function ChatView() {
  const [showSidebar, setShowSidebar] = useState(false);
  const { sessions, currentSessionId, status } = useAppStore();
  
  useSSE();

  const currentSession = sessions.find((s) => s.id === currentSessionId);

  return (
    <div className="flex h-screen bg-zinc-950">
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity ${
          showSidebar ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setShowSidebar(false)}
      />

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-zinc-900 border-r border-zinc-800 transform transition-transform lg:transform-none ${
          showSidebar ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <SessionList onClose={() => setShowSidebar(false)} />
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="lg:hidden p-2 text-zinc-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-white truncate">
              {currentSession?.title || "OpenCode Anywhere"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                status.connected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-xs text-zinc-500">
              {status.connected ? `v${status.serverVersion}` : "Disconnected"}
            </span>
          </div>
        </header>

        <MessageList />
        <MessageInput />
      </main>

      <PermissionDialog />
    </div>
  );
}

function ConnectView() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">OpenCode Anywhere</h1>
        <p className="text-zinc-400">Connect to your OpenCode server</p>
      </div>
      <ConnectionForm />
    </div>
  );
}

const emptySubscribe = () => () => {};
const getServerSnapshot = () => false;
const getClientSnapshot = () => true;

export default function Home() {
  const { status } = useAppStore();
  const hydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return status.connected ? <ChatView /> : <ConnectView />;
}
