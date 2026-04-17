import { CpPlatform } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Weighted score algorithm (as per PRD):
 *
 * If problem rating (P) exists and user rating (U) is known:
 *   difficultyScore = max(1, P / 400)
 *   challengeMultiplier:
 *     D = P - U
 *     D >= 300  → 1.5
 *     D >= 100  → 1.3
 *     D >= -100 → 1.0
 *     D >= -300 → 0.75
 *     else      → 0.5
 *   score = difficultyScore × challengeMultiplier
 *
 * If rating unavailable: flat score of 1.0 per unique accepted problem
 */

function computeProblemScore(problemRating: number | null, userRating: number | null): number {
  if (!problemRating) return 1.0;

  const difficultyScore = Math.max(1, problemRating / 400);

  if (!userRating) return difficultyScore;

  const D = problemRating - userRating;
  let multiplier: number;
  if (D >= 300) multiplier = 1.5;
  else if (D >= 100) multiplier = 1.3;
  else if (D >= -100) multiplier = 1.0;
  else if (D >= -300) multiplier = 0.75;
  else multiplier = 0.5;

  return difficultyScore * multiplier;
}

export async function computeWeeklyScoresForAllUsers(weekStart: Date, weekEnd: Date) {
  // Fetch all users with at least one cp profile
  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: {
      cpProfiles: true,
    },
  });

  for (const user of users) {
    await computeWeeklyScoreForUser(user.id, user.cpProfiles, weekStart, weekEnd);
  }

  // After computing all scores, snapshot ranks
  await snapshotRanks(weekStart);
}

async function computeWeeklyScoreForUser(
  userId: string,
  cpProfiles: { platform: CpPlatform; currentRating: number | null }[],
  weekStart: Date,
  weekEnd: Date,
) {
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
    const score = computeProblemScore(solve.problemRating, userRating);

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

  // Compute current streak
  const streak = await computeCurrentStreak(userId, weekEnd);

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
  // Walk backwards from asOf, counting consecutive days with at least one solve
  const stats = await prisma.dailyUserStat.findMany({
    where: { userId, date: { lte: asOf } },
    orderBy: { date: "desc" },
    take: 365,
    select: { date: true, solvedCount: true },
  });

  let streak = 0;
  let currentDate = new Date(asOf);
  currentDate.setHours(0, 0, 0, 0);

  for (const stat of stats) {
    const statDate = new Date(stat.date);
    statDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((currentDate.getTime() - statDate.getTime()) / 86400000);

    if (diffDays > 1) break; // Gap in solving
    if (stat.solvedCount > 0) {
      streak++;
      currentDate = statDate;
    } else {
      break;
    }
  }

  return streak;
}

async function snapshotRanks(weekStart: Date) {
  const scores = await prisma.weeklyScore.findMany({
    where: { weekStart },
    orderBy: { weightedScore: "desc" },
    select: { id: true },
  });

  for (let i = 0; i < scores.length; i++) {
    await prisma.weeklyScore.update({
      where: { id: scores[i].id },
      data: { rankSnapshot: i + 1 },
    });
  }
}

export function getWeekBounds(date: Date = new Date()): { weekStart: Date; weekEnd: Date } {
  // Week starts on Saturday (BD convention for weekly context) or Sunday. Using Monday.
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return { weekStart, weekEnd };
}
