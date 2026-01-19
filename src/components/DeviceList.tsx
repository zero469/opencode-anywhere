"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store";
import { Device } from "@/lib/relay";

// A simple time ago function since we can't add dependencies
function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000; // years
  if (interval > 1) return Math.floor(interval) + " years ago";
  
  interval = seconds / 2592000; // months
  if (interval > 1) return Math.floor(interval) + " months ago";
  
  interval = seconds / 86400; // days
  if (interval > 1) return Math.floor(interval) + " days ago";
  
  interval = seconds / 3600; // hours
  if (interval > 1) return Math.floor(interval) + " hours ago";
  
  interval = seconds / 60; // minutes
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  
  return Math.floor(seconds) + " seconds ago";
}


export function DeviceList() {
  const {
    user,
    devices,
    fetchDevices,
    selectDevice,
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
        <button
          onClick={handleLogout}
          className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-md"
        >
          Logout
        </button>
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
          <ul className="space-y-3">
            {devices.map((device) => (
              <li key={device.id}>
                <button
                  onClick={() => selectDevice(device)}
                  className="w-full text-left p-4 bg-zinc-900 hover:bg-zinc-800 rounded-lg flex items-center justify-between transition-colors"
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
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
