import { CpPlatform, ProfileStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { computeProblemScore, recomputeCurrentWeekForUser, getWeekBounds } from "@/lib/scoring/weekly-score";
import { getWeeklyScoringConfig } from "@/lib/scoring/config";

type CodeforcesSubmission = {
  id: number;
  verdict?: string;
  creationTimeSeconds?: number;
  problem?: {
    contestId?: number;
    index?: string;
    name?: string;
    rating?: number;
    tags?: string[];
  };
  programmingLanguage?: string;
  contestId?: number;
};

type AtCoderSubmission = {
  id: number;
  problem_id: string;
  contest_id?: string;
  user_id?: string;
  result?: string;
  epoch_second?: number;
  language?: string;
};

type CodeChefSubmission = {
  id: string;
  problemId: string;
  problemName: string;
  verdict: string;
  submittedAt: Date | null;
};

type LatestKnownSubmission = {
  externalSubmissionId: string;
  submittedAt: Date;
};

type AtCoderProblemMetadata = {
  titleById: Map<string, string>;
  ratingById: Map<string, number>;
};

let atCoderProblemMetadataPromise: Promise<AtCoderProblemMetadata> | null = null;

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "CPCommunityBot/1.0",
        accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function firstMatch(text: string, pattern: RegExp, group = 1) {
  const match = text.match(pattern);
  return match?.[group] ?? null;
}

function normalizeAtCoderDifficulty(difficulty: number | null | undefined) {
  if (difficulty === null || difficulty === undefined || Number.isNaN(difficulty)) {
    return null;
  }

  if (difficulty >= 400) {
    return Math.round(difficulty);
  }

  return Math.round(400 / Math.exp(1 - difficulty / 400));
}

async function getAtCoderProblemMetadata(): Promise<AtCoderProblemMetadata> {
  if (!atCoderProblemMetadataPromise) {
    atCoderProblemMetadataPromise = (async () => {
      const [problems, models] = await Promise.all([
        fetchJson<Array<{ id: string; title?: string; name?: string }>>(
          "https://kenkoooo.com/atcoder/resources/problems.json",
        ),
        fetchJson<Record<string, { difficulty?: number | null }>>(
          "https://kenkoooo.com/atcoder/resources/problem-models.json",
        ),
      ]);

      const titleById = new Map<string, string>();
      const ratingById = new Map<string, number>();

      for (const problem of problems ?? []) {
        titleById.set(problem.id, problem.title ?? problem.name ?? problem.id);
      }

      for (const [problemId, model] of Object.entries(models ?? {})) {
        const normalized = normalizeAtCoderDifficulty(model?.difficulty);
        if (normalized !== null) {
          ratingById.set(problemId, normalized);
        }
      }

      return { titleById, ratingById };
    })();
  }

  return atCoderProblemMetadataPromise;
}

async function getLatestKnownSubmission(cpProfileId: string, platform: CpPlatform): Promise<LatestKnownSubmission | null> {
  const latest = await prisma.submission.findFirst({
    where: { cpProfileId, platform },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    select: {
      externalSubmissionId: true,
      submittedAt: true,
    },
  });

  if (!latest) return null;

  return latest;
}

async function fetchAllCodeforcesSubmissions(handle: string, latestKnownSubmissionId?: string) {
  const batchSize = 1000;
  const allSubmissions: CodeforcesSubmission[] = [];

  for (let from = 1; ; from += batchSize) {
    const data = await fetchJson<{ status?: string; result?: CodeforcesSubmission[] }>(
      `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=${from}&count=${batchSize}`,
    );

    const batch = data?.status === "OK" ? (data.result ?? []) : [];
    if (batch.length === 0) break;

    const knownIndex = latestKnownSubmissionId
      ? batch.findIndex((submission) => String(submission.id) === latestKnownSubmissionId)
      : -1;

    if (knownIndex >= 0) {
      allSubmissions.push(...batch.slice(0, knownIndex));
      break;
    }

    allSubmissions.push(...batch);

    if (batch.length < batchSize) break;
  }

  return allSubmissions;
}

async function fetchAllAtCoderSubmissions(handle: string, latestKnownSubmittedAt?: Date) {
  const allSubmissions: AtCoderSubmission[] = [];
  let fromSecond = latestKnownSubmittedAt
    ? Math.max(0, Math.floor(latestKnownSubmittedAt.getTime() / 1000) - 1)
    : 0;

  for (;;) {
    const batch = await fetchJson<AtCoderSubmission[]>(
      `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=${fromSecond}`,
    );

    if (!batch || batch.length === 0) break;

    allSubmissions.push(...batch);

    const lastEpochSecond = batch[batch.length - 1]?.epoch_second;
    if (!lastEpochSecond) break;

    fromSecond = lastEpochSecond + 1;

    if (batch.length < 500) break;
  }

  return latestKnownSubmittedAt
    ? allSubmissions.filter(
        (submission) =>
          submission.epoch_second && submission.epoch_second * 1000 >= latestKnownSubmittedAt.getTime() - 1000,
      )
    : allSubmissions;
}

function parseCodeChefSubmissionTime(rawTime: string | null) {
  if (!rawTime) return null;

  const relativeMatch = rawTime.match(/(\d+)\s+(sec|min|hour|day|week|month|year)s?\s+ago/i);
  if (relativeMatch) {
    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const submittedAt = new Date();

    switch (unit) {
      case "sec":
        submittedAt.setSeconds(submittedAt.getSeconds() - amount);
        return submittedAt;
      case "min":
        submittedAt.setMinutes(submittedAt.getMinutes() - amount);
        return submittedAt;
      case "hour":
        submittedAt.setHours(submittedAt.getHours() - amount);
        return submittedAt;
      case "day":
        submittedAt.setDate(submittedAt.getDate() - amount);
        return submittedAt;
      case "week":
        submittedAt.setDate(submittedAt.getDate() - amount * 7);
        return submittedAt;
      case "month":
        submittedAt.setMonth(submittedAt.getMonth() - amount);
        return submittedAt;
      case "year":
        submittedAt.setFullYear(submittedAt.getFullYear() - amount);
        return submittedAt;
    }
  }

  const parsed = new Date(rawTime.replace(/\//g, "-") + " UTC");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseCodeChefRecentTable(html: string): CodeChefSubmission[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  let fallbackIdCounter = Date.now();

  return rows
    .map((row) => {
      const block = row[1];
      const submissionId = firstMatch(block, /\/viewsolution\/(\d+)/i) ?? (fallbackIdCounter++).toString();
      const problemId = firstMatch(block, /<td[^>]*title='([^']+)'><a href='[^']+'/i) ?? "";
      const problemName = stripTags(firstMatch(block, /<td[^>]*title='[^']+'><a href='[^']+'[^>]*>([\s\S]*?)<\/a>/i) ?? "") || problemId;
      const verdict = firstMatch(block, /<span title='([^']+)'/i) ?? "";
      const rawTime = firstMatch(block, /<td[^>]*title='([^']+)'/i);

      return {
        id: submissionId,
        problemId,
        problemName,
        verdict,
        submittedAt: parseCodeChefSubmissionTime(rawTime),
      };
    })
    .filter((submission) => submission.problemId);
}

