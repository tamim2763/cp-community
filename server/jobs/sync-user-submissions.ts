import { CpPlatform, ProfileStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ─── Types ──────────────────────────────────────────────

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
  problem_title?: string;
  result?: string;
  epoch_second?: number;
  language?: string;
};

// ─── Helpers ─────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "user-agent": "CPCommunityBot/1.0",
        accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

// ─── Platform sync functions ──────────────────────────────

async function syncCodeforcesUser(userId: string, cpProfileId: string, handle: string) {
  // Fetch up to 1000 most recent submissions
  const data = await fetchJson<{ status: string; result?: CodeforcesSubmission[] }>(
    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=1000`,
  );

  if (!data || data.status !== "OK" || !data.result) return;

  // Fetch user rating info
  const userInfo = await fetchJson<{ status: string; result?: { rating?: number }[] }>(
    `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
  );
  const currentRating = userInfo?.result?.[0]?.rating ?? null;

  // Update rating
  if (currentRating !== null) {
    await prisma.cpProfile.update({
      where: { id: cpProfileId },
      data: {
        currentRating,
        lastFetchedAt: new Date(),
        status: ProfileStatus.ACTIVE,
        syncError: null,
      },
    });
  }

  const solveMap = new Map<string, { firstSolvedAt: Date; submission: CodeforcesSubmission }>();

  for (const sub of data.result) {
    if (sub.verdict !== "OK") continue;
    const problemId = `${sub.problem?.contestId ?? ""}-${sub.problem?.index ?? ""}`;
    if (!problemId || problemId === "-") continue;

    const submittedAt = sub.creationTimeSeconds ? new Date(sub.creationTimeSeconds * 1000) : new Date();

    // Upsert raw submission
    await prisma.submission.upsert({
      where: { platform_externalSubmissionId: { platform: CpPlatform.CODEFORCES, externalSubmissionId: String(sub.id) } },
      create: {
        userId,
        cpProfileId,
        platform: CpPlatform.CODEFORCES,
        externalSubmissionId: String(sub.id),
        externalContestId: sub.contestId ? String(sub.contestId) : null,
        externalProblemId: problemId,
        problemName: sub.problem?.name ?? problemId,
        problemRating: sub.problem?.rating ?? null,
        problemTags: sub.problem?.tags ?? [],
        language: sub.programmingLanguage ?? null,
        verdict: sub.verdict ?? "",
        submittedAt,
        isAccepted: true,
        rawPayload: sub as object,
      },
      update: {},
    });

    // Track first solve
    const existing = solveMap.get(problemId);
    if (!existing || submittedAt < existing.firstSolvedAt) {
      solveMap.set(problemId, { firstSolvedAt: submittedAt, submission: sub });
    }
  }

  // Upsert problem_solves
  for (const [problemId, { firstSolvedAt, submission }] of solveMap) {
    const submissionRecord = await prisma.submission.findUnique({
      where: { platform_externalSubmissionId: { platform: CpPlatform.CODEFORCES, externalSubmissionId: String(submission.id) } },
    });
    if (!submissionRecord) continue;

    await prisma.problemSolve.upsert({
      where: { userId_platform_externalProblemId: { userId, platform: CpPlatform.CODEFORCES, externalProblemId: problemId } },
      create: {
        userId,
        cpProfileId,
        platform: CpPlatform.CODEFORCES,
        externalProblemId: problemId,
        problemName: submission.problem?.name ?? problemId,
        problemRating: submission.problem?.rating ?? null,
        firstAcceptedSubmissionId: submissionRecord.id,
        firstSolvedAt,
        lastSeenAt: new Date(),
      },
      update: {
        lastSeenAt: new Date(),
      },
    });
  }
}

