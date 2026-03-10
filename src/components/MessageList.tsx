"use client";

import { useRef, useEffect, useState, memo, useMemo } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/store";
import { fetchLazyImage } from "@/lib/opencode";
import type { SessionMessage, MessagePart, Agent } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { getAgentColor, capitalizeAgentName } from "@/lib/agentColors";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { createHighlighter, type Highlighter, type BundledLanguage } from "shiki";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTheme } from "@/contexts/ThemeContext";

// Shiki highlighter singleton
let highlighterPromise: Promise<Highlighter> | null = null;
let highlighterInstance: Highlighter | null = null;

const SUPPORTED_LANGUAGES: BundledLanguage[] = [
  "javascript", "typescript", "tsx", "jsx", "python", "rust", "go", "java",
  "c", "cpp", "csharp", "ruby", "php", "swift", "kotlin", "scala", "shell",
  "bash", "json", "yaml", "toml", "xml", "html", "css", "scss", "sql",
  "markdown", "dockerfile", "graphql", "vue", "svelte"
];

function getHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) return Promise.resolve(highlighterInstance);
  if (highlighterPromise) return highlighterPromise;
  
  highlighterPromise = createHighlighter({
    themes: ["github-dark", "github-light"],
    langs: SUPPORTED_LANGUAGES,
  }).then(h => {
    highlighterInstance = h;
    return h;
  });
  
  return highlighterPromise;
}

function useIsDarkMode(): boolean {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark";
}

// Module-level cache for lazy images (survives re-renders)
const lazyImageCache = new Map<string, string>();

function ImagePreviewModal({ 
  imageUrl, 
  onClose 
}: { 
  imageUrl: string; 
  onClose: () => void 
}) {
  const [mounted, setMounted] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const lastDistance = useRef<number | null>(null);
  const lastPosition = useRef({ x: 0, y: 0 });
  const lastTapTime = useRef<number>(0);
  
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking the backdrop itself, not children, and not zoomed
    if (e.target === e.currentTarget && scale === 1) {
      onClose();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      
      // Double-tap detection
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        resetZoom();
        lastTapTime.current = 0;
      } else {
        lastTapTime.current = now;
      }
    } else if (e.touches.length === 2) {
      // Initialize pinch distance
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      lastDistance.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (lastDistance.current !== null) {
        const delta = distance / lastDistance.current;
        setScale(prev => Math.min(Math.max(prev * delta, 0.5), 4));
      }
      lastDistance.current = distance;
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan when zoomed
      const touch = e.touches[0];
      const deltaX = touch.clientX - lastPosition.current.x;
      const deltaY = touch.clientY - lastPosition.current.y;
      setPosition(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      lastPosition.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = () => {
    lastDistance.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.5), 4));
  };

  const handleDoubleClick = () => {
    resetZoom();
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-200"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
      onClick={handleBackdropClick}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute z-10 p-3 rounded-full transition-all duration-200 active:scale-95 backdrop-blur-sm"
        style={{ 
          top: 'calc(env(safe-area-inset-top, 12px) + 16px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          color: 'rgba(255, 255, 255, 0.95)',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div 
        className="flex items-center justify-center w-full h-full overflow-hidden"
        onWheel={handleWheel}
      >
        <img
          src={imageUrl}
          alt="Preview"
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200 select-none"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: scale === 1 ? 'transform 0.2s ease-out' : 'none',
            touchAction: 'none'
          }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        />
      </div>
    </div>
  );

  // Use portal to render at document body level
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}

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
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const isDark = useIsDarkMode();

  useEffect(() => {
    if (!language) return;
    
    const langKey = language.toLowerCase() as BundledLanguage;
    if (!SUPPORTED_LANGUAGES.includes(langKey)) return;
    
    let cancelled = false;
    
    getHighlighter().then(highlighter => {
      if (cancelled) return;
      try {
        const html = highlighter.codeToHtml(code, {
          lang: langKey,
          theme: isDark ? "github-dark" : "github-light",
        });
        setHighlightedHtml(html);
      } catch {}
    });
    
    return () => { cancelled = true; };
  }, [code, language, isDark]);

  return (
    <div className="group relative my-3">
      {language && (
        <div 
          className="absolute top-0 left-0 px-2 py-1 text-xs rounded-tl rounded-br z-10"
          style={{
            color: 'var(--foreground-muted)',
            backgroundColor: 'var(--background-element)',
          }}
        >
          {language}
        </div>
      )}
      <CopyButton text={code} />
      {highlightedHtml ? (
        <div 
          className="rounded-lg overflow-x-auto text-[13px] [&>pre]:!p-4 [&>pre]:!pt-8 [&>pre]:!m-0 [&>pre]:!rounded-lg [&_code]:!bg-transparent"
          style={{ backgroundColor: 'var(--glass-bg-solid)' }}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <pre 
          className="rounded-lg p-4 pt-8 overflow-x-auto text-[13px]"
          style={{ backgroundColor: 'var(--glass-bg-solid)' }}
        >
          <code 
            className={className || ""}
            style={{ color: 'var(--foreground-muted)' }}
          >
            {children}
          </code>
        </pre>
      )}
    </div>
  );
});

