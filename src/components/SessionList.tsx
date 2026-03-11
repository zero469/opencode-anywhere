"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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

const SWIPE_THRESHOLD = 60;
const ACTION_WIDTH = 140;

interface SessionItemProps {
  session: Session;
  isActive: boolean;
  isPinned: boolean;
  hasPermission: boolean;
  isRunning: boolean;
  isFirst: boolean;
  isLast: boolean;
  isRevealed: boolean;
  onClick: () => void;
  onReveal: () => void;
  onClose: () => void;
  onRename: () => void;
  onTogglePin: () => void;
}

function SessionItem({ 
  session, isActive, isPinned, hasPermission, isRunning, 
  isFirst, isLast, isRevealed, onClick, onReveal, onClose, onRename, onTogglePin 
}: SessionItemProps) {
  const timeValue = session.time?.updated || session.time?.created || 0;
  const dirName = session.directory?.split('/').pop() || '';
  
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const currentTranslate = useRef(0);
  const isDragging = useRef(false);
  const isScrolling = useRef<boolean | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);

  useEffect(() => {
    if (isRevealed) {
      currentTranslate.current = -ACTION_WIDTH;
    } else {
      currentTranslate.current = 0;
    }
    if (containerRef.current) {
      containerRef.current.style.transform = `translateX(${currentTranslate.current}px)`;
    }
  }, [isRevealed]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
    isScrolling.current = null;
    
    if (containerRef.current) {
      containerRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - touchStartX.current;
    const diffY = touchY - touchStartY.current;
    
    if (isScrolling.current === null) {
      if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 5) {
        isScrolling.current = true;
        isDragging.current = false;
        return;
      } else if (Math.abs(diffX) > 5) {
        isScrolling.current = false;
        setIsSwiping(true);
      }
    }
    
    if (isScrolling.current) return;
    
    const baseTranslate = isRevealed ? -ACTION_WIDTH : 0;
    let newTranslate = baseTranslate + diffX;
    
    newTranslate = Math.max(-ACTION_WIDTH, Math.min(0, newTranslate));
    
    currentTranslate.current = newTranslate;
    
    if (containerRef.current) {
      containerRef.current.style.transform = `translateX(${newTranslate}px)`;
    }
  }, [isRevealed]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current && isScrolling.current !== false) {
      isDragging.current = false;
      return;
    }
    
    isDragging.current = false;
    
    if (containerRef.current) {
      containerRef.current.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    }
    
    const diffFromStart = currentTranslate.current - (isRevealed ? -ACTION_WIDTH : 0);
    
    if (isRevealed) {
      if (diffFromStart > SWIPE_THRESHOLD) {
        onClose();
      } else {
        currentTranslate.current = -ACTION_WIDTH;
        if (containerRef.current) {
          containerRef.current.style.transform = `translateX(-${ACTION_WIDTH}px)`;
        }
      }
    } else {
      if (diffFromStart < -SWIPE_THRESHOLD) {
        onReveal();
      } else if (Math.abs(diffFromStart) < 5 && isScrolling.current === null) {
        onClick();
      } else {
        currentTranslate.current = 0;
        if (containerRef.current) {
          containerRef.current.style.transform = 'translateX(0)';
        }
      }
    }
    
    isScrolling.current = null;
    setIsSwiping(false);
  }, [isRevealed, onClick, onReveal, onClose]);

  return (
    <div 
      className="relative rounded-2xl"
      style={{ 
        overflow: 'hidden'
      }}
    >
      <div 
        className="absolute right-0 top-0 bottom-0 flex"
        style={{ 
          width: ACTION_WIDTH,
          pointerEvents: (isRevealed || isSwiping) ? 'auto' : 'none',
          opacity: (isRevealed || isSwiping) ? 1 : 0,
          transition: 'opacity 0.15s ease'
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          className="flex-1 flex items-center justify-center active:opacity-80"
          style={{ background: '#FF9500' }}
        >
          <svg className="w-5 h-5 text-white" fill={isPinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onRename(); }}
          className="flex-1 flex items-center justify-center active:opacity-80"
          style={{ background: '#007AFF' }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
      </div>

      <div
        ref={containerRef}
        className="no-select relative px-4 py-3"
        style={{
          background: isActive ? 'var(--glass-accent-solid)' : 'transparent',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        
        <div className="flex items-center gap-3">
          {(hasPermission || isRunning) && (
            <div className="flex-shrink-0">
              <span 
                className={`
                  block w-2.5 h-2.5 rounded-full animate-pulse
                  ${hasPermission ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]' : ''}
                  ${isRunning && !hasPermission ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : ''}
                `}
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span 
                className="text-[14px] font-medium truncate"
                style={{ color: 'var(--foreground)' }}
              >
                {session.title || "Untitled Session"}
              </span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {timeValue > 0 && (
                  <span 
                    className="text-[12px]"
                    style={{ color: 'var(--foreground-muted)' }}
                  >
                    {formatTime(timeValue)}
                  </span>
                )}
              </div>
            </div>
            {dirName && (
              <div 
                className="text-[12px] mt-0.5 truncate"
                style={{ color: 'var(--foreground-muted)' }}
              >
                {dirName}
              </div>
            )}
          </div>
        </div>
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
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div 
        className="rounded-2xl p-5 w-full max-w-sm"
        style={{
          background: 'var(--glass-bg-prominent)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          border: '1px solid var(--glass-border-prominent)',
          boxShadow: 'var(--glass-shadow-elevated)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 
          className="text-lg font-semibold mb-4 text-center"
          style={{ color: 'var(--foreground)' }}
        >
          Rename Session
        </h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Session title"
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-[16px] mb-4 outline-none"
            style={{ 
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              color: 'var(--foreground)'
            }}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-medium active:opacity-70 transition-opacity"
              style={{ 
                background: 'var(--glass-bg)',
                color: 'var(--foreground)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-3 px-4 rounded-xl font-medium active:opacity-70 transition-opacity disabled:opacity-40"
              style={{ 
                background: 'var(--glass-blue-solid)',
                color: '#fff'
              }}
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
  const [revealedSessionId, setRevealedSessionId] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { isInstallable, install } = usePWA();
  
  const [searchInput, setSearchInput] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const handleTogglePin = (sessionId: string) => {
    togglePinSession(sessionId);
    setRevealedSessionId(null);
  };

  const handleRenameSession = (session: Session) => {
    setSessionToRename(session);
    setRevealedSessionId(null);
  };

  const renderSessionGroup = (sessionList: Session[], label?: string, isPinnedGroup?: boolean) => (
    <div className="mb-5">
      {label && (
        <div 
          className="text-[12px] font-semibold uppercase tracking-wide mb-2 px-1"
          style={{ color: 'var(--foreground-muted)' }}
        >
          {label}
        </div>
      )}
      <div className="space-y-1.5">
        {sessionList.map((session) => (
          <div
            key={session.id}
            className="rounded-2xl overflow-hidden"
            style={{ 
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '1px solid var(--glass-border)',
              borderLeft: isPinnedGroup ? '3px solid var(--glass-blue-solid)' : '1px solid var(--glass-border)',
              boxShadow: 'var(--glass-shadow)'
            }}
          >
            <SessionItem
              session={session}
              isActive={session.id === currentSessionId}
              isPinned={pinnedSessionIds.includes(session.id)}
              hasPermission={sessionsWithPermissions.has(session.id)}
              isRunning={runningSessions.includes(session.id)}
              isFirst={true}
              isLast={true}
              isRevealed={revealedSessionId === session.id}
              onClick={() => handleSelect(session.id)}
              onReveal={() => setRevealedSessionId(session.id)}
              onClose={() => setRevealedSessionId(null)}
              onRename={() => handleRenameSession(session)}
              onTogglePin={() => handleTogglePin(session.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div 
      className="relative flex flex-col h-full" 
      style={{ 
        background: 'var(--glass-bg-solid)'
      }}
    >
      <div 
        className="flex-1 overflow-y-auto px-5 pt-3"
        style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
      >
        {isOffline && (
          <button
            onClick={handleReconnect}
            disabled={isReconnecting}
            className="w-full mb-4 p-4 rounded-2xl text-center active:opacity-70 transition-opacity"
            style={{ 
              background: 'rgba(224, 108, 117, 0.15)',
              border: '1px solid rgba(224, 108, 117, 0.3)'
            }}
          >
            <div className="flex items-center justify-center gap-2" style={{ color: 'var(--oc-red)' }}>
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
          <p className="text-center py-8" style={{ color: 'var(--foreground-muted)' }}>
            Failed to load sessions
          </p>
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
            {pinnedSessions.length > 0 && renderSessionGroup(pinnedSessions, 'Pinned', true)}
            {unpinnedSessions.length > 0 && renderSessionGroup(unpinnedSessions, pinnedSessions.length > 0 ? 'Recent' : undefined, false)}
          </>
        )}
        {isInstallable && (
          <div className="mt-4">
            <button
              onClick={install}
              className="w-full py-3 rounded-2xl font-medium flex items-center justify-center gap-2 active:opacity-70 transition-opacity"
              style={{ 
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                color: 'var(--glass-blue-solid)'
              }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Install App
            </button>
          </div>
        )}
      </div>

      <div 
        className="absolute left-0 right-0 flex justify-center gap-2.5 pointer-events-none"
        style={{ bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
      >
        {isSearchExpanded ? (
          <div 
            className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full"
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px) saturate(180%)',
              WebkitBackdropFilter: 'blur(20px) saturate(180%)',
              border: '0.5px solid var(--glass-border-prominent)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 0.5px 0 rgba(255, 255, 255, 0.5)'
            }}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-36 text-[15px] bg-transparent outline-none"
              style={{ color: 'var(--foreground)' }}
            />
            <button
              onClick={() => {
                setIsSearchExpanded(false);
                setSearchInput('');
              }}
              className="text-[14px] font-medium active:opacity-70"
              style={{ color: 'var(--accent)' }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setIsSearchExpanded(true);
                setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              className="pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{ 
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '0.5px solid var(--glass-border-prominent)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 0.5px 0 rgba(255, 255, 255, 0.5)',
                color: 'var(--foreground)'
              }}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button
              onClick={() => refreshSessions()}
              className="pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{ 
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '0.5px solid var(--glass-border-prominent)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 0.5px 0 rgba(255, 255, 255, 0.5)',
                color: 'var(--foreground)'
              }}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={handleNewSession}
              className="pointer-events-auto w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-transform"
              style={{ 
                background: 'var(--accent)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                color: 'white'
              }}
            >
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </div>

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
