import type { ConnectionConfig, ConnectionStatus, SessionMessage, SSEEvent, ProvidersResponse, Agent, ModelSelection } from "@/types";
import type { Session } from "@/types";

export type { Session };

let currentConfig: ConnectionConfig | null = null;

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (currentConfig?.baseUrl) {
    headers["x-opencode-url"] = currentConfig.baseUrl;
  }
  
  if (currentConfig?.username && currentConfig?.password) {
    const credentials = btoa(`${currentConfig.username}:${currentConfig.password}`);
    headers["x-opencode-auth"] = `Basic ${credentials}`;
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
    const response = await fetch("/api/opencode/health", {
      headers: getHeaders(),
    });
    const data = await response.json();
    
    if (data.error) {
      return { connected: false, error: data.error };
    }
    
    return {
      connected: data.healthy === true,
      serverVersion: data.version,
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

export async function getProviders(): Promise<ProvidersResponse | null> {
  try {
    const response = await fetch("/api/opencode/provider", {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getAgents(): Promise<Agent[]> {
  try {
    const response = await fetch("/api/opencode/agent", {
      headers: getHeaders(),
    });
    const data = await response.json();
    if (data.error) return [];
    return data;
  } catch {
    return [];
  }
}

export async function getSessions(): Promise<Session[]> {
  const response = await fetch("/api/opencode/sessions", {
    headers: getHeaders(),
  });
  const data = await response.json();
  
  if (data.error) throw new Error(data.error);
  return data;
}

export async function getSessionMessages(sessionId: string): Promise<SessionMessage[]> {
  const response = await fetch(`/api/opencode/sessions/${sessionId}/messages`, {
    headers: getHeaders(),
  });
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

  const response = await fetch(`/api/opencode/sessions/${sessionId}/messages`, {
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
  const response = await fetch(
    `/api/opencode/sessions/${sessionId}/permissions/${permissionId}`,
    {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ response: allow ? "allow" : "deny" }),
    }
  );
  
  return response.ok;
}

export async function abortSession(sessionId: string): Promise<boolean> {
  const response = await fetch(`/api/opencode/sessions/${sessionId}/abort`, {
    method: "POST",
    headers: getHeaders(),
  });
  
  return response.ok;
}

export async function createSession(title?: string): Promise<Session | null> {
  const response = await fetch("/api/opencode/sessions", {
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
  let eventSource: EventSource | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isClosing = false;

  const connect = () => {
    if (isClosing) return;
    
    const url = new URL("/api/opencode/events", window.location.origin);
    if (config.baseUrl) {
      url.searchParams.set("baseUrl", config.baseUrl);
    }
    
    eventSource = new EventSource(url.toString());

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
      console.log("[SSE] Connected");
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
