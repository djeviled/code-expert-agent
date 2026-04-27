"use client";

import { useState, useEffect, useRef } from "react";
import { Send, User, Bot, Loader } from "lucide-react";

interface Message {
  role: "user" | "agent";
  text: string;
}

interface AgentChatProps {
  userEmail: string;
}

export default function AgentChat({ userEmail }: AgentChatProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Start session on mount
  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch("/api/agent/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail }),
    })
      .then((r) => r.json())
      .then(({ sessionId, error }) => {
        if (error) {
          setError(error);
          setLoading(false);
          return;
        }
        setSessionId(sessionId);
        listenToEvents(sessionId);
      })
      .catch((err) => {
        setError("Failed to connect");
        setLoading(false);
      });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [userEmail]);

  function listenToEvents(sid: string) {
    const es = new EventSource(`/api/agent/events?sessionId=${sid}`);
    eventSourceRef.current = es;

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);

        if (event.type === "agent.message") {
          const text = event.content?.map((b: any) => b.text).join("") ?? "";
          if (text) {
            setMessages((m) => [...m, { role: "agent", text }]);
          }
        } else if (event.type === "session.status_idle") {
          setLoading(false);
        } else if (event.type === "session.status_terminated") {
          es.close();
          setLoading(false);
        } else if (event.type === "error") {
          setError(event.message || "Agent error");
          setLoading(false);
        }
      } catch (err) {
        console.error("Event parse error:", err);
      }
    };

    es.onerror = () => {
      setError("Connection lost");
      setLoading(false);
      es.close();
    };
  }

  async function sendMessage() {
    if (!sessionId || !input.trim()) return;

    const text = input.trim();
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      await fetch("/api/agent/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
    } catch (err) {
      setError("Failed to send message");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0a1a] border border-[#1e3a5f] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0a1628] to-[#1a2744] px-6 py-4 border-b border-[#1e3a5f]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#0066ff] flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Code Expert Agent</h2>
            <p className="text-xs text-[#00d4ff]">
              {sessionId ? "Connected — ask me anything" : "Initializing..."}
            </p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-[#1e3a5f] flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-[#00d4ff]" />
            </div>
            <h3 className="text-white font-medium mb-2">Ready to help</h3>
            <p className="text-gray-400 text-sm max-w-md">
              Paste your broken AI-generated code and I'll diagnose the issues, fix the errors, and get it working.
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
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
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                m.role === "user"
                  ? "bg-[#00d4ff] text-[#0a0a1a]"
                  : "bg-[#1e3a5f] text-white"
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{m.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00d4ff] to-[#0066ff] flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-[#1e3a5f] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#1e3a5f]">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-[#1e3a5f] border border-[#2d4a6f] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#00d4ff] transition-colors"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Paste your code or describe the issue..."
            disabled={!sessionId || loading}
          />
          <button
            onClick={sendMessage}
            disabled={!sessionId || loading || !input.trim()}
            className="bg-gradient-to-r from-[#00d4ff] to-[#0066ff] text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
