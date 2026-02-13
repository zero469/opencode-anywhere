"use client";

import React from "react";
import type { CommandInfo } from "@/lib/opencode";

interface CommandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandInfo[];
  onSelectCommand: (name: string) => void;
}

export function CommandsModal({ isOpen, onClose, commands, onSelectCommand }: CommandsModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900 w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-white">Available Commands</h2>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {commands.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              No commands available
            </div>
          ) : (
            <div className="space-y-1">
              {commands.map((command) => (
                <button
                  key={command.name}
                  onClick={() => onSelectCommand(command.name)}
                  className="w-full text-left p-3 rounded-lg hover:bg-zinc-800 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">
                        {command.name}
                      </div>
                      {command.description && (
                        <div className="text-xs text-zinc-500 line-clamp-2 mt-0.5">
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
        
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
