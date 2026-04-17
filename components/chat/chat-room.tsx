"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Message = {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
};

type Props = {
  roomId: string;
  roomName: string;
  initialMessages: Message[];
  currentUserId: string;
  currentUserName: string;
};

export function ChatRoom({ roomId, roomName, initialMessages, currentUserId }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Poll every 4 seconds
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
        if (res.ok) {
          const data = await res.json() as Message[];
          setMessages(data);
        }
      } catch { /* silent */ }
    }, 4000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [roomId]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, text }),
      });
      if (res.ok) {
        const newMsg = await res.json() as Message;
        setMessages((prev) => [...prev, newMsg]);
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontWeight: 700,
          background: "var(--bg-2)",
        }}
      >
        <span style={{ color: "var(--text-3)" }}>#</span>
        <span>{roomName}</span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-3)", fontWeight: 400, marginLeft: "auto" }}>
          {messages.length} messages · polling every 4s
        </span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
        {messages.length === 0 && (
          <div className="empty-state" style={{ flex: 1 }}>
            <div className="empty-icon">💬</div>
            <div className="empty-title">No messages yet</div>
            <div className="empty-text">Be the first to say something!</div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.user.id === currentUserId;
          const initials = msg.user.name.slice(0, 2).toUpperCase();
          const prevMsg = messages[i - 1];
          const isGrouped = prevMsg && prevMsg.user.id === msg.user.id &&
            new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 60000;

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                gap: 10,
                flexDirection: isOwn ? "row-reverse" : "row",
                alignItems: "flex-end",
                marginTop: isGrouped ? 2 : 12,
              }}
            >
              {!isGrouped ? (
                <div
                  className="avatar-fallback"
                  style={{
                    width: 30,
                    height: 30,
                    fontSize: "0.65rem",
                    flexShrink: 0,
                    background: isOwn ? "linear-gradient(135deg, var(--accent), var(--diamond-2))" : "var(--surface-2)",
                  }}
                >
                  {msg.user.avatarUrl ? <img src={msg.user.avatarUrl} alt="" className="avatar avatar-xs" /> : initials}
                </div>
              ) : (
                <div style={{ width: 30, flexShrink: 0 }} />
              )}

              <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isOwn ? "flex-end" : "flex-start" }}>
                {!isGrouped && (
                  <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 3, display: "flex", gap: 8 }}>
                    <span style={{ fontWeight: 600, color: "var(--text-2)" }}>{msg.user.name}</span>
                    <span>{formatTime(msg.createdAt)}</span>
                  </div>
                )}
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 12,
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                    background: isOwn ? "var(--accent)" : "var(--surface)",
                    color: isOwn ? "white" : "var(--text)",
                    borderBottomRightRadius: isOwn ? 2 : 12,
                    borderBottomLeftRadius: isOwn ? 12 : 2,
                    wordBreak: "break-word",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          gap: 10,
          background: "var(--bg-2)",
        }}
      >
        <input
          className="form-input"
          placeholder={`Message #${roomName}…`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={1000}
          disabled={sending}
          style={{ flex: 1 }}
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!input.trim() || sending}
          style={{ flexShrink: 0 }}
        >
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
