import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { CpPlatform } from "@prisma/client";
import { getWeekBounds } from "@/lib/scoring/weekly-score";

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

export default async function UserStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { weekStart } = getWeekBounds();

  const user = await prisma.user.findUnique({
    where: { id },
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

  if (!user) redirect("/leaderboard");

  const currentWeekScore = user.weeklyScores.find(
    (w) => w.weekStart.toISOString() === weekStart.toISOString(),
  ) ?? null;

  const totalSolves = await prisma.problemSolve.count({ where: { userId: user.id } });
  const cfSolves = await prisma.problemSolve.count({ where: { userId: user.id, platform: CpPlatform.CODEFORCES } });
  const ccSolves = await prisma.problemSolve.count({ where: { userId: user.id, platform: CpPlatform.CODECHEF } });
  const atcSolves = await prisma.problemSolve.count({ where: { userId: user.id, platform: CpPlatform.ATCODER } });

  const rollingStreak = computeRollingStreak(
    user.dailyStats.map((s) => ({ date: new Date(s.date), solvedCount: s.solvedCount })),
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">{user.name}</h1>
          <p className="page-subtitle">Performance snapshot</p>
        </div>
      </div>

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

      <div className="grid-2 section">
        <div className="card">
          <div className="section-title">🎯 Problem count by platform</div>
          <div>
            <div className="count-row">
              <span className="platform-chip platform-cf">Codeforces</span>
              <span className="count-label">{cfSolves} solved</span>
              <span className="count-value mono">{cfSolves}</span>
            </div>
            <div className="count-row">
              <span className="platform-chip platform-cc">CodeChef</span>
              <span className="count-label">{ccSolves} solved</span>
              <span className="count-value mono">{ccSolves}</span>
            </div>
            <div className="count-row">
              <span className="platform-chip platform-atc">AtCoder</span>
              <span className="count-label">{atcSolves} solved</span>
              <span className="count-value mono">{atcSolves}</span>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="section-title">📈 Weekly score</div>
          {currentWeekScore ? (
            <div>
              <div className="count-row">
                <span className="count-label">Weighted score</span>
                <span className="count-value mono" style={{ color: "var(--accent-2)" }}>
                  {formatScore(currentWeekScore.weightedScore)}
                </span>
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
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <div className="empty-icon">⏳</div>
              <div className="empty-title">No data yet</div>
              <div className="empty-text">No weekly score for this user yet.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
