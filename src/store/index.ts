import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ConnectionConfig, ConnectionStatus, SessionMessage, PermissionRequest, SSEEvent, Session, MessageInfo, MessagePart, ProvidersResponse, Agent, ModelSelection, TodoItem, QuestionRequest } from "@/types";
import type { SkillInfo, CommandInfo } from "@/lib/opencode";
import * as opencode from "@/lib/opencode";
import { relay, Device, User, FrpcConfig } from "@/lib/relay";
import { notifyTaskComplete, notifyApprovalNeeded, notifyInputNeeded } from "@/lib/notifications";

const MESSAGE_PAGE_SIZE = 30;

const messageCache = new Map<string, SessionMessage[]>();
const sessionLastUpdated = new Map<string, number>();
const sendingSessions = new Set<string>();
const sessionHasMoreMessages = new Map<string, boolean>();
const sessionLoadedCount = new Map<string, number>();
const lastCheckedSessionTimes = new Map<string, number>();

// Request tracking to prevent stale responses from overwriting newer data
let selectSessionRequestId = 0;
let sessionUpdatedRequestId = 0;

let storeGetRef: (() => AppState) | null = null;
let storeSetRef: ((partial: Partial<AppState>) => void) | null = null;

function markSessionComplete(sessionId: string, sessions: Session[]) {
  if (!storeGetRef || !storeSetRef) return;
  
  const { runningSessions, sendingSessionId } = storeGetRef();
  
  if (runningSessions.includes(sessionId)) {
    storeSetRef({ runningSessions: runningSessions.filter(id => id !== sessionId) });
    
    const session = sessions.find(s => s.id === sessionId);
    notifyTaskComplete(session?.title);
  }
  
  if (sendingSessions.has(sessionId)) {
    sendingSessions.delete(sessionId);
    if (sendingSessionId === sessionId) {
      storeSetRef({ sendingSessionId: null });
    }
  }
}

let currentDeviceId: number | null = null;

function getCacheKey(sessionId: string): string {
  return currentDeviceId ? `${currentDeviceId}:${sessionId}` : sessionId;
}

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

// Fallback check interval for detecting session completion when SSE events are missed
const FALLBACK_CHECK_INTERVAL = 10000; // 10 seconds
let fallbackCheckInterval: NodeJS.Timeout | null = null;

function startFallbackCheck() {
  if (fallbackCheckInterval) return;
  
  fallbackCheckInterval = setInterval(async () => {
    const state = storeGetRef?.();
    if (!state) return;
    
    const { runningSessions, sessions } = state;
    if (!runningSessions.length) return;
    
    for (const sessionId of runningSessions) {
      try {
        const { messages } = await opencode.getSessionMessages(sessionId, { limit: 30 });
        if (!messages.length) continue;
        
        const lastMsg = messages[messages.length - 1];
        const isAssistantDone = lastMsg?.info.role === 'assistant' && lastMsg?.info.finish;
        const noRunningTools = !hasRunningToolInvocations(messages);
        
        if (isAssistantDone && noRunningTools) {
          markSessionComplete(sessionId, sessions);
        }
      } catch (e) {
        console.error('[FallbackCheck] Error checking session:', sessionId, e);
      }
    }
  }, FALLBACK_CHECK_INTERVAL);
}

function stopFallbackCheck() {
  if (fallbackCheckInterval) {
    clearInterval(fallbackCheckInterval);
    fallbackCheckInterval = null;
  }
}

