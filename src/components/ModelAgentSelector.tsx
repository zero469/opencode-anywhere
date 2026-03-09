"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { getAgentColor, capitalizeAgentName } from "@/lib/agentColors";

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
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 text-[12px] rounded-xl"
        style={{ 
          color: "var(--foreground-muted)", 
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid var(--glass-border)"
        }}
      >
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span>Loading...</span>
      </div>
    );
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
        className="flex items-center gap-2 px-3 py-1.5 text-[12px] rounded-xl transition-colors hover:opacity-80"
        style={{ 
          color: "var(--foreground-muted)", 
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid var(--glass-border)"
        }}
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

  const currentAgentName = capitalizeAgentName(selectedAgent);

  return (
    <div className="relative min-w-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="no-select flex items-center gap-2 px-3 py-1.5 text-[12px] rounded-xl transition-colors hover:opacity-80 min-w-0 max-w-full overflow-hidden"
        style={{ 
          color: "var(--foreground-muted)", 
          background: "var(--glass-bg)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid var(--glass-border)"
        }}
      >
        <span 
          className="truncate max-w-[120px]" 
          style={{ color: getAgentColor(selectedAgent || undefined, agents) }}
        >
          {currentAgentName}
        </span>
        <span style={{ color: "var(--foreground-muted)" }}>·</span>
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
          <div 
            className="no-select absolute bottom-full left-0 mb-2 w-72 rounded-xl shadow-xl z-50 overflow-hidden"
            style={{ 
              background: "var(--glass-bg-solid)", 
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid var(--glass-border)"
            }}
          >
            {agents.length > 0 && (
              <div className="p-2" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                <div className="text-xs px-2 py-1" style={{ color: "var(--foreground-muted)" }}>Agent</div>
                <div className="space-y-0.5">
                  {agents.map((agent) => (
                    <button
                      key={agent.name}
                      onClick={() => {
                        setSelectedAgent(agent.name);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-[14px] transition-colors ${
                        selectedAgent === agent.name
                          ? ""
                          : ""
                      }`}
                      style={selectedAgent === agent.name 
                        ? { backgroundColor: "var(--glass-blue-solid)", color: "white" } 
                        : { color: "var(--foreground)" }
                      }
                      onMouseEnter={(e) => {
                        if (selectedAgent !== agent.name) {
                          e.currentTarget.style.backgroundColor = "var(--glass-bg)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAgent !== agent.name) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <div 
                        className="font-medium"
                        style={{ color: selectedAgent === agent.name ? "white" : getAgentColor(agent.name, agents) }}
                      >
                        {capitalizeAgentName(agent.name)}
                      </div>
                      {agent.description && (
                        <div className="text-xs truncate" style={{ color: "var(--foreground-muted)" }}>
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
                <div className="text-xs px-2 py-1" style={{ color: "var(--foreground-muted)" }}>Model</div>
                {connectedProviders.map((provider) => (
                  <div key={provider.id} className="mb-2">
                    <div className="text-xs px-2 py-1 uppercase tracking-wider" style={{ color: "var(--foreground-muted)" }}>
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
                          className="w-full text-left px-2 py-1.5 rounded-lg text-[14px] transition-colors"
                          style={
                            selectedModel?.providerID === provider.id &&
                            selectedModel?.modelID === model.id
                              ? { backgroundColor: "var(--glass-blue-solid)", color: "white" }
                              : { color: "var(--foreground)" }
                          }
                          onMouseEnter={(e) => {
                            if (!(selectedModel?.providerID === provider.id && selectedModel?.modelID === model.id)) {
                              e.currentTarget.style.backgroundColor = "var(--glass-bg)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!(selectedModel?.providerID === provider.id && selectedModel?.modelID === model.id)) {
                              e.currentTarget.style.backgroundColor = "transparent";
                            }
                          }}
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
