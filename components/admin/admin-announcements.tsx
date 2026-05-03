"use client";

import { FormEvent, useEffect, useState } from "react";

type Announcement = {
  id: string;
  content: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  createdBy?: { name: string | null; email: string | null } | null;
};

type AnnouncementForm = {
  content: string;
  startsAt: string;
  endsAt: string;
};

const initialForm: AnnouncementForm = {
  content: "",
  startsAt: "",
  endsAt: "",
};

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState<AnnouncementForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAnnouncements() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/announcements", { cache: "no-store" });
      const data = (await response.json()) as { announcements?: Announcement[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load announcements.");
      setAnnouncements(data.announcements ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load announcements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { announcement?: Announcement; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to create announcement.");
      setAnnouncements((current) => [data.announcement!, ...current]);
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create announcement.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this announcement?")) return;

    try {
      const response = await fetch("/api/admin/announcements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete announcement.");
      setAnnouncements((current) => current.filter((announcement) => announcement.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete announcement.");
    }
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <form className="card" style={{ display: "grid", gap: 14 }} onSubmit={submit}>
        <div>
          <div className="card-title">Create announcement</div>
          <div className="card-subtitle">Announcements appear on the homepage while their time window is active.</div>
        </div>

        <textarea className="form-input form-textarea" placeholder="Announcement content" value={form.content} onChange={(e) => setForm((c) => ({ ...c, content: e.target.value }))} />
        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label className="form-field" style={{ display: "grid", gap: 8 }}>
            <span className="form-label">Start (date &amp; time)</span>
            <input className="form-input" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((c) => ({ ...c, startsAt: e.target.value }))} />
          </label>
          <label className="form-field" style={{ display: "grid", gap: 8 }}>
            <span className="form-label">End (date &amp; time)</span>
            <input className="form-input" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((c) => ({ ...c, endsAt: e.target.value }))} />
          </label>
        </div>

        {error ? <div className="form-error">{error}</div> : null}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Create announcement"}
        </button>
      </form>

      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div className="card-title">All announcements</div>
        {loading ? (
          <div className="card-subtitle">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="card-subtitle">No announcements yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {announcements.map((announcement) => (
              <div key={announcement.id} className="card" style={{ padding: 16, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ color: "var(--text-2)", fontSize: "0.85rem" }}>
                    {new Date(announcement.startsAt).toLocaleString("en-GB")} to {new Date(announcement.endsAt).toLocaleString("en-GB")}
                  </div>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(announcement.id)}>Delete</button>
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{announcement.content}</div>
                {announcement.createdBy?.name ? (
                  <div style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>By {announcement.createdBy.name}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
