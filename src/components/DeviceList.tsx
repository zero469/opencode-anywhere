"use client";

import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/store";
import { Device } from "@/lib/relay";
import { QRScanner } from "./QRScanner";

const SETUP_COMMAND_UNIX = "curl -sSL https://opencode-relay.azurewebsites.net/install.sh | bash";
const SETUP_COMMAND_WINDOWS = "irm https://opencode-relay.azurewebsites.net/install.ps1 | iex";
const START_COMMAND = "tunnel-client start";
const APP_VERSION = "1.1.0";
const GITHUB_URL = "https://github.com/code-yeongyu/opencode-anywhere";

function OpenCodeLogo({ width = 160 }: { width?: number }) {
  return (
    <img 
      src="/code-anywhere.svg" 
      alt="OpenCode Anywhere" 
      style={{ width: `${width}px`, height: 'auto' }}
    />
  );
}

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
  const [copied, setCopied] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'unix' | 'windows'>('unix');
  const [step, setStep] = useState<1 | 2>(1);

  const currentCommand = platform === 'unix' ? SETUP_COMMAND_UNIX : SETUP_COMMAND_WINDOWS;

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
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
        Manual setup
      </button>
    );
  }

  return (
    <div className={collapsed ? "bg-zinc-900 rounded-lg p-4" : ""}>
      {collapsed && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium">Manual Setup</span>
          <button onClick={() => setIsExpanded(false)} className="text-zinc-500 hover:text-zinc-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setStep(1)}
          className={`flex-1 py-2 text-xs rounded-lg transition-colors ${
            step === 1 
              ? 'bg-blue-600 text-white' 
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          1. Install
        </button>
        <button
          onClick={() => setStep(2)}
          className={`flex-1 py-2 text-xs rounded-lg transition-colors ${
            step === 2 
              ? 'bg-blue-600 text-white' 
              : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          2. Start & Pair
        </button>
      </div>

      {step === 1 ? (
        <>
          <p className="text-sm text-zinc-400 mb-3">
            Install tunnel-client on your computer:
          </p>

          <div className="flex justify-center gap-1 mb-3">
            <button
              onClick={() => setPlatform('unix')}
              className={`px-3 py-1 text-xs rounded-l-lg transition-colors ${
                platform === 'unix' 
                  ? 'bg-zinc-700 text-white' 
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              macOS / Linux
            </button>
            <button
              onClick={() => setPlatform('windows')}
              className={`px-3 py-1 text-xs rounded-r-lg transition-colors ${
                platform === 'windows' 
                  ? 'bg-zinc-700 text-white' 
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Windows
            </button>
          </div>
          
          <div className="bg-zinc-800 rounded-lg p-3 relative group">
            <code className="text-xs text-green-400 break-all block pr-8">
              {currentCommand}
            </code>
            <button
              onClick={() => handleCopy(currentCommand, 'install')}
              className="absolute top-2 right-2 p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
              title="Copy to clipboard"
            >
              {copied === 'install' ? (
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

          {platform === 'windows' && (
            <p className="text-xs text-zinc-500 mt-2">
              Run in PowerShell as Administrator
            </p>
          )}

          <button
            onClick={() => setStep(2)}
            className="w-full mt-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
          >
            Next →
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-400 mb-3">
            Run this command to display a QR code:
          </p>
          
          <div className="bg-zinc-800 rounded-lg p-3 relative group mb-4">
            <code className="text-xs text-green-400 break-all block pr-8">
              {START_COMMAND}
            </code>
            <button
              onClick={() => handleCopy(START_COMMAND, 'start')}
              className="absolute top-2 right-2 p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors"
              title="Copy to clipboard"
            >
              {copied === 'start' ? (
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

          <p className="text-sm text-zinc-400 mb-2">
            Then tap <span className="text-blue-400">&quot;Scan QR Code&quot;</span> above to pair.
          </p>

          <button
            onClick={() => setStep(1)}
            className="w-full mt-2 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
          >
            ← Back
          </button>
        </>
      )}
    </div>
  );
}

function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>
  );
}

function RenameDeviceModal({ 
  isOpen, 
  device, 
  onClose, 
  onSave 
}: { 
  isOpen: boolean; 
  device: Device | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && device) {
      setName(device.name);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, device]);

  const handleSave = async () => {
    if (!name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch {
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !device) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div 
        className="relative bg-zinc-900 rounded-xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Rename Device</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Device name"
            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
            }}
          />
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || isSaving}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded-xl text-white font-medium transition-colors"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout, providers, agents, selectedModel, defaultAgent, setSelectedModel, setDefaultAgent } = useAppStore();

  const connectedProviders = providers?.all.filter(p => providers.connected.includes(p.id)) || [];
  
  const allModels: { providerID: string; providerName: string; modelID: string; modelName: string }[] = [];
  for (const provider of connectedProviders) {
    for (const [modelID, model] of Object.entries(provider.models)) {
      allModels.push({
        providerID: provider.id,
        providerName: provider.name,
        modelID,
        modelName: model.name,
      });
    }
  }

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (!value) {
      setSelectedModel(null);
      return;
    }
    const [providerID, modelID] = value.split(":");
    setSelectedModel({ providerID, modelID });
  };

  const handleAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setDefaultAgent(value || null);
  };

  const currentModelValue = selectedModel ? `${selectedModel.providerID}:${selectedModel.modelID}` : "";

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div 
        className="relative bg-zinc-900 rounded-xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {(allModels.length > 0 || agents.length > 0) && (
            <div className="bg-zinc-800 rounded-lg divide-y divide-zinc-700">
              {allModels.length > 0 && (
                <div className="p-3">
                  <label className="block text-sm text-zinc-400 mb-2">Default Model</label>
                  <select
                    value={currentModelValue}
                    onChange={handleModelChange}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {allModels.map(m => (
                      <option key={`${m.providerID}:${m.modelID}`} value={`${m.providerID}:${m.modelID}`}>
                        {m.modelName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {agents.length > 0 && (
                <div className="p-3">
                  <label className="block text-sm text-zinc-400 mb-2">Default Agent</label>
                  <select
                    value={defaultAgent || ""}
                    onChange={handleAgentChange}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    {agents.map(a => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

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

          <button
            onClick={() => { onClose(); logout(); }}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-red-400 text-sm transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

function DeviceItem({ device, onSelect, onDelete, onRename, needsRepair }: { 
  device: Device; 
  onSelect: () => void; 
  onDelete: () => void;
  onRename: () => void;
  needsRepair: boolean;
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

  const handleRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRename();
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
        <div className="flex items-center flex-1 min-w-0">
          <span
            className={`w-3 h-3 rounded-full mr-4 shrink-0 ${
              device.online ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">{device.name}</p>
            {needsRepair ? (
              <p className="text-sm text-amber-400 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Needs re-pairing
              </p>
            ) : (
              <p className="text-sm text-zinc-400">
                {device.online
                  ? "Online"
                  : `Last seen ${timeAgo(device.last_seen)}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRename}
            className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-zinc-500"><path d="m9 18 6-6-6-6"/></svg>
        </div>
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
    updateDevice,
    isLoading,
    devicesFetched,
    getDeviceEncryptionKey,
  } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [renameDevice, setRenameDevice] = useState<Device | null>(null);

  useEffect(() => {
    fetchDevices();
    
    const interval = setInterval(() => {
      fetchDevices();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [fetchDevices]);

  const showInitialLoading = !devicesFetched && isLoading;

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-white" style={{ paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}>
      <div className="fixed top-0 left-0 right-0 bg-zinc-950 z-50" style={{ height: 'var(--safe-area-top)' }} />
      <header className="flex items-center justify-center p-4 border-b border-zinc-800 shrink-0">
        <h1 className="text-xl font-bold">Devices</h1>
      </header>

      <main className="flex-grow overflow-y-auto p-4 flex flex-col">
        {showInitialLoading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="flex items-center gap-3 text-zinc-400">
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Loading devices...</span>
            </div>
          </div>
        ) : devices.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center px-2">
            <h2 className="text-lg font-semibold mb-6">No Devices Yet</h2>
            
            <button
              onClick={() => setShowScanner(true)}
              className="w-full max-w-sm mb-6 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl flex items-center justify-center gap-3 text-white font-medium transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan QR Code to Pair
            </button>
            
            <div className="w-full max-w-sm">
              <p className="text-zinc-500 text-sm mb-4">Or set up manually:</p>
              <SetupGuide />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 mb-2">Swipe left to delete</p>
            {devices.map((device) => (
              <DeviceItem
                key={device.id}
                device={device}
                onSelect={() => selectDevice(device)}
                onDelete={() => deleteDevice(device.id)}
                onRename={() => setRenameDevice(device)}
                needsRepair={!getDeviceEncryptionKey(device.id)}
              />
            ))}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <button
                onClick={() => setShowScanner(true)}
                className="w-full py-3 mb-4 bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center justify-center gap-2 text-white text-sm font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Scan QR Code
              </button>
              <SetupGuide collapsed />
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 px-6 flex items-center justify-between shrink-0">
        <SettingsButton onClick={() => setShowSettings(true)} />
        <OpenCodeLogo width={182} />
        <button
          onClick={() => fetchDevices()}
          disabled={isLoading}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isLoading ? "text-zinc-600" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}
          title="Refresh"
        >
          <svg className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </footer>

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <QRScanner 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)} 
        onSuccess={() => setShowScanner(false)}
      />
      <RenameDeviceModal
        isOpen={!!renameDevice}
        device={renameDevice}
        onClose={() => setRenameDevice(null)}
        onSave={async (name) => {
          if (renameDevice) {
            await updateDevice(renameDevice.id, name);
          }
        }}
      />
    </div>
  );
}
