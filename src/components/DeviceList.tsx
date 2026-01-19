"use client";

import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/store";
import { Device } from "@/lib/relay";

const SETUP_COMMAND = "curl -sSL https://opencode-relay-server.fly.dev/install.sh -o /tmp/setup.sh && bash /tmp/setup.sh";
const APP_VERSION = "1.0.0";
const GITHUB_URL = "https://github.com/code-yeongyu/opencode-anywhere";

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  
  return Math.floor(seconds) + " seconds ago";
}

function SetupGuide({ collapsed = false }: { collapsed?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SETUP_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (collapsed && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full text-center py-3 text-sm text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add new device
      </button>
    );
  }

  return (
    <div className={collapsed ? "bg-zinc-900 rounded-lg p-4" : "text-center mt-8"}>
      {collapsed && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium">Add New Device</span>
          <button onClick={() => setIsExpanded(false)} className="text-zinc-500 hover:text-zinc-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {!collapsed && (
        <>
          <div className="w-16 h-16 mx-auto mb-4 bg-zinc-800 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">No Devices Yet</h2>
        </>
      )}
      
      <p className="text-sm text-zinc-400 mb-4">
        Run this command on your computer:
      </p>
      
      <div className="bg-zinc-800 rounded-lg p-3 relative group">
        <code className="text-xs text-green-400 break-all block pr-8">
          {SETUP_COMMAND}
        </code>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

function HelpButton() {
  const { user, logout } = useAppStore();
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SETUP_COMMAND);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 left-6 w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors shadow-lg"
        style={{ marginBottom: 'var(--safe-area-bottom)' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowHelp(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div 
            className="relative bg-zinc-900 rounded-xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-zinc-800">
              <h2 className="text-lg font-semibold text-white">Help</h2>
              <button onClick={() => setShowHelp(false)} className="text-zinc-500 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-zinc-800 rounded-lg divide-y divide-zinc-700">
                <div className="flex justify-between items-center p-3">
                  <span className="text-sm text-zinc-400">Account</span>
                  <span className="text-sm text-white">{user?.email}</span>
                </div>
                <div className="flex justify-between items-center p-3">
                  <span className="text-sm text-zinc-400">Version</span>
                  <span className="text-sm text-white">{APP_VERSION}</span>
                </div>
                <a 
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex justify-between items-center p-3"
                >
                  <span className="text-sm text-zinc-400">GitHub</span>
                  <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-2">Add new device:</p>
                <div className="bg-zinc-800 rounded-lg p-3 relative">
                  <code className="text-xs text-green-400 break-all block pr-8">
                    {SETUP_COMMAND}
                  </code>
                  <button
                    onClick={handleCopy}
                    className="absolute top-2 right-2 p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
                  >
                    {copied ? (
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => { setShowHelp(false); logout(); }}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-red-400 text-sm transition-colors"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DeviceItem({ device, onSelect, onDelete }: { 
  device: Device; 
  onSelect: () => void; 
  onDelete: () => void;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 50) {
      setShowDelete(true);
    } else if (diff < -50) {
      setShowDelete(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    
    if (confirm(`Delete device "${device.name}"?`)) {
      setIsDeleting(true);
      try {
        await onDelete();
      } catch {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div 
        className={`absolute inset-y-0 right-0 flex items-center transition-all duration-200 ${showDelete ? "w-20" : "w-0"}`}
      >
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="w-full h-full bg-red-600 hover:bg-red-500 flex items-center justify-center"
        >
          {isDeleting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      </div>
      
      <button
        onClick={onSelect}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => {}}
        className={`w-full text-left p-4 bg-zinc-900 hover:bg-zinc-800 flex items-center justify-between transition-all duration-200 ${showDelete ? "-translate-x-20" : "translate-x-0"}`}
      >
        <div className="flex items-center">
          <span
            className={`w-3 h-3 rounded-full mr-4 ${
              device.online ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
          <div>
            <p className="font-semibold">{device.name}</p>
            <p className="text-sm text-zinc-400">
              {device.online
                ? "Online"
                : `Last seen ${timeAgo(device.last_seen)}`}
            </p>
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-zinc-500"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  );
}


export function DeviceList() {
  const {
    devices,
    fetchDevices,
    selectDevice,
    deleteDevice,
    isLoading,
  } = useAppStore();

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white" style={{ paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}>
      <div className="fixed top-0 left-0 right-0 bg-zinc-950 z-50" style={{ height: 'var(--safe-area-top)' }} />
      <header className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
        <h1 className="text-xl font-bold">Devices</h1>
        <button
          onClick={() => fetchDevices()}
          disabled={isLoading}
          className={`p-2 rounded-md transition-colors ${isLoading ? "text-zinc-600" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
          title="Refresh"
        >
          <svg className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </header>

      <main className="flex-grow overflow-y-auto p-4">
        {isLoading && devices.length === 0 && <p className="text-zinc-400">Loading devices...</p>}
        
        {!isLoading && devices.length === 0 && (
          <SetupGuide />
        )}

        {devices.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 mb-2">Swipe left to delete</p>
            {devices.map((device) => (
              <DeviceItem
                key={device.id}
                device={device}
                onSelect={() => selectDevice(device)}
                onDelete={() => deleteDevice(device.id)}
              />
            ))}
          </div>
        )}
      </main>

      <HelpButton />
    </div>
  );
}
