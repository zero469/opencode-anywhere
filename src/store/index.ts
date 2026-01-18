import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConnectionConfig, ConnectionStatus, SessionMessage, PermissionRequest, SSEEvent, Session, MessageInfo, MessagePart, ProvidersResponse, Agent, ModelSelection } from "@/types";
import * as opencode from "@/lib/opencode";

interface AppState {
  config: ConnectionConfig | null;
  status: ConnectionStatus;
  sessions: Session[];
  currentSessionId: string | null;
  messages: SessionMessage[];
  pendingPermissions: PermissionRequest[];
  isLoading: boolean;
  isSending: boolean;
  
  providers: ProvidersResponse | null;
  agents: Agent[];
  selectedModel: ModelSelection | null;
  selectedAgent: string | null;

  setConfig: (config: ConnectionConfig) => Promise<void>;
  disconnect: () => void;
  refreshSessions: () => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  createSession: (title?: string) => Promise<void>;
  respondPermission: (permissionId: string, allow: boolean) => Promise<void>;
  abortSession: () => Promise<void>;
  handleSSEEvent: (event: SSEEvent) => void;
  
  fetchProvidersAndAgents: () => Promise<void>;
  setSelectedModel: (model: ModelSelection | null) => void;
  setSelectedAgent: (agent: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      config: null,
      status: { connected: false },
      sessions: [],
      currentSessionId: null,
      messages: [],
      pendingPermissions: [],
      isLoading: false,
      isSending: false,
      
      providers: null,
      agents: [],
      selectedModel: null,
      selectedAgent: null,

      setConfig: async (config) => {
        set({ isLoading: true });
        opencode.initClient(config);
        const status = await opencode.checkConnection();
        set({ config, status, isLoading: false });

        if (status.connected) {
          await get().refreshSessions();
          await get().fetchProvidersAndAgents();
        }
      },

      disconnect: () => {
        set({
          config: null,
          status: { connected: false },
          sessions: [],
          currentSessionId: null,
          messages: [],
          pendingPermissions: [],
          providers: null,
          agents: [],
          selectedModel: null,
          selectedAgent: null,
        });
      },

      refreshSessions: async () => {
        try {
          const sessions = await opencode.getSessions();
          const sortedSessions = [...sessions].sort((a, b) => {
            const timeA = a.time?.updated || a.time?.created || 0;
            const timeB = b.time?.updated || b.time?.created || 0;
            return timeB - timeA;
          });
          set({ sessions: sortedSessions });
        } catch (error) {
          console.error("Failed to fetch sessions:", error);
        }
      },

      selectSession: async (id) => {
        set({ currentSessionId: id, isLoading: true, messages: [] });
        try {
          const messages = await opencode.getSessionMessages(id);
          set({ messages, isLoading: false });
        } catch (error) {
          console.error("Failed to fetch messages:", error);
          set({ isLoading: false });
        }
      },

      sendMessage: async (text) => {
        const { currentSessionId, selectedModel, selectedAgent } = get();
        if (!currentSessionId || !text.trim()) return;

        set({ isSending: true });
        try {
          await opencode.sendMessageAsync(currentSessionId, text, {
            model: selectedModel || undefined,
            agent: selectedAgent || undefined,
          });
        } catch (error) {
          console.error("Failed to send message:", error);
        } finally {
          set({ isSending: false });
        }
      },

      createSession: async (title) => {
        try {
          const session = await opencode.createSession(title);
          if (session) {
            await get().refreshSessions();
            await get().selectSession(session.id);
          }
        } catch (error) {
          console.error("Failed to create session:", error);
        }
      },

      respondPermission: async (permissionId, allow) => {
        const { currentSessionId, pendingPermissions } = get();
        if (!currentSessionId) return;

        try {
          await opencode.respondToPermission(currentSessionId, permissionId, allow);
          set({
            pendingPermissions: pendingPermissions.filter((p) => p.id !== permissionId),
          });
        } catch (error) {
          console.error("Failed to respond to permission:", error);
        }
      },

      abortSession: async () => {
        const { currentSessionId } = get();
        if (!currentSessionId) return;

        try {
          await opencode.abortSession(currentSessionId);
        } catch (error) {
          console.error("Failed to abort session:", error);
        }
      },
      
      fetchProvidersAndAgents: async () => {
        const [providers, agents] = await Promise.all([
          opencode.getProviders(),
          opencode.getAgents(),
        ]);
        
        const visibleAgents = agents.filter(a => !a.hidden && a.mode === "primary");
        set({ providers, agents: visibleAgents });
        
        if (providers && !get().selectedModel) {
          const connectedProvider = providers.all.find(p => providers.connected.includes(p.id));
          if (connectedProvider) {
            const defaultModelId = providers.default[connectedProvider.id];
            const model = connectedProvider.models[defaultModelId];
            if (model) {
              set({
                selectedModel: {
                  providerID: connectedProvider.id,
                  modelID: model.id,
                },
              });
            }
          }
        }
        
        if (visibleAgents.length > 0 && !get().selectedAgent) {
          const buildAgent = visibleAgents.find(a => a.name === "build");
          set({ selectedAgent: buildAgent?.name || visibleAgents[0].name });
        }
      },
      
      setSelectedModel: (model) => set({ selectedModel: model }),
      setSelectedAgent: (agent) => set({ selectedAgent: agent }),

      handleSSEEvent: (event) => {
        const { currentSessionId, messages, pendingPermissions, sessions } = get();
        
        console.log("[SSE Event]", event.type, event.properties);

        switch (event.type) {
          case "message.created":
          case "message.updated": {
            const info = event.properties.info as MessageInfo | undefined;
            const sessionId = info?.sessionID;
            
            if (sessionId === currentSessionId && info) {
              const existingIndex = messages.findIndex((m) => m.info.id === info.id);
              if (existingIndex >= 0) {
                const newMessages = [...messages];
                const existingMsg = newMessages[existingIndex];
                newMessages[existingIndex] = {
                  info,
                  parts: existingMsg.parts,
                };
                set({ messages: newMessages });
              } else {
                set({ messages: [...messages, { info, parts: [] }] });
              }
            }
            break;
          }

          case "message.part.updated": {
            const part = event.properties.part as MessagePart | undefined;
            if (!part) break;
            
            const sessionId = part.sessionID;
            const messageId = part.messageID;
            
            if (sessionId === currentSessionId && part.id && messageId) {
              const newMessages = [...messages];
              const existingMsgIndex = newMessages.findIndex((m) => m.info.id === messageId);
              
              if (existingMsgIndex >= 0) {
                const msg = newMessages[existingMsgIndex];
                const partIndex = msg.parts.findIndex((p) => p.id === part.id);
                
                if (partIndex >= 0) {
                  const newParts = [...msg.parts];
                  newParts[partIndex] = part;
                  newMessages[existingMsgIndex] = { ...msg, parts: newParts };
                } else {
                  newMessages[existingMsgIndex] = { ...msg, parts: [...msg.parts, part] };
                }
              } else {
                newMessages.push({
                  info: {
                    id: messageId,
                    sessionID: sessionId,
                    role: "assistant",
                  },
                  parts: [part],
                });
              }
              set({ messages: newMessages });
            }
            break;
          }

          case "permission.asked": {
            const permission = event.properties as unknown as PermissionRequest;
            if (permission.sessionID === currentSessionId) {
              set({ pendingPermissions: [...pendingPermissions, permission] });
              
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("OpenCode Permission Request", {
                  body: `Tool: ${permission.toolName}`,
                  icon: "/icon.svg",
                });
              }
            }
            break;
          }

          case "session.updated": {
            const sessionData = event.properties.info as Session | undefined;
            if (sessionData?.id) {
              const newSessions = sessions.map((s) =>
                s.id === sessionData.id ? { ...s, ...sessionData } : s
              );
              set({ sessions: newSessions });
            }
            break;
          }

          case "session.created": {
            const sessionData = event.properties.info as Session | undefined;
            if (sessionData?.id && !sessions.find(s => s.id === sessionData.id)) {
              set({ sessions: [sessionData, ...sessions] });
            }
            break;
          }

          default:
            break;
        }
      },
    }),
    {
      name: "opencode-anywhere",
      partialize: (state) => ({ 
        config: state.config,
        selectedModel: state.selectedModel,
        selectedAgent: state.selectedAgent,
      }),
    }
  )
);
