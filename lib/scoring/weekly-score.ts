import { CpPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_WEEKLY_SCORING_CONFIG,
  getWeeklyScoringConfig,
  type WeeklyScoringConfig,
} from "@/lib/scoring/config";

const DHAKA_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getDhakaDateKey(date: Date): string {
  return DHAKA_DATE.format(date);
}

function getDhakaDayStartUtc(date: Date): Date {
  const [year, month, day] = getDhakaDateKey(date).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function addDhakaDays(dayStartUtc: Date, days: number): Date {
  const next = new Date(dayStartUtc);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Cross-platform CP leaderboard scoring.
 *
 * There is no single universal public standard for CF + CC + AtCoder
 * practice leaderboards, so we use a simple exponential gap multiplier:
 *
 * - unrated problem → 1 point
 * - rated problem → base score = 1
 * - then compare problem rating vs current platform rating
 * - every 100 rating gap changes the multiplier by 10%, exponentially
 *   harder: 1.1^steps, easier: 1 / 1.1^steps
 */

function getGapSteps(problemRating: number, userRating: number, gapStepSize: number) {
  const gap = problemRating - userRating;

  if (gap === 0) return 0;

  return Math.max(1, Math.ceil(Math.abs(gap) / gapStepSize));
}

export function computeProblemScore(
  problemRating: number | null,
  userRating: number | null,
  config: WeeklyScoringConfig = DEFAULT_WEEKLY_SCORING_CONFIG,
): number {
  if (!problemRating) return 1.0;
  if (!userRating) return 1.0;

  const gap = problemRating - userRating;
  const steps = getGapSteps(problemRating, userRating, config.gapStepSize);
  const multiplier =
    gap > 0
      ? Math.pow(config.multiplierBase, steps)
      : 1 / Math.pow(config.multiplierBase, steps);

  return multiplier;
}

export async function computeWeeklyScoresForAllUsers(weekStart: Date, weekEnd: Date) {
  const scoringConfig = await getWeeklyScoringConfig();

  // Fetch all users with at least one cp profile
  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: {
      cpProfiles: true,
    },
  });

  for (const user of users) {
    await computeWeeklyScoreForUser(user.id, user.cpProfiles, weekStart, weekEnd, scoringConfig);
  }

  // After computing all scores, snapshot ranks
  await snapshotRanks(weekStart);
}

export async function recomputeCurrentWeekForUser(userId: string) {
  const { weekStart, weekEnd } = getWeekBounds();
  const scoringConfig = await getWeeklyScoringConfig();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      cpProfiles: {
        select: {
          platform: true,
          currentRating: true,
        },
      },
    },
  });

  if (!user) return;

  await computeWeeklyScoreForUser(user.id, user.cpProfiles, weekStart, weekEnd, scoringConfig);
  await snapshotRanks(weekStart);
}

