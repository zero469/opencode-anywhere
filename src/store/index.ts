import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConnectionConfig, ConnectionStatus, SessionMessage, PermissionRequest, SSEEvent, Session, MessageInfo, MessagePart, ProvidersResponse, Agent, ModelSelection, TodoItem, QuestionRequest } from "@/types";
import * as opencode from "@/lib/opencode";
import { relay, Device, User, FrpcConfig } from "@/lib/relay";
import { notifyReadyForInput, notifyPermissionRequest, notifyQuestion } from "@/lib/notifications";

const MESSAGE_PAGE_SIZE = 30;

const messageCache = new Map<string, SessionMessage[]>();
const sessionLastUpdated = new Map<string, number>();
const sendingSessions = new Set<string>();
const sessionHasMoreMessages = new Map<string, boolean>();
const sessionLoadedCount = new Map<string, number>();
const notificationDebounceTimers = new Map<string, NodeJS.Timeout>();

let currentDeviceId: number | null = null;

function getCacheKey(sessionId: string): string {
  return currentDeviceId ? `${currentDeviceId}:${sessionId}` : sessionId;
}

const NOTIFICATION_DEBOUNCE_MS = 2500;

function hasRunningToolInvocations(messages: SessionMessage[]): boolean {
  for (const msg of messages) {
    for (const part of msg.parts) {
      const isToolInvocation = part.type === "tool-invocation";
      const isActive = part.state?.status === "running" || part.state?.status === "pending";
      if (isToolInvocation && isActive) {
        return true;
      }
    }
  }
  return false;
}

function scheduleNotification(sessionId: string, sessionTitle?: string) {
  const existingTimer = notificationDebounceTimers.get(sessionId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }
  
  const timer = setTimeout(() => {
    notificationDebounceTimers.delete(sessionId);
    notifyReadyForInput(sessionTitle);
  }, NOTIFICATION_DEBOUNCE_MS);
  
  notificationDebounceTimers.set(sessionId, timer);
}

type ConnectionStep = "idle" | "connecting" | "authenticating" | "loading_sessions" | "ready";
type SessionLoadingStep = "idle" | "loading_messages" | "loading_todos" | "ready";

interface AppState {
  config: ConnectionConfig | null;
  status: ConnectionStatus;
  connectionStep: ConnectionStep;
  sessionLoadingStep: SessionLoadingStep;
  sessions: Session[];
  currentSessionId: string | null;
  messages: SessionMessage[];
  pendingPermissions: PermissionRequest[];
  pendingQuestions: QuestionRequest[];
  isLoading: boolean;
  sendingSessionId: string | null;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  
  providers: ProvidersResponse | null;
  agents: Agent[];
  selectedModel: ModelSelection | null;
  selectedAgent: string | null;
  todos: TodoItem[];

  relayToken: string | null;
  user: User | null;
  devices: Device[];
  selectedDevice: Device | null;
  authError: string | null;
  pinnedSessionIds: string[];
  cachedSessionsByDevice: Record<number, { sessions: Session[]; pinnedIds: string[] }>;

