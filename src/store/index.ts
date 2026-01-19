import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConnectionConfig, ConnectionStatus, SessionMessage, PermissionRequest, SSEEvent, Session, MessageInfo, MessagePart, ProvidersResponse, Agent, ModelSelection } from "@/types";
import * as opencode from "@/lib/opencode";
import { relay, Device, User, FrpcConfig } from "@/lib/relay";

const INITIAL_MESSAGE_LIMIT = undefined;

const messageCache = new Map<string, SessionMessage[]>();
const sessionLastUpdated = new Map<string, number>();
const sendingSessions = new Set<string>();
const sessionHasMoreMessages = new Map<string, boolean>();

interface AppState {
  config: ConnectionConfig | null;
  status: ConnectionStatus;
  sessions: Session[];
  currentSessionId: string | null;
  messages: SessionMessage[];
  pendingPermissions: PermissionRequest[];
  isLoading: boolean;
  sendingSessionId: string | null;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  
  providers: ProvidersResponse | null;
  agents: Agent[];
  selectedModel: ModelSelection | null;
  selectedAgent: string | null;

  relayToken: string | null;
  user: User | null;
  devices: Device[];
  selectedDevice: Device | null;
  authError: string | null;

  setConfig: (config: ConnectionConfig) => Promise<void>;
  disconnect: () => void;
  refreshSessions: () => Promise<void>;
  preloadRecentSessions: (sessions: Session[]) => void;
  selectSession: (id: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  clearCurrentSession: () => void;
  sendMessage: (text: string) => Promise<void>;
  createSession: (title?: string) => Promise<void>;
  respondPermission: (permissionId: string, allow: boolean) => Promise<void>;
  abortSession: () => Promise<void>;
  handleSSEEvent: (event: SSEEvent) => void;
  
  fetchProvidersAndAgents: () => Promise<void>;
  setSelectedModel: (model: ModelSelection | null) => void;
  setSelectedAgent: (agent: string | null) => void;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchDevices: () => Promise<void>;
  selectDevice: (device: Device) => Promise<void>;
  deleteDevice: (deviceId: number) => Promise<void>;
  deselectDevice: () => void;
  clearAuthError: () => void;
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
      sendingSessionId: null,
      hasMoreMessages: false,
      isLoadingMore: false,
      
      providers: null,
      agents: [],
      selectedModel: null,
      selectedAgent: null,

      // New state initial values
      relayToken: null,
      user: null,
      devices: [],
      selectedDevice: null,
      authError: null,

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
      
      // New actions implementation
      login: async (email, password) => {
        set({ isLoading: true, authError: null });
        try {
          const { token, user } = await relay.login(email, password);
          set({ relayToken: token, user, isLoading: false });
          await get().fetchDevices();
        } catch (error: any) {
          set({ isLoading: false, authError: error.message });
          console.error("Login failed:", error);
        }
      },

      register: async (email, password) => {
        set({ isLoading: true, authError: null });
        try {
          await relay.register(email, password);
          // Auto-login after successful registration
          await get().login(email, password);
        } catch (error: any) {
          set({ isLoading: false, authError: error.message });
          console.error("Registration failed:", error);
        }
      },

      logout: () => {
        set({
          relayToken: null,
          user: null,
          devices: [],
          selectedDevice: null,
          config: null,
          status: { connected: false },
          sessions: [],
          currentSessionId: null,
          messages: [],
          authError: null,
        });
      },

      fetchDevices: async () => {
        const { relayToken } = get();
        if (!relayToken) return;
        set({ isLoading: true });
        try {
          const devices = await relay.getDevices(relayToken);
          set({ devices, isLoading: false });
        } catch (error: any) {
          console.error("Failed to fetch devices:", error);
          // If token is invalid, log out
          if (error.message.toLowerCase().includes('unauthorized')) {
             get().logout();
          }
          set({ isLoading: false });
        }
      },

      selectDevice: async (device) => {
        const { relayToken } = get();
        if (!relayToken) return;
        
        set({ selectedDevice: device, isLoading: true });
        try {
          const frpcConfig = await relay.getFrpcConfig(relayToken, device.id);
          const config: ConnectionConfig = {
            baseUrl: `https://${frpcConfig.subdomain}.${frpcConfig.domain}`,
            username: frpcConfig.auth_user,
            password: frpcConfig.auth_password,
          };
          await get().setConfig(config);
        } catch (error) {
          console.error("Failed to get frpc config:", error);
          set({ isLoading: false });
        }
      },

      deselectDevice: () => {
        set({ 
          selectedDevice: null, 
          config: null,
          status: { connected: false },
          sessions: [],
          currentSessionId: null,
          messages: [],
        });
      },

      deleteDevice: async (deviceId) => {
        const { relayToken, devices, selectedDevice } = get();
        if (!relayToken) return;
        
        try {
          await relay.deleteDevice(relayToken, deviceId);
          set({ devices: devices.filter(d => d.id !== deviceId) });
          
          if (selectedDevice?.id === deviceId) {
            get().deselectDevice();
          }
        } catch (error) {
          console.error("Failed to delete device:", error);
          throw error;
        }
      },
      
      clearAuthError: () => set({ authError: null }),

      refreshSessions: async () => {
        try {
          const sessions = await opencode.getSessions();
          const sortedSessions = [...sessions].sort((a, b) => {
            const timeA = a.time?.updated || a.time?.created || 0;
            const timeB = b.time?.updated || b.time?.created || 0;
            return timeB - timeA;
          });
          set({ sessions: sortedSessions });
          
          get().preloadRecentSessions(sortedSessions.slice(0, 5));
        } catch (error) {
          console.error("Failed to fetch sessions:", error);
        }
      },

      preloadRecentSessions: (sessions) => {
        sessions.forEach((session) => {
          if (!messageCache.has(session.id)) {
            opencode.getSessionMessages(session.id, { limit: INITIAL_MESSAGE_LIMIT })
              .then(({ messages, hasMore }) => {
                messageCache.set(session.id, messages);
                sessionHasMoreMessages.set(session.id, hasMore);
              })
              .catch(() => {});
          }
        });
      },

      selectSession: async (id) => {
        if (get().isLoading && get().currentSessionId === id) {
          return;
        }
        
        const session = get().sessions.find(s => s.id === id);
        if (session?.time?.updated) {
          sessionLastUpdated.set(id, session.time.updated);
        }
        
        const cached = messageCache.get(id);
        if (cached) {
          const hasMore = sessionHasMoreMessages.get(id) || false;
          set({ currentSessionId: id, messages: cached, isLoading: false, hasMoreMessages: hasMore });
          return;
        }
        
        set({ currentSessionId: id, isLoading: true, hasMoreMessages: false });
        try {
          const { messages, hasMore } = await opencode.getSessionMessages(id, { limit: INITIAL_MESSAGE_LIMIT });
          messageCache.set(id, messages);
          sessionHasMoreMessages.set(id, hasMore);
          if (get().currentSessionId === id) {
            set({ messages, isLoading: false, hasMoreMessages: hasMore });
          }
        } catch (error) {
          console.error("Failed to fetch messages:", error);
          if (get().currentSessionId === id) {
            set({ isLoading: false });
          }
        }
      },

      clearCurrentSession: () => {
        set({ currentSessionId: null, messages: [], hasMoreMessages: false });
      },

      loadMoreMessages: async () => {
        const { currentSessionId, isLoadingMore, hasMoreMessages } = get();
        if (!currentSessionId || isLoadingMore || !hasMoreMessages) return;
        
        set({ isLoadingMore: true });
        try {
          const { messages: allMessages } = await opencode.getSessionMessages(currentSessionId);
          
          if (get().currentSessionId === currentSessionId) {
            messageCache.set(currentSessionId, allMessages);
            sessionHasMoreMessages.set(currentSessionId, false);
            set({ messages: allMessages, hasMoreMessages: false, isLoadingMore: false });
          }
        } catch (error) {
          console.error("Failed to load more messages:", error);
          set({ isLoadingMore: false });
        }
      },

      sendMessage: async (text) => {
        const { currentSessionId, selectedModel, selectedAgent, messages } = get();
        if (!currentSessionId || !text.trim()) return;

        const userMessage: SessionMessage = {
          info: {
            id: `temp_${Date.now()}`,
            sessionID: currentSessionId,
            role: "user",
            time: { created: Date.now() },
          },
          parts: [{ type: "text", text, id: `prt_temp_${Date.now()}` }],
        };
        sendingSessions.add(currentSessionId);
        set({ messages: [...messages, userMessage], sendingSessionId: currentSessionId });

        const sessionId = currentSessionId;
        try {
          await opencode.sendMessageAsync(sessionId, text, {
            model: selectedModel || undefined,
            agent: selectedAgent || undefined,
          });
          
          const pollForResponse = async (attempts = 0) => {
            if (attempts > 60 || !sendingSessions.has(sessionId)) return;
            
            try {
              const { messages: newMessages } = await opencode.getSessionMessages(sessionId);
              messageCache.set(sessionId, newMessages);
              sessionHasMoreMessages.set(sessionId, false);
              if (get().currentSessionId === sessionId) {
                set({ messages: newMessages, hasMoreMessages: false });
              }
              
              const lastMsg = newMessages[newMessages.length - 1];
              const isAssistantDone = lastMsg?.info.role === "assistant" && lastMsg?.info.finish;
              
              if (!isAssistantDone) {
                setTimeout(() => pollForResponse(attempts + 1), 1000);
              } else {
                sendingSessions.delete(sessionId);
                if (get().sendingSessionId === sessionId) {
                  set({ sendingSessionId: null });
                }
              }
            } catch (e) {
              console.error("[Poll] Error:", e);
              setTimeout(() => pollForResponse(attempts + 1), 2000);
            }
          };
          
          pollForResponse();
        } catch (error) {
          console.error("Failed to send message:", error);
          sendingSessions.delete(sessionId);
          if (get().sendingSessionId === sessionId) {
            set({ sendingSessionId: null });
          }
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
        const { currentSessionId, messages, pendingPermissions, sessions, isLoading, sendingSessionId } = get();

        switch (event.type) {
          case "session.updated": {
            const sessionData = event.properties.info as Session | undefined;
            if (sessionData?.id) {
              const newSessions = sessions.map((s) =>
                s.id === sessionData.id ? { ...s, ...sessionData } : s
              );
              set({ sessions: newSessions });
            } else {
              get().refreshSessions().then(() => {
                const updatedSessions = get().sessions;
                const currentSession = updatedSessions.find(s => s.id === currentSessionId);
                const isCurrentSessionSending = sendingSessionId === currentSessionId;
                if (currentSession && currentSessionId && !isLoading && !isCurrentSessionSending) {
                  const lastUpdated = sessionLastUpdated.get(currentSessionId) || 0;
                  const newUpdated = currentSession.time?.updated || 0;
                  
                  if (newUpdated > lastUpdated) {
                    sessionLastUpdated.set(currentSessionId, newUpdated);
                    opencode.getSessionMessages(currentSessionId).then(({ messages: newMessages }) => {
                      if (get().currentSessionId === currentSessionId) {
                        set({ messages: newMessages, hasMoreMessages: false });
                        messageCache.set(currentSessionId, newMessages);
                        sessionHasMoreMessages.set(currentSessionId, false);
                      }
                    }).catch(console.error);
                  }
                }
              });
            }
            break;
          }

          case "message.created":
          case "message.updated": {
            const info = event.properties.info as MessageInfo | undefined;
            const sessionId = info?.sessionID;
            
            if (sessionId === currentSessionId && info) {
              const existingIndex = messages.findIndex((m) => m.info.id === info.id);
              let newMessages: SessionMessage[];
              if (existingIndex >= 0) {
                newMessages = [...messages];
                const existingMsg = newMessages[existingIndex];
                newMessages[existingIndex] = {
                  info,
                  parts: existingMsg.parts,
                };
              } else {
                newMessages = [...messages, { info, parts: [] }];
              }
              set({ messages: newMessages });
              messageCache.set(currentSessionId, newMessages);
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
              messageCache.set(currentSessionId, newMessages);
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
      name: "opencode-anywhere-v4",
      partialize: (state) => ({ 
        relayToken: state.relayToken,
        user: state.user,
        devices: state.devices,
        selectedDevice: state.selectedDevice,
        selectedModel: state.selectedModel,
        selectedAgent: state.selectedAgent,
      }),
    }
  )
);
