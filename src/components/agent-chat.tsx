"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, User, Bot, Loader, AlertCircle, Github, Globe, Database, Wrench } from "lucide-react";
import { marked } from "marked";

interface Message {
  role: "user" | "agent";
  text: string;
  streaming?: boolean;
}

interface AgentChatProps {
  userEmail: string;
}

interface ToolEvent {
  server: string;
  tool: string;
}

// Configure marked for safe HTML rendering
marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text: string): string {
  try {
    return marked.parse(text) as string;
  } catch {
    return text.replace(/\n/g, "<br>");
  }
}

const SERVER_ICONS: Record<string, React.ReactNode> = {
  github:   <Github className="w-3 h-3" />,
  vercel:   <Globe className="w-3 h-3" />,
  supabase: <Database className="w-3 h-3" />,
};

const SERVER_COLORS: Record<string, string> = {
  github:   "text-white bg-gray-700/60",
  vercel:   "text-white bg-black/60",
  supabase: "text-emerald-300 bg-emerald-900/40",
};

export default function AgentChat({ userEmail }: AgentChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ToolEvent | null>(null);
  const [agentStatus, setAgentStatus] = useState<"idle" | "thinking" | "streaming">("idle");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Pre-fill input from sessionStorage (set by dashboard prompt cards)
  useEffect(() => {
    const prefill = sessionStorage.getItem("chat_prefill");
    if (prefill) {
      setInput(prefill);
      sessionStorage.removeItem("chat_prefill");
    }
  }, []);

  // Start session on mount
  useEffect(() => {
    if (!userEmail) return;

    setLoading(true);
    setInitError(null);

    fetch("/api/agent/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail }),
    })
      .then((r) => r.json())
      .then(({ sessionId: sid, greeting, error }) => {
        if (error || !sid) {
          setInitError(error || "Failed to connect to agent");
          setLoading(false);
          return;
        }
        setSessionId(sid);
        if (greeting) {
          setMessages([{ role: "agent", text: greeting }]);
        }
        setLoading(false);
      })
      .catch(() => {
        setInitError("Failed to connect. Please refresh the page.");
        setLoading(false);
      });

    return () => {
      abortRef.current?.abort();
    };
  }, [userEmail]);

  async function sendMessage() {
    if (!sessionId || !input.trim() || loading) return;

    const text = input.trim();
    setInput("");
    setLoading(true);
    setActiveTool(null);
    setAgentStatus("thinking");

    setMessages((m) => [...m, { role: "user", text }]);
    setMessages((m) => [...m, { role: "agent", text: "", streaming: true }]);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agent/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let agentText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "thinking") {
              setAgentStatus("thinking");
              setActiveTool(null);

            } else if (event.type === "tool") {
              // Agent is using an MCP tool — show status
              setAgentStatus("thinking");
              setActiveTool({ server: event.server || "tool", tool: event.tool || event.name || "" });

            } else if (event.type === "chunk") {
              setAgentStatus("streaming");
              setActiveTool(null);
              agentText += event.text;
              setMessages((m) => {
                const next = [...m];
                const last = next[next.length - 1];
                if (last?.role === "agent" && last.streaming) {
                  next[next.length - 1] = { ...last, text: agentText };
                }
                return next;
              });

            } else if (event.type === "done") {
              setMessages((m) => {
                const next = [...m];
                const last = next[next.length - 1];
                if (last?.role === "agent") {
                  next[next.length - 1] = { role: "agent", text: agentText, streaming: false };
                }
                return next;
              });
              setLoading(false);
              setActiveTool(null);
              setAgentStatus("idle");

            } else if (event.type === "error") {
              setMessages((m) => {
                const next = [...m];
                const last = next[next.length - 1];
                if (last?.role === "agent" && last.streaming) {
                  next[next.length - 1] = {
                    role: "agent",
                    text: `⚠️ ${event.message || "An error occurred. Please try again."}`,
                    streaming: false,
                  };
                }
                return next;
              });
              setLoading(false);
              setActiveTool(null);
              setAgentStatus("idle");
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") return;

      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === "agent" && last.streaming) {
          next[next.length - 1] = {
            role: "agent",
            text: "⚠️ Failed to get response. Please try again.",
            streaming: false,
          };
        }
        return next;
      });
      setLoading(false);
      setActiveTool(null);
      setAgentStatus("idle");
    }

    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isReady = !!sessionId && !loading;

  // Status label for the header
  const statusLabel = initError
    ? "Connection error"
    : !sessionId
    ? "Initializing..."
    : activeTool
    ? `${activeTool.server}: ${activeTool.tool.replace(/_/g, " ")}`
    : agentStatus === "thinking"
    ? "Analyzing..."
    : agentStatus === "streaming"
    ? "Responding..."
    : "Ready to rescue your code";

  return (
    <div className="flex flex-col h-full bg-[#0a0a1a] border border-[#1e3a5f] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2744] px-6 py-4 border-b border-[#1e3a5f] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#0066ff] flex items-center justify-center flex-shrink-0">
            {loading && agentStatus === "thinking" ? (
              <Loader className="w-5 h-5 text-white animate-spin" />
            ) : (
              <Bot className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-semibold">Code Expert Agent</h2>
            <p className={`text-xs truncate transition-colors ${
              activeTool
                ? "text-yellow-400"
                : agentStatus === "thinking"
                ? "text-blue-300 animate-pulse"
                : agentStatus === "streaming"
                ? "text-[#00d4ff]"
                : "text-[#00d4ff]/70"
            }`}>
              {activeTool && (
                <span className="inline-flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  {statusLabel}
                </span>
              )}
              {!activeTool && statusLabel}
            </p>
          </div>

          {/* MCP tool badge */}
          {activeTool && (
            <div className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${SERVER_COLORS[activeTool.server] || "text-white bg-white/10"}`}>
              {SERVER_ICONS[activeTool.server] || <Wrench className="w-3 h-3" />}
              {activeTool.server}
            </div>
          )}

          {/* MCP capabilities badge (idle) */}
          {!activeTool && !loading && sessionId && (
            <div className="hidden sm:flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">MCP</span>
            </div>
          )}
        </div>
      </div>

      {/* Init Error */}
      {initError && (
        <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{initError}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && !initError && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-[#1e3a5f] flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-[#00d4ff]" />
            </div>
            <h3 className="text-white font-medium mb-2">Connecting to agent...</h3>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                m.role === "user"
                  ? "bg-[#00d4ff]"
                  : "bg-gradient-to-br from-[#00d4ff] to-[#0066ff]"
              }`}
            >
              {m.role === "user" ? (
                <User className="w-4 h-4 text-[#0a0a1a]" />
              ) : (
                <Bot className="w-4 h-4 text-white" />
              )}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.role === "user"
                  ? "bg-[#00d4ff] text-[#0a0a1a]"
                  : "bg-[#1e3a5f] text-white"
              }`}
            >
              {m.role === "agent" ? (
                <div
                  className="prose prose-invert prose-sm max-w-none prose-code:bg-black/40 prose-code:px-1 prose-code:rounded prose-pre:bg-black/60 prose-pre:border prose-pre:border-white/10"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(m.text) }}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm">{m.text}</p>
              )}
              {m.streaming && (
                <span className="inline-block w-1.5 h-4 bg-[#00d4ff] animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          </div>
        ))}

        {/* Initial loading state */}
        {loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <Loader className="w-8 h-8 text-[#00d4ff] animate-spin mb-4" />
            <p className="text-gray-400 text-sm">Starting your session...</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#1e3a5f] flex-shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 bg-[#1e3a5f] border border-[#2d4a6f] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff] transition-colors text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isReady
                ? "Paste your code, share a GitHub link, or describe what's broken..."
                : "Waiting for connection..."
            }
            disabled={!isReady}
          />
          <button
            onClick={sendMessage}
            disabled={!isReady || !input.trim()}
            className="bg-gradient-to-r from-[#00d4ff] to-[#0066ff] text-white px-5 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-gray-600 text-xs">
            Press Enter to send · Shift+Enter for new line
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Github className="w-3 h-3" />
            <Globe className="w-3 h-3" />
            <Database className="w-3 h-3" />
            <span>MCP tools active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