const VIRTUALIZED_LINE_THRESHOLD = 500;
const VIRTUALIZED_LINE_HEIGHT = 18;

const VirtualizedOutput = memo(function VirtualizedOutput({ 
  content, 
  maxHeight = "60vh" 
}: { 
  content: string; 
  maxHeight?: string;
}) {
  const lines = useMemo(() => content.split('\n'), [content]);
  const parentRef = useRef<HTMLDivElement>(null);
  
  const rowVirtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => VIRTUALIZED_LINE_HEIGHT,
    overscan: 20,
  });

  return (
    <div
      ref={parentRef}
      className="text-xs font-mono rounded p-2 overflow-auto"
      style={{ 
        maxHeight,
        color: 'var(--foreground-muted)', 
        backgroundColor: 'var(--background-panel)' 
      }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
              whiteSpace: 'pre',
            }}
          >
            {lines[virtualRow.index]}
          </div>
        ))}
      </div>
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
  const agents = useAppStore((state) => state.agents);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const status = part.state?.status || "pending";
  const toolName = part.tool || part.toolName || "unknown";
  const input = part.state?.input;
  const output = part.state?.output;
  const error = part.state?.error;
  const hasContent = input != null || output != null || error != null;
  const timeStart = part.state?.time?.start;
  const timeEnd = part.state?.time?.end;

  const isSubagentTask = toolName.toLowerCase() === "task";
  const inputObj = input as Record<string, unknown> | null;
  const subagentInfo = isSubagentTask ? {
    category: inputObj?.category as string | undefined,
    subagentType: inputObj?.subagent_type as string | undefined,
    description: inputObj?.description as string | undefined,
    runInBackground: inputObj?.run_in_background as boolean | undefined,
  } : null;

  const subagentName = subagentInfo?.subagentType || subagentInfo?.category;
  const subagentColor = subagentName ? getAgentColor(subagentName, agents) : undefined;

  const getToolCategory = (name: string): "terminal" | "read" | "write" | "search" | "other" => {
    const lowerName = name.toLowerCase();
    if (["bash", "terminal", "shell", "interactive_bash"].includes(lowerName)) return "terminal";
    if (["read", "cat"].includes(lowerName)) return "read";
    if (["write", "edit"].includes(lowerName)) return "write";
    if (["grep", "glob", "find", "search", "ast_grep_search", "ast-grep", "ast_grep_replace", "lsp_find_references", "lsp_symbols"].includes(lowerName)) return "search";
    return "other";
  };

  const toolCategory = getToolCategory(toolName);

  const StatusIcon = () => {
    if (status === "running") {
      return (
        <svg className="w-3 h-3 animate-spin" style={{ color: 'var(--oc-cyan)' }} fill="none" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="28" strokeDashoffset="8" />
        </svg>
      );
    }
    if (status === "completed") {
      return (
        <svg className="w-3 h-3" style={{ color: 'var(--oc-green)' }} fill="none" viewBox="0 0 16 16">
          <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    }
    if (status === "error") {
      return (
        <svg className="w-3 h-3" style={{ color: 'var(--oc-red)' }} fill="none" viewBox="0 0 16 16">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    }
    return (
      <svg className="w-3 h-3" style={{ color: 'var(--foreground-muted)' }} fill="currentColor" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="3" />
      </svg>
    );
  };

  const ToolIcon = () => {
    const iconStyle = { color: 'var(--foreground-muted)', flexShrink: 0 } as const;
    const size = 14;
    switch (toolCategory) {
      case "terminal":
        return (
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={iconStyle}>
            <path d="M4 6l2.5 2L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M8 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      case "read":
        return (
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={iconStyle}>
            <path d="M9 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5L9 1z" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        );
      case "write":
        return (
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={iconStyle}>
            <path d="M11 1l4 4-9 9H2v-4l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
          </svg>
        );
      case "search":
        return (
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={iconStyle}>
            <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path d="M10 10l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        );
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={iconStyle}>
            <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <circle cx="8" cy="8" r="2" fill="currentColor"/>
          </svg>
        );
    }
  };

  const getCompactLabel = (): string => {
    if (isSubagentTask) {
      const name = subagentName ? capitalizeAgentName(subagentName) : "Task";
      const desc = subagentInfo?.description;
      if (desc && desc.length <= 40) return `${name}: ${desc}`;
      if (desc) return `${name}: ${desc.slice(0, 37)}...`;
      return name;
    }

    const inp = inputObj || {};
    
    if (toolCategory === "read" || toolCategory === "write") {
      const filePath = inp.filePath || inp.path || inp.file;
      if (filePath) {
        const parts = String(filePath).split('/');
        return parts[parts.length - 1];
      }
    }
    
    if (toolCategory === "terminal") {
      const cmd = inp.command || inp.cmd;
      if (cmd) {
        const cmdStr = String(cmd);
        return cmdStr.length > 50 ? cmdStr.slice(0, 47) + "..." : cmdStr;
      }
    }
    
    if (toolCategory === "search") {
      const pattern = inp.pattern || inp.query || inp.search;
      if (pattern) {
        const patStr = String(pattern);
        return patStr.length > 40 ? `"${patStr.slice(0, 37)}..."` : `"${patStr}"`;
      }
    }

    const title = part.state?.title;
    if (title && title !== toolName) {
      return title.length > 50 ? title.slice(0, 47) + "..." : title;
    }

    return toolName;
  };

  const outputStr = output != null ? (typeof output === "string" ? output : JSON.stringify(output, null, 2)) : "";
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outputStr) {
      await navigator.clipboard.writeText(outputStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const compactLabel = getCompactLabel();

  return (
    <div className="my-1">
      <button
        onClick={() => hasContent && setExpanded(!expanded)}
        className={`no-select inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] transition-colors ${hasContent ? "cursor-pointer" : "cursor-default"}`}
        style={{ 
          backgroundColor: expanded ? 'var(--background-element)' : 'transparent',
          color: 'var(--foreground-muted)',
        }}
        onMouseEnter={(e) => hasContent && !expanded && (e.currentTarget.style.backgroundColor = 'var(--background-element)')}
        onMouseLeave={(e) => hasContent && !expanded && (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        {isSubagentTask ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: subagentColor || 'var(--foreground-muted)', flexShrink: 0 }}>
            <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <circle cx="8" cy="8" r="2" fill="currentColor"/>
          </svg>
        ) : (
          <ToolIcon />
        )}
        <span 
          className="font-mono truncate"
          style={{ 
            color: isSubagentTask && subagentColor ? subagentColor : 'var(--foreground-muted)',
            maxWidth: '280px'
          }}
        >
          {compactLabel}
        </span>
        {isSubagentTask && subagentInfo?.runInBackground && (
          <span className="text-[10px] px-1 rounded" style={{ backgroundColor: 'var(--oc-step4)', color: 'var(--oc-cyan)' }}>bg</span>
        )}
        <StatusIcon />
        {hasContent && expanded && (
          <svg className="w-3 h-3 ml-0.5" style={{ color: 'var(--foreground-muted)' }} fill="none" viewBox="0 0 16 16">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {expanded && hasContent && (
        <div 
          className="mt-1 ml-2 pl-3 border-l-2 space-y-2"
          style={{ borderColor: 'var(--border)' }}
        >
          {input != null && (
            <details className="text-xs">
              <summary className="cursor-pointer select-none" style={{ color: 'var(--foreground-muted)' }}>
                Input
              </summary>
              <pre 
                className="mt-1 text-xs rounded p-2 overflow-x-auto max-h-40 overflow-y-auto"
                style={{ color: 'var(--foreground-muted)', backgroundColor: 'var(--background-panel)' }}
              >
                {typeof input === "string" ? input : JSON.stringify(input, null, 2)}
              </pre>
            </details>
          )}
          
          {output != null && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  Output
                  {timeStart && timeEnd && (
                    <span className="ml-1 opacity-60">({formatDuration(timeStart, timeEnd)})</span>
                  )}
                </span>
                <button
                  onClick={handleCopy}
                  className="text-[10px] px-1 py-0.5 rounded transition-colors"
                  style={{ color: copied ? 'var(--oc-green)' : 'var(--foreground-muted)' }}
                >
                  {copied ? "✓" : "Copy"}
                </button>
              </div>
              {outputStr.split('\n').length > VIRTUALIZED_LINE_THRESHOLD ? (
                <VirtualizedOutput content={outputStr} />
              ) : (
                <pre 
                  className="text-xs rounded p-2 overflow-x-auto max-h-[50vh] overflow-y-auto"
                  style={{ color: 'var(--foreground-muted)', backgroundColor: 'var(--background-panel)' }}
                >
                  {outputStr}
                </pre>
              )}
            </div>
          )}
          
          {error != null && (
            <div>
              <div className="text-xs text-red-500 mb-1">Error</div>
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
      className="mt-2 pt-2 text-[12px]"
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

interface ToolTimelineEntry {
  name: string;
  start: number;
  end?: number;
  status: string;
}

function getToolDisplayName(part: MessagePart): string {
  const toolName = part.tool || part.toolName || "tool";
  
  let inputObj: Record<string, unknown> | null = null;
  try {
    const partAny = part as unknown as Record<string, unknown>;
    const rawInput = part.state?.input ?? partAny.input ?? partAny.args;
    if (typeof rawInput === "string") {
      inputObj = JSON.parse(rawInput);
    } else if (rawInput && typeof rawInput === "object") {
      inputObj = rawInput as Record<string, unknown>;
    }
  } catch { /* ignore */ }
  
  if (inputObj) {
    const filePath = inputObj.filePath || inputObj.path || inputObj.file;
    if (filePath) {
      const segments = String(filePath).split('/');
      return segments[segments.length - 1];
    }
    
    const cmd = inputObj.command || inputObj.cmd;
    if (cmd) {
      const cmdStr = String(cmd);
      return cmdStr.length > 30 ? cmdStr.slice(0, 27) + "..." : cmdStr;
    }
    
    const pattern = inputObj.pattern || inputObj.query || inputObj.search;
    if (pattern) {
      const patStr = String(pattern);
      return patStr.length > 25 ? `"${patStr.slice(0, 22)}..."` : `"${patStr}"`;
    }
  }
  
  const title = part.state?.title;
  if (title) {
    if (title.includes('/')) {
      const segments = title.split('/');
      return segments[segments.length - 1];
    }
    return title.length > 30 ? title.slice(0, 27) + "..." : title;
  }
  
  return toolName;
}

function ToolTimeline({ toolParts }: { toolParts: MessagePart[] }) {
  const entries = useMemo(() => {
    const result: ToolTimelineEntry[] = [];
    for (const part of toolParts) {
      const start = part.state?.time?.start;
      if (!start) continue;
      result.push({
        name: getToolDisplayName(part),
        start,
        end: part.state?.time?.end,
        status: part.state?.status || "pending",
      });
    }
    return result.sort((a, b) => a.start - b.start);
  }, [toolParts]);

  if (entries.length < 2) return null;

  const minTime = entries[0]?.start || 0;
  const maxTime = Math.max(...entries.map(e => e.end || e.start));
  const totalDuration = maxTime - minTime;
  if (totalDuration <= 0) return null;

  const statusColors: Record<string, string> = {
    pending: "var(--oc-yellow)",
    running: "var(--oc-cyan)",
    completed: "var(--oc-green)",
    error: "var(--oc-red)",
  };

  return (
    <div className="my-2">
      <div className="text-[11px] mb-1" style={{ color: 'var(--foreground-muted)' }}>
        Tool Timeline ({formatDuration(minTime, maxTime)})
      </div>
      <div 
        className="relative h-6 rounded overflow-hidden"
        style={{ backgroundColor: 'var(--background-panel)' }}
      >
        {entries.map((entry, i) => {
          const left = ((entry.start - minTime) / totalDuration) * 100;
          const width = (((entry.end || entry.start) - entry.start) / totalDuration) * 100 || 2;
          return (
            <div
              key={i}
              className="absolute h-full flex items-center"
              style={{
                left: `${left}%`,
                width: `${Math.max(width, 2)}%`,
                minWidth: '4px',
              }}
              title={`${entry.name}: ${entry.end ? formatDuration(entry.start, entry.end) : 'running...'}`}
            >
              <div 
                className="h-3 w-full rounded-sm"
                style={{ 
                  backgroundColor: statusColors[entry.status] || statusColors.pending,
                  opacity: 0.8,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 mt-1 text-[10px]" style={{ color: 'var(--foreground-muted)' }}>
        {entries.slice(0, 5).map((entry, i) => (
          <span key={i} className="flex items-center gap-1">
            <span 
              className="w-2 h-2 rounded-sm"
              style={{ backgroundColor: statusColors[entry.status] || statusColors.pending }}
            />
            <span className="truncate max-w-[80px]">{entry.name}</span>
          </span>
        ))}
        {entries.length > 5 && <span>+{entries.length - 5} more</span>}
      </div>
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
  const retryMessage = useAppStore((state) => state.retryMessage);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const isUser = message.info.role === "user";
  const createdTime = message.info.time?.created;
  const hasError = !!message.info.error;
  const isThinking = !isUser && !message.info.finish;
  
  const fileParts = message.parts.filter(p => p.type === "file" && p.url && p.mime?.startsWith("image/"));
  const hasImages = fileParts.length > 0;
  
  const handleImageClick = async (part: MessagePart) => {
    const url = part.url!;
    
    if (url.startsWith('data:')) {
      setPreviewImage(url);
      return;
    }
    
    if (url.startsWith('lazy:')) {
      const partId = url.slice(5);
      
      if (lazyImageCache.has(partId)) {
        setPreviewImage(lazyImageCache.get(partId)!);
        return;
      }
      
      setLoadingImages(prev => new Set(prev).add(partId));
      try {
        const dataUrl = await fetchLazyImage(partId);
        lazyImageCache.set(partId, dataUrl);
        setPreviewImage(dataUrl);
      } catch (err) {
        console.error('Failed to load image:', err);
      } finally {
        setLoadingImages(prev => {
          const next = new Set(prev);
          next.delete(partId);
          return next;
        });
      }
      return;
    }
    
    setPreviewImage(url);
  };
  
  const textParts = message.parts.filter(p => {
    if (p.type !== "text" || !p.text) return false;
    
    if (hasImages) {
      const trimmed = p.text.trim();
      if (/^(\[Image\s+\d+\]\s*)+$/.test(trimmed)) {
        return false;
      }
    }
    
    return true;
  });
  const toolParts = message.parts.filter(p => p.type === "tool");
  const reasoningParts = message.parts.filter(p => p.type === "reasoning" && p.text);
  const compactionParts = message.parts.filter(p => p.type === "compaction");
  
  if (compactionParts.length > 0) {
    const isAuto = compactionParts[0]?.auto;
    return (
      <div className="flex justify-center my-4">
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px]"
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
  
  const hasVisibleContent = textParts.length > 0 || toolParts.length > 0 || reasoningParts.length > 0 || fileParts.length > 0;
  
  if (!hasVisibleContent) {
    return null;
  }

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} mb-4`}>
      {createdTime && (
        <div className="text-[12px] mb-1 px-2" style={{ color: 'var(--foreground-muted)' }}>
          {formatMessageTime(createdTime)}
        </div>
      )}
      <div
        className={`max-w-[90%] lg:max-w-[80%] rounded-2xl px-4 py-3 overflow-hidden break-words text-[14px] ${
          isUser
            ? hasError ? "bg-red-600/80 text-white" : "bg-blue-600 text-white"
            : ""
        }`}
        style={isUser ? undefined : {
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid var(--glass-border)',
          boxShadow: 'var(--glass-shadow)',
          color: 'var(--foreground)',
          ...(message.info.agent ? {
            borderLeftWidth: 3,
            borderLeftColor: getAgentColor(message.info.agent, agents),
          } : {})
        }}
      >
        {reasoningParts.map((part, i) => (
          <details key={`reasoning-${i}`} className="my-2" open={isThinking && i === reasoningParts.length - 1}>
            <summary 
              className="text-[13px] cursor-pointer flex items-center gap-2"
              style={{ color: 'var(--foreground-muted)' }}
            >
              {isThinking && i === reasoningParts.length - 1 ? (
                <>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '300ms' }} />
                  </span>
                  <span>Thinking</span>
                </>
              ) : (
                <span>Thought process</span>
              )}
            </summary>
            <div 
              className="text-[13px] pl-3 mt-2 prose prose-invert prose-sm max-w-none"
              style={{ color: 'var(--foreground-muted)', borderLeft: '2px solid var(--border)' }}
            >
              <MarkdownContent text={part.text!} />
            </div>
          </details>
        ))}
        
        {fileParts.map((part, i) => {
          const isLazy = part.url?.startsWith('lazy:');
          const partId = isLazy ? part.url!.slice(5) : null;
          const isLoading = partId ? loadingImages.has(partId) : false;
          
          return (
            <button
              key={`file-${part.id || i}`}
              onClick={() => handleImageClick(part)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-medium mr-1.5 mb-1.5 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-60 disabled:cursor-wait"
              style={{ 
                backgroundColor: 'var(--oc-step4)', 
                color: 'var(--oc-step11)',
                border: '1px solid var(--oc-step6)'
              }}
            >
              {isLoading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              {isLoading ? 'Loading...' : `Image ${i + 1}`}
            </button>
          );
        })}

        {textParts.map((part, i) => (
          <div key={`text-${i}`} className="prose prose-invert prose-sm max-w-none text-[14px]">
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

        {!isUser && toolParts.length >= 2 && <ToolTimeline toolParts={toolParts} />}

        {!isUser && <MessageFooter message={message} />}
      </div>
      {hasError && (
        <div className="text-[12px] text-red-400 mt-1 px-2 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Failed to send
          </div>
          <button
            onClick={() => retryMessage(message.info.id)}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-blue-400 hover:bg-blue-400/10 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      )}
      {previewImage && (
        <ImagePreviewModal 
          imageUrl={previewImage} 
          onClose={() => setPreviewImage(null)} 
        />
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevSessionIdRef = useRef<string | null>(null);
  const firstMessageIdRef = useRef<string | null>(null);
  const prevScrollHeightRef = useRef<number>(0);

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
        {stepLabel && <span className="text-[13px]" style={{ color: 'var(--foreground-muted)' }}>{stepLabel}</span>}
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
    <StickToBottom
      className="flex-1 overflow-y-auto overflow-x-hidden relative"
      resize="smooth"
      initial="smooth"
    >
      <MessageListContent
        messages={messages}
        hasMoreMessages={hasMoreMessages}
        isLoadingMore={isLoadingMore}
        loadMoreMessages={loadMoreMessages}
        currentSessionId={currentSessionId}
        keyboardHeight={keyboardHeight}
        bottomRef={bottomRef}
        topSentinelRef={topSentinelRef}
        prevSessionIdRef={prevSessionIdRef}
        firstMessageIdRef={firstMessageIdRef}
        prevScrollHeightRef={prevScrollHeightRef}
      />
      <ScrollToBottomButton />
    </StickToBottom>
  );
}

interface MessageListContentProps {
  messages: SessionMessage[];
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  loadMoreMessages: () => void;
  currentSessionId: string | null;
  keyboardHeight: number;
  bottomRef: React.RefObject<HTMLDivElement | null>;
  topSentinelRef: React.RefObject<HTMLDivElement | null>;
  prevSessionIdRef: React.RefObject<string | null>;
  firstMessageIdRef: React.RefObject<string | null>;
  prevScrollHeightRef: React.RefObject<number>;
}

function MessageListContent({
  messages,
  hasMoreMessages,
  isLoadingMore,
  loadMoreMessages,
  currentSessionId,
  keyboardHeight,
  bottomRef,
  topSentinelRef,
  prevSessionIdRef,
  firstMessageIdRef,
  prevScrollHeightRef,
}: MessageListContentProps) {
  const { scrollToBottom, scrollRef } = useStickToBottomContext();

  useEffect(() => {
    if (keyboardHeight > 0) {
      requestAnimationFrame(() => {
        scrollToBottom("instant");
      });
    }
  }, [keyboardHeight, scrollToBottom]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || messages.length === 0) return;

    const isNewSession = prevSessionIdRef.current !== currentSessionId;
    const currentFirstMessageId = messages[0]?.info.id;
    const hasOlderMessagesLoaded =
      currentFirstMessageId !== firstMessageIdRef.current && !isNewSession;

    if (hasOlderMessagesLoaded && prevScrollHeightRef.current > 0) {
      const newScrollHeight = container.scrollHeight;
      const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
      container.scrollTop = scrollDiff;
    } else if (isNewSession) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom("instant");
        });
      });
    }

    prevSessionIdRef.current = currentSessionId;
    firstMessageIdRef.current = currentFirstMessageId;
    prevScrollHeightRef.current = container.scrollHeight;
  }, [messages, currentSessionId, scrollToBottom, scrollRef, prevSessionIdRef, firstMessageIdRef, prevScrollHeightRef]);

  useEffect(() => {
    const container = scrollRef.current;
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
  }, [hasMoreMessages, isLoadingMore, loadMoreMessages, scrollRef, topSentinelRef, prevScrollHeightRef]);

  return (
    <StickToBottom.Content className="flex flex-col p-4">
      <div ref={topSentinelRef} className="h-1" />

      {isLoadingMore && (
        <div className="flex justify-center mb-4">
          <span
            className="flex items-center gap-2 text-[13px]"
            style={{ color: "var(--foreground-muted)" }}
          >
            <span
              className="animate-spin h-4 w-4 border-2 rounded-full"
              style={{
                borderColor: "var(--border)",
                borderTopColor: "var(--foreground)",
              }}
            />
            Loading earlier messages...
          </span>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.info.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </StickToBottom.Content>
  );
}

function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;

  return (
    <button
      onClick={() => scrollToBottom("smooth")}
      className="absolute bottom-4 right-4 z-10 p-2 rounded-full transition-all duration-200 hover:scale-110 active:scale-95"
      style={{
        background: "var(--glass-bg)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        color: "var(--foreground-muted)",
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--glass-shadow)",
      }}
      aria-label="Scroll to bottom"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    </button>
  );
}
