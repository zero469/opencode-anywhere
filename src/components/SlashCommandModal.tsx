"use client";

import { useState, useMemo, useEffect } from "react";
import type { CommandInfo, SkillInfo } from "@/lib/opencode";

type FilterType = "all" | "skills" | "commands" | "actions";

interface SlashCommandItem {
  name: string;
  description?: string;
  category: "skill" | "command" | "action";
}

interface SlashCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandInfo[];
  skills: SkillInfo[];
  onSelect: (name: string) => void;
  onCompact: () => void;
  isCompacting?: boolean;
  loading?: boolean;
}

export function SlashCommandModal({ 
  isOpen, 
  onClose, 
  commands, 
  skills, 
  onSelect,
  onCompact,
  isCompacting,
  loading 
}: SlashCommandModalProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFilter("all");
      setHoveredItem(null);
    }
  }, [isOpen]);

  const items = useMemo(() => {
    const skillSet = new Set(skills.map(s => s.name));
    
    const skillItems: SlashCommandItem[] = skills.map(s => ({
      name: s.name,
      description: s.description,
      category: "skill",
    }));
    
    const commandItems: SlashCommandItem[] = commands
      .filter(c => !skillSet.has(c.name))
      .map(c => ({
        name: c.name,
        description: c.description,
        category: "command",
      }));
    
    // Action items (special actions like Compact)
    const actionItems: SlashCommandItem[] = [
      {
        name: "compact",
        description: "Compact conversation history to reduce token usage",
        category: "action",
      },
    ];
    
    const all = [...skillItems, ...commandItems, ...actionItems].sort((a, b) => a.name.localeCompare(b.name));
    
    if (filter === "skills") return all.filter(i => i.category === "skill");
    if (filter === "commands") return all.filter(i => i.category === "command");
    if (filter === "actions") return all.filter(i => i.category === "action");
    return all;
  }, [commands, skills, filter]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[70vh] flex flex-col"
        style={{ backgroundColor: 'var(--background-panel)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border-subtle)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Slash Commands</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--foreground-muted)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--foreground)'; e.currentTarget.style.backgroundColor = 'var(--background-element)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--foreground-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex gap-2 px-4 py-2" style={{ borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border-subtle)' }}>
          {(["all", "skills", "commands", "actions"] as const).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setHoveredItem(null); }}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
              style={{
                backgroundColor: filter === f ? '#2563eb' : 'var(--background-element)',
                color: filter === f ? '#ffffff' : 'var(--foreground-muted)',
                border: filter === f ? '1px solid #3b82f6' : '1px solid transparent',
              }}
            >
              {f === "all" ? "All" : f === "skills" ? "Skills" : f === "commands" ? "Commands" : "Actions"}
            </button>
          ))}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="w-6 h-6 animate-spin" style={{ color: 'var(--foreground-muted)' }} fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--foreground-muted)' }}>
              No items available
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => {
                const itemKey = `${item.category}-${item.name}`;
                const isHovered = hoveredItem === itemKey;
                const isAction = item.category === "action";
                const isCompactAction = isAction && item.name === "compact";
                const isDisabled = isCompactAction && isCompacting;
                
                const handleClick = () => {
                  if (isCompactAction) {
                    onCompact();
                  } else {
                    onSelect(item.name);
                  }
                };
                
                const getIconBgColor = () => {
                  if (item.category === "skill") return 'rgba(59, 130, 246, 0.2)';
                  if (item.category === "action") return 'rgba(251, 146, 60, 0.2)';
                  return 'rgba(34, 197, 94, 0.2)';
                };
                
                const getBadgeColor = () => {
                  if (item.category === "skill") return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60a5fa' };
                  if (item.category === "action") return { bg: 'rgba(251, 146, 60, 0.2)', text: '#fb923c' };
                  return { bg: 'rgba(34, 197, 94, 0.2)', text: '#4ade80' };
                };
                
                const badgeColors = getBadgeColor();
                
                return (
                  <button
                    key={itemKey}
                    onClick={handleClick}
                    disabled={isDisabled}
                    className="w-full text-left p-3 rounded-lg transition-colors group disabled:opacity-50"
                    style={{ backgroundColor: isHovered ? 'var(--background-element)' : 'transparent' }}
                    onMouseEnter={() => setHoveredItem(itemKey)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                  <div className="flex items-start gap-3">
                    <div 
                      className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: getIconBgColor() }}
                    >
                      {isCompactAction && isCompacting ? (
                        <svg className="w-4 h-4 text-orange-400 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      ) : item.category === "skill" ? (
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      ) : item.category === "action" ? (
                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span 
                          className="text-sm font-medium transition-colors"
                          style={{ color: 'var(--foreground)' }}
                        >
                          {isAction ? item.name.charAt(0).toUpperCase() + item.name.slice(1) : `/${item.name}`}
                        </span>
                        <span 
                          className="text-xs px-1.5 py-0.5 rounded"
                          style={{ backgroundColor: badgeColors.bg, color: badgeColors.text }}
                        >
                          {item.category}
                        </span>
                      </div>
                      {item.description && (
                        <div className="text-xs line-clamp-2 mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
                          {item.description}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );})}
            </div>
          )}
        </div>
        
        <div className="p-4" style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'var(--border-subtle)' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={{ color: 'var(--foreground-muted)', backgroundColor: 'var(--background-element)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--foreground)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--foreground-muted)'; }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
