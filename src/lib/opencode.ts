import type { ConnectionConfig, ConnectionStatus, SessionMessage, SSEEvent, ProvidersResponse, Agent, ModelSelection, TodoItem, QuestionRequest } from "@/types";
import type { Session } from "@/types";
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { encrypt, decrypt } from "./crypto";

// Cache keys for local storage
const CACHE_KEY_PROVIDERS = "opencode_providers_cache";
const CACHE_KEY_AGENTS = "opencode_agents_cache";

// Cache helper functions
async function getCachedData<T>(key: string): Promise<T | null> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    } else {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }
  } catch {
    return null;
  }
}

async function setCachedData<T>(key: string, data: T): Promise<void> {
  try {
    const value = JSON.stringify(data);
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // Ignore cache write errors
  }
}

export type { Session };

export interface Attachment {
  uri: string;
  mimeType: string;
  fileName?: string;
}

let currentConfig: ConnectionConfig | null = null;
let currentEncryptionKey: string | null = null;

export function setEncryptionKey(key: string | null) {
  currentEncryptionKey = key;
}

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

async function nativeFetch(url: string, options?: { method?: string; headers?: Record<string, string>; body?: string; timeout?: number }) {
  const startTime = Date.now();
  let requestBody = options?.body;
  
  if (currentEncryptionKey && requestBody) {
    requestBody = await encrypt(requestBody, currentEncryptionKey);
  }
  const encryptTime = Date.now();
  
  const response = await CapacitorHttp.request({
    url,
    method: options?.method || 'GET',
    headers: options?.headers,
    data: currentEncryptionKey ? requestBody : (requestBody ? JSON.parse(requestBody) : undefined),
    connectTimeout: options?.timeout || 60000,
    readTimeout: options?.timeout || 300000,
    responseType: currentEncryptionKey ? 'text' : undefined,
  });
  const networkTime = Date.now();
  
  let responseData = response.data;
  
  if (currentEncryptionKey && responseData && typeof responseData === 'string') {
    try {
      const decrypted = await decrypt(responseData, currentEncryptionKey);
      responseData = JSON.parse(decrypted);
    } catch (decryptErr) {
      console.error('[nativeFetch] Decryption failed:', decryptErr, 'Response preview:', responseData?.substring?.(0, 100));
      try {
        responseData = JSON.parse(responseData);
      } catch (parseErr) {
        console.error('[nativeFetch] JSON parse also failed, returning raw data as error');
        responseData = { error: responseData };
      }
    }
  }
  const decryptTime = Date.now();
  
  console.log(`[nativeFetch] ${options?.method || 'GET'} ${url.split('/').slice(-2).join('/')} - encrypt: ${encryptTime - startTime}ms, network: ${networkTime - encryptTime}ms, decrypt: ${decryptTime - networkTime}ms, total: ${decryptTime - startTime}ms`);
  
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: async () => responseData,
  };
}

async function http(url: string, options?: { method?: string; headers?: Record<string, string>; body?: string; timeout?: number }) {
  if (isNative()) {
    return nativeFetch(url, options);
  }
  const response = await fetch(url, {
    method: options?.method,
    headers: options?.headers,
    body: options?.body,
    mode: 'same-origin',
  });
  return {
    ok: response.ok,
    status: response.status,
    json: () => response.json(),
  };
}

function getBaseUrl(): string {
  if (!currentConfig?.baseUrl) return "";
  return currentConfig.baseUrl;
}

