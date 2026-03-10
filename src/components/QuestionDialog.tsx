"use client";

import { useState, useRef } from "react";
import { useAppStore } from "@/store";

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 0.3;

export function QuestionDialog() {
  const { pendingQuestions, replyToQuestion, rejectQuestion, currentSessionId } = useAppStore();
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string[]>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ startY: 0, currentY: 0, startTime: 0, direction: '' as '' | 'up' | 'down' });
  
  const sessionQuestions = pendingQuestions.filter(q => q.sessionID === currentSessionId);
  
  if (sessionQuestions.length === 0) return null;

  const question = sessionQuestions[0];
  const questions = question.questions;

  if (!questions || questions.length === 0) return null;

  const handleOptionSelect = (questionIndex: number, optionLabel: string, isMultiple: boolean) => {
    if (isMultiple) {
      const current = selectedOptions[questionIndex] || [];
      if (current.includes(optionLabel)) {
        setSelectedOptions({
          ...selectedOptions,
          [questionIndex]: current.filter(l => l !== optionLabel),
        });
      } else {
        setSelectedOptions({
          ...selectedOptions,
          [questionIndex]: [...current, optionLabel],
        });
      }
    } else {
      setSelectedOptions({
        ...selectedOptions,
        [questionIndex]: [optionLabel],
      });
    }
  };

  const handleReply = async () => {
    const answers = questions.map((_, index) => selectedOptions[index] || []);
    await replyToQuestion(question.id, answers);
    setSelectedOptions({});
    setIsExpanded(false);
  };

  const handleReject = async () => {
    await rejectQuestion(question.id);
    setSelectedOptions({});
    setIsExpanded(false);
  };

  const allQuestionsAnswered = questions.every((_, index) => {
    const selection = selectedOptions[index] || [];
    return selection.length > 0;
  });

  const totalPendingRequests = sessionQuestions.length;
  const firstQuestion = questions[0];

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
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                    Question
                  </span>
                  {totalPendingRequests > 1 && (
                    <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                      +{totalPendingRequests - 1} more
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                  {firstQuestion.header}
                </h3>
                <p 
                  className="text-xs mt-0.5 overflow-hidden"
                  style={{ 
                    color: 'var(--foreground-muted)',
                    display: '-webkit-box',
                    WebkitLineClamp: isExpanded ? 'unset' : 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {firstQuestion.question}
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
              <div className="overflow-y-auto pr-1" style={{ maxHeight: '45vh' }}>
                {questions.map((questionItem, questionIndex) => {
                  const currentSelection = selectedOptions[questionIndex] || [];
                  const options = questionItem.options || [];
                  const isLastQuestion = questionIndex === questions.length - 1;

                  return (
                    <div key={questionIndex} className={!isLastQuestion ? "mb-4 pb-4" : "mb-2"} style={!isLastQuestion ? { borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border)' } : {}}>
                      {questionIndex > 0 && (
                        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                          {questionItem.header}
                        </h3>
                      )}
                      {questionIndex > 0 && (
                        <p className="text-sm mb-3" style={{ color: 'var(--foreground-muted)' }}>
                          {questionItem.question}
                        </p>
                      )}
                      
                      {questionItem.multiple && (
                        <p className="text-xs text-blue-400 mb-2">Select multiple options</p>
                      )}

                      <div className="space-y-2">
                        {options.length === 0 ? (
                          <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>No options available</p>
                        ) : (
                          options.map((option, optionIndex) => {
                            const isSelected = currentSelection.includes(option.label);
                            return (
                              <button
                                key={optionIndex}
                                onClick={() => handleOptionSelect(questionIndex, option.label, questionItem.multiple || false)}
                                className={`no-select w-full text-left p-3 rounded-lg border transition-colors ${
                                  isSelected
                                    ? "border-blue-500 bg-blue-500/10"
                                    : "hover:opacity-80"
                                }`}
                                style={isSelected ? {} : { borderColor: 'var(--border)', backgroundColor: 'var(--background-element)' }}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-5 h-5 flex-shrink-0 ${questionItem.multiple ? "rounded" : "rounded-full"} border-2 flex items-center justify-center ${
                                      isSelected ? "border-blue-500" : ""
                                    }`}
                                    style={isSelected ? {} : { borderColor: 'var(--foreground-muted)' }}
                                  >
                                    {isSelected && (
                                      questionItem.multiple ? (
                                        <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      ) : (
                                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                      )
                                    )}
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm" style={{ color: 'var(--foreground)' }}>
                                      {option.label}
                                    </div>
                                    {option.description && (
                                      <div className="text-xs mt-0.5" style={{ color: 'var(--foreground-muted)' }}>
                                        {option.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              <button
                onClick={handleReject}
                className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                style={{ backgroundColor: 'var(--background-element)', color: 'var(--foreground)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}
              >
                Dismiss
              </button>
              {isExpanded ? (
                <button
                  onClick={handleReply}
                  disabled={!allQuestionsAnswered}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium text-white transition-colors ${
                    allQuestionsAnswered
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                  style={allQuestionsAnswered ? {} : { backgroundColor: 'var(--background-element)' }}
                >
                  Confirm
                </button>
              ) : (
                <button
                  onClick={() => setIsExpanded(true)}
                  className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Answer
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
