"use client";

import { FormEvent, useEffect, useState } from "react";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  type: string;
  description: string;
  applyUrl: string | null;
  deadline: string | null;
  isActive: boolean;
};

type JobForm = {
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
  applyUrl: string;
  deadline: string;
};

const initialForm: JobForm = {
  title: "",
  company: "",
  location: "",
  type: "INTERNSHIP",
  description: "",
  applyUrl: "",
  deadline: "",
};

export function AdminJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [form, setForm] = useState<JobForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadJobs() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/jobs", { cache: "no-store" });
      const data = (await response.json()) as { jobs?: Job[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load jobs.");
      setJobs(data.jobs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadJobs();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          type: form.type || undefined,
        }),
      });
      const data = (await response.json()) as { job?: Job; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to create job.");
      setJobs((current) => [data.job!, ...current]);
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Remove this job listing?")) return;

    try {
      const response = await fetch("/api/admin/jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to remove job.");
      setJobs((current) => current.filter((job) => job.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove job.");
    }
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <form className="card" style={{ display: "grid", gap: 14 }} onSubmit={submit}>
        <div>
          <div className="card-title">Post a job</div>
          <div className="card-subtitle">Internships, full-time roles, and other opportunities.</div>
        </div>

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <input className="form-input" placeholder="Position (e.g. Backend Eng.)" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
          <input className="form-input" placeholder="Company (e.g. Cefalo)" value={form.company} onChange={(e) => setForm((c) => ({ ...c, company: e.target.value }))} />
          <input className="form-input" placeholder="Location" value={form.location} onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))} />
          <select className="form-input form-select" style={{
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="%23999" d="M4 6l4 4 4-4z"/></svg>')`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 10px center",
            paddingRight: "36px"
          }} value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))}>
            <option value="" disabled>
              Select type
            </option>
            <option value="INTERNSHIP">Internship</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
            <option value="REMOTE">Remote</option>
          </select>
          <input className="form-input" placeholder="Application portal link" value={form.applyUrl} onChange={(e) => setForm((c) => ({ ...c, applyUrl: e.target.value }))} />
          <label className="form-field" style={{ display: "grid", gap: 8 }}>
            <span className="form-label">Application deadline</span>
            <input className="form-input" type="date" value={form.deadline} onChange={(e) => setForm((c) => ({ ...c, deadline: e.target.value }))} />
          </label>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <button type="submit" className="btn btn-primary" disabled={saving || !form.type}>
          {saving ? "Saving..." : "Post job"}
        </button>
      </form>

      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div className="card-title">All job listings</div>
        {loading ? (
          <div className="card-subtitle">Loading jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="card-subtitle">No jobs yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {jobs.map((job) => (
              <div key={job.id} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{job.title}</div>
                  <div style={{ color: "var(--text-2)", fontSize: "0.9rem", marginTop: 4 }}>
                    {job.company}
                    {job.location ? ` • ${job.location}` : ""}
                    {job.type ? ` • ${job.type}` : ""}
                  </div>
                  <div style={{ color: "var(--text-3)", fontSize: "0.8rem", marginTop: 6 }}>
                    {job.deadline ? `Deadline: ${new Date(job.deadline).toLocaleDateString("en-GB")}` : "No deadline"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {job.applyUrl ? <a href={job.applyUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Open</a> : null}
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(job.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
