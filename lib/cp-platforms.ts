import { CpPlatform } from "@prisma/client";

import type { VerificationChallenge } from "@/lib/cp-challenge";

export type FetchedCpProfile = {
  handle: string;
  displayHandle: string;
  currentRating: number | null;
  maxRating: number | null;
  rankTitle: string | null;
  country: string | null;
  avatarUrl: string | null;
};

export type VerificationEvidence = {
  submissionId: string;
  problemId: string;
  verdict: string;
  submittedAt: Date | null;
};

class CpProfileLookupError extends Error {}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&#43;/g, "+").replace(/\s+/g, " ").trim();
}

function firstMatch(text: string, pattern: RegExp, group = 1) {
  const match = text.match(pattern);
  return match?.[group] ?? null;
}

function toInt(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; CPCommunityBot/1.0; +https://localhost)",
      accept: "text/html,application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    cache: "no-store",
  });

  return {
    response,
    text: await response.text(),
  };
}

async function fetchCodeforcesProfile(handle: string): Promise<FetchedCpProfile> {
  const { response, text } = await fetchText(
    `https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`,
  );

  if (!response.ok) {
    throw new CpProfileLookupError("Codeforces handle was not found.");
  }

  const payload = JSON.parse(text) as {
    status?: string;
    result?: Array<{
      handle?: string;
      rating?: number;
      maxRating?: number;
      rank?: string;
      maxRank?: string;
      country?: string;
      avatar?: string;
      titlePhoto?: string;
    }>;
    comment?: string;
  };

  const user = payload.result?.[0];

  if (payload.status !== "OK" || !user?.handle) {
    throw new CpProfileLookupError(payload.comment || "Codeforces handle was not found.");
  }

  const rankTitle = user.maxRank ?? user.rank ?? null;
  const avatarUrl = user.titlePhoto || user.avatar || null;

  return {
    handle: user.handle,
    displayHandle: user.handle,
    currentRating: user.rating ?? null,
    maxRating: user.maxRating ?? user.rating ?? null,
    rankTitle: rankTitle ? rankTitle.replace(/\b\w/g, (char) => char.toUpperCase()) : null,
    country: user.country ?? null,
    avatarUrl,
  };
}

async function fetchAtCoderProfile(handle: string): Promise<FetchedCpProfile> {
  const { response, text } = await fetchText(`https://atcoder.jp/users/${encodeURIComponent(handle)}`);

  if (!response.ok || /<title>404 Not Found - AtCoder<\/title>/i.test(text)) {
    throw new CpProfileLookupError("AtCoder handle was not found.");
  }

  const displayHandle = firstMatch(text, /<title>\s*([^<]+?)\s*-\s*AtCoder\s*<\/title>/i)?.trim();
  const currentRating = toInt(firstMatch(text, /<th class="no-break">Rating<\/th><td><span[^>]*>([\d,]+)<\/span>/i));
  const maxRating = toInt(firstMatch(text, /<th class="no-break">Highest Rating<\/th><td><span[^>]*>([\d,]+)<\/span>/i));
  const rankTitle = stripTags(
    firstMatch(text, /<th class="no-break">Highest Rating<\/th><td>[\s\S]*?<span class="bold">([^<]+)<\/span>/i) ?? "",
  ) || null;
  const country = stripTags(
    firstMatch(text, /<th class="no-break">Country\/Region<\/th><td>([\s\S]*?)<\/td>/i) ?? "",
  ) || null;
  const avatarUrl = firstMatch(text, /<img class='avatar' src='([^']+)'/i);

  if (!displayHandle) {
    throw new CpProfileLookupError("AtCoder profile could not be parsed.");
  }

  return {
    handle: displayHandle,
    displayHandle,
    currentRating,
    maxRating: maxRating ?? currentRating,
    rankTitle,
    country,
    avatarUrl,
  };
}

