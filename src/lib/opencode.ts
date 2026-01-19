import type { ConnectionConfig, ConnectionStatus, SessionMessage, SSEEvent, ProvidersResponse, Agent, ModelSelection } from "@/types";
import type { Session } from "@/types";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

export type { Session };

let currentConfig: ConnectionConfig | null = null;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

async function nativeFetch(url: string, options?: { method?: string; headers?: Record<string, string>; body?: string; timeout?: number }) {
  const response = await CapacitorHttp.request({
    url,
    method: options?.method || 'GET',
    headers: options?.headers,
    data: options?.body ? JSON.parse(options.body) : undefined,
    connectTimeout: options?.timeout || 60000,
    readTimeout: options?.timeout || 300000, // 5 minutes for large responses
  });
  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: async () => response.data,
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
    .replace(/^\/session$/, "/api/opencode/sessions")
    .replace(/^\/session\/([^/]+)\/message$/, "/api/opencode/sessions/$1/messages")
    .replace(/^\/session\/([^/]+)\/prompt_async$/, "/api/opencode/sessions/$1/messages")
    .replace(/^\/session\/([^/]+)\/abort$/, "/api/opencode/sessions/$1/abort")
    .replace(/^\/session\/([^/]+)\/permissions\/([^/]+)$/, "/api/opencode/sessions/$1/permissions/$2");
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
    const data = await response.json();
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getAgents(): Promise<Agent[]> {
  try {
    const url = isNative() ? `${getBaseUrl()}/agent` : "/api/opencode/agent";
    const response = await http(url, { headers: getHeaders() });
    const data = await response.json();
    if (data.error) return [];
    return data;
  } catch {
    return [];
  }
}

export async function getSessions(): Promise<Session[]> {
  const url = isNative() ? `${getBaseUrl()}/session` : "/api/opencode/sessions";
  const response = await http(url, { headers: getHeaders() });
  const data = await response.json();
  
  if (data.error) throw new Error(data.error);
  return data;
}

export async function getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
  const url = isNative() 
    ? `${getBaseUrl()}/session/${sessionId}/message` 
    : `/api/opencode/sessions/${sessionId}/messages`;
  const response = await http(url, { headers: getHeaders(), timeout: 300000 });
  const data = await response.json();
  
  if (data.error) throw new Error(data.error);
  return data || [];
}

export async function sendMessageAsync(
  sessionId: string,
  text: string,
  options?: {
    model?: ModelSelection;
    agent?: string;
  }
): Promise<boolean> {
  const body: Record<string, unknown> = {
    parts: [{ type: "text", text }],
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
  const response = await http(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  
  return response.ok;
}

export async function respondToPermission(
  sessionId: string,
  permissionId: string,
  allow: boolean
): Promise<boolean> {
  const url = isNative()
    ? `${getBaseUrl()}/session/${sessionId}/permissions/${permissionId}`
    : `/api/opencode/sessions/${sessionId}/permissions/${permissionId}`;
  const response = await http(url, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ response: allow ? "allow" : "deny" }),
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

export function subscribeToEvents(
  config: ConnectionConfig,
  onEvent?: (event: SSEEvent) => void
): { close: () => void } {
  let isClosing = false;

  if (isNative()) {
    let pollTimeout: NodeJS.Timeout | null = null;
    let lastMessageCount = 0;

    const poll = async () => {
      if (isClosing) return;
      
      try {
        const response = await nativeFetch(`${config.baseUrl}/session`, {
          headers: getHeaders(),
        });
        
        if (response.ok) {
          onEvent?.({ type: "session.updated", properties: {} });
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
