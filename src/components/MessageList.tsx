"use client";

import { useRef, useEffect, useState, memo } from "react";
import { useAppStore } from "@/store";
import type { SessionMessage, MessagePart } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

const CodeBlock = memo(function CodeBlock({ 
  className, 
  children 
}: { 
  className?: string; 
  children: React.ReactNode;
}) {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");

  return (
    <div className="group relative my-3">
      {language && (
        <div className="absolute top-0 left-0 px-2 py-1 text-xs text-zinc-500 bg-zinc-800 rounded-tl rounded-br">
          {language}
        </div>
      )}
      <CopyButton text={code} />
      <pre className="bg-zinc-900 rounded-lg p-4 pt-8 overflow-x-auto text-sm">
        <code className={`${className || ""} text-zinc-300`}>
          {children}
        </code>
      </pre>
    </div>
  );
});

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const isInline = !className && typeof children === "string" && !children.includes("\n");
    
    if (isInline) {
      return (
        <code className="bg-zinc-700/50 px-1.5 py-0.5 rounded text-sm text-pink-400" {...props}>
          {children}
        </code>
      );
    }
    
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
  pre({ children }) {
    return <>{children}</>;
  },
  p({ children }) {
    return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
  },
  ul({ children }) {
    return <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>;
  },
  li({ children }) {
    return <li className="text-zinc-200">{children}</li>;
  },
  h1({ children }) {
    return <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0 text-white">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0 text-white">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0 text-white">{children}</h3>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-4 border-zinc-600 pl-4 my-3 text-zinc-400 italic">
        {children}
      </blockquote>
    );
  },
  a({ href, children }) {
    return (
      <a 
        href={href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline"
      >
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border-collapse border border-zinc-700">
          {children}
        </table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-zinc-700 px-3 py-2 bg-zinc-800 text-left font-semibold">
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td className="border border-zinc-700 px-3 py-2">
        {children}
      </td>
    );
  },
  hr() {
    return <hr className="my-4 border-zinc-700" />;
  },
  strong({ children }) {
    return <strong className="font-semibold text-white">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic text-zinc-300">{children}</em>;
  },
};

