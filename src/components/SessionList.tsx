"use client";

import { useState, useRef, useCallback } from "react";
import { useAppStore } from "@/store";
import { usePWA } from "@/hooks/usePWA";
import type { Session } from "@/types";

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface SwipeableSessionProps {
  session: Session;
  isActive: boolean;
  isPinned: boolean;
  onClick: () => void;
  onRename: () => void;
  onTogglePin: () => void;
}

function SwipeableSession({ session, isActive, isPinned, onClick, onRename, onTogglePin }: SwipeableSessionProps) {
  const timeValue = session.time?.updated || session.time?.created || 0;
  const dirName = session.directory?.split('/').pop() || '';
  
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  
  const ACTION_WIDTH = 140;
  
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = translateX;
    isDraggingRef.current = false;
  }, [translateX]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - startXRef.current;
    if (Math.abs(diff) > 10) {
      isDraggingRef.current = true;
    }
    const newX = Math.max(-ACTION_WIDTH, Math.min(0, currentXRef.current + diff));
    setTranslateX(newX);
  }, []);
  
  const handleTouchEnd = useCallback(() => {
    if (translateX < -ACTION_WIDTH / 2) {
      setTranslateX(-ACTION_WIDTH);
      setIsOpen(true);
    } else {
      setTranslateX(0);
      setIsOpen(false);
    }
  }, [translateX]);
  
  const handleClick = useCallback(() => {
    if (isDraggingRef.current) return;
    if (isOpen) {
      setTranslateX(0);
      setIsOpen(false);
    } else {
      onClick();
    }
  }, [isOpen, onClick]);
  
  const handleAction = useCallback((action: () => void) => {
    setTranslateX(0);
    setIsOpen(false);
    action();
  }, []);

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="absolute right-0 top-0 bottom-0 flex">
        <button
          onClick={() => handleAction(onTogglePin)}
          className="w-[70px] bg-amber-600 flex items-center justify-center"
        >
          {isPinned ? (
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          )}
        </button>
        <button
          onClick={() => handleAction(onRename)}
          className="w-[70px] bg-blue-600 flex items-center justify-center"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>
      
      <div
        className={`relative p-3 ${
          isActive
            ? "bg-zinc-800 border border-blue-500/50"
            : "bg-zinc-900 border border-transparent"
        }`}
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease-out'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isPinned && (
              <svg className="w-3 h-3 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
              </svg>
            )}
            <span className="text-sm font-medium text-white truncate">
              {session.title || "Untitled Session"}
            </span>
          </div>
          {timeValue > 0 && (
            <span className="text-xs text-zinc-500 ml-2 flex-shrink-0">
              {formatTime(timeValue)}
            </span>
          )}
        </div>
        {dirName && (
          <div className="text-xs text-zinc-500 mt-1 truncate">
            {dirName}
          </div>
        )}
      </div>
    </div>
  );
}

interface RenameModalProps {
  session: Session;
  onClose: () => void;
  onRename: (title: string) => void;
}

function RenameModal({ session, onClose, onRename }: RenameModalProps) {
  const [title, setTitle] = useState(session.title || "");
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onRename(title.trim());
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 rounded-xl p-4 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">Rename Session</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Session title"
            autoFocus
            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SessionList({ onClose }: { onClose?: () => void }) {
  const { sessions, currentSessionId, selectSession, createSession, renameSession, togglePinSession, pinnedSessionIds, refreshSessions, isLoading } = useAppStore();
  const [isCreating, setIsCreating] = useState(false);
  const [sessionToRename, setSessionToRename] = useState<Session | null>(null);
  const { isInstallable, install } = usePWA();

  const pinnedSessions = sessions.filter(s => pinnedSessionIds.includes(s.id));
  const unpinnedSessions = sessions.filter(s => !pinnedSessionIds.includes(s.id));

  const handleSelect = async (id: string) => {
    if (isLoading) return;
    await selectSession(id);
    onClose?.();
  };

  const handleNewSession = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      await createSession();
      onClose?.();
    } finally {
      setIsCreating(false);
    }
  };

  const handleRename = async (title: string) => {
    if (sessionToRename) {
      await renameSession(sessionToRename.id, title);
      setSessionToRename(null);
    }
  };

  const renderSession = (session: Session) => (
    <SwipeableSession
      key={session.id}
      session={session}
      isActive={session.id === currentSessionId}
      isPinned={pinnedSessionIds.includes(session.id)}
      onClick={() => handleSelect(session.id)}
      onRename={() => setSessionToRename(session)}
      onTogglePin={() => togglePinSession(session.id)}
    />
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white">Sessions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => refreshSessions()}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleNewSession}
            disabled={isCreating}
            className={`p-2 transition-colors ${isCreating ? "text-zinc-600 cursor-not-allowed" : "text-zinc-400 hover:text-white"}`}
            title="New Session"
          >
            {isCreating ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {sessions.length === 0 ? (
          <p className="text-zinc-500 text-center py-8">No sessions yet</p>
        ) : (
          <>
            {pinnedSessions.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2 px-1">Pinned</div>
                <div className="space-y-2">
                  {pinnedSessions.map(renderSession)}
                </div>
              </div>
            )}
            {unpinnedSessions.length > 0 && (
              <div>
                {pinnedSessions.length > 0 && (
                  <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2 px-1">Recent</div>
                )}
                <div className="space-y-2">
                  {unpinnedSessions.map(renderSession)}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isInstallable && (
        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={install}
            className="w-full py-2 px-4 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Install App
          </button>
        </div>
      )}

      {sessionToRename && (
        <RenameModal
          session={sessionToRename}
          onClose={() => setSessionToRename(null)}
          onRename={handleRename}
        />
      )}
    </div>
  );
}
