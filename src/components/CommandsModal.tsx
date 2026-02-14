"use client";

import React from "react";
import type { CommandInfo } from "@/lib/opencode";

interface CommandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandInfo[];
  onSelectCommand: (name: string) => void;
  loading?: boolean;
}

export function CommandsModal({ isOpen, onClose, commands, onSelectCommand, loading }: CommandsModalProps) {
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
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Available Commands</h2>
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
          ) : commands.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--foreground-muted)' }}>
              No commands available
            </div>
          ) : (
            <div className="space-y-1">
              {commands.map((command) => (
                  <button
                    key={command.name}
                    onClick={() => onSelectCommand(command.name)}
                    className="w-full text-left p-3 rounded-lg transition-colors group"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--background-element)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium group-hover:text-green-400 transition-colors" style={{ color: 'var(--foreground)' }}>
                        {command.name}
                      </div>
                      {command.description && (
                        <div className="text-xs line-clamp-2 mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
                          {command.description}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
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
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