type ConnectionStep = "idle" | "connecting" | "authenticating" | "loading_sessions" | "ready" | "disconnected";
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
  runningSessions: string[];
  
   providers: ProvidersResponse | null;
   agents: Agent[];
   selectedModel: ModelSelection | null;
   sessionAgents: Record<string, string>;
   defaultAgent: string | null;
   todos: TodoItem[];
   skills: SkillInfo[];
   commands: CommandInfo[];
   isCompacting: boolean;

   relayToken: string | null;
  user: User | null;
  devices: Device[];
  selectedDevice: Device | null;
  authError: string | null;
  pinnedSessionIds: string[];
  cachedSessionsByDevice: Record<number, { sessions: Session[]; pinnedIds: string[] }>;
  devicesFetched: boolean;
  deviceEncryptionKeys: Record<number, string>;

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
   setDefaultAgent: (agent: string | null) => void;
   getSelectedAgent: () => string | null;
   fetchTodos: (sessionId?: string) => Promise<void>;
   fetchSkills: () => Promise<void>;
   fetchCommands: () => Promise<void>;
   summarizeCurrentSession: () => Promise<void>;
   fetchPendingRequests: () => Promise<void>;
   onAppResume: () => Promise<void>;

   sendVerification: (email: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, code: string) => Promise<void>;
  logout: () => void;
  fetchDevices: () => Promise<void>;
  selectDevice: (device: Device) => Promise<void>;
  deleteDevice: (deviceId: number) => Promise<void>;
  updateDevice: (deviceId: number, name: string) => Promise<void>;
  saveDeviceEncryptionKey: (deviceId: number, key: string) => void;
  getDeviceEncryptionKey: (deviceId: number) => string | null;
  deselectDevice: () => void;
  clearAuthError: () => void;
  checkDeviceAndReconnect: () => Promise<void>;
  setRelayToken: (token: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      storeGetRef = get;
      storeSetRef = set;
      
      return {
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
       runningSessions: [],
       
       providers: null,
       agents: [],
       selectedModel: null,
       sessionAgents: {},
       defaultAgent: null,
       todos: [],
       skills: [],
       commands: [],
       isCompacting: false,

       relayToken: null,
      user: null,
      devices: [],
      selectedDevice: null,
      authError: null,
      pinnedSessionIds: [],
      cachedSessionsByDevice: {},
      devicesFetched: false,
      deviceEncryptionKeys: {},

      setConfig: async (config) => {
        set({ isLoading: true, connectionStep: "connecting" });
        opencode.initClient(config);
        
        set({ connectionStep: "authenticating" });
        const status = await opencode.checkConnection();
        set({ config, status });

        if (status.connected) {
          set({ connectionStep: "loading_sessions" });
          await get().refreshSessions();
          await get().fetchProvidersAndAgents();  // Critical - wait for this
          set({ connectionStep: "ready", isLoading: false });  // UI ready now
          
          // Fire and forget - non-blocking background fetches
          get().fetchCommands().catch(err => console.error('Failed to fetch commands:', err));
          get().fetchPendingRequests().catch(err => console.error('Failed to fetch pending requests:', err));
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
          sessionAgents: {},
          defaultAgent: null,
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
        opencode.setEncryptionKey(null);
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
          set({ devices, isLoading: false, devicesFetched: true });
        } catch (error: any) {
          console.error("[fetchDevices] error:", error, "message:", error?.message, "stack:", error?.stack);
          if (error?.message?.toLowerCase?.()?.includes('unauthorized')) {
             get().logout();
          }
          set({ isLoading: false, devicesFetched: true });
        }
      },

      selectDevice: async (device) => {
        const { relayToken, selectedDevice: currentDevice, cachedSessionsByDevice, getDeviceEncryptionKey } = get();
        if (!relayToken) return;
        
        if (currentDevice?.id === device.id) {
          return;
        }
        
        const previousDeviceId = currentDeviceId;
        currentDeviceId = device.id;
        
        opencode.initClient({ baseUrl: '', username: '', password: '' });
        opencode.setEncryptionKey(getDeviceEncryptionKey(device.id));
        
        const cached = cachedSessionsByDevice[device.id];
        const cachedSessions = cached?.sessions || [];
        
        const newState: Partial<AppState> = { 
          selectedDevice: device, 
          isLoading: true,
          sessions: cachedSessions,
          currentSessionId: null,
          messages: [],
          todos: [],
          connectionStep: "connecting",
        };
        
        if (previousDeviceId !== device.id) {
          newState.pinnedSessionIds = cached?.pinnedIds || [];
        }
        
        set(newState);
        
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
        opencode.setEncryptionKey(null);
        set({ 
          selectedDevice: null, 
          currentSessionId: null,
          messages: [],
        });
      },

      deleteDevice: async (deviceId) => {
        const { relayToken, devices, selectedDevice, deviceEncryptionKeys, cachedSessionsByDevice } = get();
        if (!relayToken) return;
        
        try {
          await relay.deleteDevice(relayToken, deviceId);
          
          const { [deviceId]: _removedKey, ...remainingKeys } = deviceEncryptionKeys;
          const { [deviceId]: _removedCache, ...remainingCache } = cachedSessionsByDevice;
          
          set({ 
            devices: devices.filter(d => d.id !== deviceId),
            deviceEncryptionKeys: remainingKeys,
            cachedSessionsByDevice: remainingCache,
          });
          
          if (selectedDevice?.id === deviceId) {
            get().deselectDevice();
          }
        } catch (error) {
          console.error("Failed to delete device:", error);
          throw error;
        }
      },

      updateDevice: async (deviceId, name) => {
        const { relayToken, devices, selectedDevice } = get();
        if (!relayToken) return;
        
        try {
          const updatedDevice = await relay.updateDevice(relayToken, deviceId, name);
          set({ 
            devices: devices.map(d => d.id === deviceId ? updatedDevice : d),
            selectedDevice: selectedDevice?.id === deviceId ? updatedDevice : selectedDevice,
          });
        } catch (error) {
          console.error("Failed to update device:", error);
          throw error;
        }
      },

      saveDeviceEncryptionKey: (deviceId, key) => {
        const { deviceEncryptionKeys } = get();
        set({ deviceEncryptionKeys: { ...deviceEncryptionKeys, [deviceId]: key } });
      },

      getDeviceEncryptionKey: (deviceId) => {
        const { deviceEncryptionKeys } = get();
        return deviceEncryptionKeys[deviceId] || null;
      },
      
      clearAuthError: () => set({ authError: null }),

      setRelayToken: (token) => set({ relayToken: token }),

      checkDeviceAndReconnect: async () => {
        const { relayToken, selectedDevice, pinnedSessionIds, getDeviceEncryptionKey } = get();
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
            opencode.setEncryptionKey(getDeviceEncryptionKey(updatedDevice.id));
            const frpcConfig = await relay.getFrpcConfig(relayToken, updatedDevice.id);
            const newConfig: ConnectionConfig = {
              baseUrl: `https://opencode-relay.azurewebsites.net/proxy/${frpcConfig.subdomain}`,
              username: frpcConfig.auth_user,
              password: frpcConfig.auth_password,
            };
            await get().setConfig(newConfig);
            
            const { sessions, selectedDevice: currentSelectedDevice } = get();
            if (currentSelectedDevice?.id === updatedDevice.id && sessions.length > 0) {
              set({ 
                cachedSessionsByDevice: {
                  ...get().cachedSessionsByDevice,
                  [updatedDevice.id]: { sessions, pinnedIds: pinnedSessionIds }
                }
              });
            }
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
        
        const thisRequestId = ++selectSessionRequestId;
        const deviceIdAtStart = currentDeviceId;
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
        
        const fetchWithRetry = async (retriesLeft: number): Promise<{ messages: SessionMessage[]; hasMore: boolean }> => {
          try {
            return await opencode.getSessionMessages(id, { limit: MESSAGE_PAGE_SIZE });
          } catch (error: any) {
            if (retriesLeft > 0 && (error?.message?.includes('503') || error?.message?.includes('not connected'))) {
              console.log('[selectSession] Device not connected, retrying in 1s...', retriesLeft);
              await new Promise(r => setTimeout(r, 1000));
              return fetchWithRetry(retriesLeft - 1);
            }
            throw error;
          }
        };
        
        try {
          const { messages, hasMore } = await fetchWithRetry(3);
          
          if (thisRequestId !== selectSessionRequestId || currentDeviceId !== deviceIdAtStart) {
            console.log('[selectSession] Stale response discarded:', { requestId: thisRequestId, currentRequestId: selectSessionRequestId });
            return;
          }
          
          messageCache.set(cacheKey, messages);
          sessionHasMoreMessages.set(cacheKey, hasMore);
          sessionLoadedCount.set(cacheKey, messages.length);
          sessionLastUpdated.set(cacheKey, sessionUpdatedTime);
          
          if (get().currentSessionId === id) {
            // Extract agent from most recent assistant message to set session agent
            const lastAssistantMessage = messages.slice().reverse().find(m => m.info.role === 'assistant' && m.info.agent);
            if (lastAssistantMessage?.info.agent) {
              const { sessionAgents } = get();
              if (!sessionAgents[id]) {
                set({ 
                  sessionAgents: { ...sessionAgents, [id]: lastAssistantMessage.info.agent }
                });
              }
            }
            
            set({ messages, isLoading: false, hasMoreMessages: hasMore, sessionLoadingStep: "loading_todos" });
            await get().fetchTodos(id);
            if (get().currentSessionId === id && thisRequestId === selectSessionRequestId) {
              set({ sessionLoadingStep: "ready" });
            }
          }
        } catch (error) {
          console.error("Failed to fetch messages:", error);
          if (get().currentSessionId === id && thisRequestId === selectSessionRequestId) {
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
        const { currentSessionId, selectedModel, sessionAgents, defaultAgent, messages } = get();
        if (!currentSessionId || !text.trim()) return;

        const selectedAgent = sessionAgents[currentSessionId] || defaultAgent;

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
        set({ 
          messages: [...messages, userMessage], 
          sendingSessionId: currentSessionId,
          runningSessions: get().runningSessions.includes(currentSessionId) 
            ? get().runningSessions 
            : [...get().runningSessions, currentSessionId]
        });

        const sessionId = currentSessionId;
        try {
          await opencode.sendMessageAsync(sessionId, text, {
            model: selectedModel || undefined,
            agent: selectedAgent || undefined,
          });
          sendingSessions.delete(sessionId);
          if (get().sendingSessionId === sessionId) {
            set({ sendingSessionId: null });
          }
        } catch (error) {
          console.error("Failed to send message:", error);
          sendingSessions.delete(sessionId);
          if (get().sendingSessionId === sessionId) {
            set({ sendingSessionId: null });
          }
          
          const errorMessage = error instanceof Error ? error.message : "Failed to send";
          const isDeviceDisconnected = errorMessage.toLowerCase().includes("device not connected");
          
          if (isDeviceDisconnected) {
            set({ connectionStep: "disconnected" });
          }
          
          const currentMessages = get().messages;
          const tempMsgIndex = currentMessages.findIndex(m => m.info.id === userMessage.info.id);
          if (tempMsgIndex >= 0) {
            const newMessages = [...currentMessages];
            newMessages[tempMsgIndex] = {
              ...newMessages[tempMsgIndex],
              info: {
                ...newMessages[tempMsgIndex].info,
                error: isDeviceDisconnected ? "Device disconnected" : errorMessage,
              },
            };
            set({ messages: newMessages });
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

        try {
          await opencode.replyToQuestion(requestId, answers);
          set({
            pendingQuestions: pendingQuestions.filter((q) => q.id !== requestId),
          });
        } catch (error) {
          console.error("[Question] Failed to reply to question:", error);
        }
      },

      rejectQuestion: async (requestId) => {
        const { pendingQuestions } = get();

        try {
          await opencode.rejectQuestion(requestId);
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
        
        const visibleAgents = agents.filter(a => !a.hidden && a.mode !== "subagent");
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
        
        if (visibleAgents.length > 0 && !get().defaultAgent) {
          const buildAgent = visibleAgents.find(a => a.name === "build");
          set({ defaultAgent: buildAgent?.name || visibleAgents[0].name });
        }
      },
      
      setSelectedModel: (model) => set({ selectedModel: model }),
      setSelectedAgent: (agent) => {
        const { currentSessionId, sessionAgents } = get();
        if (!currentSessionId || !agent) return;
        set({ 
          sessionAgents: { ...sessionAgents, [currentSessionId]: agent }
        });
      },
      setDefaultAgent: (agent) => set({ defaultAgent: agent }),
       getSelectedAgent: () => {
         const { currentSessionId, sessionAgents, defaultAgent, agents } = get();
         if (!currentSessionId) return defaultAgent;
         const sessionAgent = sessionAgents[currentSessionId];
         if (sessionAgent) return sessionAgent;
         if (defaultAgent) return defaultAgent;
         if (agents.length > 0) {
           const buildAgent = agents.find(a => a.name === 'build');
           return buildAgent?.name || agents[0].name;
         }
         return null;
       },
       
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

      fetchSkills: async () => {
        try {
          const skills = await opencode.getSkills();
          set({ skills });
        } catch (error) {
          console.error("Failed to fetch skills:", error);
        }
      },

      fetchCommands: async () => {
        try {
          const commands = await opencode.getCommands();
          set({ commands });
        } catch (error) {
          console.error("Failed to fetch commands:", error);
        }
      },

      summarizeCurrentSession: async () => {
        const { currentSessionId, selectedModel, isCompacting } = get();
        if (!currentSessionId || !selectedModel || isCompacting) return;
        
        set({ isCompacting: true });
        try {
          await opencode.summarizeSession(currentSessionId, {
            providerID: selectedModel.providerID,
            modelID: selectedModel.modelID,
          });
          // Refresh session messages after compaction
          await get().refreshCurrentSession();
        } catch (error) {
          console.error("Failed to summarize session:", error);
        } finally {
          set({ isCompacting: false });
        }
      },

      fetchPendingRequests: async () => {
        try {
          const [questions, permissions] = await Promise.all([
            opencode.getQuestions(),
            opencode.getPermissions(),
          ]);
          
          const { pendingQuestions, pendingPermissions, sessions } = get();
          
          const existingQuestionIds = new Set(pendingQuestions.map(q => q.id));
          const newQuestions = questions.filter(q => !existingQuestionIds.has(q.id));
          if (newQuestions.length > 0) {
            set({ pendingQuestions: [...pendingQuestions, ...newQuestions] });
            for (const question of newQuestions) {
              const header = question.questions?.[0]?.header || "Question";
              const session = sessions.find(s => s.id === question.sessionID);
              notifyInputNeeded(header, session?.title);
            }
          }
          
          const existingPermissionIds = new Set(pendingPermissions.map(p => p.id));
          const newPermissions = permissions.filter(p => !existingPermissionIds.has(p.id));
          if (newPermissions.length > 0) {
            set({ pendingPermissions: [...pendingPermissions, ...newPermissions] });
            for (const permission of newPermissions) {
              const session = sessions.find(s => s.id === permission.sessionID);
              notifyApprovalNeeded(permission.permission, session?.title);
            }
          }
        } catch (error) {
          console.error("Failed to fetch pending requests:", error);
        }
      },

      onAppResume: async () => {
        const { currentSessionId, status } = get();
        
        if (!status.connected) return;
        
        // Refresh all data that may have changed while app was in background
        await Promise.all([
          get().refreshSessions(),
          get().fetchPendingRequests(),
        ]);
        
        if (currentSessionId) {
          await get().refreshCurrentSession();
          await get().fetchTodos(currentSessionId);
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
              
              const sessionId = sessionData.id;
              const cacheKey = getCacheKey(sessionId);
              const sessionUpdatedTime = sessionData.time?.updated || 0;
              const lastUpdated = sessionLastUpdated.get(cacheKey) || 0;
              
              if (currentSessionId === sessionId && sessionUpdatedTime > lastUpdated) {
                sessionLastUpdated.set(cacheKey, sessionUpdatedTime);
                const thisRequestId = ++sessionUpdatedRequestId;
                const deviceIdAtFetch = currentDeviceId;
                
                opencode.getSessionMessages(sessionId, { limit: MESSAGE_PAGE_SIZE }).then(({ messages: latestMessages }) => {
                  if (thisRequestId !== sessionUpdatedRequestId || currentDeviceId !== deviceIdAtFetch) {
                    console.log('[session.updated] Stale response discarded:', { requestId: thisRequestId, currentRequestId: sessionUpdatedRequestId });
                    return;
                  }
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
                }).catch(console.error);
              }
            } else {
              get().refreshSessions();
            }
            break;
          }

          case "message.created":
          case "message.updated": {
            const info = event.properties.info as MessageInfo | undefined;
            const sessionId = info?.sessionID;
            
            if (sessionId === currentSessionId && info) {
              const currentMessages = get().messages;
              const existingIndex = currentMessages.findIndex((m) => m.info.id === info.id);
              let newMessages: SessionMessage[];
              
              if (existingIndex >= 0) {
                newMessages = [...currentMessages];
                const existingMsg = newMessages[existingIndex];
                newMessages[existingIndex] = {
                  info,
                  parts: existingMsg.parts,
                };
              } else {
                const nonTempMessages = currentMessages.filter(m => !m.info.id.startsWith('temp_') || m.info.role !== info.role);
                newMessages = [...nonTempMessages, { info, parts: [] }];
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
              
              const { runningSessions } = get();
              if (runningSessions.includes(sessionId)) {
                const lastMsg = newMessages[newMessages.length - 1];
                const isAssistantFinished = lastMsg?.info.role === 'assistant' && lastMsg?.info.finish;
                if (isAssistantFinished && !hasRunningToolInvocations(newMessages)) {
                  markSessionComplete(sessionId, sessions);
                }
              }
            }
            break;
          }

          case "permission.asked": {
            const permission = event.properties as unknown as PermissionRequest;
            const { pendingPermissions } = get();
            if (!pendingPermissions.find(p => p.id === permission.id)) {
              set({ pendingPermissions: [...pendingPermissions, permission] });
              const session = sessions.find(s => s.id === permission.sessionID);
              notifyApprovalNeeded(permission.permission, session?.title);
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
            const todosFromEvent = event.properties.todos as TodoItem[] | undefined;
            if (todoSessionId === currentSessionId) {
              if (todosFromEvent && Array.isArray(todosFromEvent)) {
                // Use todos directly from the event - no API call needed
                set({ todos: todosFromEvent });
              } else {
                // Fallback to API if todos not in event
                get().fetchTodos(todoSessionId);
              }
            }
            break;
          }

          case "question.asked": {
            const question = event.properties as unknown as QuestionRequest;
            if (question.id && question.questions) {
              const { pendingQuestions } = get();
              if (!pendingQuestions.find(q => q.id === question.id)) {
                set({ pendingQuestions: [...pendingQuestions, question] });
                const header = question.questions[0]?.header || "Question";
                const session = sessions.find(s => s.id === question.sessionID);
                notifyInputNeeded(header, session?.title);
              }
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

          case "session.idle": {
            const sessionId = event.properties.sessionID as string | undefined;
            if (sessionId) {
              const { runningSessions } = get();
              if (runningSessions.includes(sessionId)) {
                markSessionComplete(sessionId, sessions);
              }
            }
            break;
          }

          case "session.status": {
            const sessionId = event.properties.sessionID as string | undefined;
            const statusObj = event.properties.status as { type?: string } | undefined;
            const statusType = statusObj?.type;
            if (sessionId && statusType) {
              const { runningSessions } = get();
              const isRunning = statusType === "busy" || statusType === "running";
              const isIdle = statusType === "idle";
              
              if (isRunning && !runningSessions.includes(sessionId)) {
                set({ runningSessions: [...runningSessions, sessionId] });
              } else if (isIdle && runningSessions.includes(sessionId)) {
                markSessionComplete(sessionId, sessions);
              }
            }
            break;
          }

          default:
            break;
        }
      },
    }},
    {
      name: "opencode-anywhere-v8",
      partialize: (state) => ({ 
        relayToken: state.relayToken,
        user: state.user,
        devices: state.devices,
        selectedDevice: state.selectedDevice,
        selectedModel: state.selectedModel,
        sessionAgents: state.sessionAgents,
        defaultAgent: state.defaultAgent,
        cachedSessionsByDevice: state.cachedSessionsByDevice,
        pinnedSessionIds: state.pinnedSessionIds,
        deviceEncryptionKeys: state.deviceEncryptionKeys,
        providers: state.providers,
        agents: state.agents,
      }),
    }
  )
);

export { startFallbackCheck, stopFallbackCheck };
