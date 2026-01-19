export interface ConnectionConfig {
  baseUrl: string;
  username?: string;
  password?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  serverVersion?: string;
  error?: string;
}

export interface Session {
  id: string;
  slug?: string;
  title?: string;
  directory?: string;
  parentID?: string;
  time?: {
    created: number;
    updated?: number;
  };
  share?: { url: string };
}

export interface TokenUsage {
  input: number;
  output: number;
  reasoning: number;
  cache: {
    read: number;
    write: number;
  };
}

export interface MessageInfo {
  id: string;
  sessionID: string;
  role: "user" | "assistant";
  parentID?: string;
  modelID?: string;
  providerID?: string;
  agent?: string;
  finish?: string;
  cost?: number;
  tokens?: TokenUsage;
  time?: {
    created: number;
    updated?: number;
    completed?: number;
  };
}

export interface SessionMessage {
  info: MessageInfo;
  parts: MessagePart[];
}

export interface MessagePart {
  id?: string;
  sessionID?: string;
  messageID?: string;
  type: "text" | "tool" | "tool-invocation" | "tool-result" | "reasoning" | "file" | "step-start" | "step-finish";
  text?: string;
  tool?: string;
  toolName?: string;
  callID?: string;
  state?: {
    status?: "pending" | "running" | "completed" | "error";
    title?: string;
    input?: unknown;
    output?: unknown;
    error?: string;
    time?: {
      start?: number;
      end?: number;
    };
  };
}

export interface PermissionRequest {
  id: string;
  sessionID: string;
  toolName: string;
  input: unknown;
  time?: {
    created: number;
  };
}

export interface SSEEvent {
  type: string;
  properties: Record<string, unknown>;
}

export interface Model {
  id: string;
  name: string;
  attachment?: boolean;
  reasoning?: boolean;
  temperature?: boolean;
}

export interface Provider {
  id: string;
  name: string;
  models: Record<string, Model>;
}

export interface ProvidersResponse {
  all: Provider[];
  default: Record<string, string>;
  connected: string[];
}

export interface Agent {
  name: string;
  description?: string;
  mode?: "primary" | "subagent";
  hidden?: boolean;
  model?: {
    modelID: string;
    providerID: string;
  };
}

export interface ModelSelection {
  providerID: string;
  modelID: string;
}

export interface TodoItem {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "high" | "medium" | "low";
}
