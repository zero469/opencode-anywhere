"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/store";

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.3;

export function PermissionDialog() {
  const { pendingPermissions, respondPermission, currentSessionId } = useAppStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startY: 0, currentY: 0, startTime: 0, direction: '' as '' | 'up' | 'down' });

  const currentSessionPermissions = pendingPermissions.filter(
    p => p.sessionID === currentSessionId
  );

  if (currentSessionPermissions.length === 0) return null;

  const permission = currentSessionPermissions[0];
  const totalPendingRequests = currentSessionPermissions.length;

  const handleAllow = () => {
    respondPermission(permission.id, true);
    setIsExpanded(false);
  };

  const handleDeny = () => {
    respondPermission(permission.id, false);
    setIsExpanded(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragState.current = { startY: touch.clientY, currentY: touch.clientY, startTime: Date.now(), direction: '' };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const deltaY = touch.clientY - dragState.current.startY;
    dragState.current.currentY = touch.clientY;
    
    if (!dragState.current.direction && Math.abs(deltaY) > 10) {
      dragState.current.direction = deltaY > 0 ? 'down' : 'up';
    }
    
    if (isExpanded && deltaY > 0) {
      setDragOffset(Math.min(deltaY * 0.6, 150));
    } else if (!isExpanded && deltaY < 0) {
      setDragOffset(Math.max(deltaY * 0.6, -100));
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    const deltaY = dragState.current.currentY - dragState.current.startY;
    const elapsed = Date.now() - dragState.current.startTime;
    const velocity = Math.abs(deltaY) / elapsed;
    
    setIsDragging(false);
    setDragOffset(0);

    if (isExpanded && (deltaY > SWIPE_THRESHOLD || (deltaY > 20 && velocity > VELOCITY_THRESHOLD))) {
      setIsExpanded(false);
    } else if (!isExpanded && (deltaY < -SWIPE_THRESHOLD || (deltaY < -20 && velocity > VELOCITY_THRESHOLD))) {
      setIsExpanded(true);
    }
  };

  const getExpandProgress = () => {
    if (!isDragging) return isExpanded ? 1 : 0;
    if (isExpanded) {
      return Math.max(0, 1 - dragOffset / 150);
    } else {
      return Math.min(1, -dragOffset / 100);
    }
  };

  const expandProgress = getExpandProgress();
  const backdropOpacity = expandProgress * 0.3;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black pointer-events-none"
        style={{ 
          opacity: backdropOpacity,
          transition: isDragging ? 'none' : 'opacity 0.3s ease-out',
          pointerEvents: expandProgress > 0.1 ? 'auto' : 'none',
        }}
        onClick={() => setIsExpanded(false)}
      />
      
      <div 
        className="fixed bottom-0 left-0 right-0 z-40 px-3"
        style={{
          transform: isDragging && dragOffset > 0 ? `translateY(${dragOffset * 0.3}px)` : 'translateY(0)',
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="rounded-t-xl shadow-lg overflow-hidden"
          style={{ 
            backgroundColor: 'var(--background-panel)', 
            borderWidth: '1px', 
            borderBottomWidth: '0',
            borderStyle: 'solid', 
            borderColor: 'var(--border)',
          }}
        >
          <div 
            className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
            style={{
              opacity: isExpanded ? 1 : 0.5,
              transition: 'opacity 0.2s',
            }}
          >
            <div
              className="w-10 h-1 rounded-full"
              style={{ backgroundColor: 'var(--foreground-muted)', opacity: 0.5 }}
            />
          </div>

          <div className="px-4 pt-1 pb-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400">
                    Permission
                  </span>
                  {totalPendingRequests > 1 && (
                    <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                      +{totalPendingRequests - 1} more
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                  {permission.permission}
                </h3>
                <p 
                  className="text-xs mt-0.5 font-mono overflow-hidden"
                  style={{ 
                    color: 'var(--foreground-muted)',
                    display: '-webkit-box',
                    WebkitLineClamp: isExpanded ? 'unset' : 1,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {permission.patterns?.join(", ") || ""}
                </p>
              </div>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex-shrink-0 p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--background-element)' }}
              >
                <svg 
                  className="w-5 h-5" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24" 
                  style={{ 
                    color: 'var(--foreground)',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease-out',
                  }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            </div>

            <div 
              className="overflow-hidden"
              style={{ 
                maxHeight: isExpanded ? '50vh' : '0px',
                opacity: isExpanded ? 1 : 0,
                transition: isDragging ? 'none' : 'max-height 0.3s ease-out, opacity 0.2s ease-out',
              }}
            >
              <div className="mb-4">
                <p className="text-sm mb-3" style={{ color: 'var(--foreground-muted)' }}>
                  OpenCode wants to use the following tool:
                </p>
                
                <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--background-element)' }}>
                  <code className="text-blue-400 font-mono text-sm">{permission.permission}</code>
                  {permission.patterns && permission.patterns.length > 0 && (
                    <pre className="text-xs mt-2 overflow-x-auto max-h-32 overflow-y-auto" style={{ color: 'var(--foreground-muted)' }}>
                      {permission.patterns.join(", ")}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              <button
                onClick={handleDeny}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--background-element)', color: 'var(--foreground)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}
              >
                Deny
              </button>
              {isExpanded ? (
                <button
                  onClick={handleAllow}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Confirm
                </button>
              ) : (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Allow
                </button>
              )}
            </div>
          </div>
        </div>
        <div 
          className="h-[env(safe-area-inset-bottom)]"
          style={{ backgroundColor: 'var(--background-panel)' }}
        />
      </div>
    </>
  );
}