async function syncAtCoderUser(userId: string, cpProfileId: string, handle: string) {
  const data = await fetchJson<AtCoderSubmission[]>(
    `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=0`,
  );

  if (!data || !Array.isArray(data)) return;

  const accepted = data.filter((s) => s.result === "AC");
  const solveMap = new Map<string, { firstSolvedAt: Date; submission: AtCoderSubmission }>();

  for (const sub of accepted) {
    const submittedAt = sub.epoch_second ? new Date(sub.epoch_second * 1000) : new Date();

    await prisma.submission.upsert({
      where: { platform_externalSubmissionId: { platform: CpPlatform.ATCODER, externalSubmissionId: String(sub.id) } },
      create: {
        userId,
        cpProfileId,
        platform: CpPlatform.ATCODER,
        externalSubmissionId: String(sub.id),
        externalProblemId: sub.problem_id,
        problemName: sub.problem_title ?? sub.problem_id,
        problemRating: null,
        language: sub.language ?? null,
        verdict: sub.result ?? "AC",
        submittedAt,
        isAccepted: true,
        rawPayload: sub as object,
      },
      update: {},
    });

    const existing = solveMap.get(sub.problem_id);
    if (!existing || submittedAt < existing.firstSolvedAt) {
      solveMap.set(sub.problem_id, { firstSolvedAt: submittedAt, submission: sub });
    }
  }

  for (const [problemId, { firstSolvedAt, submission }] of solveMap) {
    const submissionRecord = await prisma.submission.findUnique({
      where: { platform_externalSubmissionId: { platform: CpPlatform.ATCODER, externalSubmissionId: String(submission.id) } },
    });
    if (!submissionRecord) continue;

    await prisma.problemSolve.upsert({
      where: { userId_platform_externalProblemId: { userId, platform: CpPlatform.ATCODER, externalProblemId: problemId } },
      create: {
        userId,
        cpProfileId,
        platform: CpPlatform.ATCODER,
        externalProblemId: problemId,
        problemName: submission.problem_title ?? problemId,
        problemRating: null,
        firstAcceptedSubmissionId: submissionRecord.id,
        firstSolvedAt,
        lastSeenAt: new Date(),
      },
      update: { lastSeenAt: new Date() },
    });
  }

  await prisma.cpProfile.update({
    where: { id: cpProfileId },
    data: { lastFetchedAt: new Date(), status: ProfileStatus.ACTIVE, syncError: null },
  });
}

// ─── Daily stats aggregation ──────────────────────────────

async function recomputeDailyStats(userId: string) {
  // Count unique solves per day
  const solves = await prisma.problemSolve.findMany({
    where: { userId },
    select: { firstSolvedAt: true, problemRating: true },
  });

  const byDay = new Map<string, { count: number; weighted: number }>();

  for (const solve of solves) {
    const day = solve.firstSolvedAt.toISOString().split("T")[0];
    const score = solve.problemRating ? Math.max(1, solve.problemRating / 400) : 1;
    const prev = byDay.get(day) ?? { count: 0, weighted: 0 };
    byDay.set(day, { count: prev.count + 1, weighted: prev.weighted + score });
  }

  for (const [dayStr, { count, weighted }] of byDay) {
    const date = new Date(dayStr + "T00:00:00.000Z");
    await prisma.dailyUserStat.upsert({
      where: { userId_date: { userId, date } },
      create: {
        userId,
        date,
        solvedCount: count,
        weightedScore: weighted,
        acceptedSubmissionCount: count,
        streakContinues: count > 0,
      },
      update: {
        solvedCount: count,
        weightedScore: weighted,
        acceptedSubmissionCount: count,
        streakContinues: count > 0,
      },
    });
  }
}

// ─── Main export ──────────────────────────────────────────

export async function syncAllUsers() {
  const profiles = await prisma.cpProfile.findMany({
    where: { status: { not: ProfileStatus.ERROR } },
    include: { user: { select: { id: true, isActive: true } } },
  });

  const results = { synced: 0, failed: 0 };

  for (const profile of profiles) {
    if (!profile.user.isActive) continue;

    try {
      switch (profile.platform) {
        case CpPlatform.CODEFORCES:
          await syncCodeforcesUser(profile.userId, profile.id, profile.handle);
          break;
        case CpPlatform.ATCODER:
          await syncAtCoderUser(profile.userId, profile.id, profile.handle);
          break;
        case CpPlatform.CODECHEF:
          // CodeChef doesn't have a reliable public submission API
          // Skip for now; can add when CF-style API is available
          break;
      }

      await recomputeDailyStats(profile.userId);
      await prisma.cpProfile.update({
        where: { id: profile.id },
        data: { lastSubmissionFetchedAt: new Date() },
      });

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

  return results;
}
