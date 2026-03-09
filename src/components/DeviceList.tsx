"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAppStore } from "@/store";
import { useTheme } from "@/contexts/ThemeContext";
import { Device } from "@/lib/relay";
import { QRScanner } from "./QRScanner";
import { getAgentColor, capitalizeAgentName } from "@/lib/agentColors";
import { APP_VERSION } from "@/lib/version";

const SETUP_COMMAND_UNIX = "curl -sSL https://opencode-relay.azurewebsites.net/install.sh | bash";
const SETUP_COMMAND_WINDOWS = "irm https://opencode-relay.azurewebsites.net/install.ps1 | iex";
const GITHUB_URL = "https://github.com/code-yeongyu/opencode-anywhere";

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 80;

function OpenCodeLogo({ width = 160 }: { width?: number }) {
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === 'dark' 
    ? '/opencode-anywhere-dark.png'
    : '/opencode-anywhere-light.png';
  
  return (
    <img 
      src={logoSrc}
      alt="OpenCode Anywhere" 
      style={{ width: `${width}px`, height: 'auto' }}
    />
  );
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  
  if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
    return "never";
  }
  
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 0) return "just now";

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
  
  return "just now";
}

function SetupGuide({ collapsed = false }: { collapsed?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(!collapsed);
  const [copied, setCopied] = useState(false);
  const [platform, setPlatform] = useState<'unix' | 'windows'>('unix');

  const currentCommand = platform === 'unix' ? SETUP_COMMAND_UNIX : SETUP_COMMAND_WINDOWS;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(currentCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (collapsed && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="no-select w-full text-center py-3 text-[14px] flex items-center justify-center gap-2 transition-opacity active:opacity-70"
        style={{ color: 'var(--foreground-muted)' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add New Device
      </button>
    );
  }

  return (
    <div 
      className={collapsed ? "rounded-2xl p-4" : ""}
      style={collapsed ? { 
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid var(--glass-border)'
      } : undefined}
    >
      {collapsed && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-[14px] font-medium" style={{ color: 'var(--foreground)' }}>Add New Device</span>
          <button 
            onClick={() => setIsExpanded(false)} 
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
            style={{ 
              background: 'var(--glass-bg)',
              color: 'var(--foreground-muted)'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <p className="text-[13px] mb-3" style={{ color: 'var(--foreground-muted)' }}>
        Run this command on your computer:
      </p>

      <div className="flex justify-center gap-1 mb-3">
        <button
          onClick={() => setPlatform('unix')}
          className="no-select px-4 py-1.5 text-[12px] rounded-l-full transition-all"
          style={platform === 'unix' 
            ? { backgroundColor: 'var(--glass-blue-solid)', color: '#fff' }
            : { backgroundColor: 'var(--glass-bg)', color: 'var(--foreground-muted)', border: '1px solid var(--glass-border)' }}
        >
          macOS / Linux
        </button>
        <button
          onClick={() => setPlatform('windows')}
          className="no-select px-4 py-1.5 text-[12px] rounded-r-full transition-all"
          style={platform === 'windows' 
            ? { backgroundColor: 'var(--glass-blue-solid)', color: '#fff' }
            : { backgroundColor: 'var(--glass-bg)', color: 'var(--foreground-muted)', border: '1px solid var(--glass-border)' }}
        >
          Windows
        </button>
      </div>
      
      <div 
        className="rounded-xl p-3 relative group"
        style={{ 
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)'
        }}
      >
        <code className="text-[11px] text-green-400 break-all block pr-8">
          {currentCommand}
        </code>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-lg transition-opacity active:opacity-70"
          style={{ 
            background: 'var(--glass-bg-elevated)',
            color: copied ? 'var(--oc-green)' : 'var(--foreground-muted)'
          }}
          title="Copy to clipboard"
        >
          {copied ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      </div>

      {platform === 'windows' && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--foreground-muted)' }}>
          Run in PowerShell as Administrator
        </p>
      )}

      <p className="text-[11px] mt-3" style={{ color: 'var(--foreground-muted)' }}>
        The installer will show a QR code. Tap <span style={{ color: 'var(--glass-blue-solid)' }}>&quot;Scan QR Code&quot;</span> to pair.
      </p>
    </div>
  );
}

function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
      style={{ 
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        color: 'var(--foreground)'
      }}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ 
        background: 'rgba(0,0,0,0.4)', 
        backdropFilter: 'blur(8px)', 
        WebkitBackdropFilter: 'blur(8px)' 
      }}
      onClick={onClose}
    >
      <div 
        className="rounded-2xl p-5 w-full max-w-sm"
        style={{
          background: 'var(--glass-bg-prominent)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid var(--glass-border-prominent)',
          boxShadow: 'var(--glass-shadow-elevated)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 
          className="text-lg font-semibold mb-4 text-center"
          style={{ color: 'var(--foreground)' }}
        >
          Rename Device
        </h3>
        
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Device name"
          className="w-full px-4 py-3 rounded-xl text-[16px] mb-4 outline-none"
          style={{ 
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            color: 'var(--foreground)'
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
        />
        
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-medium active:opacity-70 transition-opacity"
            style={{ 
              background: 'var(--glass-bg)',
              color: 'var(--foreground)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="flex-1 py-3 px-4 rounded-xl font-medium active:opacity-70 transition-opacity disabled:opacity-40"
            style={{ 
              background: 'var(--glass-blue-solid)',
              color: '#fff'
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, logout, providers, agents, selectedModel, defaultAgent, setSelectedModel, setDefaultAgent } = useAppStore();
  const { theme, setTheme } = useTheme();

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

  const currentModelValue = selectedModel ? `${selectedModel.providerID}:${selectedModel.modelID}` : "";

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ 
        background: 'rgba(0,0,0,0.4)', 
        backdropFilter: 'blur(8px)', 
        WebkitBackdropFilter: 'blur(8px)' 
      }}
      onClick={onClose}
    >
      <div 
        className="rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto"
        style={{
          background: 'var(--glass-bg-prominent)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid var(--glass-border-prominent)',
          boxShadow: 'var(--glass-shadow-elevated)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 pb-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Settings</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
            style={{ 
              background: 'var(--glass-bg)',
              color: 'var(--foreground-muted)'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="px-5 pb-5 space-y-4">
          {(allModels.length > 0 || agents.length > 0) && (
            <div 
              className="rounded-xl overflow-hidden"
              style={{ 
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)'
              }}
            >
              {allModels.length > 0 && (
                <div className="p-3" style={{ borderBottom: agents.length > 0 ? '1px solid var(--glass-border)' : undefined }}>
                  <label className="block text-[12px] mb-2" style={{ color: 'var(--foreground-muted)' }}>Default Model</label>
                  <select
                    value={currentModelValue}
                    onChange={handleModelChange}
                    className="w-full rounded-lg px-3 py-2 text-[14px] focus:outline-none"
                    style={{ 
                      background: 'var(--glass-bg-solid)', 
                      border: '1px solid var(--glass-border)', 
                      color: 'var(--foreground)' 
                    }}
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
                  <label className="block text-[12px] mb-2" style={{ color: 'var(--foreground-muted)' }}>Default Agent</label>
                  <div className="space-y-1">
                    {agents.map(agent => (
                      <button
                        key={agent.name}
                        onClick={() => setDefaultAgent(agent.name)}
                        className="w-full text-left px-3 py-2 rounded-lg text-[14px] transition-all active:opacity-70"
                        style={defaultAgent === agent.name ? {
                          background: 'var(--glass-blue-solid)',
                          color: '#fff'
                        } : { 
                          background: 'var(--glass-bg-solid)', 
                          color: 'var(--foreground)' 
                        }}
                      >
                        <span 
                          className="font-medium"
                          style={{ color: defaultAgent === agent.name ? '#fff' : getAgentColor(agent.name, agents) }}
                        >
                          {capitalizeAgentName(agent.name)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div 
            className="rounded-xl p-3"
            style={{ 
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)'
            }}
          >
            <label className="block text-[12px] mb-2" style={{ color: 'var(--foreground-muted)' }}>Theme</label>
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="flex-1 py-2 px-3 rounded-lg text-[13px] font-medium transition-all active:opacity-70"
                  style={theme === t ? {
                    background: 'var(--glass-blue-solid)',
                    color: '#fff'
                  } : { 
                    background: 'var(--glass-bg-solid)', 
                    color: 'var(--foreground)' 
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div 
            className="rounded-xl overflow-hidden"
            style={{ 
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)'
            }}
          >
            <div className="flex justify-between items-center p-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <span className="text-[13px]" style={{ color: 'var(--foreground-muted)' }}>Account</span>
              <span className="text-[13px]" style={{ color: 'var(--foreground)' }}>{user?.email}</span>
            </div>
            <div className="flex justify-between items-center p-3" style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <span className="text-[13px]" style={{ color: 'var(--foreground-muted)' }}>Version</span>
              <span className="text-[13px]" style={{ color: 'var(--foreground)' }}>{APP_VERSION}</span>
            </div>
            <a 
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex justify-between items-center p-3 active:opacity-70 transition-opacity"
            >
              <span className="text-[13px]" style={{ color: 'var(--foreground-muted)' }}>GitHub</span>
              <svg className="w-4 h-4" style={{ color: 'var(--foreground-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <button
            onClick={() => { onClose(); logout(); }}
            className="w-full py-3 rounded-xl text-red-400 text-[14px] font-medium transition-opacity active:opacity-70"
            style={{ 
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)'
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

function DeviceItem({ 
  device, 
  onSelect, 
  onDelete, 
  onRename, 
  needsRepair,
  isFirst,
  isLast,
  isRevealed,
  onReveal,
  onClose
}: { 
  device: Device; 
  onSelect: () => void; 
  onDelete: () => void;
  onRename: () => void;
  needsRepair: boolean;
  isFirst: boolean;
  isLast: boolean;
  isRevealed: boolean;
  onReveal: () => void;
  onClose: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = e.touches[0].clientX;
    isDraggingRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    currentXRef.current = e.touches[0].clientX;
    const diff = startXRef.current - currentXRef.current;
    
    if (Math.abs(diff) > 10) {
      isDraggingRef.current = true;
    }
    
    if (containerRef.current) {
      let translateX = 0;
      if (isRevealed) {
        translateX = Math.min(0, Math.max(-ACTION_WIDTH, -ACTION_WIDTH + (-diff)));
      } else {
        translateX = Math.min(0, Math.max(-ACTION_WIDTH, -diff));
      }
      containerRef.current.style.transform = `translateX(${translateX}px)`;
      containerRef.current.style.transition = 'none';
    }
  }, [isRevealed]);

  const handleTouchEnd = useCallback(() => {
    const diff = startXRef.current - currentXRef.current;
    
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.2s ease-out';
      
      if (isRevealed) {
        if (diff < -SWIPE_THRESHOLD) {
          containerRef.current.style.transform = 'translateX(0)';
          onClose();
        } else {
          containerRef.current.style.transform = `translateX(-${ACTION_WIDTH}px)`;
        }
      } else {
        if (diff > SWIPE_THRESHOLD) {
          containerRef.current.style.transform = `translateX(-${ACTION_WIDTH}px)`;
          onReveal();
        } else {
          containerRef.current.style.transform = 'translateX(0)';
        }
      }
    }
  }, [isRevealed, onReveal, onClose]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.2s ease-out';
      containerRef.current.style.transform = isRevealed ? `translateX(-${ACTION_WIDTH}px)` : 'translateX(0)';
    }
  }, [isRevealed]);

  const handleClick = useCallback(() => {
    if (isDraggingRef.current) return;
    if (isRevealed) {
      onClose();
    } else {
      onSelect();
    }
  }, [isRevealed, onClose, onSelect]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    
    setIsDeleting(true);
    try {
      await onDelete();
    } catch {
      setIsDeleting(false);
    }
  };

  const borderRadius = isFirst && isLast 
    ? '16px' 
    : isFirst 
      ? '16px 16px 0 0' 
      : isLast 
        ? '0 0 16px 16px' 
        : '0';

  return (
    <div 
      className="relative"
      style={{ 
        overflow: 'hidden',
        borderRadius,
        background: 'var(--glass-bg-solid)'
      }}
    >
      <div 
        className="absolute right-0 top-0 bottom-0 flex items-stretch"
        style={{ width: ACTION_WIDTH }}
      >
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex-1 flex items-center justify-center text-white active:opacity-80 transition-opacity"
          style={{ background: '#FF3B30' }}
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

      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className="no-select relative flex items-center px-4 py-3 cursor-pointer active:opacity-80 transition-opacity"
        style={{ 
          background: 'var(--glass-bg-solid)',
          borderRadius
        }}
      >
        <div className="mr-3 relative">
          <span
            className="block w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: device.online ? '#34C759' : '#FF3B30',
              boxShadow: device.online 
                ? '0 0 6px rgba(52, 199, 89, 0.5)' 
                : '0 0 6px rgba(255, 59, 48, 0.4)'
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p 
            className="font-medium truncate text-[15px]"
            style={{ color: 'var(--foreground)' }}
          >
            {device.name}
          </p>
          {needsRepair ? (
            <p className="text-[12px] flex items-center gap-1" style={{ color: '#FF9F0A' }}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Needs re-pairing
            </p>
          ) : (
            <p className="text-[12px]" style={{ color: 'var(--foreground-muted)' }}>
              {device.online ? "Online" : `Last seen ${timeAgo(device.last_seen)}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
            className="p-2 rounded-full transition-opacity active:opacity-60"
            style={{ color: 'var(--foreground-muted)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <svg 
            className="w-4 h-4" 
            style={{ color: 'var(--foreground-muted)' }} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m9 18 6-6-6-6"/>
          </svg>
        </div>
      </div>

      {!isLast && (
        <div 
          className="absolute bottom-0 right-0"
          style={{ 
            left: '52px',
            height: '1px',
            background: 'var(--glass-border)'
          }}
        />
      )}
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
  const [revealedDeviceId, setRevealedDeviceId] = useState<number | null>(null);

  useEffect(() => {
    fetchDevices();
    
    const interval = setInterval(() => {
      fetchDevices();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [fetchDevices]);

  const showInitialLoading = !devicesFetched && isLoading;

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}>
      <div className="fixed top-0 left-0 right-0 z-50" style={{ height: 'var(--safe-area-top)', backgroundColor: 'var(--background)' }} />
      <header className="no-select flex items-center justify-center p-4 shrink-0" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <h1 className="text-[17px] font-semibold" style={{ color: 'var(--foreground)' }}>Devices</h1>
      </header>

      <main className="flex-grow overflow-y-auto p-4 flex flex-col">
        {showInitialLoading ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="flex items-center gap-3" style={{ color: 'var(--foreground-muted)' }}>
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-[14px]">Loading devices...</span>
            </div>
          </div>
        ) : devices.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center px-2">
            <h2 className="text-[17px] font-semibold mb-6" style={{ color: 'var(--foreground)' }}>No Devices Yet</h2>
            
            <button
              onClick={() => setShowScanner(true)}
              className="no-select w-full max-w-sm mb-6 py-4 rounded-2xl flex items-center justify-center gap-3 text-white font-medium transition-opacity active:opacity-70"
              style={{ background: 'var(--glass-blue-solid)' }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan QR Code to Pair
            </button>
            
            <div className="w-full max-w-sm">
              <p className="text-[13px] mb-4" style={{ color: 'var(--foreground-muted)' }}>Or set up manually:</p>
              <SetupGuide />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div 
              className="rounded-2xl overflow-hidden"
              style={{ 
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow)'
              }}
            >
              {devices.map((device, index) => (
                <DeviceItem
                  key={device.id}
                  device={device}
                  onSelect={() => selectDevice(device)}
                  onDelete={() => deleteDevice(device.id)}
                  onRename={() => setRenameDevice(device)}
                  needsRepair={!getDeviceEncryptionKey(device.id)}
                  isFirst={index === 0}
                  isLast={index === devices.length - 1}
                  isRevealed={revealedDeviceId === device.id}
                  onReveal={() => setRevealedDeviceId(device.id)}
                  onClose={() => setRevealedDeviceId(null)}
                />
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowScanner(true)}
                className="no-select w-full py-3 mb-4 rounded-xl flex items-center justify-center gap-2 text-white text-[14px] font-medium transition-opacity active:opacity-70"
                style={{ background: 'var(--glass-blue-solid)' }}
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

      <footer 
        className="no-select py-4 px-6 flex items-center justify-between shrink-0"
        style={{ borderTop: '1px solid var(--glass-border)' }}
      >
        <SettingsButton onClick={() => setShowSettings(true)} />
        <OpenCodeLogo width={200} />
        <button
          onClick={() => fetchDevices()}
          disabled={isLoading}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity active:opacity-70"
          style={{ 
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)',
            color: 'var(--foreground)'
          }}
          title="Refresh"
        >
          <svg className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
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