async function fetchCodeChefProfile(handle: string): Promise<FetchedCpProfile> {
  const { response, text } = await fetchText(`https://www.codechef.com/users/${encodeURIComponent(handle)}`);

  if (!response.ok) {
    throw new CpProfileLookupError("CodeChef handle was not found.");
  }

  const canonicalHandle = firstMatch(text, /<link rel='canonical' href='https:\/\/www\.codechef\.com\/users\/([^']+)'/i);
  const pageTitle = firstMatch(text, /<meta property="og:title" content="([^"]+)"/i);

  if (!canonicalHandle || !pageTitle?.includes("CodeChef User Profile")) {
    throw new CpProfileLookupError("CodeChef handle was not found.");
  }

  const displayHandle = canonicalHandle.trim();
  const currentRating = toInt(firstMatch(text, /<div class="rating-number">\s*([\d,]+)\s*<\/div>/i));
  const maxRating = toInt(firstMatch(text, /\(Highest Rating\s*([\d,]+)\)/i));
  const country = stripTags(firstMatch(text, /<span class="user-country-name"[^>]*>([^<]+)<\/span>/i) ?? "") || null;
  const avatarUrl = firstMatch(text, /<img class="user-image" src="([^"]+)"/i);

  return {
    handle: displayHandle,
    displayHandle,
    currentRating,
    maxRating: maxRating ?? currentRating,
    rankTitle: null,
    country,
    avatarUrl,
  };
}

type CodeforcesSubmission = {
  id: string;
  problemId: string;
  verdict: string;
  submittedAt: Date | null;
};

async function fetchCodeforcesSubmissions(handle: string): Promise<CodeforcesSubmission[]> {
  const { response, text } = await fetchText(
    `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=20`,
  );

  if (!response.ok) return [];

  const payload = JSON.parse(text) as {
    status?: string;
    result?: Array<{ id: number; verdict?: string; creationTimeSeconds?: number; problem?: { contestId?: number; index?: string } }>;
  };

  if (payload.status !== "OK") return [];

  return (payload.result ?? []).map((submission) => ({
    id: String(submission.id),
    problemId: `${submission.problem?.contestId ?? ""}-${submission.problem?.index ?? ""}`,
    verdict: submission.verdict ?? "",
    submittedAt: submission.creationTimeSeconds ? new Date(submission.creationTimeSeconds * 1000) : null,
  }));
}

type AtCoderSubmission = {
  id: string;
  problemId: string;
  verdict: string;
  submittedAt: Date | null;
};

async function fetchAtCoderSubmissions(handle: string): Promise<AtCoderSubmission[]> {
  const { response, text } = await fetchText(
    `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=0`,
  );

  if (!response.ok) return [];

  const payload = JSON.parse(text) as Array<{ id: number; problem_id: string; result?: string; epoch_second?: number }>;

  return payload
    .slice(-50)
    .reverse()
    .map((submission) => ({
      id: String(submission.id),
      problemId: submission.problem_id,
      verdict: submission.result ?? "",
      submittedAt: submission.epoch_second ? new Date(submission.epoch_second * 1000) : null,
    }));
}

type CodeChefSubmission = {
  id: string;
  problemId: string;
  verdict: string;
  submittedAt: Date | null;
};

function parseCodeChefRecentTable(html: string): CodeChefSubmission[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];

  return rows
    .map((row) => {
      const block = row[1];
      const submissionId = firstMatch(block, /\/viewsolution\/(\d+)/i);
      const problemId = firstMatch(block, /<td[^>]*title='([^']+)'><a href='[^']+'/i);
      const verdict = firstMatch(block, /<span title='([^']+)'/i);
      const rawTime = firstMatch(block, /<td[^>]*title='([^']+)'/i);
      return {
        id: submissionId ?? "",
        problemId: problemId ?? "",
        verdict: verdict ?? "",
        submittedAt: rawTime ? new Date(rawTime.replace(/\//g, "-") + " UTC") : null,
      };
    })
    .filter((submission) => submission.id && submission.problemId);
}

