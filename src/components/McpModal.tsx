"use client";

import { useState, useEffect } from "react";
import type { McpStatusMap, McpStatus } from "@/lib/opencode";

interface McpModalProps {
  isOpen: boolean;
  onClose: () => void;
  mcpStatus: McpStatusMap;
  onToggle: (name: string, enable: boolean) => Promise<void>;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

function getStatusDisplay(status: McpStatus): { icon: string; label: string; color: string } {
  switch (status.status) {
    case "connected":
      return { icon: "🟢", label: "Connected", color: "#22c55e" };
    case "disabled":
      return { icon: "⚫", label: "Disabled", color: "var(--foreground-muted)" };
    case "failed":
      return { icon: "🔴", label: "Failed", color: "#ef4444" };
    case "needs_auth":
      return { icon: "🟡", label: "Needs Auth", color: "#eab308" };
    case "needs_client_registration":
      return { icon: "🟡", label: "Needs Registration", color: "#eab308" };
    default:
      return { icon: "⚪", label: "Unknown", color: "var(--foreground-muted)" };
  }
}

export function McpModal({ 
  isOpen, 
  onClose, 
  mcpStatus, 
  onToggle,
  onRefresh,
  loading 
}: McpModalProps) {
  const [togglingServers, setTogglingServers] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTogglingServers(new Set());
      setHoveredItem(null);
      onRefresh();
    }
  }, [isOpen, onRefresh]);

  const serverNames = Object.keys(mcpStatus).sort();

  const handleToggle = async (name: string) => {
    const currentStatus = mcpStatus[name];
    if (!currentStatus) return;
    
    const isCurrentlyConnected = currentStatus.status === "connected";
    
    setTogglingServers(prev => new Set(prev).add(name));
    try {
      await onToggle(name, !isCurrentlyConnected);
    } finally {
      setTogglingServers(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[70vh] flex flex-col"
        style={{ backgroundColor: 'var(--background-panel)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border-subtle)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>MCP Servers</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--foreground-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--foreground)'; e.currentTarget.style.backgroundColor = 'var(--background-element)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--foreground-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--foreground-muted)' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : serverNames.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--foreground-muted)' }}>
              No MCP servers configured
            </div>
          ) : (
            <div className="space-y-1">
              {serverNames.map((name) => {
                const status = mcpStatus[name];
                const statusDisplay = getStatusDisplay(status);
                const isToggling = togglingServers.has(name);
                const isHovered = hoveredItem === name;
                const isConnected = status.status === "connected";
                const canToggle = status.status === "connected" || status.status === "disabled" || status.status === "failed";
                
                return (
                  <div
                    key={name}
                    className="p-3 rounded-lg transition-colors"
                    style={{ backgroundColor: isHovered ? 'var(--background-element)' : 'transparent' }}
                    onMouseEnter={() => setHoveredItem(name)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div 
                          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}
                        >
                          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
                            {name}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs" style={{ color: statusDisplay.color }}>
                            <span>{statusDisplay.icon}</span>
                            <span>{statusDisplay.label}</span>
                            {status.status === "failed" && "error" in status && (
                              <span className="truncate" style={{ color: 'var(--foreground-muted)' }}>
                                - {status.error}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {canToggle && (
                        <button
                          onClick={() => handleToggle(name)}
                          disabled={isToggling}
                          className="no-select relative flex-shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50"
                          style={{ 
                            backgroundColor: isConnected ? '#22c55e' : 'var(--background-element)',
                            border: '1px solid',
                            borderColor: isConnected ? '#22c55e' : 'var(--border-subtle)',
                          }}
                          aria-label={isConnected ? `Disconnect ${name}` : `Connect ${name}`}
                        >
                          {isToggling ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-4 h-4 animate-spin" style={{ color: isConnected ? '#fff' : 'var(--foreground-muted)' }} fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            </div>
                          ) : (
                            <div 
                              className="absolute top-0.5 w-6 h-6 rounded-full shadow transition-transform"
                              style={{ 
                                backgroundColor: '#fff',
                                transform: isConnected ? 'translateX(22px)' : 'translateX(2px)',
                              }}
                            />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="p-4" style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'var(--border-subtle)' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--foreground-muted)', backgroundColor: 'var(--background-element)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--foreground)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--foreground-muted)'; }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
