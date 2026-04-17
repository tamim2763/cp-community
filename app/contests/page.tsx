import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Contest Schedule" };
export const revalidate = 300;

const PLATFORM_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  CODEFORCES: { bg: "rgba(229,115,115,0.12)", color: "var(--cf)", label: "Codeforces" },
  CODECHEF: { bg: "rgba(129,201,149,0.12)", color: "var(--cc)", label: "CodeChef" },
  ATCODER: { bg: "rgba(95,179,240,0.12)", color: "var(--atc)", label: "AtCoder" },
};

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function timeUntil(start: Date) {
  const now = new Date();
  const diff = start.getTime() - now.getTime();
  if (diff < 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

export default async function ContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();

  const contests = await prisma.contest.findMany({
    where: {
      isVisible: true,
      startTime: { gte: now },
      ...(params.platform && params.platform !== "ALL"
        ? { platform: params.platform as "CODEFORCES" | "CODECHEF" | "ATCODER" }
        : {}),
    },
    orderBy: { startTime: "asc" },
    take: 100,
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">📅 Contest Schedule</h1>
            <p className="page-subtitle">Upcoming programming contests · times shown in your local timezone</p>
          </div>
          <span className="badge badge-neutral">{contests.length} upcoming</span>
        </div>
      </div>

      {/* Platform filter */}
      <div className="flex gap-2" style={{ marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { key: "ALL", label: "All Platforms" },
          { key: "CODEFORCES", label: "Codeforces" },
          { key: "CODECHEF", label: "CodeChef" },
          { key: "ATCODER", label: "AtCoder" },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={key === "ALL" ? "/contests" : `/contests?platform=${key}`}
            className={`btn btn-sm ${(params.platform ?? "ALL") === key ? "btn-primary" : "btn-secondary"}`}
          >
            {label}
          </a>
        ))}
      </div>

      {contests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">No upcoming contests</div>
          <div className="empty-text">
            Contest data syncs automatically every 12 hours. Check back soon or configure your CLIST API key.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {contests.map((c) => {
            const pInfo = c.platform ? PLATFORM_COLORS[c.platform] : null;
            const startLocal = new Date(c.startTime);
            const until = timeUntil(startLocal);
            const duration = formatDuration(c.durationMinutes);

            return (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card card-hover"
                style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", flexWrap: "wrap" }}
              >
                {/* Platform badge */}
                {pInfo && (
                  <span
                    style={{
                      background: pInfo.bg,
                      color: pInfo.color,
                      padding: "4px 10px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      flexShrink: 0,
                      minWidth: 80,
                      textAlign: "center",
                    }}
                  >
                    {pInfo.label}
                  </span>
                )}

                {/* Title */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>
                    {c.title}
                    {c.isFeatured && (
                      <span className="badge" style={{ marginLeft: 8, fontSize: "0.65rem" }}>Featured</span>
                    )}
                  </div>
                </div>

                {/* Duration */}
                {duration && (
                  <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>⏱ {duration}</span>
                )}

                {/* Start time */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text)" }}>
                    {startLocal.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                    &nbsp;
                    {startLocal.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {until && (
                    <div style={{ fontSize: "0.75rem", color: "var(--accent-2)", marginTop: 2 }}>{until}</div>
                  )}
                </div>

                {/* Arrow */}
                <span style={{ color: "var(--text-3)", fontSize: "0.9rem" }}>↗</span>
              </a>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: "0.775rem", color: "var(--text-3)", textAlign: "center" }}>
        Contest data sourced from{" "}
        <a href="https://clist.by" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-2)" }}>
          clist.by
        </a>{" "}
        · Synced every 12 hours
      </p>
    </div>
  );
}
