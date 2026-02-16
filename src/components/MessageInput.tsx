"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useAppStore } from "@/store";
import { ModelAgentSelector } from "./ModelAgentSelector";
import { QuickActionsBar } from "./QuickActionsBar";
import { SkillsModal } from "./SkillsModal";
import { CommandsModal } from "./CommandsModal";
import { ContextUsageDisplay } from "./ContextUsageDisplay";

const isMobileDevice = () => {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

export function MessageInput() {
  const sendMessage = useAppStore((state) => state.sendMessage);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const runningSessions = useAppStore((state) => state.runningSessions);
  const abortSession = useAppStore((state) => state.abortSession);
  const summarizeCurrentSession = useAppStore((state) => state.summarizeCurrentSession);
  const compactingSessions = useAppStore((state) => state.compactingSessions);
  const fetchSkills = useAppStore((state) => state.fetchSkills);
  const skills = useAppStore((state) => state.skills);
  const fetchCommands = useAppStore((state) => state.fetchCommands);
  const commands = useAppStore((state) => state.commands);
  
  const isSessionBusy = currentSessionId ? runningSessions.includes(currentSessionId) : false;
  const isCompacting = currentSessionId ? compactingSessions.includes(currentSessionId) : false;
  
  const [text, setText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [isLoadingCommands, setIsLoadingCommands] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    requestAnimationFrame(adjustHeight);
  }, [adjustHeight]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSessionBusy) return;
    
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await sendMessage(trimmed);
  }, [text, isSessionBusy, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (isMobile) return;
    if (e.key === "Enter" && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [isMobile, isComposing, handleSubmit]);

  const handleCompact = useCallback(() => {
    summarizeCurrentSession();
  }, [summarizeCurrentSession]);

  const handleSkills = useCallback(async () => {
    await fetchSkills();
    setShowSkillsModal(true);
  }, [fetchSkills]);

  const handleMore = useCallback(() => {
    setShowCommandsModal(true);
    if (commands.length === 0) {
      setIsLoadingCommands(true);
      fetchCommands().finally(() => setIsLoadingCommands(false));
    }
  }, [commands.length, fetchCommands]);

  const handleSelectSkill = useCallback((skillName: string) => {
    setShowSkillsModal(false);
    setText(`/${skillName} `);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
        adjustHeight();
      }
    });
  }, [adjustHeight]);

  const handleSelectCommand = useCallback((commandName: string) => {
    setShowCommandsModal(false);
    setText(`/${commandName} `);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.value.length;
        textareaRef.current.selectionEnd = textareaRef.current.value.length;
        adjustHeight();
      }
    });
  }, [adjustHeight]);

  if (!currentSessionId) {
    return (
      <div 
        className="p-4 border-t text-center"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--foreground-muted)' }}
      >
        Select a session to start chatting
      </div>
    );
  }

  return (
    <div className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="px-4 pt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <ModelAgentSelector />
          <ContextUsageDisplay />
        </div>
        <div className="flex-shrink-0">
          <QuickActionsBar 
            onCompact={handleCompact}
            onSkills={handleSkills}
            onMore={handleMore}
            disabled={isSessionBusy}
            isCompacting={isCompacting}
          />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-4 pt-2">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="Message..."
            rows={1}
            className="flex-1 px-4 py-2 border rounded-xl placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[42px] max-h-[200px] overflow-y-auto"
            style={{ 
              backgroundColor: 'var(--background-element)', 
              borderColor: 'var(--border)', 
              color: 'var(--foreground)' 
            }}
            disabled={isSessionBusy}
          />
          {isSessionBusy ? (
            <button
              type="button"
              onClick={() => abortSession()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-xl font-medium transition-colors h-[42px]"
              style={{ color: 'var(--foreground)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!text.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed rounded-xl font-medium transition-colors h-[42px]"
              style={{ 
                color: 'var(--foreground)',
                backgroundColor: !text.trim() ? 'var(--background-element)' : undefined
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
      </form>
      <SkillsModal
        isOpen={showSkillsModal}
        onClose={() => setShowSkillsModal(false)}
        skills={skills}
        onSelectSkill={handleSelectSkill}
      />
      <CommandsModal
        isOpen={showCommandsModal}
        onClose={() => setShowCommandsModal(false)}
        commands={commands}
        onSelectCommand={handleSelectCommand}
        loading={isLoadingCommands}
      />
    </div>
  );
}