function ToolInvocation({ part }: { part: MessagePart }) {
  const [expanded, setExpanded] = useState(false);
  
  const statusColors: Record<string, string> = {
    pending: "text-yellow-400 bg-yellow-400/10",
    running: "text-blue-400 bg-blue-400/10",
    completed: "text-green-400 bg-green-400/10",
    error: "text-red-400 bg-red-400/10",
  };
  
  const statusIcons: Record<string, string> = {
    pending: "○",
    running: "⟳",
    completed: "✓",
    error: "✗",
  };

  const status = part.state?.status || "pending";
  const toolName = part.tool || part.toolName || "unknown";
  const title = part.state?.title || toolName;
  const input = part.state?.input;
  const output = part.state?.output;
  const error = part.state?.error;
  const hasContent = input != null || output != null || error != null;

  return (
    <div className="bg-zinc-800/50 rounded-lg my-2 overflow-hidden">
      <button
        onClick={() => hasContent && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 ${hasContent ? "cursor-pointer hover:bg-zinc-700/50" : "cursor-default"}`}
      >
        <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[status] || statusColors.pending}`}>
          {statusIcons[status] || statusIcons.pending}
        </span>
        <span className="text-sm font-mono text-zinc-300 flex-1 text-left truncate">
          {title}
        </span>
        {hasContent && (
          <span className="text-zinc-500 text-xs">
            {expanded ? "▼" : "▶"}
          </span>
        )}
      </button>
      
      {expanded && hasContent && (
        <div className="px-3 pb-3 space-y-2">
          {input != null && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Input:</div>
              <pre className="text-xs text-zinc-400 bg-zinc-900 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                {typeof input === "string" ? input : JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output != null && (
            <div>
              <div className="text-xs text-zinc-500 mb-1">Output:</div>
              <pre className="text-xs text-zinc-400 bg-zinc-900 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
          {error != null && (
            <div>
              <div className="text-xs text-red-500 mb-1">Error:</div>
              <pre className="text-xs text-red-400 bg-zinc-900 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                {error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDuration(startMs: number, endMs: number): string {
  const diffSeconds = (endMs - startMs) / 1000;
  if (diffSeconds < 1) {
    return `${Math.round(diffSeconds * 1000)}ms`;
  }
  if (diffSeconds < 60) {
    return `${diffSeconds.toFixed(1)}s`;
  }
  return `${(diffSeconds / 60).toFixed(1)}m`;
}

function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  
  if (isToday) {
    return timeStr;
  } else if (isYesterday) {
    return `Yesterday ${timeStr}`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }) + ` ${timeStr}`;
  }
}

function getFinishStatusText(reason: string): string | null {
  switch (reason) {
    case "end_turn":
      return null;
    case "canceled":
      return "canceled";
    case "error":
      return "error";
    case "permission_denied":
      return "permission denied";
    case "max_tokens":
      return "max tokens";
    default:
      return null;
  }
}

function MessageFooter({ message }: { message: SessionMessage }) {
  const { modelID, agent, finish, time } = message.info;
  
  if (!finish && !modelID && !agent) {
    return null;
  }

  const parts: string[] = [];
  
  if (agent) {
    parts.push(agent);
  }
  
  if (modelID) {
    parts.push(modelID);
  }
  
  if (finish) {
    const statusText = getFinishStatusText(finish);
    if (statusText) {
      parts.push(statusText);
    } else if (time?.created && time?.completed) {
      parts.push(formatDuration(time.created, time.completed));
    }
  }

  if (parts.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 pt-2 border-t border-zinc-700/50 text-xs text-zinc-500">
      {parts.join(" · ")}
    </div>
  );
}

const MarkdownContent = memo(function MarkdownContent({ text }: { text: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {text}
    </ReactMarkdown>
  );
});

const MessageBubble = memo(function MessageBubble({ message }: { message: SessionMessage }) {
  const isUser = message.info.role === "user";
  const createdTime = message.info.time?.created;
  
  const textParts = message.parts.filter(p => p.type === "text" && p.text);
  const toolParts = message.parts.filter(p => p.type === "tool");
  const reasoningParts = message.parts.filter(p => p.type === "reasoning" && p.text);
  
  const hasVisibleContent = textParts.length > 0 || toolParts.length > 0 || reasoningParts.length > 0;
  
  if (!hasVisibleContent) {
    return null;
  }

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} mb-4`}>
      {createdTime && (
        <div className="text-xs text-zinc-500 mb-1 px-2">
          {formatMessageTime(createdTime)}
        </div>
      )}
      <div
        className={`max-w-[90%] lg:max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-zinc-800 text-zinc-100"
        }`}
      >
        {reasoningParts.map((part, i) => (
          <details key={`reasoning-${i}`} className="my-2">
            <summary className="text-zinc-400 text-sm cursor-pointer hover:text-zinc-300">
              Thinking...
            </summary>
            <div className="text-zinc-400 text-sm border-l-2 border-zinc-600 pl-3 mt-2 italic">
              {part.text}
            </div>
          </details>
        ))}
        
        {textParts.map((part, i) => (
          <div key={`text-${i}`} className="prose prose-invert prose-sm max-w-none">
            {isUser ? (
              <p className="mb-0 whitespace-pre-wrap">{part.text}</p>
            ) : (
              <MarkdownContent text={part.text!} />
            )}
          </div>
        ))}
        
        {toolParts.map((part, i) => (
          <ToolInvocation key={`tool-${part.id || i}`} part={part} />
        ))}

        {!isUser && <MessageFooter message={message} />}
      </div>
    </div>
  );
});

export function MessageList() {
  const { messages, isLoading } = useAppStore();
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevSessionIdRef = useRef<string | null>(null);
  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (messages.length === 0) return;
    
    const isNewSession = prevSessionIdRef.current !== currentSessionId;
    const hasNewMessages = messages.length > prevMessageCountRef.current;
    
    prevSessionIdRef.current = currentSessionId;
    prevMessageCountRef.current = messages.length;

    if (isNewSession) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: "instant" });
        });
      });
    } else if (hasNewMessages) {
      const timer = setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, currentSessionId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        No messages yet. Start a conversation!
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.info.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
