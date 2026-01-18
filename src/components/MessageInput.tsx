"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore } from "@/store";
import { ModelAgentSelector } from "./ModelAgentSelector";

export function MessageInput() {
  const { sendMessage, isSending, currentSessionId, abortSession } = useAppStore();
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
    }
  }, [text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;
    
    const message = text;
    setText("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!currentSessionId) {
    return (
      <div className="p-4 border-t border-zinc-800 text-center text-zinc-500">
        Select a session to start chatting
      </div>
    );
  }

  return (
    <div className="border-t border-zinc-800">
      <div className="px-4 pt-2">
        <ModelAgentSelector />
      </div>
      <form onSubmit={handleSubmit} className="p-4 pt-2">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Shift+Enter for new line)"
            rows={1}
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[42px] max-h-[200px] overflow-y-auto"
            disabled={isSending}
          />
          {isSending ? (
            <button
              type="button"
              onClick={() => abortSession()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl text-white font-medium transition-colors h-[42px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!text.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl text-white font-medium transition-colors h-[42px]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
