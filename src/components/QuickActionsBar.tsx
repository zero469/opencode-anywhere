"use client";

import React, { useRef, useState } from "react";

interface QuickActionsBarProps {
  onCompact: () => void;
  onSlashCommands: () => void;
  disabled?: boolean;
  isCompacting?: boolean;
}

function CompactIcon() {
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
        d="M4 6h16M4 12h16m-7 6h7"
      />
    </svg>
  );
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

function SpinnerIcon() {
  return (
    <svg
      className="w-5 h-5 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.FC;
  onClick: () => void;
  disabled?: boolean;
}

export function QuickActionsBar({ onCompact, onSlashCommands, disabled, isCompacting }: QuickActionsBarProps) {
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
    { id: "compact", label: "Compact", icon: isCompacting ? SpinnerIcon : CompactIcon, onClick: onCompact, disabled: isCompacting },
    { id: "slash", label: "Commands", icon: SlashIcon, onClick: onSlashCommands },
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
            className="flex items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            style={{
              color: isHovered ? 'var(--foreground)' : 'var(--foreground-muted)',
              backgroundColor: 'var(--background-element)',
            }}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
