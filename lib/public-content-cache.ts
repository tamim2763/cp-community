import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/prisma";
import { getWeekBounds } from "@/lib/scoring/weekly-score";

const CACHE_TTL_SECONDS = 300;

export const getCachedAchievements = unstable_cache(
  async () => {
    return prisma.achievement.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { name: true, username: true, avatarUrl: true, batch: true } },
      },
    });
  },
  ["public-achievements"],
  { revalidate: CACHE_TTL_SECONDS, tags: ["public-achievements"] },
);

export const getCachedResources = unstable_cache(
  async (selectedCategory?: string) => {
    const allowedCategories = ["problem-solving-sheets", "topic-lists-and-tracks"] as const;

    return prisma.resourceCategory.findMany({
      orderBy: { sortOrder: "asc" },
      where: {
        slug: {
          in: [...allowedCategories],
        },
        ...(selectedCategory ? { slug: selectedCategory } : {}),
      },
      include: {
        resources: {
          where: {
            isPublished: true,
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  },
  ["public-resources"],
  { revalidate: CACHE_TTL_SECONDS, tags: ["public-resources"] },
);

export const getCachedJobs = unstable_cache(
  async () => {
    return prisma.job.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
  },
  ["public-jobs"],
  { revalidate: CACHE_TTL_SECONDS, tags: ["public-jobs"] },
);

export const getCachedContests = unstable_cache(
  async (selectedPlatform?: string) => {
    const now = new Date();

    return prisma.contest.findMany({
      where: {
        isVisible: true,
        startTime: { gte: now },
        ...(selectedPlatform && selectedPlatform !== "ALL"
          ? { platform: selectedPlatform as "CODEFORCES" | "CODECHEF" | "ATCODER" }
          : {}),
      },
      orderBy: { startTime: "asc" },
      take: 100,
    });
  },
  ["public-contests"],
  { revalidate: CACHE_TTL_SECONDS, tags: ["public-contests"] },
);

export const getCachedMotivation = unstable_cache(
  async () => {
    return prisma.motivationalProfile.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  },
  ["public-motivation"],
  { revalidate: CACHE_TTL_SECONDS, tags: ["public-motivation"] },
);

export const getCachedLeaderboard = unstable_cache(
  async (weekStartIso: string) => {
    const weekStart = new Date(weekStartIso);

    return prisma.weeklyScore.findMany({
      where: {
        weekStart,
        user: { role: { notIn: ["ADMIN", "SUPER_ADMIN"] } },
      },
      orderBy: [
        { weightedScore: "desc" },
        { rawSolvedCount: "desc" },
        { streakAtWeekEnd: "desc" },
        { userId: "asc" },
      ],
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
  },
  ["public-leaderboard"],
  { revalidate: CACHE_TTL_SECONDS, tags: ["public-leaderboard"] },
);

export function getCurrentWeekStartIso() {
  return getWeekBounds().weekStart.toISOString();
}