function getApiUrl(path: string): string {
  if (isNative()) {
    return `${getBaseUrl()}${path}`;
  }
  const proxyPath = path
    .replace("/global/health", "/api/opencode/health")
    .replace("/provider", "/api/opencode/provider")
    .replace("/agent", "/api/opencode/agent")
    .replace(/^\/question\/([^/]+)\/reply$/, "/api/opencode/questions/$1/reply")
    .replace(/^\/question\/([^/]+)\/reject$/, "/api/opencode/questions/$1/reject")
    .replace(/^\/question$/, "/api/opencode/questions")
    .replace(/^\/permission\/([^/]+)\/reply$/, "/api/opencode/permissions/$1/reply")
    .replace(/^\/permission$/, "/api/opencode/permissions")
    .replace(/^\/session$/, "/api/opencode/sessions")
    .replace(/^\/session\/([^/]+)\/message$/, "/api/opencode/sessions/$1/messages")
    .replace(/^\/session\/([^/]+)\/prompt_async$/, "/api/opencode/sessions/$1/messages")
    .replace(/^\/session\/([^/]+)\/abort$/, "/api/opencode/sessions/$1/abort")
    .replace(/^\/session\/([^/]+)\/todo$/, "/api/opencode/sessions/$1/todo")
    .replace(/^\/session\/([^/]+)$/, "/api/opencode/sessions/$1")
    .replace(/^\/command$/, "/api/opencode/commands")
    .replace(/^\/lazy-image\/([^/]+)$/, "/api/opencode/lazy-image/$1");
  return proxyPath;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (!isNative() && currentConfig?.baseUrl) {
    headers["x-opencode-url"] = currentConfig.baseUrl;
  }
  
  if (currentConfig?.username && currentConfig?.password) {
    const credentials = btoa(`${currentConfig.username}:${currentConfig.password}`);
    if (isNative()) {
      headers["Authorization"] = `Basic ${credentials}`;
    } else {
      headers["x-opencode-auth"] = `Basic ${credentials}`;
    }
  }
  
  return headers;
}

export function initClient(config: ConnectionConfig) {
  currentConfig = config;
}

export function getConfig() {
  return currentConfig;
}

export async function checkConnection(): Promise<ConnectionStatus> {
  if (!currentConfig) {
    return { connected: false, error: "Client not initialized" };
  }

  try {
    const url = isNative() ? `${getBaseUrl()}/global/health` : "/api/opencode/health";
    
    const response = isNative() 
      ? await nativeFetch(url, { headers: getHeaders() })
      : await fetch(url, { headers: getHeaders(), mode: 'same-origin' });
    
    const data = await response.json();
    
    if (data.error) {
      return { connected: false, error: data.error };
    }
    
    return {
      connected: data.healthy === true,
      serverVersion: data.version,
    };
  } catch (error) {
    console.error("[OpenCode] checkConnection error:", error);
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

export async function getProviders(): Promise<ProvidersResponse | null> {
  try {
    const url = isNative() ? `${getBaseUrl()}/provider` : "/api/opencode/provider";
    const response = await http(url, { headers: getHeaders() });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.error || !Array.isArray(data.all)) return null;
    setCachedData(CACHE_KEY_PROVIDERS, data);
    return data;
  } catch {
    return null;
  }
}

export async function getCachedProviders(): Promise<ProvidersResponse | null> {
  return getCachedData<ProvidersResponse>(CACHE_KEY_PROVIDERS);
}

export async function getAgents(): Promise<Agent[]> {
  try {
    const url = isNative() ? `${getBaseUrl()}/agent` : "/api/opencode/agent";
    const response = await http(url, { headers: getHeaders() });
    if (!response.ok) return [];
    const data = await response.json();
    if (data.error || !Array.isArray(data)) return [];
    setCachedData(CACHE_KEY_AGENTS, data);
    return data;
  } catch {
    return [];
  }
}

export async function getCachedAgents(): Promise<Agent[]> {
  return (await getCachedData<Agent[]>(CACHE_KEY_AGENTS)) || [];
}

export async function getSessions(): Promise<Session[]> {
  const baseUrl = isNative() ? `${getBaseUrl()}/session` : "/api/opencode/sessions";
  const url = `${baseUrl}?roots=true`;
  const response = await http(url, { headers: getHeaders() });
  const data = await response.json();
  
  if (data.error) throw new Error(data.error);
  return data;
}

export interface PaginatedMessages {
  messages: SessionMessage[];
  hasMore: boolean;
}

export async function getSessionMessages(
  sessionId: string, 
  options?: { limit?: number; offset?: number; order?: 'asc' | 'desc' }
): Promise<PaginatedMessages> {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) {
    params.set('limit', options.limit.toString());
  }
  if (options?.offset !== undefined) {
    params.set('offset', options.offset.toString());
  }
  if (options?.order) {
    params.set('order', options.order);
  }
  
  const queryString = params.toString();
  const baseUrlPath = isNative() 
    ? `${getBaseUrl()}/session/${sessionId}/message` 
    : `/api/opencode/sessions/${sessionId}/messages`;
  const url = queryString ? `${baseUrlPath}?${queryString}` : baseUrlPath;
  
  const response = await http(url, { headers: getHeaders(), timeout: 300000 });
  
  if (!response.ok) {
    const errorText = typeof response.status === 'number' ? `HTTP ${response.status}` : 'Request failed';
    throw new Error(errorText);
  }
  
  const data = await response.json();
  
  if (data.error) throw new Error(data.error);
  
  const messages = Array.isArray(data) ? data : [];
  if (!Array.isArray(data)) {
    console.error('[getSessionMessages] Unexpected response type:', typeof data, data?.substring?.(0, 100) || data);
  }
  const hasMore = options?.limit !== undefined && messages.length >= options.limit;
  
  return {
    messages,
    hasMore,
  };
}

