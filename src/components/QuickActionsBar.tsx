"use client";

import React, { useRef } from "react";

interface QuickActionsBarProps {
  onCompact: () => void;
  onSkills: () => void;
  onMore: () => void;
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

export function QuickActionsBar({ onCompact, onSkills, onMore, disabled, isCompacting }: QuickActionsBarProps) {
  const lastTapRef = useRef<number>(0);

  const handleTap = (action: QuickAction) => {
    if (action.disabled || disabled) return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) return;
    lastTapRef.current = now;
    action.onClick();
  };

  const actions: QuickAction[] = [
    { id: "compact", label: "Compact", icon: isCompacting ? SpinnerIcon : CompactIcon, onClick: onCompact, disabled: isCompacting },
    { id: "skills", label: "Skills", icon: SkillsIcon, onClick: onSkills },
    { id: "more", label: "More", icon: MoreIcon, onClick: onMore },
  ];

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            type="button"
            onClick={() => handleTap(action)}
            disabled={disabled || action.disabled}
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
