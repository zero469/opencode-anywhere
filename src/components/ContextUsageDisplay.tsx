"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store";
import { calculateContextUsage } from "@/lib/context";

export function ContextUsageDisplay() {
  const messages = useAppStore((state) => state.messages);
  const providers = useAppStore((state) => state.providers);
  const currentSessionId = useAppStore((state) => state.currentSessionId);

  const contextUsage = useMemo(
    () => calculateContextUsage(messages, providers),
    [messages, providers]
  );

  if (!currentSessionId || !contextUsage) {
    return null;
  }

  const hasPercentage = contextUsage.percentage !== null;
  const percentage = contextUsage.percentage ?? 0;
  
  const getContextColor = (pct: number): string => {
    if (pct >= 80) return "var(--oc-red)";
    if (pct >= 60) return "var(--oc-orange)";
    if (pct >= 40) return "var(--oc-yellow)";
    return "var(--foreground-muted)";
  };

  const size = 14;
  const strokeWidth = 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = hasPercentage ? Math.min(percentage, 100) : 0;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const color = hasPercentage ? getContextColor(percentage) : "var(--foreground-muted)";

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg shrink-0"
      style={{ backgroundColor: "var(--background-element)" }}
      title={`${contextUsage.formatted} tokens${hasPercentage ? ` (${percentage}% of context window)` : ""}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.3s ease" }}
        />
      </svg>
      <span style={{ color }}>
        {hasPercentage ? `${percentage}%` : contextUsage.formatted}
      </span>
    </div>
  );
}