export async function sendMessageAsync(
  sessionId: string,
  text: string,
  options?: {
    model?: ModelSelection;
    agent?: string;
    attachments?: Attachment[];
  }
): Promise<boolean> {
  // Build parts array: file attachments first, then text
  const parts: Array<{ type: string; text?: string; mime?: string; url?: string; filename?: string }> = [];
  
  // Add file parts from attachments (prepend before text)
  if (options?.attachments?.length) {
    for (const attachment of options.attachments) {
      parts.push({
        type: "file",
        mime: attachment.mimeType,
        url: attachment.uri,
        ...(attachment.fileName && { filename: attachment.fileName }),
      });
    }
  }
  
  // Add text part last
  parts.push({ type: "text", text });
  
  const body: Record<string, unknown> = {
    parts,
  };
  
  if (options?.model) {
    body.model = options.model;
  }
  
  if (options?.agent) {
    body.agent = options.agent;
  }

  const url = isNative()
    ? `${getBaseUrl()}/session/${sessionId}/prompt_async`
    : `/api/opencode/sessions/${sessionId}/messages`;
  
  console.log('[sendMessageAsync] Sending to:', url, 'body:', JSON.stringify(body));
  
  const response = await http(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  
  console.log('[sendMessageAsync] Response:', response.ok, response.status);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[sendMessageAsync] Error data:', errorData);
    throw new Error(errorData?.error || `Failed to send message: ${response.status}`);
  }
  
  const responseData = await response.json().catch(() => null);
  console.log('[sendMessageAsync] Response data:', responseData);
  
  return true;
}

export async function respondToPermission(
  sessionId: string,
  permissionId: string,
  allow: boolean
): Promise<boolean> {
  const url = isNative()
    ? `${getBaseUrl()}/permission/${permissionId}/reply`
    : `/api/opencode/permissions/${permissionId}/reply`;
  const response = await http(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ reply: allow ? "once" : "reject" }),
  });
  
  return response.ok;
}

export async function abortSession(sessionId: string): Promise<boolean> {
  const url = isNative()
    ? `${getBaseUrl()}/session/${sessionId}/abort`
    : `/api/opencode/sessions/${sessionId}/abort`;
  const response = await http(url, {
    method: "POST",
    headers: getHeaders(),
  });
  
  return response.ok;
}

export async function createSession(title?: string): Promise<Session | null> {
  const url = isNative() ? `${getBaseUrl()}/session` : "/api/opencode/sessions";
  const response = await http(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ title }),
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const url = isNative()
    ? `${getBaseUrl()}/session/${sessionId}`
    : `/api/opencode/sessions/${sessionId}`;
  const response = await http(url, {
    method: "DELETE",
    headers: getHeaders(),
  });
  
  return response.ok;
}

export async function renameSession(sessionId: string, title: string): Promise<Session | null> {
  const url = isNative()
    ? `${getBaseUrl()}/session/${sessionId}`
    : `/api/opencode/sessions/${sessionId}`;
  const response = await http(url, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ title }),
  });
  
  if (!response.ok) return null;
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function getSessionTodos(sessionId: string): Promise<TodoItem[]> {
  const url = isNative()
    ? `${getBaseUrl()}/session/${sessionId}/todo`
    : `/api/opencode/sessions/${sessionId}/todo`;
  const response = await http(url, { headers: getHeaders() });
  const data = await response.json();
  
  if (data.error) return [];
  return Array.isArray(data) ? data : [];
}

