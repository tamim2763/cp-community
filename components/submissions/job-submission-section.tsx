"use client";

import { FormEvent, useState } from "react";

type JobForm = {
  title: string;
  company: string;
  location: string;
  type: string;
  applyUrl: string;
  deadline: string;
};

const initialForm: JobForm = {
  title: "",
  company: "",
  location: "",
  type: "INTERNSHIP",
  applyUrl: "",
  deadline: "",
};

type Props = {
  showSubmission: boolean;
};

export function JobSubmissionSection({ showSubmission }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<JobForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setToastMessage(null);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          type: form.type || undefined,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to submit job.");
      }
      setForm(initialForm);
      setOpen(false);
      setToastMessage("Submitted for review. You will see it once approved.");
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit job.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">💼 Jobs &amp; Internships</h1>
            <p className="page-subtitle">Opportunities posted for our CP community members</p>
          </div>
          {showSubmission ? (
            <button type="button" className="btn btn-primary" onClick={() => setOpen((value) => !value)}>
              {open ? "Close" : "Add job"}
            </button>
          ) : null}
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
            <div className="card-title">Post a job</div>
            <div className="card-subtitle">Submissions are reviewed by admins before publishing.</div>
          </div>

          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <input
              className="form-input"
              placeholder="Position (e.g. Backend Eng.)"
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              required
            />
            <input
              className="form-input"
              placeholder="Company (e.g. Cefalo)"
              value={form.company}
              onChange={(e) => setForm((current) => ({ ...current, company: e.target.value }))}
              required
            />
            <input
              className="form-input"
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))}
            />
            <select
              className="form-input form-select"
              style={{
                backgroundImage:
                  "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\"><path fill=\"%23999\" d=\"M4 6l4 4 4-4z\"/></svg>')",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
                paddingRight: "36px",
              }}
              value={form.type}
              onChange={(e) => setForm((current) => ({ ...current, type: e.target.value }))}
              required
            >
              <option value="" disabled>
                Select type
              </option>
              <option value="INTERNSHIP">Internship</option>
              <option value="FULL_TIME">Full-time</option>
              <option value="PART_TIME">Part-time</option>
              <option value="CONTRACT">Contract</option>
              <option value="REMOTE">Remote</option>
            </select>
            <input
              className="form-input"
              placeholder="Application portal link"
              value={form.applyUrl}
              onChange={(e) => setForm((current) => ({ ...current, applyUrl: e.target.value }))}
              required
            />
            <label className="form-field" style={{ display: "grid", gap: 8 }}>
              <span className="form-label">Application deadline</span>
              <input
                className="form-input"
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((current) => ({ ...current, deadline: e.target.value }))}
              />
            </label>
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" className="btn btn-primary" disabled={saving || !form.type}>
            {saving ? "Submitting..." : "Submit job"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
