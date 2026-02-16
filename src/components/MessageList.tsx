"use client";

import { useRef, useEffect, useState, memo } from "react";
import { useAppStore } from "@/store";
import type { SessionMessage, MessagePart } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { getAgentColor, capitalizeAgentName } from "@/lib/agentColors";

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
      className="absolute top-2 right-2 px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity"
      style={{
        backgroundColor: 'var(--oc-step6)',
        color: 'var(--foreground-muted)',
      }}
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
        <div 
          className="absolute top-0 left-0 px-2 py-1 text-xs rounded-tl rounded-br"
          style={{
            color: 'var(--foreground-muted)',
            backgroundColor: 'var(--background-element)',
          }}
        >
          {language}
        </div>
      )}
      <CopyButton text={code} />
      <pre 
        className="rounded-lg p-4 pt-8 overflow-x-auto text-sm"
        style={{ backgroundColor: 'var(--background-panel)' }}
      >
        <code 
          className={className || ""}
          style={{ color: 'var(--foreground-muted)' }}
        >
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
        <code 
          className="px-1.5 py-0.5 rounded text-sm break-all" 
          style={{ backgroundColor: 'var(--oc-step4)', color: 'var(--oc-green)' }} 
          {...props}
        >
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
    return <li style={{ color: 'var(--foreground)' }}>{children}</li>;
  },
  h1({ children }) {
    return <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0" style={{ color: 'var(--oc-accent)' }}>{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0" style={{ color: 'var(--oc-accent)' }}>{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0" style={{ color: 'var(--oc-accent)' }}>{children}</h3>;
  },
  blockquote({ children }) {
    return (
      <blockquote 
        className="pl-4 my-3 italic" 
        style={{ borderLeft: '4px solid var(--border)', color: 'var(--oc-yellow)' }}
      >
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
        className="hover:opacity-80 underline"
        style={{ color: 'var(--oc-step9)' }}
      >
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="overflow-x-auto my-3">
        <table 
          className="min-w-full border-collapse"
          style={{ border: '1px solid var(--border)' }}
        >
          {children}
        </table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th 
        className="px-3 py-2 text-left font-semibold" 
        style={{ 
          border: '1px solid var(--border)', 
          backgroundColor: 'var(--background-element)', 
          color: 'var(--oc-accent)' 
        }}
      >
        {children}
      </th>
    );
  },
  td({ children }) {
    return (
      <td 
        className="px-3 py-2"
        style={{ border: '1px solid var(--border)' }}
      >
        {children}
      </td>
    );
  },
  hr() {
    return <hr className="my-4" style={{ borderColor: 'var(--border)' }} />;
  },
  strong({ children }) {
    return <strong className="font-semibold" style={{ color: 'var(--oc-orange)' }}>{children}</strong>;
  },
  em({ children }) {
    return <em className="italic" style={{ color: 'var(--oc-yellow)' }}>{children}</em>;
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
    <div 
      className="rounded-lg my-2 overflow-hidden"
      style={{ backgroundColor: 'color-mix(in srgb, var(--background-element) 50%, transparent)' }}
    >
      <button
        onClick={() => hasContent && setExpanded(!expanded)}
        className={`w-full flex items-center gap-2 px-3 py-2 ${hasContent ? "cursor-pointer" : "cursor-default"}`}
        style={hasContent ? { 
          ['--hover-bg' as string]: 'color-mix(in srgb, var(--oc-step6) 50%, transparent)'
        } : undefined}
        onMouseEnter={(e) => hasContent && (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--oc-step6) 50%, transparent)')}
        onMouseLeave={(e) => hasContent && (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <span className={`text-xs px-1.5 py-0.5 rounded ${statusColors[status] || statusColors.pending}`}>
          {statusIcons[status] || statusIcons.pending}
        </span>
        <span 
          className="text-sm font-mono flex-1 text-left truncate"
          style={{ color: 'var(--foreground-muted)' }}
        >
          {title}
        </span>
        {hasContent && (
          <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            {expanded ? "▼" : "▶"}
          </span>
        )}
      </button>
      
      {expanded && hasContent && (
        <div className="px-3 pb-3 space-y-2">
          {input != null && (
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Input:</div>
              <pre 
                className="text-xs rounded p-2 overflow-x-auto max-h-40 overflow-y-auto"
                style={{ color: 'var(--foreground-muted)', backgroundColor: 'var(--background-panel)' }}
              >
                {typeof input === "string" ? input : JSON.stringify(input, null, 2)}
              </pre>
            </div>
          )}
          {output != null && (
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>Output:</div>
              <pre 
                className="text-xs rounded p-2 overflow-x-auto max-h-40 overflow-y-auto"
                style={{ color: 'var(--foreground-muted)', backgroundColor: 'var(--background-panel)' }}
              >
                {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
              </pre>
            </div>
          )}
          {error != null && (
            <div>
              <div className="text-xs text-red-500 mb-1">Error:</div>
              <pre 
                className="text-xs text-red-400 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto"
                style={{ backgroundColor: 'var(--background-panel)' }}
              >
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
  const agents = useAppStore((state) => state.agents);
  const { modelID, agent, finish, time } = message.info;
  
  if (!finish && !modelID && !agent) {
    return null;
  }

  let durationText: string | null = null;
  if (finish) {
    const statusText = getFinishStatusText(finish);
    if (statusText) {
      durationText = statusText;
    } else if (time?.created && time?.completed) {
      durationText = formatDuration(time.created, time.completed);
    }
  }

  if (!agent && !modelID && !durationText) {
    return null;
  }

  return (
    <div 
      className="mt-2 pt-2 text-xs"
      style={{ 
        borderTop: '1px solid color-mix(in srgb, var(--border) 50%, transparent)',
        color: 'var(--foreground-muted)'
      }}
    >
      {agent && (
        <span style={{ color: getAgentColor(agent, agents) }}>{capitalizeAgentName(agent)}</span>
      )}
      {agent && (modelID || durationText) && <span> · </span>}
      {modelID && <span>{modelID}</span>}
      {modelID && durationText && <span> · </span>}
      {durationText && <span>{durationText}</span>}
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
  const agents = useAppStore((state) => state.agents);
  const isUser = message.info.role === "user";
  const createdTime = message.info.time?.created;
  const hasError = !!message.info.error;
  
  const textParts = message.parts.filter(p => p.type === "text" && p.text);
  const toolParts = message.parts.filter(p => p.type === "tool");
  const reasoningParts = message.parts.filter(p => p.type === "reasoning" && p.text);
  const compactionParts = message.parts.filter(p => p.type === "compaction");
  
  if (compactionParts.length > 0) {
    const isAuto = compactionParts[0]?.auto;
    return (
      <div className="flex justify-center my-4">
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--background-element) 60%, transparent)',
            color: 'var(--foreground-muted)'
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
          <span>Session compacted{isAuto ? " (auto)" : ""}</span>
          {createdTime && (
            <span style={{ color: 'var(--foreground-muted)' }}>· {formatMessageTime(createdTime)}</span>
          )}
        </div>
      </div>
    );
  }
  
  const hasVisibleContent = textParts.length > 0 || toolParts.length > 0 || reasoningParts.length > 0;
  
  if (!hasVisibleContent) {
    return null;
  }

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} mb-4`}>
      {createdTime && (
        <div className="text-xs mb-1 px-2" style={{ color: 'var(--foreground-muted)' }}>
          {formatMessageTime(createdTime)}
        </div>
      )}
      <div
        className={`max-w-[90%] lg:max-w-[80%] rounded-2xl px-4 py-3 overflow-hidden break-words ${
          isUser
            ? hasError ? "bg-red-600/80 text-white" : "bg-blue-600 text-white"
            : ""
        }`}
        style={isUser ? undefined : {
          backgroundColor: 'var(--background-element)',
          color: 'var(--foreground)',
          borderWidth: 1,
          borderStyle: 'solid',
          borderColor: 'var(--border-subtle)',
          ...(message.info.agent ? {
            borderLeftWidth: 3,
            borderLeftColor: getAgentColor(message.info.agent, agents),
          } : {})
        }}
      >
        {reasoningParts.map((part, i) => (
          <details key={`reasoning-${i}`} className="my-2">
            <summary 
              className="text-sm cursor-pointer"
              style={{ color: 'var(--foreground-muted)' }}
            >
              Thinking...
            </summary>
            <div 
              className="text-sm pl-3 mt-2 italic"
              style={{ color: 'var(--foreground-muted)', borderLeft: '2px solid var(--border)' }}
            >
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
      {hasError && (
        <div className="text-xs text-red-400 mt-1 px-2 flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Failed to send
        </div>
      )}
    </div>
  );
});

export function MessageList({ keyboardHeight = 0 }: { keyboardHeight?: number }) {
  const messages = useAppStore((state) => state.messages);
  const isLoading = useAppStore((state) => state.isLoading);
  const sessionLoadingStep = useAppStore((state) => state.sessionLoadingStep);
  const hasMoreMessages = useAppStore((state) => state.hasMoreMessages);
  const isLoadingMore = useAppStore((state) => state.isLoadingMore);
  const loadMoreMessages = useAppStore((state) => state.loadMoreMessages);
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const runningSessions = useAppStore((state) => state.runningSessions);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevSessionIdRef = useRef<string | null>(null);
  const firstMessageIdRef = useRef<string | null>(null);
  const prevScrollHeightRef = useRef<number>(0);
  // Touch-based scroll detection (more reliable on mobile than scroll events)
  const isTouchingRef = useRef(false);
  const shouldAutoScrollRef = useRef(true);

  const isSessionRunning = currentSessionId ? runningSessions.includes(currentSessionId) : false;

  // Touch events for detecting user scroll intent (more reliable on mobile)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = () => {
      isTouchingRef.current = true;
    };

    const handleTouchEnd = () => {
      isTouchingRef.current = false;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      shouldAutoScrollRef.current = distanceFromBottom < 50;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    
    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  useEffect(() => {
    if (keyboardHeight > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [keyboardHeight]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;
    
    const isNewSession = prevSessionIdRef.current !== currentSessionId;
    const currentFirstMessageId = messages[0]?.info.id;
    const hasOlderMessagesLoaded = currentFirstMessageId !== firstMessageIdRef.current && !isNewSession;
    
    if (hasOlderMessagesLoaded && prevScrollHeightRef.current > 0) {
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      container.scrollTop = scrollDiff;
    } else if (isNewSession) {
      shouldAutoScrollRef.current = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: "instant" });
        });
      });
    } else if (!isTouchingRef.current && shouldAutoScrollRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    
    prevSessionIdRef.current = currentSessionId;
    firstMessageIdRef.current = currentFirstMessageId;
    prevScrollHeightRef.current = container.scrollHeight;
  }, [messages, currentSessionId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (isSessionRunning && !isTouchingRef.current) {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const isNearBottom = distanceFromBottom < 100;
      if (isNearBottom) {
        shouldAutoScrollRef.current = true;
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [isSessionRunning]);

  useEffect(() => {
    const container = containerRef.current;
    const sentinel = topSentinelRef.current;
    if (!container || !sentinel) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMoreMessages && !isLoadingMore) {
          prevScrollHeightRef.current = container.scrollHeight;
          loadMoreMessages();
        }
      },
      { root: container, threshold: 0.1 }
    );
    
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages]);

  const SESSION_LOADING_STEP_LABELS: Record<string, string> = {
    idle: "",
    loading_messages: "Loading messages...",
    loading_todos: "Loading todos...",
    ready: "",
  };

  if (isLoading) {
    const stepLabel = SESSION_LOADING_STEP_LABELS[sessionLoadingStep] || "Loading...";
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        {stepLabel && <span className="text-sm" style={{ color: 'var(--foreground-muted)' }}>{stepLabel}</span>}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--foreground-muted)' }}>
        No messages yet. Start a conversation!
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4">
      <div ref={topSentinelRef} className="h-1" />
      
      {isLoadingMore && (
        <div className="flex justify-center mb-4">
          <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--foreground-muted)' }}>
            <span 
              className="animate-spin h-4 w-4 border-2 rounded-full"
              style={{ borderColor: 'var(--border)', borderTopColor: 'var(--foreground)' }}
            />
            Loading earlier messages...
          </span>
        </div>
      )}
      
      {messages.map((msg) => (
        <MessageBubble key={msg.info.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