async function fetchCodeChefRecentPage(handle: string, page: number) {
  try {
    const response = await fetch(
      `https://www.codechef.com/recent/user?page=${page}&user_handle=${encodeURIComponent(handle)}`,
      {
        headers: {
          "user-agent": "CPCommunityBot/1.0",
          accept: "application/json,text/html",
          "x-requested-with": "XMLHttpRequest",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

    if (!response.ok) return null;

    const payload = JSON.parse(await response.text()) as { max_page?: number; content?: string };
    if (!payload.content) return null;

    return {
      maxPage: Math.max(1, payload.max_page ?? 1),
      submissions: parseCodeChefRecentTable(payload.content),
    };
  } catch {
    return null;
  }
}

async function fetchAllCodeChefSubmissions(handle: string, latestKnownSubmissionId?: string) {
  const allSubmissions: CodeChefSubmission[] = [];
  let maxPage = 1;

  for (let page = 0; page < maxPage; page++) {
    const pageResult = await fetchCodeChefRecentPage(handle, page);
    if (!pageResult) break;

    maxPage = pageResult.maxPage;

    const knownIndex = latestKnownSubmissionId
      ? pageResult.submissions.findIndex((submission) => submission.id === latestKnownSubmissionId)
      : -1;

    if (knownIndex >= 0) {
      allSubmissions.push(...pageResult.submissions.slice(0, knownIndex));
      break;
    }

    allSubmissions.push(...pageResult.submissions);

    if (pageResult.submissions.length === 0) break;
  }

  return allSubmissions;
}

async function syncCodeforcesUser(userId: string, cpProfileId: string, handle: string) {
  const latestKnownSubmission = await getLatestKnownSubmission(cpProfileId, CpPlatform.CODEFORCES);
  const data = await fetchAllCodeforcesSubmissions(handle, latestKnownSubmission?.externalSubmissionId);

  const userInfo = await fetchJson<{ status: string; result?: { rating?: number }[] }>(
    `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
  );
  const currentRating = userInfo?.result?.[0]?.rating ?? null;

  await prisma.cpProfile.update({
    where: { id: cpProfileId },
    data: { currentRating, lastFetchedAt: new Date(), status: ProfileStatus.ACTIVE, syncError: null },
  });

  const okSubmissionsAll = data.filter((submission) => submission.verdict === "OK" && submission.problem?.contestId);
  const { weekStart } = getWeekBounds();
  const okSubmissions = okSubmissionsAll.filter((submission) => {
    const submittedAt = submission.creationTimeSeconds ? new Date(submission.creationTimeSeconds * 1000) : new Date();
    return submittedAt >= weekStart;
  });

  const submissionData = okSubmissions.map((sub) => {
    const problemId = `${sub.problem?.contestId ?? ""}-${sub.problem?.index ?? ""}`;
    return {
      userId,
      cpProfileId,
      platform: CpPlatform.CODEFORCES,
      externalSubmissionId: String(sub.id),
      externalContestId: sub.contestId ? String(sub.contestId) : null,
      externalProblemId: problemId,
      problemName: sub.problem?.name ?? problemId,
      problemRating: sub.problem?.rating ?? null,
      problemTags: (sub.problem?.tags ?? []) as object,
      language: sub.programmingLanguage ?? null,
      verdict: sub.verdict ?? "",
      submittedAt: sub.creationTimeSeconds ? new Date(sub.creationTimeSeconds * 1000) : new Date(),
      isAccepted: true,
      rawPayload: sub as object,
    };
  });

  if (submissionData.length > 0) {
    await prisma.submission.createMany({ data: submissionData, skipDuplicates: true });
  }

  const externalSubIds = okSubmissions.map((submission) => String(submission.id));
  const submissionRecords = externalSubIds.length
    ? await prisma.submission.findMany({
        where: { platform: CpPlatform.CODEFORCES, userId, externalSubmissionId: { in: externalSubIds } },
        select: { id: true, externalSubmissionId: true },
      })
    : [];
  const subIdMap = new Map(submissionRecords.map((submission) => [submission.externalSubmissionId, submission.id]));

  const solveMap = new Map<string, { firstSolvedAt: Date; internalSubId: string; subData: (typeof submissionData)[number] }>();
  for (const sub of submissionData) {
    const existing = solveMap.get(sub.externalProblemId);
    if (!existing || sub.submittedAt < existing.firstSolvedAt) {
      const internalId = subIdMap.get(sub.externalSubmissionId);
      if (internalId) {
        solveMap.set(sub.externalProblemId, { firstSolvedAt: sub.submittedAt, internalSubId: internalId, subData: sub });
      }
    }
  }

  const existingSolves = await prisma.problemSolve.findMany({
    where: { platform: CpPlatform.CODEFORCES, userId },
    select: { externalProblemId: true },
  });
  const existingProblemSet = new Set(existingSolves.map((solve) => solve.externalProblemId));

  const newProblemSolves = [];
  for (const [problemId, info] of solveMap) {
    if (!existingProblemSet.has(problemId)) {
      newProblemSolves.push({
        userId,
        cpProfileId,
        platform: CpPlatform.CODEFORCES,
        externalProblemId: problemId,
        problemName: info.subData.problemName,
        problemRating: info.subData.problemRating,
        firstAcceptedSubmissionId: info.internalSubId,
        firstSolvedAt: info.firstSolvedAt,
        lastSeenAt: new Date(),
      });
    }
  }

  if (newProblemSolves.length > 0) {
    await prisma.problemSolve.createMany({ data: newProblemSolves, skipDuplicates: true });
  }
}

async function syncAtCoderUser(userId: string, cpProfileId: string, handle: string) {
  // Disabled auto-sync for AtCoder
  await prisma.cpProfile.update({
    where: { id: cpProfileId },
    data: { lastFetchedAt: new Date(), status: ProfileStatus.ACTIVE, syncError: null },
  });
}

async function syncCodeChefUser(userId: string, cpProfileId: string, handle: string) {
  // Disabled auto-sync for CodeChef
  await prisma.cpProfile.update({
    where: { id: cpProfileId },
    data: { lastFetchedAt: new Date(), status: ProfileStatus.ACTIVE, syncError: null },
  });
}

export async function refreshUserAggregates(userId: string) {
  const scoringConfig = await getWeeklyScoringConfig();
  const [solves, profiles] = await Promise.all([
    prisma.problemSolve.findMany({
      where: { userId },
      select: { firstSolvedAt: true, problemRating: true, platform: true },
    }),
    prisma.cpProfile.findMany({
      where: { userId },
      select: { platform: true, currentRating: true },
    }),
  ]);

  const ratingByPlatform = new Map(profiles.map((profile) => [profile.platform, profile.currentRating]));
  const byDay = new Map<string, { count: number; weighted: number }>();

  for (const solve of solves) {
    // Use Dhaka local date for aggregation
    const solveDateLocal = new Date(solve.firstSolvedAt.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
    const dayKey = `${solveDateLocal.getFullYear()}-${(solveDateLocal.getMonth() + 1).toString().padStart(2, "0")}-${solveDateLocal.getDate().toString().padStart(2, "0")}`;

    const score = computeProblemScore(
      solve.problemRating,
      ratingByPlatform.get(solve.platform) ?? null,
      scoringConfig,
    );
    const prev = byDay.get(dayKey) ?? { count: 0, weighted: 0 };
    byDay.set(dayKey, { count: prev.count + 1, weighted: prev.weighted + score });
  }

  const existingStats = await prisma.dailyUserStat.findMany({
    where: { userId },
  });
  const existingMap = new Map(existingStats.map((stat) => {
    const statDateLocal = new Date(stat.date.toLocaleString("en-US", { timeZone: "Asia/Dhaka" }));
    const dayKey = `${statDateLocal.getFullYear()}-${(statDateLocal.getMonth() + 1).toString().padStart(2, "0")}-${statDateLocal.getDate().toString().padStart(2, "0")}`;
    return [dayKey, stat];
  }));

  const creates = [];
  const updates = [];

  for (const [dayStr, { count, weighted }] of byDay) {
    const date = new Date(dayStr + "T00:00:00.000Z"); // Store as UTC midnight for the local day
    const existing = existingMap.get(dayStr);

    if (existing) {
      if (existing.solvedCount !== count || existing.weightedScore.toNumber() !== weighted) {
        updates.push(
          prisma.dailyUserStat.update({
            where: { id: existing.id },
            data: { solvedCount: count, weightedScore: weighted, acceptedSubmissionCount: count },
          }),
        );
      }
    } else {
      creates.push({
        userId,
        date,
        solvedCount: count,
        weightedScore: weighted,
        acceptedSubmissionCount: count,
        streakContinues: count > 0,
      });
    }
  }

  // Handle days that no longer have solves but previously did
  for (const [dayStr, existingStat] of existingMap) {
    if (!byDay.has(dayStr) && existingStat.solvedCount > 0) {
      updates.push(
        prisma.dailyUserStat.update({
          where: { id: existingStat.id },
          data: { solvedCount: 0, weightedScore: 0, acceptedSubmissionCount: 0, streakContinues: false },
        }),
      );
    }
  }

  if (creates.length > 0) {
    await prisma.dailyUserStat.createMany({ data: creates, skipDuplicates: true });
  }

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}

async function finalizeUsers(userIds: Set<string>) {
  for (const userId of userIds) {
    await refreshUserAggregates(userId);
    await recomputeCurrentWeekForUser(userId);
  }
}

export async function recomputeAllUserAggregates() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const user of users) {
    await refreshUserAggregates(user.id);
    await recomputeCurrentWeekForUser(user.id);
  }
}

export async function syncAllUsers() {
  const profiles = await prisma.cpProfile.findMany({
    include: { user: { select: { id: true, isActive: true } } },
  });

  const results = { synced: 0, failed: 0 };
  const touchedUserIds = new Set<string>();

  for (const profile of profiles) {
    if (!profile.user.isActive) continue;
    if (profile.platform !== CpPlatform.CODEFORCES) {
      // Only auto-sync Codeforces
      touchedUserIds.add(profile.userId); // Still trigger aggregates for this user
      continue;
    }

    try {
      await syncCodeforcesUser(profile.userId, profile.id, profile.handle);

      await prisma.cpProfile.update({
        where: { id: profile.id },
        data: { lastSubmissionFetchedAt: new Date(), status: ProfileStatus.ACTIVE, syncError: null },
      });

      touchedUserIds.add(profile.userId);
      results.synced++;
    } catch (error) {
      results.failed++;
      await prisma.cpProfile.update({
        where: { id: profile.id },
        data: {
          status: ProfileStatus.ERROR,
          syncError: error instanceof Error ? error.message : "Unknown error",
        },
      }).catch(() => {});
    }
  }

  await finalizeUsers(touchedUserIds);

  return results;
}

export async function syncSpecificUser(userId: string) {
  const profiles = await prisma.cpProfile.findMany({
    where: { userId },
    include: { user: { select: { id: true, isActive: true } } },
  });

  if (!profiles.length || !profiles[0]?.user.isActive) {
    return { synced: 0, failed: 0 };
  }

  const results = { synced: 0, failed: 0 };
  const touchedUserIds = new Set<string>();

  for (const profile of profiles) {
    if (profile.platform !== CpPlatform.CODEFORCES) {
      // Only auto-sync Codeforces
      touchedUserIds.add(profile.userId); // Still trigger aggregates for this user
      continue;
    }

    try {
      await syncCodeforcesUser(profile.userId, profile.id, profile.handle);

      await prisma.cpProfile.update({
        where: { id: profile.id },
        data: { lastSubmissionFetchedAt: new Date(), status: ProfileStatus.ACTIVE, syncError: null },
      });

      touchedUserIds.add(profile.userId);
      results.synced++;
    } catch (error) {
      results.failed++;
      await prisma.cpProfile.update({
        where: { id: profile.id },
        data: {
          status: ProfileStatus.ERROR,
          syncError: error instanceof Error ? error.message : "Unknown error",
        },
      }).catch(() => {});
    }
  }

  await finalizeUsers(touchedUserIds);

  return results;
}
