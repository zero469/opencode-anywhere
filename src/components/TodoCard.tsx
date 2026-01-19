"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import type { TodoItem } from "@/types";

const statusConfig: Record<TodoItem["status"], { icon: string; color: string; bg: string }> = {
  pending: { icon: "○", color: "text-zinc-400", bg: "bg-zinc-400/10" },
  in_progress: { icon: "◐", color: "text-blue-400", bg: "bg-blue-400/10" },
  completed: { icon: "✓", color: "text-green-400", bg: "bg-green-400/10" },
  cancelled: { icon: "✗", color: "text-zinc-500", bg: "bg-zinc-500/10" },
};

const priorityConfig: Record<TodoItem["priority"], { color: string }> = {
  high: { color: "text-red-400" },
  medium: { color: "text-yellow-400" },
  low: { color: "text-zinc-500" },
};

function TodoItemRow({ item }: { item: TodoItem }) {
  const status = statusConfig[item.status] || statusConfig.pending;
  const priority = priorityConfig[item.priority] || priorityConfig.medium;
  const isFinished = item.status === "completed" || item.status === "cancelled";

  return (
    <div className={`flex items-start gap-2 py-1.5 ${isFinished ? "opacity-50" : ""}`}>
      <span className={`${status.color} text-sm flex-shrink-0 w-4`}>{status.icon}</span>
      <span className={`text-sm flex-1 ${isFinished ? "line-through text-zinc-500" : "text-zinc-200"}`}>
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
    <div className="mx-4 mt-2 mb-1 bg-zinc-800/80 rounded-lg border border-zinc-700/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-zinc-700/30 transition-colors"
      >
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <span className="text-sm font-medium text-zinc-300">
            {completed}/{total} tasks
          </span>
          <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden max-w-32">
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
        <span className="text-zinc-500 text-xs flex-shrink-0">
          {expanded ? "▼" : "▶"}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-2 border-t border-zinc-700/50">
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
