"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Message = {
  id: string;
  text: string;
  createdAt: string;
  isEdited?: boolean;
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgCountRef = useRef(initialMessages.length);
  const shouldAutoScroll = useRef(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Track if user is near bottom to decide auto-scroll
  function handleScroll() {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScroll.current = distanceFromBottom < 80;
  }

  // Poll every 4 seconds — only update state & scroll if messages actually changed
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
        if (res.ok) {
          const data = await res.json() as Message[];
          // Only update if message count changed or last message ID differs
          setMessages((prev) => {
            const lastPrevId = prev[prev.length - 1]?.id;
            const lastNewId = data[data.length - 1]?.id;
            if (prev.length === data.length && lastPrevId === lastNewId) {
              return prev; // no change — skip re-render entirely
            }
            // New messages arrived
            if (data.length > lastMsgCountRef.current && shouldAutoScroll.current) {
              setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
            }
            lastMsgCountRef.current = data.length;
            return data;
          });
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
    // Reset textarea height back to single line
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, text }),
      });
      if (res.ok) {
        const newMsg = await res.json() as Message;
        setMessages((prev) => [...prev, newMsg]);
        lastMsgCountRef.current += 1;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch { /* silent */ }
    finally { setSending(false); }
  }

  async function handleEdit(msgId: string) {
    const trimmed = editText.trim();
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/chat/messages/${msgId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (res.ok) {
        const updated = await res.json() as Message;
        setMessages((prev) => prev.map((m) => m.id === msgId ? updated : m));
      }
    } catch { /* silent */ }
    setEditingId(null);
    setEditText("");
  }

  async function handleDelete(msgId: string) {
    if (!confirm("Delete this message?")) return;
    try {
      const res = await fetch(`/api/chat/messages/${msgId}`, { method: "DELETE" });
      if (res.ok) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
    } catch { /* silent */ }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });
  }

  /** Detect URLs in text and render them as clickable links */
  function renderMessageText(text: string, isOwn: boolean) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: isOwn ? "#dbeafe" : "var(--accent-2)",
            textDecoration: "underline",
            wordBreak: "break-all",
          }}
        >
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* 30-day reset notice */}
      <div
        style={{
          padding: "6px 20px",
          fontSize: "0.72rem",
          color: "var(--text-3)",
          background: "rgba(59,130,246,0.06)",
          borderBottom: "1px solid var(--border)",
          textAlign: "center",
          letterSpacing: "0.02em",
        }}
      >
        💬 Chat history is automatically cleared every 30 days
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 2 }}>
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
                position: "relative",
              }}
              onMouseEnter={() => setHoveredId(msg.id)}
              onMouseLeave={() => setHoveredId(null)}
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
                  <div style={{ fontSize: "0.72rem", color: "var(--text-3)", marginBottom: 3, display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-2)" }}>{msg.user.name}</span>
                    <span>{formatTime(msg.createdAt)}</span>
                    {msg.isEdited && <span style={{ fontStyle: "italic", opacity: 0.7 }}>(edited)</span>}
                  </div>
                )}

                {/* Edit mode */}
                {editingId === msg.id ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEdit(msg.id); }
                        if (e.key === "Escape") { setEditingId(null); setEditText(""); }
                      }}
                      className="form-input"
                      style={{ resize: "none", minHeight: 40, fontSize: "0.85rem", lineHeight: 1.5, fontFamily: "inherit" }}
                      autoFocus
                      maxLength={5000}
                    />
                    <div style={{ display: "flex", gap: 6, fontSize: "0.72rem" }}>
                      <button onClick={() => handleEdit(msg.id)} className="btn btn-primary btn-sm" style={{ fontSize: "0.72rem", padding: "3px 10px" }}>Save</button>
                      <button onClick={() => { setEditingId(null); setEditText(""); }} className="btn btn-secondary btn-sm" style={{ fontSize: "0.72rem", padding: "3px 10px" }}>Cancel</button>
                      <span style={{ color: "var(--text-3)", marginLeft: 4, alignSelf: "center" }}>Esc to cancel</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ position: "relative" }}>
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
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {renderMessageText(msg.text, isOwn)}
                    </div>

                    {/* Edit/Delete actions — only on own messages, on hover */}
                    {isOwn && hoveredId === msg.id && (
                      <div
                        style={{
                          position: "absolute",
                          top: -8,
                          right: isOwn ? undefined : -60,
                          left: isOwn ? -60 : undefined,
                          display: "flex",
                          gap: 2,
                          background: "var(--surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: 2,
                          zIndex: 10,
                        }}
                      >
                        <button
                          onClick={() => { setEditingId(msg.id); setEditText(msg.text); }}
                          title="Edit message"
                          style={{
                            background: "none",
                            border: "none",
                            padding: "4px 6px",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            borderRadius: 4,
                            color: "var(--text-2)",
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(msg.id)}
                          title="Delete message"
                          style={{
                            background: "none",
                            border: "none",
                            padding: "4px 6px",
                            fontSize: "0.8rem",
                            cursor: "pointer",
                            borderRadius: 4,
                            color: "var(--danger, #ef4444)",
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Show (edited) on grouped messages too */}
                {isGrouped && msg.isEdited && (
                  <span style={{ fontSize: "0.65rem", color: "var(--text-3)", fontStyle: "italic", marginTop: 2 }}>(edited)</span>
                )}
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
          alignItems: "flex-end",
          background: "var(--bg-2)",
        }}
      >
        <textarea
          ref={textareaRef}
          className="form-input"
          placeholder={`Message #${roomName}… (Shift+Enter for new line)`}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            // Auto-grow the textarea
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
          }}
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter inserts newline
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(e);
            }
          }}
          maxLength={5000}
          disabled={sending}
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            minHeight: 40,
            maxHeight: 200,
            lineHeight: 1.5,
            fontFamily: "inherit",
          }}
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!input.trim() || sending}
          style={{ flexShrink: 0, alignSelf: "flex-end" }}
        >
          {sending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
