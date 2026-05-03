"use client";

import { FormEvent, useEffect, useState } from "react";

type Contest = {
  id: string;
  title: string;
  source: string;
  platform: string | null;
  url: string;
  startTime: string;
  durationMinutes: number | null;
};

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

export function AdminContests() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [form, setForm] = useState<ContestForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadContests() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/contests", { cache: "no-store" });
      const data = (await response.json()) as { contests?: Contest[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load contests.");
      setContests(data.contests ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContests();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const durationMinutes = Number(form.durationMinutes);
      const response = await fetch("/api/admin/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          platform: null,
          durationMinutes,
        }),
      });
      const data = (await response.json()) as { contest?: Contest; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to add contest.");
      setContests((current) => [data.contest!, ...current].sort((a, b) => +new Date(b.startTime) - +new Date(a.startTime)));
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add contest.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this manual contest?")) return;

    try {
      const response = await fetch("/api/admin/contests", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete contest.");
      setContests((current) => current.filter((contest) => contest.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contest.");
    }
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <form className="card" style={{ display: "grid", gap: 14 }} onSubmit={submit}>
        <div>
          <div className="card-title">Add manual contest</div>
          <div className="card-subtitle">Use this for community contests or manual schedule fixes.</div>
        </div>

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <input className="form-input" placeholder="Contest title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
          <input className="form-input" placeholder="Contest URL" value={form.url} onChange={(e) => setForm((c) => ({ ...c, url: e.target.value }))} />
          <label className="form-field" style={{ display: "grid", gap: 8 }}>
            <span className="form-label">Date &amp; Time</span>
            <input className="form-input" type="datetime-local" placeholder="Select the date" value={form.startTime} onChange={(e) => setForm((c) => ({ ...c, startTime: e.target.value }))} />
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
                setForm((c) => ({
                  ...c,
                  durationMinutes: Number(e.target.value || 0),
                }))
              }
            />
          </label>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Add contest"}
        </button>
      </form>

      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div className="card-title">Manual contests</div>
        {loading ? (
          <div className="card-subtitle">Loading contests...</div>
        ) : contests.length === 0 ? (
          <div className="card-subtitle">No manual contests yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {contests.map((contest) => (
              <div key={contest.id} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{contest.title}</div>
                  <div style={{ color: "var(--text-2)", fontSize: "0.9rem", marginTop: 4 }}>
                    {contest.source === "MANUAL" ? "CUSTOM" : contest.platform ?? "Unknown"} • {new Date(contest.startTime).toLocaleString("en-GB")}
                    {contest.durationMinutes ? ` • ${contest.durationMinutes}m` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <a href={contest.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Open</a>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(contest.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
