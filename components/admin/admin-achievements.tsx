"use client";

import { useEffect, useState } from "react";

type Achievement = {
  id: string;
  title: string | null;
  caption: string;
  imageUrl: string;
  platform: string | null;
  achievementDate: string | null;
  user: {
    name: string;
    email: string;
    batch: string | null;
  };
};

export function AdminAchievements() {
  const [pendingAchievements, setPendingAchievements] = useState<Achievement[]>([]);
  const [approvedAchievements, setApprovedAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadAchievements() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/achievements", { cache: "no-store" });
      const data = (await response.json()) as { pendingAchievements?: Achievement[]; approvedAchievements?: Achievement[]; error?: string };

      if (!response.ok) throw new Error(data.error ?? "Failed to load achievements.");
      setPendingAchievements(data.pendingAchievements ?? []);
      setApprovedAchievements(data.approvedAchievements ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load achievements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAchievements();
  }, []);

  async function moderate(id: string, status: "APPROVED" | "REJECTED") {
    const rejectionReason =
      status === "REJECTED"
        ? window.prompt("Why are you rejecting this achievement?", "Needs clearer proof or caption") ?? ""
        : "";

    if (status === "REJECTED" && !rejectionReason.trim()) return;

    setBusyId(id);
    setError(null);

    try {
      const response = await fetch("/api/admin/achievements", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, rejectionReason }),
      });
      const data = (await response.json()) as { achievement?: Achievement; error?: string };

      if (!response.ok) throw new Error(data.error ?? "Failed to update achievement.");
      setPendingAchievements((current) => current.filter((achievement) => achievement.id !== id));
      if (status === "APPROVED" && data.achievement) {
        setApprovedAchievements((current) => [data.achievement!, ...current]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update achievement.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this approved achievement?")) return;

    setBusyId(id);
    setError(null);

    try {
      const response = await fetch("/api/admin/achievements", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(data.error ?? "Failed to delete achievement.");
      setApprovedAchievements((current) => current.filter((achievement) => achievement.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete achievement.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card" style={{ display: "grid", gap: 16 }}>
      <div>
        <div className="card-title">Achievement moderation</div>
        <div className="card-subtitle">Approve or reject community submissions before they appear publicly.</div>
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {loading ? (
        <div className="card-subtitle">Loading achievements...</div>
      ) : (
        <div style={{ display: "grid", gap: 24 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="card-title" style={{ fontSize: "1rem" }}>Pending achievements</div>
            {pendingAchievements.length === 0 ? (
              <div className="card-subtitle">No pending achievements right now.</div>
            ) : (
              <div className="grid-auto">
                {pendingAchievements.map((achievement) => (
                  <article key={achievement.id} className="card card-hover" style={{ display: "grid", gap: 12 }}>
                    <img
                      src={achievement.imageUrl}
                      alt={achievement.title ?? achievement.user.name}
                      style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 12 }}
                    />

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {achievement.platform ? <span className="badge badge-neutral">{achievement.platform}</span> : null}
                      {achievement.achievementDate ? (
                        <span className="badge badge-neutral">
                          {new Date(achievement.achievementDate).toLocaleDateString("en-GB")}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <div className="card-title">{achievement.title || "Untitled achievement"}</div>
                      <p style={{ color: "var(--text-2)", marginTop: 8 }}>{achievement.caption}</p>
                    </div>

                    <div style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>
                      <div style={{ color: "var(--text)", fontWeight: 600 }}>{achievement.user.name}</div>
                      <div>{achievement.user.email}</div>
                      {achievement.user.batch ? <div>Batch: {achievement.user.batch}</div> : null}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busyId === achievement.id}
                        onClick={() => void moderate(achievement.id, "APPROVED")}
                      >
                        {busyId === achievement.id ? "Saving..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busyId === achievement.id}
                        onClick={() => void moderate(achievement.id, "REJECTED")}
                      >
                        Reject
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div className="card-title" style={{ fontSize: "1rem" }}>Approved achievements</div>
            {approvedAchievements.length === 0 ? (
              <div className="card-subtitle">No approved achievements yet.</div>
            ) : (
              <div className="grid-auto">
                {approvedAchievements.map((achievement) => (
                  <article key={achievement.id} className="card card-hover" style={{ display: "grid", gap: 12 }}>
                    <img
                      src={achievement.imageUrl}
                      alt={achievement.title ?? achievement.user.name}
                      style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 12 }}
                    />

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {achievement.platform ? <span className="badge badge-neutral">{achievement.platform}</span> : null}
                      {achievement.achievementDate ? (
                        <span className="badge badge-neutral">
                          {new Date(achievement.achievementDate).toLocaleDateString("en-GB")}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <div className="card-title">{achievement.title || "Untitled achievement"}</div>
                      <p style={{ color: "var(--text-2)", marginTop: 8 }}>{achievement.caption}</p>
                    </div>

                    <div style={{ color: "var(--text-3)", fontSize: "0.85rem" }}>
                      <div style={{ color: "var(--text)", fontWeight: 600 }}>{achievement.user.name}</div>
                      <div>{achievement.user.email}</div>
                      {achievement.user.batch ? <div>Batch: {achievement.user.batch}</div> : null}
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        disabled={busyId === achievement.id}
                        onClick={() => void remove(achievement.id)}
                      >
                        {busyId === achievement.id ? "Deleting..." : "Remove"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
