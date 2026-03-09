"use client";

import React, { useRef, useState } from "react";

interface QuickActionsBarProps {
  onSlashCommands: () => void;
  onMcp: () => void;
  disabled?: boolean;
}

function SlashIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 20l10-16"
      />
    </svg>
  );
}

function McpIcon() {
  return (
    <span className="text-xs font-semibold">MCP</span>
  );
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.FC;
  onClick: () => void;
  disabled?: boolean;
}

export function QuickActionsBar({ onSlashCommands, onMcp, disabled }: QuickActionsBarProps) {
  const lastTapRef = useRef<number>(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleTap = (action: QuickAction) => {
    if (action.disabled || disabled) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) return;
    lastTapRef.current = now;
    action.onClick();
  };

  const actions: QuickAction[] = [
    { id: "slash", label: "Commands", icon: SlashIcon, onClick: onSlashCommands },
    { id: "mcp", label: "MCP", icon: McpIcon, onClick: onMcp },
  ];

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        const isHovered = hoveredId === action.id;
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => handleTap(action)}
            onMouseEnter={() => setHoveredId(action.id)}
            onMouseLeave={() => setHoveredId(null)}
            disabled={disabled || action.disabled}
            aria-label={action.label}
            className="no-select flex items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            style={{
              color: isHovered ? 'var(--foreground)' : 'var(--foreground-muted)',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