async function fetchCodeChefSubmissions(handle: string): Promise<CodeChefSubmission[]> {
  const { response, text } = await fetchText(
    `https://www.codechef.com/recent/user?page=0&user_handle=${encodeURIComponent(handle)}`,
  );

  if (!response.ok) return [];

  const payload = JSON.parse(text) as { content?: string };
  return parseCodeChefRecentTable(payload.content ?? "");
}

export async function fetchLatestSubmissionMarker(platform: CpPlatform, handle: string): Promise<string | null> {
  switch (platform) {
    case CpPlatform.CODEFORCES:
      return (await fetchCodeforcesSubmissions(handle))[0]?.id ?? null;
    case CpPlatform.CODECHEF:
      return (await fetchCodeChefSubmissions(handle))[0]?.id ?? null;
    case CpPlatform.ATCODER:
      return (await fetchAtCoderSubmissions(handle))[0]?.id ?? null;
  }
}

function isSubmissionAfterBaseline(submissionId: string, baselineSubmissionId: string | null) {
  if (!baselineSubmissionId) return true;
  const current = BigInt(submissionId);
  const baseline = BigInt(baselineSubmissionId);
  return current > baseline;
}

export async function findCompilationErrorProof(
  platform: CpPlatform,
  handle: string,
  challenge: VerificationChallenge,
): Promise<VerificationEvidence | null> {
  switch (platform) {
    case CpPlatform.CODEFORCES: {
      const submissions = await fetchCodeforcesSubmissions(handle);
      const matched = submissions.find(
        (submission) =>
          isSubmissionAfterBaseline(submission.id, challenge.baselineSubmissionId) &&
          submission.problemId === challenge.problemId &&
          submission.verdict === "COMPILATION_ERROR",
      );
      return matched
        ? {
            submissionId: matched.id,
            problemId: matched.problemId,
            verdict: matched.verdict,
            submittedAt: matched.submittedAt,
          }
        : null;
    }
    case CpPlatform.CODECHEF: {
      const submissions = await fetchCodeChefSubmissions(handle);
      const matched = submissions.find(
        (submission) =>
          isSubmissionAfterBaseline(submission.id, challenge.baselineSubmissionId) &&
          submission.problemId === challenge.problemId &&
          submission.verdict.toLowerCase().includes("compilation error"),
      );
      return matched
        ? {
            submissionId: matched.id,
            problemId: matched.problemId,
            verdict: matched.verdict,
            submittedAt: matched.submittedAt,
          }
        : null;
    }
    case CpPlatform.ATCODER: {
      const submissions = await fetchAtCoderSubmissions(handle);
      const matched = submissions.find(
        (submission) =>
          isSubmissionAfterBaseline(submission.id, challenge.baselineSubmissionId) &&
          submission.problemId === challenge.problemId &&
          submission.verdict === "CE",
      );
      return matched
        ? {
            submissionId: matched.id,
            problemId: matched.problemId,
            verdict: matched.verdict,
            submittedAt: matched.submittedAt,
          }
        : null;
    }
  }
}

export async function fetchCpProfile(platform: CpPlatform, handle: string): Promise<FetchedCpProfile> {
  try {
    switch (platform) {
      case CpPlatform.CODEFORCES:
        return await fetchCodeforcesProfile(handle);
      case CpPlatform.CODECHEF:
        return await fetchCodeChefProfile(handle);
      case CpPlatform.ATCODER:
        return await fetchAtCoderProfile(handle);
    }
  } catch (error) {
    if (error instanceof CpProfileLookupError) {
      throw error;
    }

    throw new CpProfileLookupError(
      `Could not verify this ${platform.toLowerCase()} handle right now. Please try again.`,
    );
  }
}

export function isCpProfileLookupError(error: unknown): error is CpProfileLookupError {
  return error instanceof CpProfileLookupError;
}
