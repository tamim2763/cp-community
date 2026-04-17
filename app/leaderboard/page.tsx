import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getWeekBounds } from "@/lib/scoring/weekly-score";
import { getTierForRank, TIER_CSS_CLASS, TIER_EMOJI } from "@/lib/scoring/tier";
import Link from "next/link";

export const metadata: Metadata = { title: "Leaderboard" };
export const revalidate = 300; // Refresh every 5 minutes

function formatScore(val: unknown): string {
  if (val === null || val === undefined) return "0.00";
  if (typeof val === "object" && "toFixed" in (val as object)) {
    return Number(val).toFixed(2);
  }
  return Number(val).toFixed(2);
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string; platform?: string }>;
}) {
  const params = await searchParams;
  const { weekStart, weekEnd } = params.week
    ? (() => {
        const ws = new Date(params.week!);
        const we = new Date(ws);
        we.setDate(ws.getDate() + 6);
        we.setHours(23, 59, 59, 999);
        return { weekStart: ws, weekEnd: we };
      })()
    : getWeekBounds();

  const scores = await prisma.weeklyScore.findMany({
    where: { weekStart },
    orderBy: { weightedScore: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatarUrl: true,
          batch: true,
          department: true,
          prizeMoneyWon: true,
          cpProfiles: {
            select: { platform: true, currentRating: true, handle: true },
          },
        },
      },
    },
  });

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

  const tierCounts = { DIAMOND: 0, PLATINUM: 0, GOLD: 0, SILVER: 0, BRONZE: 0 };
  scores.forEach((_, i) => {
    const tier = getTierForRank(i + 1);
    tierCounts[tier]++;
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
            <span className="badge badge-neutral">
              {scores.length} participant{scores.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Tier summary */}
      <div className="grid-4" style={{ marginBottom: 28 }}>
        {(["DIAMOND", "PLATINUM", "GOLD", "SILVER", "BRONZE"] as const).map((tier) => (
          <div key={tier} className={`card tier-badge ${TIER_CSS_CLASS[tier]}`}
            style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, border: "none" }}
          >
            <span style={{ fontSize: "1.5rem" }}>{TIER_EMOJI[tier]}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{tier.charAt(0) + tier.slice(1).toLowerCase()}</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>{tierCounts[tier]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top 3 podium */}
      {scores.length >= 1 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          {[1, 0, 2].map((idx) => {
            const entry = scores[idx];
            if (!entry) return null;
            const rank = idx + 1;
            const tier = getTierForRank(rank);
            const initials = entry.user.name.slice(0, 2).toUpperCase();
            const podiumOrder = idx === 0 ? 1 : idx === 1 ? 0 : 2;
            return (
              <div
                key={entry.id}
                className={`card card-hover`}
                style={{
                  flex: "1 1 200px",
                  textAlign: "center",
                  padding: "24px 16px",
                  order: podiumOrder,
                  borderColor: rank === 1 ? "var(--diamond)" : rank === 2 ? "var(--platinum)" : "var(--gold)",
                  boxShadow: rank === 1 ? "0 0 24px var(--diamond-glow)" : undefined,
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
                        ? "linear-gradient(135deg, var(--diamond), var(--accent))"
                        : rank === 2
                        ? "linear-gradient(135deg, var(--platinum-2), var(--silver))"
                        : "linear-gradient(135deg, var(--gold), var(--bronze))",
                  }}
                >
                  {entry.user.avatarUrl ? (
                    <img src={entry.user.avatarUrl} alt="" className="avatar avatar-lg" />
                  ) : (
                    initials
                  )}
                </div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{entry.user.name}</div>
                <span className={`tier-badge ${TIER_CSS_CLASS[tier]}`}>
                  {TIER_EMOJI[tier]} #{rank}
                </span>
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
              Link your CP handles on your dashboard and sync will run automatically every 6 hours.
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
                <th>Tier</th>
                <th style={{ textAlign: "center" }}>CF</th>
                <th style={{ textAlign: "center" }}>CC</th>
                <th style={{ textAlign: "center" }}>ATC</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "right" }}>Score</th>
                <th style={{ textAlign: "center" }}>Streak</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((entry, i) => {
                const rank = (entry.rankSnapshot ?? i + 1);
                const tier = getTierForRank(rank);
                const initials = entry.user.name.slice(0, 2).toUpperCase();
                return (
                  <tr key={entry.id}>
                    <td>
                      <span
                        className={`rank-num ${rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : ""}`}
                      >
                        #{rank}
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
                          <div style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.875rem" }}>
                            {entry.user.name}
                          </div>
                          {entry.user.batch && (
                            <div style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>
                              Batch {entry.user.batch}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`tier-badge ${TIER_CSS_CLASS[tier]}`} style={{ fontSize: "0.7rem" }}>
                        {TIER_EMOJI[tier]} {tier.charAt(0) + tier.slice(1).toLowerCase()}
                      </span>
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
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--text)" }}>
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
          <p>Each accepted unique problem gives a <strong style={{ color: "var(--text)" }}>weighted score</strong> based on difficulty and your current rating.</p>
          <p><span className="mono" style={{ color: "var(--accent-2)" }}>score = (problem_rating / 400) × challenge_multiplier</span></p>
          <p>Challenge multiplier increases when you solve problems harder than your rating, and decreases for easy ones — preventing leaderboard farming.</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <span className="badge" style={{ fontSize: "0.72rem" }}>+400 above → 1.5×</span>
            <span className="badge" style={{ fontSize: "0.72rem" }}>+100–400 → 1.3×</span>
            <span className="badge" style={{ fontSize: "0.72rem" }}>±100 → 1.0×</span>
            <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>-100–300 → 0.75×</span>
            <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>-300+ → 0.5×</span>
          </div>
        </div>
      </div>
    </div>
  );
}