export async function computeWeeklyScoreForUser(
  userId: string,
  cpProfiles: { platform: CpPlatform; currentRating: number | null }[],
  weekStart: Date,
  weekEnd: Date,
  scoringConfig?: WeeklyScoringConfig,
) {
  const effectiveScoringConfig = scoringConfig ?? (await getWeeklyScoringConfig());
  const ratingByPlatform = new Map(cpProfiles.map((p) => [p.platform, p.currentRating]));

  // Fetch all unique solves during this week
  const solves = await prisma.problemSolve.findMany({
    where: {
      userId,
      firstSolvedAt: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: {
      platform: true,
      problemRating: true,
      firstSolvedAt: true,
    },
  });

  let totalWeighted = 0;
  let cfSolves = 0, ccSolves = 0, atcSolves = 0;
  let cfWeighted = 0, ccWeighted = 0, atcWeighted = 0;

  for (const solve of solves) {
    const userRating = ratingByPlatform.get(solve.platform) ?? null;
    const score = computeProblemScore(solve.problemRating, userRating, effectiveScoringConfig);

    totalWeighted += score;

    switch (solve.platform) {
      case CpPlatform.CODEFORCES:
        cfSolves++;
        cfWeighted += score;
        break;
      case CpPlatform.CODECHEF:
        ccSolves++;
        ccWeighted += score;
        break;
      case CpPlatform.ATCODER:
        atcSolves++;
        atcWeighted += score;
        break;
    }
  }

  // For the active week, compute streak up to now (not week end), otherwise use the historical week end.
  const streakAsOf = weekEnd.getTime() > Date.now() ? new Date() : weekEnd;
  const streak = await computeCurrentStreak(userId, streakAsOf);

  await prisma.weeklyScore.upsert({
    where: {
      userId_weekStart: { userId, weekStart },
    },
    create: {
      userId,
      weekStart,
      weekEnd,
      rawSolvedCount: solves.length,
      weightedScore: totalWeighted,
      codeforcesSolvedCount: cfSolves,
      codechefSolvedCount: ccSolves,
      atcoderSolvedCount: atcSolves,
      codeforcesWeightedScore: cfWeighted,
      codechefWeightedScore: ccWeighted,
      atcoderWeightedScore: atcWeighted,
      streakAtWeekEnd: streak,
      computedAt: new Date(),
    },
    update: {
      rawSolvedCount: solves.length,
      weightedScore: totalWeighted,
      codeforcesSolvedCount: cfSolves,
      codechefSolvedCount: ccSolves,
      atcoderSolvedCount: atcSolves,
      codeforcesWeightedScore: cfWeighted,
      codechefWeightedScore: ccWeighted,
      atcoderWeightedScore: atcWeighted,
      streakAtWeekEnd: streak,
      computedAt: new Date(),
    },
  });
}

async function computeCurrentStreak(userId: string, asOf: Date): Promise<number> {
  const stats = await prisma.dailyUserStat.findMany({
    where: { userId, date: { lte: getDhakaDayStartUtc(asOf) } },
    orderBy: { date: "desc" },
    take: 365,
    select: { date: true, solvedCount: true },
  });

  const solvedDays = new Set(
    stats.filter((stat) => stat.solvedCount > 0).map((stat) => getDhakaDateKey(new Date(stat.date))),
  );

  const todayStart = getDhakaDayStartUtc(asOf);
  const todayKey = getDhakaDateKey(todayStart);
  let streak = 0;
  let cursor = solvedDays.has(todayKey) ? todayStart : addDhakaDays(todayStart, -1);

  while (solvedDays.has(getDhakaDateKey(cursor))) {
    streak++;
    cursor = addDhakaDays(cursor, -1);
  }

  return streak;
}

export async function snapshotRanks(weekStart?: Date) {
  const effectiveWeekStart = weekStart ?? getWeekBounds().weekStart;

  const scores = await prisma.weeklyScore.findMany({
    where: { weekStart: effectiveWeekStart },
    orderBy: [
      { weightedScore: "desc" },
      { rawSolvedCount: "desc" },
      { streakAtWeekEnd: "desc" },
      { userId: "asc" }
    ],
    select: { id: true, weightedScore: true, rawSolvedCount: true, streakAtWeekEnd: true },
  });

  let currentRank = 1;
  let displayRank = 1;

  for (let i = 0; i < scores.length; i++) {
    if (
      i > 0 &&
      scores[i].weightedScore.equals(scores[i - 1].weightedScore) &&
      scores[i].rawSolvedCount === scores[i - 1].rawSolvedCount &&
      scores[i].streakAtWeekEnd === scores[i - 1].streakAtWeekEnd
    ) {
      // Tie -> keep displayRank
    } else {
      displayRank = currentRank;
    }

    await prisma.weeklyScore.update({
      where: { id: scores[i].id },
      data: { rankSnapshot: displayRank },
    });
    currentRank++;
  }
}

export function getWeekBounds(date: Date = new Date()): { weekStart: Date; weekEnd: Date } {
  const dhakaDayStart = getDhakaDayStartUtc(date);
  const day = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Dhaka" })).getDay(); // 0=Sun
  const weekStart = addDhakaDays(dhakaDayStart, -day);
  const weekEnd = addDhakaDays(weekStart, 6);
  weekEnd.setUTCHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}
