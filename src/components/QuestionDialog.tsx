"use client";

import { useState } from "react";
import { useAppStore } from "@/store";

export function QuestionDialog() {
  const { pendingQuestions, replyToQuestion, rejectQuestion, currentSessionId } = useAppStore();
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string[]>>({});
  
  // Only show questions for the current session
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
  };

  const handleReject = async () => {
    await rejectQuestion(question.id);
    setSelectedOptions({});
  };

  // Check if all questions have at least one selection
  const allQuestionsAnswered = questions.every((_, index) => {
    const selection = selectedOptions[index] || [];
    return selection.length > 0;
  });

  const totalPendingRequests = sessionQuestions.length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" style={{ backgroundColor: 'var(--background-panel)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}>
        {/* Header with count indicator */}
        {totalPendingRequests > 1 && (
          <div className="text-xs mb-3" style={{ color: 'var(--foreground-muted)' }}>
            Question set 1 of {totalPendingRequests}
          </div>
        )}

        {/* Render ALL questions within this QuestionRequest */}
        {questions.map((questionItem, questionIndex) => {
          const currentSelection = selectedOptions[questionIndex] || [];
          const options = questionItem.options || [];
          const isLastQuestion = questionIndex === questions.length - 1;

          return (
            <div key={questionIndex} className={!isLastQuestion ? "mb-6 pb-6" : ""} style={!isLastQuestion ? { borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border)' } : {}}>
              <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
                {questionItem.header}
                {questions.length > 1 && (
                  <span className="text-sm font-normal ml-2" style={{ color: 'var(--foreground-muted)' }}>
                    ({questionIndex + 1}/{questions.length})
                  </span>
                )}
              </h3>
              <p className="text-sm mb-4" style={{ color: 'var(--foreground-muted)' }}>
                {questionItem.question}
              </p>
              
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

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleReject}
            className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--background-element)', color: 'var(--foreground)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}
          >
            Dismiss
          </button>
          <button
            onClick={handleReply}
            disabled={!allQuestionsAnswered}
            className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-colors ${
              allQuestionsAnswered
                ? "bg-blue-600 hover:bg-blue-700"
                : "opacity-50 cursor-not-allowed"
            }`}
            style={allQuestionsAnswered ? {} : { backgroundColor: 'var(--background-element)' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