export function subscribeToEvents(
  config: ConnectionConfig,
  onEvent?: (event: SSEEvent) => void,
  getCurrentSessionId?: () => string | null,
  deviceInfo?: { subdomain: string; authUser: string; authPassword: string; encryptionKey?: string },
  onReconnect?: () => void
): { close: () => void } {
  let isClosing = false;

  if (isNative() && deviceInfo) {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let hasConnectedBefore = false;

    const connect = () => {
      if (isClosing) return;

      const relayUrl = new URL(config.baseUrl || '');
      const wsProtocol = relayUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${relayUrl.host}/api/events/${deviceInfo.subdomain}?auth_user=${encodeURIComponent(deviceInfo.authUser)}&auth_password=${encodeURIComponent(deviceInfo.authPassword)}`;
      
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (hasConnectedBefore && onReconnect) {
          console.log('[WebSocket] Reconnected, refreshing session data');
          onReconnect();
        }
        hasConnectedBefore = true;
      };

      ws.onmessage = async (event) => {
        try {
          const raw = event.data;
          
          const envelope = JSON.parse(raw);
          if (envelope.event !== 'sse' || !envelope.data) {
            return;
          }
          
          let data = envelope.data;
          
          if (deviceInfo.encryptionKey) {
            try {
              data = await decrypt(data, deviceInfo.encryptionKey);
            } catch (e) {
              console.error("[WebSocket] Decryption failed:", e);
              return;
            }
          }
          
          const sseEvent = JSON.parse(data) as SSEEvent;
          onEvent?.(sseEvent);
        } catch (e) {
          console.error("[WebSocket] Parse error:", e);
        }
      };

      ws.onerror = (error) => {
        console.error("[WebSocket] Error:", error);
      };

      ws.onclose = (event) => {
        ws = null;
        if (!isClosing) {
          reconnectTimeout = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return {
      close: () => {
        isClosing = true;
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
        }
        if (ws) {
          ws.close();
          ws = null;
        }
      },
    };
  }

  if (isNative()) {
    let pollTimeout: NodeJS.Timeout | null = null;
    const knownQuestionIds = new Set<string>();
    const knownPermissionIds = new Set<string>();
    let lastTodosJson = "";

    const poll = async () => {
      if (isClosing) return;
      
      try {
        const response = await nativeFetch(`${config.baseUrl}/session`, {
          headers: getHeaders(),
        });
        
        if (response.ok) {
          onEvent?.({ type: "session.updated", properties: {} });
        }
        
        const permissionsUrl = `${config.baseUrl}/permission`;
        const permissionsResponse = await nativeFetch(permissionsUrl, {
          headers: getHeaders(),
        });
        
        if (permissionsResponse.ok) {
          const permissions = await permissionsResponse.json();
          if (Array.isArray(permissions)) {
            for (const permission of permissions) {
              if (!knownPermissionIds.has(permission.id)) {
                knownPermissionIds.add(permission.id);
                onEvent?.({ 
                  type: "permission.asked", 
                  properties: permission,
                });
              }
            }
            const currentIds = new Set(permissions.map((p: any) => p.id));
            for (const id of knownPermissionIds) {
              if (!currentIds.has(id)) {
                knownPermissionIds.delete(id);
              }
            }
          }
        }
        
        const questionsUrl = `${config.baseUrl}/question`;
        const questionsResponse = await nativeFetch(questionsUrl, {
          headers: getHeaders(),
        });
        
        if (questionsResponse.ok) {
          const questions = await questionsResponse.json();
          if (Array.isArray(questions)) {
            for (const question of questions) {
              if (!knownQuestionIds.has(question.id)) {
                knownQuestionIds.add(question.id);
                onEvent?.({ 
                  type: "question.asked", 
                  properties: question,
                });
              }
            }
            const currentIds = new Set(questions.map((q: any) => q.id));
            for (const id of knownQuestionIds) {
              if (!currentIds.has(id)) {
                knownQuestionIds.delete(id);
              }
            }
          }
        }
        
        const currentSessionId = getCurrentSessionId?.();
        if (currentSessionId) {
          const todosUrl = `${config.baseUrl}/session/${currentSessionId}/todo`;
          const todosResponse = await nativeFetch(todosUrl, {
            headers: getHeaders(),
          });
          
          if (todosResponse.ok) {
            const todos = await todosResponse.json();
            const todosJson = JSON.stringify(todos);
            if (todosJson !== lastTodosJson) {
              lastTodosJson = todosJson;
              onEvent?.({
                type: "todo.updated",
                properties: { sessionID: currentSessionId, todos: Array.isArray(todos) ? todos : [] },
              });
            }
          }
        }
      } catch (e) {
        console.error("[Polling] Error:", e);
      }
      
      if (!isClosing) {
        pollTimeout = setTimeout(poll, 3000);
      }
    };

    poll();

    return {
      close: () => {
        isClosing = true;
        if (pollTimeout) {
          clearTimeout(pollTimeout);
        }
      },
    };
  }

  let eventSource: EventSource | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  const connect = () => {
    if (isClosing) return;
    
    const proxyUrl = new URL("/api/opencode/events", window.location.origin);
    if (config.baseUrl) {
      proxyUrl.searchParams.set("baseUrl", config.baseUrl);
    }
    const url = proxyUrl.toString();
    
    eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const payload = raw.payload || raw;
        if (payload.type) {
          const sseEvent: SSEEvent = {
            type: payload.type,
            properties: payload.properties || {},
          };
          onEvent?.(sseEvent);
        }
      } catch (e) {
        console.error("[SSE] Parse error:", e);
      }
    };

    eventSource.onopen = () => {
    };

    eventSource.onerror = () => {
      eventSource?.close();
      if (!isClosing) {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };
  };

  connect();

  return {
    close: () => {
      isClosing = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      eventSource?.close();
    },
  };
}

export async function getQuestions(): Promise<QuestionRequest[]> {
  const url = isNative() ? `${getBaseUrl()}/question` : "/api/opencode/questions";
  const response = await http(url, { headers: getHeaders() });
  const data = await response.json();
  
  if (data.error) return [];
  return Array.isArray(data) ? data : [];
}

export async function getPermissions(): Promise<import("@/types").PermissionRequest[]> {
  const url = isNative() ? `${getBaseUrl()}/permission` : "/api/opencode/permissions";
  const response = await http(url, { headers: getHeaders() });
  const data = await response.json();
  
  if (data.error) return [];
  return Array.isArray(data) ? data : [];
}

export async function replyToQuestion(
  requestId: string,
  answers: string[][]
): Promise<boolean> {
  const url = isNative()
    ? `${getBaseUrl()}/question/${requestId}/reply`
    : `/api/opencode/questions/${requestId}/reply`;
  const response = await http(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ answers }),
  });
  
  return response.ok;
}

export async function rejectQuestion(requestId: string): Promise<boolean> {
  const url = isNative()
    ? `${getBaseUrl()}/question/${requestId}/reject`
    : `/api/opencode/questions/${requestId}/reject`;
  const response = await http(url, {
    method: "POST",
    headers: getHeaders(),
  });

  return response.ok;
}

export interface SummarizeOptions {
  providerID: string;
  modelID: string;
  auto?: boolean;
}

export async function summarizeSession(
  sessionId: string,
  options: SummarizeOptions
): Promise<boolean> {
  const url = isNative()
    ? `${getBaseUrl()}/session/${sessionId}/summarize`
    : `/api/opencode/sessions/${sessionId}/summarize`;
  const response = await http(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(options),
  });

  return response.ok;
}

export interface SkillInfo {
  name: string;
  description: string;
}

export interface CommandInfo {
  name: string;
  description?: string;
  hints: string[];
}

export async function getSkills(): Promise<SkillInfo[]> {
  const url = isNative() ? `${getBaseUrl()}/skill` : "/api/opencode/skills";
  const response = await http(url, { headers: getHeaders() });
  const data = await response.json();
  
  if (data.error || !Array.isArray(data)) return [];
  return data;
}

export async function getCommands(): Promise<CommandInfo[]> {
  const url = isNative() ? `${getBaseUrl()}/command` : "/api/opencode/commands";
  const response = await http(url, { headers: getHeaders() });
  const data = await response.json();
  
  if (data.error || !Array.isArray(data)) return [];
  return data;
}

export async function fetchLazyImage(partId: string): Promise<string> {
  const path = `/lazy-image/${partId}`;
  const url = getApiUrl(path);
  const response = await http(url, { headers: getHeaders() });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch lazy image: ${response.status}`);
  }
  
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data.url;
}
