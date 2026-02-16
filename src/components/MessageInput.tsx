"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useAppStore } from "@/store";
import { ModelAgentSelector } from "./ModelAgentSelector";
import { QuickActionsBar } from "./QuickActionsBar";
import { SkillsModal } from "./SkillsModal";
import { CommandsModal } from "./CommandsModal";
import { ContextUsageDisplay } from "./ContextUsageDisplay";
import type { Attachment } from "@/lib/opencode";

interface PendingAttachment {
  previewUrl: string;     // URL.createObjectURL() result for instant display
  uri: string | null;     // base64 data URL (null while loading)
  mimeType: string;
  fileName?: string;
  isLoading: boolean;
}

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
  const providers = useAppStore((state) => state.providers);
  const selectedModel = useAppStore((state) => state.selectedModel);
  
  const isSessionBusy = currentSessionId ? runningSessions.includes(currentSessionId) : false;
  const isCompacting = currentSessionId ? compactingSessions.includes(currentSessionId) : false;

  // Check if current model supports attachments
  const currentModelSupportsAttachments = useMemo(() => {
    if (!providers || !selectedModel) return true; // Assume yes if unknown
    const provider = providers.all.find(p => p.id === selectedModel.providerID);
    const model = provider?.models[selectedModel.modelID];
    return model?.attachment ?? true; // Default to true if not specified
  }, [providers, selectedModel]);
  
  const [text, setText] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [showCommandsModal, setShowCommandsModal] = useState(false);
  const [isLoadingCommands, setIsLoadingCommands] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const hasLoadingAttachments = attachments.some(att => att.isLoading);
    if ((!trimmed && attachments.length === 0) || isSessionBusy || hasLoadingAttachments) return;
    
    const readyAttachments: Attachment[] = attachments
      .filter(att => att.uri !== null)
      .map(att => ({
        uri: att.uri!,
        mimeType: att.mimeType,
        fileName: att.fileName,
      }));
    
    attachments.forEach(att => URL.revokeObjectURL(att.previewUrl));
    
    setText("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await sendMessage(
      trimmed || "What's in this image?",
      readyAttachments.length > 0 ? readyAttachments : undefined
    );
  }, [text, attachments, isSessionBusy, sendMessage]);

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

  const handleImagePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    
    Array.from(files).forEach(file => {
      const previewUrl = URL.createObjectURL(file);
      const pendingAttachment: PendingAttachment = {
        previewUrl,
        uri: null,
        mimeType: file.type,
        fileName: file.name,
        isLoading: true,
      };
      
      setAttachments(prev => [...prev, pendingAttachment]);
      
      requestIdleCallback(() => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUrl = ev.target?.result as string;
          setAttachments(prev => prev.map(att => 
            att.previewUrl === previewUrl 
              ? { ...att, uri: dataUrl, isLoading: false }
              : att
          ));
        };
        reader.readAsDataURL(file);
      });
    });
    e.target.value = '';
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments(prev => {
      const toRemove = prev[index];
      if (toRemove) {
        URL.revokeObjectURL(toRemove.previewUrl);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  }, []);

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
        <div className="flex items-center gap-2 min-w-0">
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
        {attachments.length > 0 && (
          <div className="flex gap-2 pb-2 flex-wrap">
            {attachments.map((att, i) => (
              <div key={i} className="relative group">
                <img 
                  src={att.previewUrl} 
                  alt={att.fileName || `Image ${i + 1}`}
                  className="w-16 h-16 object-cover rounded-lg border"
                  style={{ borderColor: 'var(--border)' }}
                />
                {att.isLoading && (
                  <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs font-bold transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {attachments.length > 0 && !currentModelSupportsAttachments && (
          <div 
            className="flex items-center gap-2 pb-2 text-xs"
            style={{ color: 'var(--warning, #f59e0b)' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>Current model may not support images</span>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <button
            type="button"
            onClick={handleImagePick}
            disabled={isSessionBusy}
            className="p-2 rounded-lg transition-colors h-[42px] flex items-center justify-center"
            style={{ 
              color: 'var(--foreground-muted)',
              backgroundColor: 'var(--background-element)',
            }}
            title="Attach image"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
          />
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
              disabled={(!text.trim() && attachments.length === 0) || attachments.some(att => att.isLoading)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed rounded-xl font-medium transition-colors h-[42px]"
              style={{ 
                color: 'var(--foreground)',
                backgroundColor: ((!text.trim() && attachments.length === 0) || attachments.some(att => att.isLoading)) ? 'var(--background-element)' : undefined
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
