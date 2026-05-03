import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CpProfileForm } from "@/components/cp-profile-form";
import { CpPlatform } from "@prisma/client";
import { getWeekBounds } from "@/lib/scoring/weekly-score";
import { TIER_CSS_CLASS, TIER_EMOJI, TIER_LABELS, getTierForRank } from "@/lib/scoring/tier";
import { SyncSubmissionsButton } from "@/components/sync-submissions-button";
import { SolveEntry } from "@/components/solve-entry";

export const metadata: Metadata = { title: "Dashboard" };

const platformCards = [
  {
    platform: CpPlatform.CODEFORCES,
    title: "Codeforces",
    placeholder: "tourist",
    description: "Link your Codeforces handle to start tracking solves and rating.",
    color: "var(--cf)",
    bg: "rgba(229,115,115,0.08)",
  },
  {
    platform: CpPlatform.CODECHEF,
    title: "CodeChef",
    placeholder: "tourist",
    description: "Connect your CodeChef handle, then add solved problems manually.",
    color: "var(--cc)",
    bg: "rgba(129,201,149,0.08)",
  },
  {
    platform: CpPlatform.ATCODER,
    title: "AtCoder",
    placeholder: "tourist",
    description: "Add your AtCoder handle, then add solved problems manually.",
    color: "var(--atc)",
    bg: "rgba(95,179,240,0.08)",
  },
] as const;

function formatScore(val: unknown) {
  return Number(val ?? 0).toFixed(2);
}

