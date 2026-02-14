"use client";

import React from "react";
import type { SkillInfo } from "@/lib/opencode";

interface SkillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  skills: SkillInfo[];
  onSelectSkill: (skillName: string) => void;
}

export function SkillsModal({ isOpen, onClose, skills, onSelectSkill }: SkillsModalProps) {
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
          <h2 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>Available Skills</h2>
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
        
        <div className="flex-1 overflow-y-auto p-2">
          {skills.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--foreground-muted)' }}>
              No skills available
            </div>
          ) : (
            <div className="space-y-1">
              {skills.map((skill) => (
                  <button
                    key={skill.name}
                    onClick={() => onSelectSkill(skill.name)}
                    className="w-full text-left p-3 rounded-lg transition-colors group"
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--background-element)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium group-hover:text-blue-400 transition-colors" style={{ color: 'var(--foreground)' }}>
                        {skill.name}
                      </div>
                      <div className="text-xs line-clamp-2 mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
                        {skill.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
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
