"use client";

import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/store";
import { Device } from "@/lib/relay";

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
    user,
    devices,
    fetchDevices,
    selectDevice,
    deleteDevice,
    logout,
    isLoading,
  } = useAppStore();

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white" style={{ paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}>
      <div className="fixed top-0 left-0 right-0 bg-zinc-950 z-50" style={{ height: 'var(--safe-area-top)' }} />
      <header className="flex items-center justify-between p-4 border-b border-zinc-800 shrink-0">
        <div className="flex flex-col">
          <h1 className="text-xl font-bold">Select a Device</h1>
          {user && <span className="text-sm text-zinc-400">{user.email}</span>}
        </div>
        <div className="flex items-center gap-2">
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
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-md"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex-grow overflow-y-auto p-4">
        {isLoading && devices.length === 0 && <p className="text-zinc-400">Loading devices...</p>}
        
        {!isLoading && devices.length === 0 && (
          <div className="text-center text-zinc-400 mt-20">
            <p className="mb-2">No devices found for your account.</p>
            <p className="text-sm">
              You can register a new device by running the OpenCode server
              with your API token.
            </p>
          </div>
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
    </div>
  );
}
