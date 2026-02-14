"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store";
import { calculateContextUsage } from "@/lib/context";

export function ContextUsageDisplay() {
  const messages = useAppStore((state) => state.messages);
  const providers = useAppStore((state) => state.providers);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const contextUsage = useMemo(
    () => calculateContextUsage(messages, providers),
    [messages, providers]
  );

  useEffect(() => {
    if (!showTooltip) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [showTooltip]);

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
    <div ref={containerRef} className="relative">
      <div
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg shrink-0 cursor-pointer"
        style={{ backgroundColor: "var(--background-element)" }}
        onClick={() => setShowTooltip(!showTooltip)}
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
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs rounded-lg whitespace-nowrap z-50"
          style={{ 
            backgroundColor: "var(--background-panel)", 
            color: "var(--foreground)",
            border: "1px solid var(--border)"
          }}
        >
          {contextUsage.formatted} tokens
        </div>
      )}
    </div>
  );
}
