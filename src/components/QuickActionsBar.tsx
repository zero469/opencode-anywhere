"use client";

import React, { useRef } from "react";

const QUICK_ACTIONS = [
  { id: "compact", label: "Compact", command: "/compact" },
  { id: "skills", label: "Skills", command: "/skills" },
  { id: "more", label: "More", command: null },
] as const;

interface QuickActionsBarProps {
  onAction: (command: string) => void;
  disabled?: boolean;
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

function SkillsIcon() {
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
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function MoreIcon() {
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
        d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
      />
    </svg>
  );
}

const iconMap: Record<string, React.FC> = {
  compact: CompactIcon,
  skills: SkillsIcon,
  more: MoreIcon,
};

export function QuickActionsBar({ onAction, disabled }: QuickActionsBarProps) {
  const lastTapRef = useRef<number>(0);

  const handleTap = (command: string | null) => {
    if (!command || disabled) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) return;
    lastTapRef.current = now;
    onAction(command);
  };

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {QUICK_ACTIONS.map((action) => {
        const Icon = iconMap[action.id];
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => handleTap(action.command)}
            disabled={disabled || action.command === null}
            aria-label={action.label}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] px-3 py-2 text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
