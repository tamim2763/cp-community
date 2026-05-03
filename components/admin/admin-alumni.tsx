"use client";

import { FormEvent, useEffect, useState } from "react";

type Alumni = {
  id: string;
  name: string;
  headline: string | null;
  imageUrl: string | null;
  linkedinUrl: string;
  batchYear: number | null;
  department: string | null;
};

type AlumniForm = {
  name: string;
  headline: string;
  bio: string;
  imageUrl: string;
  linkedinUrl: string;
  batchYear: string;
  department: string;
  achievementsText: string;
  isFeatured: boolean;
};

const initialForm: AlumniForm = {
  name: "",
  headline: "",
  bio: "",
  imageUrl: "",
  linkedinUrl: "",
  batchYear: "",
  department: "",
  achievementsText: "",
  isFeatured: false,
};

export function AdminAlumni() {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [form, setForm] = useState<AlumniForm>(initialForm);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadAlumni() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/alumni", { cache: "no-store" });
      const data = (await response.json()) as { alumni?: Alumni[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load alumni.");
      setAlumni(data.alumni ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alumni.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAlumni();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/alumni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          batchYear: form.batchYear ? Number(form.batchYear) : null,
        }),
      });
      const data = (await response.json()) as { alumni?: Alumni; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to create alumni profile.");
      setForm(initialForm);
      setImagePreview(null);
      setAlumni((current) => [data.alumni!, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create alumni profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImageChange(file: File | null) {
    if (!file) {
      setForm((current) => ({ ...current, imageUrl: "" }));
      setImagePreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setForm((current) => ({ ...current, imageUrl: result }));
      setImagePreview(result || null);
    };
    reader.readAsDataURL(file);
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this alumni profile?")) return;

    try {
      const response = await fetch("/api/admin/alumni", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete alumni profile.");
      setAlumni((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete alumni profile.");
    }
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <form className="card" style={{ display: "grid", gap: 14 }} onSubmit={submit}>
        <div>
          <div className="card-title">Add alumni profile</div>
        </div>

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <input className="form-input" placeholder="Name" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          <input className="form-input" placeholder="Headline (e.g. ICPC asia west finalist)" value={form.headline} onChange={(e) => setForm((c) => ({ ...c, headline: e.target.value }))} />
          <input className="form-input" placeholder="LinkedIn URL" value={form.linkedinUrl} onChange={(e) => setForm((c) => ({ ...c, linkedinUrl: e.target.value }))} />
        </div>

        <div className="form-field">
          <label className="form-label">Profile image</label>
          <input
            className="form-input"
            type="file"
            accept="image/*"
            onChange={(e) => void handleImageChange(e.target.files?.[0] ?? null)}
          />
          <div className="form-hint">Upload an image from your device. Max 5MB.</div>
        </div>

        {imagePreview ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={imagePreview}
              alt="Selected profile preview"
              style={{ width: 72, height: 72, borderRadius: 999, objectFit: "cover", border: "1px solid var(--border)" }}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void handleImageChange(null)}
            >
              Remove image
            </button>
          </div>
        ) : null}

        {error ? <div className="form-error">{error}</div> : null}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Add alumni profile"}
        </button>
      </form>

      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div className="card-title">Current profiles</div>
        {loading ? (
          <div className="card-subtitle">Loading profiles...</div>
        ) : alumni.length === 0 ? (
          <div className="card-subtitle">No profiles yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {alumni.map((item) => (
              <div key={item.id} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} style={{ width: 56, height: 56, borderRadius: 999, objectFit: "cover" }} />
                  ) : (
                    <div className="navbar-avatar" style={{ width: 56, height: 56 }}>{item.name.slice(0, 2).toUpperCase()}</div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: "var(--text-2)", fontSize: "0.9rem" }}>{item.headline ?? "No headline"}</div>
                    <div style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>
                      {item.batchYear ? `Batch ${item.batchYear}` : ""} {item.department ? `• ${item.department}` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <a href={item.linkedinUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">LinkedIn</a>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(item.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
