"use client";

import { useState } from "react";
import { useAppStore } from "@/store";

export function ModelAgentSelector() {
  const {
    providers,
    agents,
    selectedModel,
    selectedAgent,
    setSelectedModel,
    setSelectedAgent,
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);

  if (!providers && agents.length === 0) {
    return null;
  }

  const connectedProviders = providers?.all.filter(p => 
    providers.connected.includes(p.id)
  ) || [];

  const currentModelName = selectedModel
    ? connectedProviders
        .find(p => p.id === selectedModel.providerID)
        ?.models[selectedModel.modelID]?.name || selectedModel.modelID
    : "Default";

  const currentAgentName = selectedAgent || "Default";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
      >
        <span className="truncate max-w-[120px]">{currentAgentName}</span>
        <span className="text-zinc-600">·</span>
        <span className="truncate max-w-[120px]">{currentModelName}</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute bottom-full left-0 mb-2 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {agents.length > 0 && (
              <div className="p-2 border-b border-zinc-800">
                <div className="text-xs text-zinc-500 px-2 py-1">Agent</div>
                <div className="space-y-0.5">
                  {agents.map((agent) => (
                    <button
                      key={agent.name}
                      onClick={() => {
                        setSelectedAgent(agent.name);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                        selectedAgent === agent.name
                          ? "bg-blue-600 text-white"
                          : "text-zinc-300 hover:bg-zinc-800"
                      }`}
                    >
                      <div className="font-medium">{agent.name}</div>
                      {agent.description && (
                        <div className="text-xs text-zinc-400 truncate">
                          {agent.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {connectedProviders.length > 0 && (
              <div className="p-2 max-h-64 overflow-y-auto">
                <div className="text-xs text-zinc-500 px-2 py-1">Model</div>
                {connectedProviders.map((provider) => (
                  <div key={provider.id} className="mb-2">
                    <div className="text-xs text-zinc-600 px-2 py-1 uppercase tracking-wider">
                      {provider.name}
                    </div>
                    <div className="space-y-0.5">
                      {Object.values(provider.models).map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            setSelectedModel({
                              providerID: provider.id,
                              modelID: model.id,
                            });
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                            selectedModel?.providerID === provider.id &&
                            selectedModel?.modelID === model.id
                              ? "bg-blue-600 text-white"
                              : "text-zinc-300 hover:bg-zinc-800"
                          }`}
                        >
                          {model.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
