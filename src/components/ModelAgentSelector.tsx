"use client";

import { useState } from "react";
import { useAppStore } from "@/store";

export function ModelAgentSelector() {
  const {
    providers,
    agents,
    selectedModel,
    setSelectedModel,
    setSelectedAgent,
    getSelectedAgent,
    fetchProvidersAndAgents,
    connectionStep,
  } = useAppStore();

  const selectedAgent = getSelectedAgent();
  const [isOpen, setIsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const isConnectionInProgress = connectionStep === "connecting" || connectionStep === "authenticating" || connectionStep === "loading_sessions";
  const hasNoData = !providers && agents.length === 0;

  if (hasNoData && isConnectionInProgress) {
    return null;
  }

  if (hasNoData) {
    return (
      <button
        onClick={async () => {
          setIsRetrying(true);
          await fetchProvidersAndAgents();
          setIsRetrying(false);
        }}
        disabled={isRetrying}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-800 rounded-lg transition-colors"
      >
        {isRetrying ? (
          <>
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Load agents</span>
          </>
        )}
      </button>
    );
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
