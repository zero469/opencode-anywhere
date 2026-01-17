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

export interface MessageInfo {
  id: string;
  sessionID: string;
  role: "user" | "assistant";
  parentID?: string;
  modelID?: string;
  providerID?: string;
  agent?: string;
  time?: {
    created: number;
    updated?: number;
  };
}

export interface SessionMessage {
  info: MessageInfo;
  parts: MessagePart[];
}

export type FinishReason = 
  | "end_turn" 
  | "max_tokens" 
  | "tool_use" 
  | "canceled" 
  | "error" 
  | "permission_denied" 
  | "unknown";

export interface MessagePart {
  id?: string;
  sessionID?: string;
  messageID?: string;
  type: "text" | "tool" | "tool-invocation" | "tool-result" | "reasoning" | "file" | "step-start" | "step-finish" | "finish";
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
  finish?: {
    reason: FinishReason;
    time: number;
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
