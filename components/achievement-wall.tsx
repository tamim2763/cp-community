"use client";

import { useState } from "react";

type Achievement = {
  id: string;
  title: string | null;
  caption: string;
  imageUrl: string | null;
  platform: string | null;
  achievementDate: Date | null;
  user: {
    name: string;
    username: string | null;
    avatarUrl: string | null;
    batch: string | null;
  };
};

const PLATFORM_LABELS: Record<string, string> = {
  CODEFORCES: "Codeforces",
  CODECHEF: "CodeChef",
  ATCODER: "AtCoder",
};

type SelectedAchievement = Achievement | null;

export function AchievementWall({ achievements }: { achievements: Achievement[] }) {
  const [selectedAchievement, setSelectedAchievement] = useState<SelectedAchievement>(null);

  return (
    <>
      <div className="grid-auto">
        {achievements.map((a) => {
          const initials = a.user.name.slice(0, 2).toUpperCase();
          return (
            <div
              key={a.id}
              className="card card-hover"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                cursor: "pointer",
              }}
              onClick={() => setSelectedAchievement(a)}
            >
              {a.imageUrl && (
                <div style={{ borderRadius: "var(--radius)", overflow: "hidden", lineHeight: 0 }}>
                  <img
                    src={a.imageUrl}
                    alt={a.title ?? "Achievement"}
                    style={{ width: "100%", height: 180, objectFit: "cover" }}
                  />
                </div>
              )}

              {a.platform && (
                <span
                  className={`platform-chip platform-${a.platform.toLowerCase().replace("codeforces", "cf").replace("codechef", "cc").replace("atcoder", "atc")}`}
                  style={{ alignSelf: "flex-start" }}
                >
                  {PLATFORM_LABELS[a.platform] ?? a.platform}
                </span>
              )}

              {a.title && (
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>
                  {a.title}
                </div>
              )}

              <p style={{ fontSize: "0.85rem", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
                {a.caption}
              </p>

              <div className="flex items-center gap-2" style={{ marginTop: "auto" }}>
                <div
                  className="avatar-fallback"
                  style={{
                    width: 28,
                    height: 28,
                    fontSize: "0.65rem",
                    background: "linear-gradient(135deg, var(--accent), var(--diamond-2))",
                  }}
                >
                  {a.user.avatarUrl ? (
                    <img src={a.user.avatarUrl} alt="" className="avatar avatar-xs" />
                  ) : (
                    initials
                  )}
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>
                    {a.user.name}
                  </div>
                  {a.achievementDate && (
                    <div style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
                      {new Date(a.achievementDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal overlay */}
      {selectedAchievement && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setSelectedAchievement(null)}
        >
          <div
            className="card"
            style={{
              maxWidth: 600,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedAchievement(null)}
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "none",
                border: "none",
                color: "var(--text-2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: "50%",
                transition: "all 0.2s",
                zIndex: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--surface-2)";
                e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "var(--text-2)";
              }}
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Content */}
            <div style={{ display: "grid", gap: 16, paddingRight: 40 }}>
              {selectedAchievement.imageUrl && (
                <div style={{ borderRadius: "var(--radius)", overflow: "hidden", lineHeight: 0 }}>
                  <img
                    src={selectedAchievement.imageUrl}
                    alt={selectedAchievement.title ?? "Achievement"}
                    style={{ width: "100%", height: "auto", maxHeight: 400, objectFit: "cover" }}
                  />
                </div>
              )}

              {selectedAchievement.platform && (
                <span
                  className={`platform-chip platform-${selectedAchievement.platform.toLowerCase().replace("codeforces", "cf").replace("codechef", "cc").replace("atcoder", "atc")}`}
                  style={{ alignSelf: "flex-start" }}
                >
                  {PLATFORM_LABELS[selectedAchievement.platform] ?? selectedAchievement.platform}
                </span>
              )}

              {selectedAchievement.title && (
                <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 700, color: "var(--text)" }}>
                  {selectedAchievement.title}
                </h2>
              )}

              <p style={{ fontSize: "0.95rem", color: "var(--text-2)", lineHeight: 1.7, margin: 0 }}>
                {selectedAchievement.caption}
              </p>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                <div className="flex items-center gap-3">
                  <div
                    className="avatar-fallback"
                    style={{
                      width: 40,
                      height: 40,
                      fontSize: "0.8rem",
                      background: "linear-gradient(135deg, var(--accent), var(--diamond-2))",
                    }}
                  >
                    {selectedAchievement.user.avatarUrl ? (
                      <img src={selectedAchievement.user.avatarUrl} alt="" className="avatar avatar-md" />
                    ) : (
                      selectedAchievement.user.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" }}>
                      {selectedAchievement.user.name}
                    </div>
                    {selectedAchievement.user.batch && (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-3)" }}>
                        Batch {selectedAchievement.user.batch}
                      </div>
                    )}
                    {selectedAchievement.achievementDate && (
                      <div style={{ fontSize: "0.8rem", color: "var(--text-3)", marginTop: 2 }}>
                        {new Date(selectedAchievement.achievementDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