  setConfig: (config: ConnectionConfig) => Promise<void>;
  disconnect: () => void;
  refreshSessions: () => Promise<void>;
  preloadRecentSessions: (sessions: Session[]) => void;
  selectSession: (id: string) => Promise<void>;
  refreshCurrentSession: () => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  clearCurrentSession: () => void;
  sendMessage: (text: string) => Promise<void>;
  createSession: (title?: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  renameSession: (sessionId: string, title: string) => Promise<boolean>;
  togglePinSession: (sessionId: string) => void;
  respondPermission: (permissionId: string, allow: boolean) => Promise<void>;
  replyToQuestion: (requestId: string, answers: string[][]) => Promise<void>;
  rejectQuestion: (requestId: string) => Promise<void>;
  abortSession: () => Promise<void>;
  handleSSEEvent: (event: SSEEvent) => void;
  
  fetchProvidersAndAgents: () => Promise<void>;
  setSelectedModel: (model: ModelSelection | null) => void;
  setSelectedAgent: (agent: string | null) => void;
  fetchTodos: (sessionId?: string) => Promise<void>;

  sendVerification: (email: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, code: string) => Promise<void>;
  logout: () => void;
  fetchDevices: () => Promise<void>;
  selectDevice: (device: Device) => Promise<void>;
  deleteDevice: (deviceId: number) => Promise<void>;
  deselectDevice: () => void;
  clearAuthError: () => void;
  checkDeviceAndReconnect: () => Promise<void>;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      config: null,
      status: { connected: false },
      connectionStep: "idle",
      sessionLoadingStep: "idle",
      sessions: [],
      currentSessionId: null,
      messages: [],
      pendingPermissions: [],
      pendingQuestions: [],
      isLoading: false,
      sendingSessionId: null,
      hasMoreMessages: false,
      isLoadingMore: false,
      
      providers: null,
      agents: [],
      selectedModel: null,
      selectedAgent: null,
      todos: [],

      relayToken: null,
      user: null,
      devices: [],
      selectedDevice: null,
      authError: null,
      pinnedSessionIds: [],
      cachedSessionsByDevice: {},

      setConfig: async (config) => {
        set({ isLoading: true, connectionStep: "connecting" });
        opencode.initClient(config);
        
        set({ connectionStep: "authenticating" });
        const status = await opencode.checkConnection();
        set({ config, status });

        if (status.connected) {
          set({ connectionStep: "loading_sessions" });
          await get().refreshSessions();
          await get().fetchProvidersAndAgents();
          set({ connectionStep: "ready", isLoading: false });
        } else {
          set({ connectionStep: "idle", isLoading: false });
        }
      },

      disconnect: () => {
        set({
          config: null,
          status: { connected: false },
          connectionStep: "idle",
          sessions: [],
          currentSessionId: null,
          messages: [],
          pendingPermissions: [],
          providers: null,
          agents: [],
          selectedModel: null,
          selectedAgent: null,
          todos: [],
        });
      },
      
      sendVerification: async (email) => {
        set({ isLoading: true, authError: null });
        try {
          await relay.sendVerification(email);
          set({ isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, authError: error.message });
          throw error;
        }
      },

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

      register: async (email, password, code) => {
        set({ isLoading: true, authError: null });
        try {
          await relay.register(email, password, code);
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
        console.log("[fetchDevices] token:", relayToken ? "present" : "missing");
        if (!relayToken) return;
        set({ isLoading: true });
        try {
          const devices = await relay.getDevices(relayToken);
          console.log("[fetchDevices] success, devices:", devices.length);
          set({ devices, isLoading: false });
        } catch (error: any) {
          console.error("[fetchDevices] error:", error, "message:", error?.message, "stack:", error?.stack);
          if (error?.message?.toLowerCase?.()?.includes('unauthorized')) {
             get().logout();
          }
          set({ isLoading: false });
        }
      },

      selectDevice: async (device) => {
        const { relayToken, selectedDevice: currentDevice, cachedSessionsByDevice } = get();
        if (!relayToken) return;
        
        if (currentDevice?.id === device.id) {
          return;
        }
        
        currentDeviceId = device.id;
        
        opencode.initClient({ baseUrl: '', username: '', password: '' });
        
        const cached = cachedSessionsByDevice[device.id];
        const cachedSessions = cached?.sessions || [];
        const cachedPinnedIds = cached?.pinnedIds || [];
        
        set({ 
          selectedDevice: device, 
          isLoading: true,
          sessions: cachedSessions,
          pinnedSessionIds: cachedPinnedIds,
          currentSessionId: null,
          messages: [],
          todos: [],
          connectionStep: "connecting",
        });
        
        try {
          set({ connectionStep: "authenticating" });
          const frpcConfig = await relay.getFrpcConfig(relayToken, device.id);
          const newConfig: ConnectionConfig = {
            baseUrl: `https://opencode-relay.azurewebsites.net/proxy/${frpcConfig.subdomain}`,
            username: frpcConfig.auth_user,
            password: frpcConfig.auth_password,
          };
          await get().setConfig(newConfig);
          
          const { sessions, pinnedSessionIds: currentPinnedIds, selectedDevice: currentSelectedDevice } = get();
          if (currentSelectedDevice?.id === device.id && sessions.length > 0) {
            set({ 
              cachedSessionsByDevice: {
                ...get().cachedSessionsByDevice,
                [device.id]: { sessions, pinnedIds: currentPinnedIds }
              }
            });
          }
        } catch (error) {
          console.error("Failed to get frpc config:", error);
          set({ isLoading: false, connectionStep: "idle" });
        }
      },

      deselectDevice: () => {
        set({ 
          selectedDevice: null, 
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

      checkDeviceAndReconnect: async () => {
        const { relayToken, selectedDevice } = get();
        if (!relayToken || !selectedDevice) return;
        
        set({ connectionStep: "connecting" });
        
        try {
          const devices = await relay.getDevices(relayToken);
          set({ devices });
          
          const updatedDevice = devices.find(d => d.id === selectedDevice.id);
          if (!updatedDevice) {
            set({ connectionStep: "idle", selectedDevice: null });
            return;
          }
          
          set({ selectedDevice: updatedDevice });
          
          if (updatedDevice.online) {
            set({ connectionStep: "authenticating" });
            const frpcConfig = await relay.getFrpcConfig(relayToken, updatedDevice.id);
            const newConfig: ConnectionConfig = {
              baseUrl: `https://opencode-relay.azurewebsites.net/proxy/${frpcConfig.subdomain}`,
              username: frpcConfig.auth_user,
              password: frpcConfig.auth_password,
            };
            await get().setConfig(newConfig);
          } else {
            set({ connectionStep: "idle" });
          }
        } catch (error) {
          console.error("Failed to check device status:", error);
          set({ connectionStep: "idle" });
        }
      },

      refreshSessions: async () => {
        const deviceIdAtStart = currentDeviceId;
        
        const config = opencode.getConfig();
        if (!config?.baseUrl) {
          return;
        }
        
        try {
          const sessions = await opencode.getSessions();
          
          if (currentDeviceId !== deviceIdAtStart) {
            return;
          }
          
          const sortedSessions = [...sessions].sort((a, b) => {
            const timeA = a.time?.updated || a.time?.created || 0;
            const timeB = b.time?.updated || b.time?.created || 0;
            return timeB - timeA;
          });
          set({ sessions: sortedSessions });
          
          get().preloadRecentSessions(sortedSessions.slice(0, 5));
        } catch (error) {
          console.error("Failed to fetch sessions:", error);
          if (currentDeviceId !== deviceIdAtStart) {
            return;
          }
          const { selectedDevice, devices } = get();
          if (selectedDevice) {
            const updatedDevices = devices.map(d => 
              d.id === selectedDevice.id ? { ...d, online: false } : d
            );
            set({ 
              connectionStep: "idle",
              selectedDevice: { ...selectedDevice, online: false },
              devices: updatedDevices,
            });
          } else {
            set({ connectionStep: "idle" });
          }
        }
      },

      preloadRecentSessions: (sessions) => {
        const deviceIdAtStart = currentDeviceId;
        const loadSequentially = async () => {
          for (const session of sessions) {
            if (currentDeviceId !== deviceIdAtStart) return;
            
            const cacheKey = getCacheKey(session.id);
            if (!messageCache.has(cacheKey)) {
              try {
                const { messages, hasMore } = await opencode.getSessionMessages(session.id, { 
                  limit: MESSAGE_PAGE_SIZE
                });
                
                if (currentDeviceId !== deviceIdAtStart) return;
                
                messageCache.set(cacheKey, messages);
                sessionHasMoreMessages.set(cacheKey, hasMore);
                sessionLoadedCount.set(cacheKey, messages.length);
              } catch {}
            }
          }
        };
        loadSequentially();
      },

      selectSession: async (id) => {
        if (get().currentSessionId === id) {
          return;
        }
        
        const cacheKey = getCacheKey(id);
        const session = get().sessions.find(s => s.id === id);
        const sessionUpdatedTime = session?.time?.updated || 0;
        const cacheUpdatedTime = sessionLastUpdated.get(cacheKey) || 0;
        
        const cached = messageCache.get(cacheKey);
        const shouldUseCache = cached && cacheUpdatedTime >= sessionUpdatedTime;
        
        if (shouldUseCache) {
          const hasMore = sessionHasMoreMessages.get(cacheKey) || false;
          set({ currentSessionId: id, messages: cached, isLoading: false, hasMoreMessages: hasMore, sessionLoadingStep: "ready" });
          get().fetchTodos(id);
          return;
        }
        
        const previousCached = cached ? [...cached] : [];
        const previousHasMore = sessionHasMoreMessages.get(cacheKey) || false;
        
        set({ currentSessionId: id, messages: previousCached, isLoading: true, hasMoreMessages: previousHasMore, sessionLoadingStep: "loading_messages" });
        try {
          const { messages, hasMore } = await opencode.getSessionMessages(id, { 
            limit: MESSAGE_PAGE_SIZE
          });
          
          messageCache.set(cacheKey, messages);
          sessionHasMoreMessages.set(cacheKey, hasMore);
          sessionLoadedCount.set(cacheKey, messages.length);
          sessionLastUpdated.set(cacheKey, sessionUpdatedTime);
          
          if (get().currentSessionId === id) {
            set({ messages, isLoading: false, hasMoreMessages: hasMore, sessionLoadingStep: "loading_todos" });
            await get().fetchTodos(id);
            if (get().currentSessionId === id) {
              set({ sessionLoadingStep: "ready" });
            }
          }
        } catch (error) {
          console.error("Failed to fetch messages:", error);
          if (get().currentSessionId === id) {
            const { selectedDevice, devices } = get();
            if (selectedDevice) {
              const updatedDevices = devices.map(d => 
                d.id === selectedDevice.id ? { ...d, online: false } : d
              );
              set({ 
                isLoading: false, 
                sessionLoadingStep: "idle", 
                connectionStep: "idle",
                selectedDevice: { ...selectedDevice, online: false },
                devices: updatedDevices,
              });
            } else {
              set({ isLoading: false, sessionLoadingStep: "idle", connectionStep: "idle" });
            }
          }
        }
      },

      clearCurrentSession: () => {
        set({ currentSessionId: null, messages: [], hasMoreMessages: false, todos: [], sessionLoadingStep: "idle", isLoading: false });
      },

      loadMoreMessages: async () => {
        const { currentSessionId, isLoadingMore, hasMoreMessages, messages } = get();
        if (!currentSessionId || isLoadingMore || !hasMoreMessages) return;
        
        const cacheKey = getCacheKey(currentSessionId);
        const currentOffset = sessionLoadedCount.get(cacheKey) || messages.length;
        
        set({ isLoadingMore: true });
        try {
          const { messages: olderMessages, hasMore } = await opencode.getSessionMessages(currentSessionId, {
            limit: MESSAGE_PAGE_SIZE,
            offset: currentOffset
          });
          
          if (get().currentSessionId !== currentSessionId) return;
          
          const messageMap = new Map(messages.map(m => [m.info.id, m]));
          for (const msg of olderMessages) {
            if (!messageMap.has(msg.info.id)) {
              messageMap.set(msg.info.id, msg);
            }
          }
          
          const newMessages = Array.from(messageMap.values()).sort((a, b) => {
            const timeA = a.info.time?.created || 0;
            const timeB = b.info.time?.created || 0;
            return timeA - timeB;
          });
          
          messageCache.set(cacheKey, newMessages);
          sessionHasMoreMessages.set(cacheKey, hasMore);
          sessionLoadedCount.set(cacheKey, currentOffset + olderMessages.length);
          
          set({ messages: newMessages, hasMoreMessages: hasMore, isLoadingMore: false });
        } catch (error) {
          console.error("Failed to load more messages:", error);
          set({ isLoadingMore: false });
        }
      },

      refreshCurrentSession: async () => {
        const { currentSessionId, messages: currentMessages } = get();
        if (!currentSessionId) return;
        
        const sessionIdAtStart = currentSessionId;
        const deviceIdAtStart = currentDeviceId;
        const cacheKey = getCacheKey(sessionIdAtStart);
        
        try {
          const { messages: latestMessages } = await opencode.getSessionMessages(sessionIdAtStart, {
            limit: MESSAGE_PAGE_SIZE
          });
          
          if (get().currentSessionId !== sessionIdAtStart || currentDeviceId !== deviceIdAtStart) {
            return;
          }
          
          const existingNonTemp = currentMessages.filter(m => !m.info.id.startsWith('temp_'));
          const messageMap = new Map(existingNonTemp.map(m => [m.info.id, m]));
          for (const msg of latestMessages) {
            messageMap.set(msg.info.id, msg);
          }
          
          const mergedMessages = Array.from(messageMap.values()).sort((a, b) => {
            const timeA = a.info.time?.created || 0;
            const timeB = b.info.time?.created || 0;
            return timeA - timeB;
          });
          
          messageCache.set(cacheKey, mergedMessages);
          set({ messages: mergedMessages });
          
          const lastMsg = mergedMessages[mergedMessages.length - 1];
          const isAssistantDone = lastMsg?.info.role === "assistant" && lastMsg?.info.finish;
          
          if (isAssistantDone) {
            sendingSessions.delete(sessionIdAtStart);
            if (get().sendingSessionId === sessionIdAtStart) {
              set({ sendingSessionId: null });
            }
          }
        } catch (error) {
          console.error("[refreshCurrentSession] Failed:", error);
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
        const deviceIdAtStart = currentDeviceId;
        const cacheKey = getCacheKey(sessionId);
        try {
          await opencode.sendMessageAsync(sessionId, text, {
            model: selectedModel || undefined,
            agent: selectedAgent || undefined,
          });
          
          const pollForResponse = async (attempts = 0) => {
            if (attempts > 60 || !sendingSessions.has(sessionId) || currentDeviceId !== deviceIdAtStart) {
              sendingSessions.delete(sessionId);
              if (get().sendingSessionId === sessionId) {
                set({ sendingSessionId: null });
              }
              return;
            }
            
            try {
              const currentMessages = get().messages;
              
              const { messages: latestMessages } = await opencode.getSessionMessages(sessionId, {
                limit: MESSAGE_PAGE_SIZE
              });
              
              const existingNonTemp = currentMessages.filter(m => !m.info.id.startsWith('temp_'));
              
              const messageMap = new Map(existingNonTemp.map(m => [m.info.id, m]));
              for (const msg of latestMessages) {
                messageMap.set(msg.info.id, msg);
              }
              
              const mergedMessages = Array.from(messageMap.values()).sort((a, b) => {
                const timeA = a.info.time?.created || 0;
                const timeB = b.info.time?.created || 0;
                return timeA - timeB;
              });
              
              messageCache.set(cacheKey, mergedMessages);
              if (get().currentSessionId === sessionId && currentDeviceId === deviceIdAtStart) {
                set({ messages: mergedMessages });
                if (attempts % 5 === 0) {
                  get().fetchTodos(sessionId);
                }
              }
              
              const lastMsg = mergedMessages[mergedMessages.length - 1];
              const isAssistantDone = lastMsg?.info.role === "assistant" && lastMsg?.info.finish;
              const hasActiveTools = hasRunningToolInvocations(mergedMessages);
              
              if (!isAssistantDone || hasActiveTools) {
                setTimeout(() => pollForResponse(attempts + 1), 1000);
              } else {
                sendingSessions.delete(sessionId);
                if (get().sendingSessionId === sessionId) {
                  set({ sendingSessionId: null });
                }
                const session = get().sessions.find(s => s.id === sessionId);
                scheduleNotification(sessionId, session?.title);
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

      deleteSession: async (sessionId) => {
        try {
          const success = await opencode.deleteSession(sessionId);
          if (success) {
            const { sessions, currentSessionId } = get();
            const newSessions = sessions.filter(s => s.id !== sessionId);
            set({ sessions: newSessions });
            
            const cacheKey = getCacheKey(sessionId);
            messageCache.delete(cacheKey);
            sessionLastUpdated.delete(cacheKey);
            sessionHasMoreMessages.delete(cacheKey);
            sessionLoadedCount.delete(cacheKey);
            
            if (currentSessionId === sessionId) {
              set({ currentSessionId: null, messages: [], hasMoreMessages: false });
            }
          }
          return success;
        } catch (error) {
          console.error("Failed to delete session:", error);
          return false;
        }
      },

      renameSession: async (sessionId, title) => {
        try {
          const updated = await opencode.renameSession(sessionId, title);
          if (updated) {
            const { sessions } = get();
            const newSessions = sessions.map(s => 
              s.id === sessionId ? { ...s, title } : s
            );
            set({ sessions: newSessions });
            return true;
          }
          return false;
        } catch (error) {
          console.error("Failed to rename session:", error);
          return false;
        }
      },

      togglePinSession: (sessionId) => {
        const { pinnedSessionIds, selectedDevice, sessions, cachedSessionsByDevice } = get();
        const isPinned = pinnedSessionIds.includes(sessionId);
        const newPinnedIds = isPinned 
          ? pinnedSessionIds.filter(id => id !== sessionId)
          : [...pinnedSessionIds, sessionId];
        
        set({ pinnedSessionIds: newPinnedIds });
        
        if (selectedDevice && sessions.length > 0) {
          set({
            cachedSessionsByDevice: {
              ...cachedSessionsByDevice,
              [selectedDevice.id]: { sessions, pinnedIds: newPinnedIds }
            }
          });
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

      replyToQuestion: async (requestId, answers) => {
        const { pendingQuestions } = get();

        console.log("[Question] Replying to question:", requestId, "with answers:", JSON.stringify(answers));
        try {
          const success = await opencode.replyToQuestion(requestId, answers);
          console.log("[Question] Reply result:", success);
          set({
            pendingQuestions: pendingQuestions.filter((q) => q.id !== requestId),
          });
        } catch (error) {
          console.error("[Question] Failed to reply to question:", error);
        }
      },

      rejectQuestion: async (requestId) => {
        const { pendingQuestions } = get();

        console.log("[Question] Rejecting question:", requestId);
        try {
          const success = await opencode.rejectQuestion(requestId);
          console.log("[Question] Reject result:", success);
          set({
            pendingQuestions: pendingQuestions.filter((q) => q.id !== requestId),
          });
        } catch (error) {
          console.error("[Question] Failed to reject question:", error);
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
        
        const hasValidProviders = providers && Array.isArray(providers.all) && Array.isArray(providers.connected);
        if (hasValidProviders && !get().selectedModel) {
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
      
      fetchTodos: async (sessionId) => {
        const id = sessionId || get().currentSessionId;
        if (!id) return;
        
        try {
          const todos = await opencode.getSessionTodos(id);
          if (get().currentSessionId === id) {
            set({ todos });
          }
        } catch (error) {
          console.error("Failed to fetch todos:", error);
        }
      },

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
                const state = get();
                const sessionId = state.currentSessionId;
                if (!sessionId || state.isLoading) return;
                
                const currentSession = state.sessions.find(s => s.id === sessionId);
                if (!currentSession) return;
                
                const cacheKey = getCacheKey(sessionId);
                const lastUpdated = sessionLastUpdated.get(cacheKey) || 0;
                const newUpdated = currentSession.time?.updated || 0;
                
                if (newUpdated > lastUpdated) {
                  sessionLastUpdated.set(cacheKey, newUpdated);
                  
                  opencode.getSessionMessages(sessionId, { limit: MESSAGE_PAGE_SIZE }).then(({ messages: latestMessages }) => {
                    if (get().currentSessionId !== sessionId) return;
                    
                    const currentMessages = get().messages;
                    const existingNonTemp = currentMessages.filter(m => !m.info.id.startsWith('temp_'));
                    
                    const messageMap = new Map(existingNonTemp.map(m => [m.info.id, m]));
                    for (const msg of latestMessages) {
                      messageMap.set(msg.info.id, msg);
                    }
                    
                    const mergedMessages = Array.from(messageMap.values()).sort((a, b) => {
                      const timeA = a.info.time?.created || 0;
                      const timeB = b.info.time?.created || 0;
                      return timeA - timeB;
                    });
                    
                    set({ messages: mergedMessages });
                    messageCache.set(cacheKey, mergedMessages);
                    
                    const lastMsg = mergedMessages[mergedMessages.length - 1];
                    const isAssistantDone = lastMsg?.info.role === "assistant" && lastMsg?.info.finish;
                    if (isAssistantDone && sendingSessions.has(sessionId)) {
                      sendingSessions.delete(sessionId);
                      if (get().sendingSessionId === sessionId) {
                        set({ sendingSessionId: null });
                      }
                    }
                  }).catch(console.error);
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
              messageCache.set(getCacheKey(currentSessionId), newMessages);
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
              messageCache.set(getCacheKey(currentSessionId), newMessages);
            }
            break;
          }

          case "permission.asked": {
            const permission = event.properties as unknown as PermissionRequest;
            console.log("[SSE] permission.asked received:", JSON.stringify(permission));
            const { pendingPermissions } = get();
            if (!pendingPermissions.find(p => p.id === permission.id)) {
              console.log("[SSE] Adding new permission to pendingPermissions:", permission.id);
              set({ pendingPermissions: [...pendingPermissions, permission] });
              const session = sessions.find(s => s.id === permission.sessionID);
              notifyPermissionRequest(permission.permission, session?.title);
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

          case "todo.updated": {
            const todoSessionId = event.properties.sessionID as string | undefined;
            if (todoSessionId === currentSessionId) {
              get().fetchTodos(todoSessionId);
            }
            break;
          }

          case "question.asked": {
            const question = event.properties as unknown as QuestionRequest;
            console.log("[SSE] question.asked received:", JSON.stringify(question));
            if (question.id && question.questions) {
              const { pendingQuestions } = get();
              if (!pendingQuestions.find(q => q.id === question.id)) {
                console.log("[SSE] Adding new question to pendingQuestions:", question.id);
                set({ pendingQuestions: [...pendingQuestions, question] });
                const header = question.questions[0]?.header || "Question";
                const session = sessions.find(s => s.id === question.sessionID);
                notifyQuestion(header, session?.title);
              } else {
                console.log("[SSE] Question already in pendingQuestions:", question.id);
              }
            } else {
              console.log("[SSE] Invalid question format:", question);
            }
            break;
          }

          case "question.replied":
          case "question.rejected": {
            const requestId = event.properties.requestID as string | undefined;
            if (requestId) {
              const { pendingQuestions } = get();
              set({
                pendingQuestions: pendingQuestions.filter(q => q.id !== requestId),
              });
            }
            break;
          }

          default:
            break;
        }
      },
    }),
    {
      name: "opencode-anywhere-v6",
      partialize: (state) => ({ 
        relayToken: state.relayToken,
        user: state.user,
        devices: state.devices,
        selectedDevice: state.selectedDevice,
        selectedModel: state.selectedModel,
        selectedAgent: state.selectedAgent,
        cachedSessionsByDevice: state.cachedSessionsByDevice,
      }),
    }
  )
);
