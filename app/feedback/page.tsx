"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FeedbackPage() {
  const router = useRouter();
  const [type, setType] = useState<"BUG_REPORT" | "SUGGESTION">("BUG_REPORT");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: title.trim(), description: description.trim() }),
      });

      if (!res.ok) throw new Error("Failed to submit");
      setSuccess(true);
      setTitle("");
      setDescription("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 680 }}>
      <div className="page-header">
        <h1 className="page-title">🐛 Bug Report &amp; Suggestions</h1>
        <p className="page-subtitle">
          Found a bug? Have an idea? Let us know — we&apos;re always improving.
        </p>
      </div>

      {success ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "48px 24px",
            borderColor: "var(--success)",
            background: "var(--success-soft)",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--success)", marginBottom: 8 }}>
            Thanks for your feedback!
          </div>
          <p style={{ color: "var(--text-2)", marginBottom: 20, fontSize: "0.875rem" }}>
            We&apos;ll review it shortly. Your input helps make this platform better for everyone.
          </p>
          <div className="flex-center gap-3">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSuccess(false)}
            >
              Submit another
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => router.push("/")}>
              Back to home
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card" style={{ display: "grid", gap: 20 }}>
          {/* Type selector */}
          <div className="form-field">
            <label className="form-label">Type</label>
            <div className="flex gap-2">
              {(["BUG_REPORT", "SUGGESTION"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`btn btn-sm ${type === t ? "btn-primary" : "btn-secondary"}`}
                >
                  {t === "BUG_REPORT" ? "🐛 Bug" : "💡 Suggestion"}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="form-field">
            <label className="form-label" htmlFor="fb-title">Title</label>
            <input
              id="fb-title"
              className="form-input"
              placeholder={
                type === "BUG_REPORT"
                  ? "e.g. Heatmap not loading on mobile"
                  : "e.g. Add dark mode toggle"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          {/* Description */}
          <div className="form-field">
            <label className="form-label" htmlFor="fb-desc">Details</label>
            <textarea
              id="fb-desc"
              className="form-input form-textarea"
              placeholder={
                type === "BUG_REPORT"
                  ? "Describe what happened, steps to reproduce, and what you expected…"
                  : "Describe your idea in detail…"
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              required
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ justifySelf: "flex-start" }}
          >
            {loading ? "Submitting…" : "Submit feedback"}
          </button>
        </form>
      )}
    </div>
  );
}
