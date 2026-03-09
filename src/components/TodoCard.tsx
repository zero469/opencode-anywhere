"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import type { TodoItem } from "@/types";

const statusConfig: Record<TodoItem["status"], { icon: string; color: string; bg: string }> = {
  pending: { icon: "○", color: "var(--foreground-muted)", bg: "bg-zinc-400/10" },
  in_progress: { icon: "◐", color: "text-blue-400", bg: "bg-blue-400/10" },
  completed: { icon: "✓", color: "text-green-400", bg: "bg-green-400/10" },
  cancelled: { icon: "✗", color: "var(--foreground-muted)", bg: "bg-zinc-500/10" },
};

const priorityConfig: Record<TodoItem["priority"], { color: string }> = {
  high: { color: "text-red-400" },
  medium: { color: "text-yellow-400" },
  low: { color: "var(--foreground-muted)" },
};

function TodoItemRow({ item }: { item: TodoItem }) {
  const status = statusConfig[item.status] || statusConfig.pending;
  const priority = priorityConfig[item.priority] || priorityConfig.medium;
  const isFinished = item.status === "completed" || item.status === "cancelled";
  
  const isColorVar = status.color.startsWith("var(");

  return (
    <div className={`flex items-start gap-2 py-1.5 ${isFinished ? "opacity-50" : ""}`}>
      <span 
        className={`text-sm flex-shrink-0 w-4 ${isColorVar ? "" : status.color}`}
        style={isColorVar ? { color: status.color } : undefined}
      >
        {status.icon}
      </span>
      <span 
        className={`text-sm flex-1 ${isFinished ? "line-through" : ""}`}
        style={{ color: isFinished ? "var(--foreground-muted)" : "var(--foreground)" }}
      >
        {item.content}
      </span>
      {item.priority === "high" && !isFinished && (
        <span className={`text-xs ${priority.color}`}>!</span>
      )}
    </div>
  );
}

export function TodoCard() {
  const todos = useAppStore((state) => state.todos);
  const [expanded, setExpanded] = useState(true);

  const activeTodos = todos.filter((t) => t.status === "pending" || t.status === "in_progress");
  
  if (activeTodos.length === 0) {
    return null;
  }

  const completed = todos.filter((t) => t.status === "completed" || t.status === "cancelled").length;
  const total = todos.length;
  const inProgress = todos.find((t) => t.status === "in_progress");
  const progress = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div 
      className="mx-4 mt-2 mb-1 rounded-lg overflow-hidden"
      style={{ backgroundColor: "var(--background-element)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="no-select w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-700/30 transition-colors"
      >
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
            {completed}/{total} tasks
          </span>
          <div 
            className="flex-1 h-1.5 rounded-full overflow-hidden max-w-32"
            style={{ backgroundColor: "var(--border)" }}
          >
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          {inProgress && (
            <span className="text-xs text-blue-400 truncate max-w-40">
              {inProgress.content}
            </span>
          )}
        </div>
        <span className="text-xs flex-shrink-0" style={{ color: "var(--foreground-muted)" }}>
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-2" style={{ borderTopWidth: 1, borderTopStyle: "solid", borderTopColor: "var(--border)" }}>
          <div className="max-h-48 overflow-y-auto">
            {todos.map((item) => (
              <TodoItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
