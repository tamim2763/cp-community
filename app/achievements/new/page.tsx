"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewAchievementPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [achievementDate, setAchievementDate] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim()) { setError("Caption is required."); return; }
    if (!imageFile) { setError("Please upload an image."); return; }
    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("file", imageFile);

      const uploadRes = await fetch("/api/uploads/achievement", {
        method: "POST",
        body: fd,
      });
      const uploadData = await uploadRes.json() as { secure_url?: string; public_id?: string; error?: string };
      if (!uploadRes.ok || !uploadData.secure_url) {
        throw new Error(uploadData.error ?? "Image upload failed");
      }

      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || null,
          caption: caption.trim(),
          achievementDate: achievementDate || null,
          imageUrl: uploadData.secure_url,
          imagePublicId: uploadData.public_id,
        }),
      });

      if (!res.ok) throw new Error("Submission failed");
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="page-container" style={{ maxWidth: 640 }}>
        <div className="card" style={{ textAlign: "center", padding: "48px 24px", borderColor: "var(--success)", background: "var(--success-soft)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎉</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--success)", marginBottom: 8 }}>Achievement submitted!</div>
          <p style={{ color: "var(--text-2)", fontSize: "0.875rem", marginBottom: 20 }}>
            It&apos;s pending admin approval and will appear on the wall once approved.
          </p>
          <div className="flex-center gap-3">
            <button className="btn btn-secondary btn-sm" onClick={() => { setSuccess(false); setCaption(""); setTitle(""); setImageFile(null); setPreview(null); }}>
              Submit another
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => router.push("/achievements")}>
              View wall
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <h1 className="page-title">🏅 Share Achievement</h1>
        <p className="page-subtitle">Celebrate your win — it inspires others in the community</p>
      </div>

      <form onSubmit={handleSubmit} className="card" style={{ display: "grid", gap: 20 }}>
        <div className="form-field">
          <label className="form-label">Screenshot / Image *</label>
          <div
            style={{
              border: "2px dashed var(--border-2)",
              borderRadius: "var(--radius)",
              padding: preview ? 0 : "32px 16px",
              textAlign: "center",
              cursor: "pointer",
              overflow: "hidden",
              background: "var(--bg-3)",
              transition: "border-color 0.2s",
            }}
            onClick={() => document.getElementById("ach-image")?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" style={{ width: "100%", maxHeight: 300, objectFit: "contain" }} />
            ) : (
              <div style={{ color: "var(--text-3)", fontSize: "0.875rem" }}>
                <div style={{ fontSize: "2rem", marginBottom: 8 }}>📷</div>
                Click to upload · Max 5MB · JPG, PNG, WebP
              </div>
            )}
          </div>
          <input id="ach-image" type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="ach-title">Title (optional)</label>
          <input id="ach-title" className="form-input" placeholder="e.g. Reached Expert on Codeforces!" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
        </div>

        <div className="form-field">
          <label className="form-label" htmlFor="ach-caption">Caption *</label>
          <textarea id="ach-caption" className="form-input form-textarea" placeholder="Tell us about this achievement..." value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} required />
        </div>

        <div className="form-field">
          <label className="form-label">Date (optional)</label>
          <input type="date" className="form-input" value={achievementDate} onChange={(e) => setAchievementDate(e.target.value)} />
        </div>

        {error && <p className="form-error">{error}</p>}

        <p className="form-hint">Posts are reviewed by admins before appearing on the wall.</p>

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifySelf: "flex-start" }}>
          {loading ? "Uploading…" : "Submit achievement"}
        </button>
      </form>
    </div>
  );
}
