import type { Metadata } from "next";
import { getWeekBounds } from "@/lib/scoring/weekly-score";
import { getTierForRank, TIER_CSS_CLASS, TIER_EMOJI } from "@/lib/scoring/tier";
import Link from "next/link";
import { getCachedLeaderboard } from "@/lib/public-content-cache";

export const metadata: Metadata = { title: "Leaderboard" };
export const revalidate = 300; // Refresh every 5 minutes

function formatScore(val: unknown): string {
  if (val === null || val === undefined) return "0.00";
  if (typeof val === "object" && "toFixed" in (val as object)) {
    return Number(val).toFixed(2);
  }
  return Number(val).toFixed(2);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; platform?: string }>;
}) {
  const params = await searchParams;
  const currentWeekBounds = getWeekBounds();
  const { weekStart, weekEnd } = params.week
    ? (() => {
        const ws = new Date(params.week!);
        const we = new Date(ws);
        we.setDate(ws.getDate() + 6);
        we.setHours(23, 59, 59, 999);
        return { weekStart: ws, weekEnd: we };
      })()
    : currentWeekBounds;

  const previousWeekStart = new Date(weekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const isCurrentWeekView = weekStart.toISOString() === currentWeekBounds.weekStart.toISOString();

  const scores = await getCachedLeaderboard(weekStart.toISOString());

  const weekLabel = weekStart.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const weekEndLabel = weekEnd.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">🏆 Leaderboard</h1>
            <p className="page-subtitle">
              Weekly rankings · {weekLabel} — {weekEndLabel}
            </p>
          </div>
          <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
            <Link
              href={`/leaderboard?week=${toIsoDate(previousWeekStart)}`}
              className="btn btn-secondary btn-sm"
            >
              Last week
            </Link>
            {!isCurrentWeekView && (
              <Link href="/leaderboard" className="btn btn-secondary btn-sm">
                This week
              </Link>
            )}
            <span className="badge badge-neutral">
              {scores.length} participant{scores.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Top 3 podium */}
      {scores.length >= 1 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "nowrap", overflowX: "auto" }}>
          {[0, 1, 2].map((idx) => {
            const entry = scores[idx];
            if (!entry) return null;
            const rank = entry.rankSnapshot ?? idx + 1;
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
            const tier = getTierForRank(rank);
            const initials = entry.user.name.slice(0, 2).toUpperCase();
            return (
              <div
                key={entry.id}
                className={`card card-hover`}
                style={{
                  flex: "1 0 280px",
                  textAlign: "center",
                  padding: "24px 16px",
                  borderColor: rank === 1 ? "var(--gold)" : rank === 2 ? "var(--silver)" : rank === 3 ? "var(--bronze)" : "var(--border)",
                  boxShadow: rank === 1 ? "0 0 24px var(--gold-glow)" : undefined,
                }}
              >
                <div
                  className="avatar-fallback"
                  style={{
                    width: 56,
                    height: 56,
                    fontSize: "1.2rem",
                    margin: "0 auto 12px",
                    background:
                      rank === 1
                        ? "linear-gradient(135deg, var(--gold), var(--warning))"
                        : rank === 2
                        ? "linear-gradient(135deg, var(--silver), var(--silver-2))"
                        : rank === 3
                        ? "linear-gradient(135deg, var(--bronze), var(--bronze-2))"
                        : "linear-gradient(135deg, var(--surface-2), var(--surface))",
                  }}
                >
                  {entry.user.avatarUrl ? (
                    <img src={entry.user.avatarUrl} alt="" className="avatar avatar-lg" />
                  ) : (
                    initials
                  )}
                </div>
                <Link
                  href={`/users/${entry.user.id}`}
                  style={{ fontWeight: 700, display: "inline-block", color: "var(--text)" }}
                >
                  {entry.user.name}
                </Link>
                <div className="rank-num" style={{ marginTop: 6 }}>
                  {medal ? `${medal}#${rank}` : `#${rank}`}
                </div>
                <div style={{ marginTop: 12, fontSize: "0.8rem", color: "var(--text-3)" }}>
                  <div>{entry.rawSolvedCount} problems</div>
                  <div className="mono">{formatScore(entry.weightedScore)} pts</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full table */}
      <div className="table-wrap">
        {scores.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">No data yet for this week</div>
            <div className="empty-text">
              Link your CP handles on your dashboard, sync Codeforces, and add CodeChef or AtCoder solves manually.
            </div>
            <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 8 }}>
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Rank</th>
                <th>User</th>
                <th style={{ textAlign: "center" }}>CF</th>
                <th style={{ textAlign: "center" }}>CC</th>
                <th style={{ textAlign: "center" }}>ATC</th>
                <th style={{ textAlign: "center" }}>Total</th>
                <th style={{ textAlign: "right" }}>Score</th>
                <th style={{ textAlign: "center" }}>Streak</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((entry, i) => {
                const rank = (entry.rankSnapshot ?? i + 1);
                const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
                const initials = entry.user.name.slice(0, 2).toUpperCase();
                return (
                  <tr key={entry.id}>
                    <td>
                      <span
                        className={`rank-num ${rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : ""}`}
                      >
                        {medal ? `${medal}#${rank}` : `#${rank}`}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="avatar-fallback avatar-sm"
                          style={{
                            fontSize: "0.65rem",
                            background:
                              rank <= 3
                                ? "linear-gradient(135deg, var(--accent), var(--diamond-2))"
                                : "var(--surface-2)",
                          }}
                        >
                          {entry.user.avatarUrl ? (
                            <img src={entry.user.avatarUrl} alt="" className="avatar avatar-sm" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/users/${entry.user.id}`}
                            style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.875rem", display: "inline-block" }}
                          >
                            {entry.user.name}
                          </Link>
                          {entry.user.batch && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>
                              Batch {entry.user.batch}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="platform-chip platform-cf">
                        {entry.codeforcesSolvedCount}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="platform-chip platform-cc">
                        {entry.codechefSolvedCount}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className="platform-chip platform-atc">
                        {entry.atcoderSolvedCount}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--text)" }}>
                      {entry.rawSolvedCount}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className="mono" style={{ fontWeight: 600, color: "var(--accent-2)", fontSize: "0.875rem" }}>
                        {formatScore(entry.weightedScore)}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {entry.streakAtWeekEnd > 0 ? (
                        <span className="badge badge-success" style={{ fontSize: "0.72rem" }}>
                          🔥 {entry.streakAtWeekEnd}d
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-3)", fontSize: "0.75rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Scoring explanation */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="section-title">📐 How scoring works</div>
        <div style={{ display: "grid", gap: 8, fontSize: "0.875rem", color: "var(--text-2)" }}>
          <p>Each accepted unique problem gives a <strong style={{ color: "var(--text)" }}>weighted score</strong> based on problem rating and your current platform rating.</p>
          <p><span className="mono" style={{ color: "var(--accent-2)" }}>unrated = 1 point, rated = 1 × gap_multiplier</span></p>
          <p>The gap multiplier changes exponentially by <strong style={{ color: "var(--text)" }}>10% per 100 rating gap</strong>, so the score measures relative challenge for each user.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <span className="badge" style={{ fontSize: "0.72rem" }}>+100 → 1.1×</span>
            <span className="badge" style={{ fontSize: "0.72rem" }}>+200 → 1.21×</span>
            <span className="badge" style={{ fontSize: "0.72rem" }}>+300 → 1.33×</span>
            <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>-100 → 0.91×</span>
            <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>-200 → 0.83×</span>
          </div>
        </div>
      </div>
    </div>
  );
}
