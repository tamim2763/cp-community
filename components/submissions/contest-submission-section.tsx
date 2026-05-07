"use client";

import { FormEvent, useState } from "react";

type ContestForm = {
  title: string;
  url: string;
  startTime: string;
  durationMinutes: number;
};

const initialForm: ContestForm = {
  title: "",
  url: "",
  startTime: "",
  durationMinutes: 120,
};

type Props = {
  contestCount: number;
  showSubmission: boolean;
};

export function ContestSubmissionSection({ contestCount, showSubmission }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ContestForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setToastMessage(null);

    try {
      const response = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          durationMinutes: Number(form.durationMinutes),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to submit contest.");
      }
      setForm(initialForm);
      setOpen(false);
      setToastMessage("Submitted for review. You will see it once approved.");
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit contest.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">📅 Contest Schedule</h1>
          </div>
          <div className="flex items-center" style={{ gap: 10, flexWrap: "wrap" }}>
            <span className="badge badge-neutral">{contestCount} upcoming</span>
            {showSubmission ? (
              <button type="button" className="btn btn-primary" onClick={() => setOpen((value) => !value)}>
                {open ? "Close" : "Add contest"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {toastMessage ? (
        <div className="submission-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}

      {showSubmission && open ? (
        <form className="card" style={{ display: "grid", gap: 14 }} onSubmit={submit}>
          <div>
            <div className="card-title">Add manual contest</div>
            <div className="card-subtitle">Submissions are reviewed by admins before publishing.</div>
          </div>

          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <input
              className="form-input"
              placeholder="Contest title"
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              required
            />
            <input
              className="form-input"
              placeholder="Contest URL"
              value={form.url}
              onChange={(e) => setForm((current) => ({ ...current, url: e.target.value }))}
              required
            />
            <label className="form-field" style={{ display: "grid", gap: 8 }}>
              <span className="form-label">Date &amp; Time</span>
              <input
                className="form-input"
                type="datetime-local"
                placeholder="Select the date"
                value={form.startTime}
                onChange={(e) => setForm((current) => ({ ...current, startTime: e.target.value }))}
                required
              />
            </label>
            <label className="form-field" style={{ display: "grid", gap: 8 }}>
              <span className="form-label">Duration (minutes)</span>
              <input
                className="form-input"
                type="number"
                min="1"
                placeholder="Contest duration"
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm((current) => ({
                    ...current,
                    durationMinutes: Number(e.target.value || 0),
                  }))
                }
                required
              />
            </label>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Submitting..." : "Submit contest"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