const DHAKA_DATE = new Intl.DateTimeFormat("en", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getDhakaDateKey(date: Date) {
  const parts = DHAKA_DATE.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function getDhakaDayStartUtc(date: Date) {
  const [year, month, day] = getDhakaDateKey(date).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function addDhakaDays(dayStartUtc: Date, days: number) {
  const next = new Date(dayStartUtc);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

// Heatmap: last 52 weeks of daily solve data
function buildHeatmapData(dailyStats: { date: Date; solvedCount: number }[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Start from 52 weeks ago, aligned to Sunday
  const start = new Date(today);
  start.setDate(today.getDate() - 364);
  const startDay = start.getDay();
  start.setDate(start.getDate() - startDay);

  const statMap = new Map<string, number>();
  for (const s of dailyStats) {
    const key = getDhakaDateKey(new Date(s.date));
    statMap.set(key, s.solvedCount);
  }

  const weeks: { date: Date; count: number }[][] = [];
  let week: { date: Date; count: number }[] = [];
  const d = new Date(start);

  while (d <= today) {
    const key = getDhakaDateKey(d);
    week.push({ date: new Date(d), count: statMap.get(key) ?? 0 });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    d.setDate(d.getDate() + 1);
  }
  if (week.length > 0) weeks.push(week);

  return weeks;
}

function getHeatmapLevel(count: number) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function computeRollingStreak(dailyStats: { date: Date; solvedCount: number }[]) {
  const solvedDays = new Set(
    dailyStats
      .filter((stat) => stat.solvedCount > 0)
      .map((stat) => getDhakaDateKey(new Date(stat.date))),
  );

  const todayStart = getDhakaDayStartUtc(new Date());
  const todayKey = getDhakaDateKey(todayStart);
  let streak = 0;
  let cursor = solvedDays.has(todayKey) ? todayStart : addDhakaDays(todayStart, -1);

  while (solvedDays.has(getDhakaDateKey(cursor))) {
    streak++;
    cursor = addDhakaDays(cursor, -1);
  }

  return streak;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { weekStart, weekEnd } = getWeekBounds();
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      cpProfiles: { orderBy: { createdAt: "asc" } },
      weeklyScores: {
        orderBy: { weekStart: "desc" },
        take: 4,
      },
      dailyStats: {
        orderBy: { date: "desc" },
        take: 365,
      },
    },
  });

  if (!user) redirect("/login");

  const announcements = await prisma.announcement.findMany({
    where: {
      isActive: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { startsAt: "desc" },
    take: 3,
  });

  const currentWeekScore = user.weeklyScores.find(
    (w) => w.weekStart.toISOString() === weekStart.toISOString(),
  ) ?? null;

  const profileByPlatform = new Map(user.cpProfiles.map((p) => [p.platform, p]));

  // Total problem solve counts
  const totalSolves = await prisma.problemSolve.count({ where: { userId: user.id } });
  const cfSolves = await prisma.problemSolve.count({ where: { userId: user.id, platform: CpPlatform.CODEFORCES } });
  const ccSolves = await prisma.problemSolve.count({ where: { userId: user.id, platform: CpPlatform.CODECHEF } });
  const atcSolves = await prisma.problemSolve.count({ where: { userId: user.id, platform: CpPlatform.ATCODER } });

  // Leaderboard rank this week
  const thisWeekRank = currentWeekScore?.rankSnapshot ?? null;

  const tier = thisWeekRank ? getTierForRank(thisWeekRank) : null;
  const heatmapWeeks = buildHeatmapData(user.dailyStats.map((s) => ({ date: new Date(s.date), solvedCount: s.solvedCount })));
  const rollingStreak = computeRollingStreak(user.dailyStats.map((s) => ({ date: new Date(s.date), solvedCount: s.solvedCount })));

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 className="page-title">Welcome, {user.name} 👋</h1>
            <p className="page-subtitle">Here&apos;s your competitive programming overview</p>
          </div>
          <div className="flex items-center gap-3">
            <SolveEntry />
            <SyncSubmissionsButton />
            {tier && (
              <span className={`tier-badge ${TIER_CSS_CLASS[tier]}`} style={{ fontSize: "0.9rem", padding: "6px 14px" }}>
                {TIER_EMOJI[tier]} {TIER_LABELS[tier]} this week
              </span>
            )}
          </div>
        </div>
      </div>

      {announcements.length > 0 ? (
        <div className="card section">
          <div className="section-title">📢 Community announcements</div>
          <div style={{ display: "grid", gap: 12 }}>
            {announcements.map((announcement) => (
              <div key={announcement.id} className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
                <div style={{ whiteSpace: "pre-wrap", color: "var(--text)" }}>{announcement.content}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Stat row */}
      <div className="grid-4 section" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div className="stat-card">
          <div className="stat-label">Total Solved</div>
          <div className="stat-value mono">{totalSolves}</div>
          <div className="stat-sub">across all platforms</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Week (solve count)</div>
          <div className="stat-value mono">{currentWeekScore?.rawSolvedCount ?? 0}</div>
          <div className="stat-sub">
            {currentWeekScore ? `${formatScore(currentWeekScore.weightedScore)} pts` : "no data yet"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Current Streak</div>
          <div className="stat-value">
            {rollingStreak}
            <span style={{ fontSize: "1.2rem", marginLeft: 4 }}>🔥</span>
          </div>
          <div className="stat-sub">days in a row</div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="card section">
        <div className="section-title">📅 Activity heatmap</div>
        <p style={{ fontSize: "0.8rem", color: "var(--text-3)", marginBottom: 16 }}>
          Last 52 weeks · each cell = one day · darker = more problems
        </p>
        <div className="heatmap-grid">
          {heatmapWeeks.map((week, wi) => (
            <div key={wi} className="heatmap-col">
              {week.map((day, di) => (
                <div
                  key={di}
                  className="heatmap-cell"
                  data-level={getHeatmapLevel(day.count)}
                  title={`${day.date.toDateString()}: ${day.count} solved`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2" style={{ marginTop: 12, fontSize: "0.75rem", color: "var(--text-3)" }}>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <div key={l} className="heatmap-cell" data-level={l} style={{ flexShrink: 0 }} />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Platform breakdown + Weekly ranking */}
      <div className="grid-2 section">
        {/* Platform counts */}
        <div className="card">
          <div className="section-title">🎯 Problem count by platform</div>
          <div>
            <div className="count-row">
              <span className="platform-chip platform-cf">Codeforces</span>
              <span className="count-label">
                {profileByPlatform.get(CpPlatform.CODEFORCES)
                  ? `Rating: ${profileByPlatform.get(CpPlatform.CODEFORCES)?.currentRating ?? "unrated"}`
                  : "Not linked"}
              </span>
              <span className="count-value mono">{cfSolves}</span>
            </div>
            <div className="count-row">
              <span className="platform-chip platform-cc">CodeChef</span>
              <span className="count-label">
                {profileByPlatform.get(CpPlatform.CODECHEF)
                  ? `Rating: ${profileByPlatform.get(CpPlatform.CODECHEF)?.currentRating ?? "unrated"}`
                  : "Not linked"}
              </span>
              <span className="count-value mono">{ccSolves}</span>
            </div>
            <div className="count-row">
              <span className="platform-chip platform-atc">AtCoder</span>
              <span className="count-label">
                {profileByPlatform.get(CpPlatform.ATCODER)
                  ? `Rating: ${profileByPlatform.get(CpPlatform.ATCODER)?.currentRating ?? "unrated"}`
                  : "Not linked"}
              </span>
              <span className="count-value mono">{atcSolves}</span>
            </div>
          </div>
        </div>

        {/* Weekly performance */}
        <div className="card">
          <div className="section-title">📈 This week</div>
          {currentWeekScore ? (
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1 }} className="mono">
                    #{thisWeekRank}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-3)", marginTop: 4 }}>leaderboard rank</div>
                </div>
                {tier && (
                  <span className={`tier-badge ${TIER_CSS_CLASS[tier]}`}>
                    {TIER_EMOJI[tier]} {TIER_LABELS[tier]}
                  </span>
                )}
              </div>
              <div className="count-row">
                <span className="count-label">Codeforces</span>
                <span className="count-value" style={{ color: "var(--cf)" }}>
                  {currentWeekScore.codeforcesSolvedCount}
                </span>
              </div>
              <div className="count-row">
                <span className="count-label">CodeChef</span>
                <span className="count-value" style={{ color: "var(--cc)" }}>
                  {currentWeekScore.codechefSolvedCount}
                </span>
              </div>
              <div className="count-row">
                <span className="count-label">AtCoder</span>
                <span className="count-value" style={{ color: "var(--atc)" }}>
                  {currentWeekScore.atcoderSolvedCount}
                </span>
              </div>
              <div className="count-row" style={{ borderTop: "1px solid var(--border-2)", paddingTop: 10, marginTop: 4 }}>
                <span className="count-label" style={{ fontWeight: 700, color: "var(--text)" }}>Weighted score</span>
                <span className="count-value mono" style={{ color: "var(--accent-2)" }}>
                  {formatScore(currentWeekScore.weightedScore)}
                </span>
              </div>
              <Link href="/leaderboard" className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>
                View leaderboard →
              </Link>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <div className="empty-icon">⏳</div>
              <div className="empty-title">No data yet</div>
              <div className="empty-text">
                Link your handles below. Codeforces syncs automatically, and CodeChef or AtCoder solves can be added manually.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CP handles */}
      <div className="card section">
        <div className="section-heading">
          <div>
            <h2 style={{ margin: "0 0 4px" }}>CP Handles</h2>
            <p className="section-copy">Link one handle per platform. Codeforces syncs automatically, CodeChef and AtCoder are entered manually.</p>
          </div>
          <span className="badge">{user.cpProfiles.length}/3 linked</span>
        </div>
        <div className="grid platform-grid">
          {platformCards.map((pc) => (
            <CpProfileForm
              key={pc.platform}
              platform={pc.platform}
              title={pc.title}
              placeholder={pc.placeholder}
              description={pc.description}
              profile={profileByPlatform.get(pc.platform)}
              fallbackAvatarUrl={user.avatarUrl}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
