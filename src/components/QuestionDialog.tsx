"use client";

import { useState } from "react";
import { useAppStore } from "@/store";

export function QuestionDialog() {
  const { pendingQuestions, replyToQuestion, rejectQuestion } = useAppStore();
  const [selectedOptions, setSelectedOptions] = useState<Record<number, string[]>>({});

  if (pendingQuestions.length === 0) return null;

  const question = pendingQuestions[0];
  const questionItem = question.questions[0];

  if (!questionItem) return null;

  const handleOptionSelect = (questionIndex: number, optionLabel: string) => {
    if (questionItem.multiple) {
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
    const answers = question.questions.map((_, index) => selectedOptions[index] || []);
    await replyToQuestion(question.id, answers);
    setSelectedOptions({});
  };

  const handleReject = async () => {
    await rejectQuestion(question.id);
    setSelectedOptions({});
  };

  const currentSelection = selectedOptions[0] || [];
  const hasSelection = currentSelection.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full border border-zinc-700">
        <h3 className="text-lg font-semibold text-white mb-1">
          {questionItem.header}
        </h3>
        <p className="text-zinc-400 text-sm mb-4">
          {questionItem.question}
        </p>
        
        <div className="space-y-2 mb-4">
          {questionItem.options.map((option, optionIndex) => {
            const isSelected = currentSelection.includes(option.label);
            return (
              <button
                key={optionIndex}
                onClick={() => handleOptionSelect(0, option.label)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-blue-500" : "border-zinc-600"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">
                      {option.label}
                    </div>
                    {option.description && (
                      <div className="text-zinc-500 text-xs mt-0.5">
                        {option.description}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReject}
            className="flex-1 py-2 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={handleReply}
            disabled={!hasSelection}
            className={`flex-1 py-2 px-4 rounded-lg text-white font-medium transition-colors ${
              hasSelection
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-zinc-700 opacity-50 cursor-not-allowed"
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
