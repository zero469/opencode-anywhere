"use client";

import React, { useRef } from "react";

const QUICK_ACTIONS = [
  { id: "undo", label: "Undo", command: "/undo" },
  { id: "redo", label: "Redo", command: "/redo" },
  { id: "attach", label: "Attach", command: "/attach" },
  { id: "more", label: "More", command: null },
] as const;

interface QuickActionsBarProps {
  onAction: (command: string) => void;
  disabled?: boolean;
}

function UndoIcon() {
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
        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
      />
    </svg>
  );
}

function RedoIcon() {
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
        d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"
      />
    </svg>
  );
}

function AttachIcon() {
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
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
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
  undo: UndoIcon,
  redo: RedoIcon,
  attach: AttachIcon,
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
