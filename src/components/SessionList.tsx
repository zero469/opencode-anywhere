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
  hasPermission: boolean;
  isRunning: boolean;
  onClick: () => void;
  onRename: () => void;
  onTogglePin: () => void;
}

function SwipeableSession({ session, isActive, isPinned, hasPermission, isRunning, onClick, onRename, onTogglePin }: SwipeableSessionProps) {
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
    const wasDragging = isDraggingRef.current;
    
    if (translateX < -ACTION_WIDTH / 2) {
      setTranslateX(-ACTION_WIDTH);
      setIsOpen(true);
    } else {
      setTranslateX(0);
      setIsOpen(false);
    }
    
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);

    if (!wasDragging && translateX === 0 && !isOpen) {
      onClick();
    }
  }, [translateX, isOpen, onClick]);
  
  const handleClick = useCallback(() => {
    // Tap is handled in handleTouchEnd to avoid conflict with swipe gestures
  }, []);
  
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
        className={`relative p-3 border ${
          isActive
            ? "border-blue-500/50"
            : "border-transparent"
        }`}
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: isDraggingRef.current ? 'none' : 'transform 0.2s ease-out',
          backgroundColor: isActive ? 'var(--background-element)' : 'var(--background-panel)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasPermission && (
              <span className="w-2.5 h-2.5 bg-orange-500 rounded-full flex-shrink-0 animate-pulse" />
            )}
            {isRunning && !hasPermission && (
              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0 animate-pulse" />
            )}
            <span className="text-sm font-medium truncate" style={{ color: 'var(--foreground)' }}>
              {session.title || "Untitled Session"}
            </span>
          </div>
          {timeValue > 0 && (
            <span className="text-xs ml-2 flex-shrink-0" style={{ color: 'var(--foreground-muted)' }}>
              {formatTime(timeValue)}
            </span>
          )}
        </div>
        {dirName && (
          <div className="text-xs mt-1 truncate" style={{ color: 'var(--foreground-muted)' }}>
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
      <div className="rounded-xl p-4 w-full max-w-sm" style={{ backgroundColor: 'var(--background-panel)' }} onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)' }}>Rename Session</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Session title"
            autoFocus
            className="w-full px-4 py-2 rounded-lg placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            style={{ backgroundColor: 'var(--background-element)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 hover:opacity-80 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--background-element)', color: 'var(--foreground)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg transition-colors"
              style={{ color: 'var(--foreground)' }}
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
  const { sessions, currentSessionId, selectSession, startDraftSession, renameSession, togglePinSession, pinnedSessionIds, refreshSessions, connectionStep, selectedDevice, checkDeviceAndReconnect, pendingPermissions, runningSessions } = useAppStore();
  const sessionsWithPermissions = new Set(pendingPermissions.map(p => p.sessionID));
  const [sessionToRename, setSessionToRename] = useState<Session | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { isInstallable, install } = usePWA();
  
  const [searchInput, setSearchInput] = useState('');

  const isOffline = connectionStep === "idle" && selectedDevice !== null;
  const hasStaleCache = isOffline && sessions.length > 0 && sessions.every(s => !s.title);

  const matchesSearch = (session: Session) => {
    if (!searchInput.trim()) return true;
    const query = searchInput.toLowerCase();
    const title = (session.title || '').toLowerCase();
    const id = session.id.toLowerCase();
    return title.includes(query) || id.includes(query);
  };

  const filteredSessions = sessions.filter(matchesSearch);
  const pinnedSessions = filteredSessions.filter(s => pinnedSessionIds.includes(s.id));
  const unpinnedSessions = filteredSessions.filter(s => !pinnedSessionIds.includes(s.id));

  const handleReconnect = async () => {
    if (isReconnecting) return;
    setIsReconnecting(true);
    try {
      await checkDeviceAndReconnect();
    } finally {
      setIsReconnecting(false);
    }
  };

  const handleSelect = async (id: string) => {
    await selectSession(id);
    onClose?.();
  };

  const handleNewSession = () => {
    startDraftSession();
    onClose?.();
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
      hasPermission={sessionsWithPermissions.has(session.id)}
      isRunning={runningSessions.includes(session.id)}
      onClick={() => handleSelect(session.id)}
      onRename={() => setSessionToRename(session)}
      onTogglePin={() => togglePinSession(session.id)}
    />
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border-subtle)' }}>
        <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Sessions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => refreshSessions()}
            className="p-2 transition-colors hover:opacity-80"
            title="Refresh"
            style={{ color: 'var(--foreground-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={handleNewSession}
            className="p-2 transition-colors hover:opacity-80"
            title="New Session"
            style={{ color: 'var(--foreground-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-2" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border-subtle)' }}>
        <div className="relative">
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-lg text-sm placeholder-zinc-500 focus:outline-none transition-colors"
            style={{ backgroundColor: 'var(--background-panel)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)', color: 'var(--foreground)' }}
          />
          <div className="absolute left-3 top-2.5" style={{ color: 'var(--foreground-muted)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchInput && (
            <div className="absolute right-3 top-2.5 flex items-center">
              <button
                onClick={() => setSearchInput("")}
                className="focus:outline-none hover:opacity-80"
                style={{ color: 'var(--foreground-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {isOffline && (
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="w-full mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center"
          >
            <div className="flex items-center justify-center gap-2 text-red-400">
              {isReconnecting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm font-medium">Reconnecting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-sm font-medium">Device offline</span>
                </>
              )}
            </div>
            {!isReconnecting && (
              <p className="text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}>Tap to reconnect</p>
            )}
          </button>
        )}
        {hasStaleCache ? (
          <p className="text-center py-8" style={{ color: 'var(--foreground-muted)' }}>Failed to load sessions</p>
        ) : sessions.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--foreground-muted)' }}>
            No sessions yet
          </p>
        ) : filteredSessions.length === 0 ? (
          <p className="text-center py-8" style={{ color: 'var(--foreground-muted)' }}>
            No sessions found
          </p>
        ) : (
          <>
            {pinnedSessions.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--foreground-muted)' }}>Pinned</div>
                <div className="space-y-2">
                  {pinnedSessions.map(renderSession)}
                </div>
              </div>
            )}
            {unpinnedSessions.length > 0 && (
              <div>
                {pinnedSessions.length > 0 && (
                  <div className="text-xs uppercase tracking-wider mb-2 px-1" style={{ color: 'var(--foreground-muted)' }}>Recent</div>
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
        <div className="p-4" style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'var(--border-subtle)' }}>
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
