"use server";

import { CpPlatform, Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";

import { auth } from "@/auth";
import {
  fetchCpProfile,
  fetchLatestSubmissionMarker,
  findCompilationErrorProof,
  isCpProfileLookupError,
} from "@/lib/cp-platforms";
import { prisma } from "@/lib/prisma";
import { cpVerificationSchema } from "@/lib/validations/cp-verification";
import { cpProfileSchema, manualProblemSolveSchema, unlinkCpProfileSchema } from "@/lib/validations/cp-profile";
import { parseChallenge, serializeChallenge } from "@/lib/cp-challenge";
import { createChallenge, getPlatformLabel } from "@/lib/cp-verification";

export type CpProfileFormState = {
  error: string | null;
  success: string | null;
};

export type SyncSubmissionsState = {
  error: string | null;
  success: string | null;
};

export type ManualProblemEntryState = {
  error: string | null;
  success: string | null;
};

const TRANSIENT_PRISMA_ERROR_CODES = new Set(["P1001", "P1008", "P1017", "P2024"]);

function isTransientPrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (TRANSIENT_PRISMA_ERROR_CODES.has(error.code)) return true;
    return /server has closed the connection|can't reach database server|connection pool/i.test(error.message);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return /server has closed the connection|can't reach database server|connection pool/i.test(error.message);
  }

  if (error instanceof Error) {
    return /server has closed the connection|can't reach database server|connection pool/i.test(error.message);
  }

  return false;
}

async function withPrismaRetry<T>(operation: () => Promise<T>, retries = 1): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransientPrismaError(error) || attempt === retries) {
        throw error;
      }

      await prisma.$disconnect().catch(() => undefined);
      await prisma.$connect();
    }
  }

  throw lastError;
}

function normalizeManualProblem(platform: CpPlatform, rawProblemUrl: string) {
  const url = new URL(rawProblemUrl);
  url.hash = "";
  url.search = "";

  const parts = url.pathname.split("/").filter(Boolean);

  if (platform === CpPlatform.CODECHEF) {
    const slugIndex = parts.findIndex((part) => part.toLowerCase() === "problems");
    const problemId = parts[slugIndex + 1]?.trim();

    if (!problemId) {
      throw new Error("Could not detect the CodeChef problem code from that link.");
    }

    return {
      externalProblemId: problemId.toUpperCase(),
      problemName: problemId.toUpperCase(),
      problemUrl: `https://www.codechef.com/problems/${problemId.toUpperCase()}`,
    };
  }

  if (platform === CpPlatform.ATCODER) {
    const tasksIndex = parts.findIndex((part) => part.toLowerCase() === "tasks");
    const contestIndex = parts.findIndex((part) => part.toLowerCase() === "contests");
    const problemId = parts[tasksIndex + 1]?.trim();
    const contestId = parts[contestIndex + 1]?.trim();

    if (!problemId) {
      throw new Error("Could not detect the AtCoder task id from that link.");
    }

    return {
      externalProblemId: problemId,
      problemName: problemId,
      problemUrl:
        contestId
          ? `https://atcoder.jp/contests/${contestId}/tasks/${problemId}`
          : `https://atcoder.jp/tasks/${problemId}`,
    };
  }

  throw new Error("Manual problem entry is only supported for CodeChef and AtCoder.");
}

async function getCurrentProfile(userId: string, platform: CpPlatform) {
  return prisma.cpProfile.findUnique({
    where: {
      userId_platform: {
        userId,
        platform,
      },
    },
  });
}

export async function saveCpProfileAction(
  _prevState: CpProfileFormState,
  formData: FormData,
): Promise<CpProfileFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You need to log in again.", success: null };
  }

  const parsed = cpProfileSchema.safeParse({
    platform: formData.get("platform"),
    handle: formData.get("handle"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid handle.", success: null };
  }

  const handle = parsed.data.handle.trim();

  let fetchedProfile;

  try {
    fetchedProfile = await fetchCpProfile(parsed.data.platform, handle);
  } catch (error) {
    if (isCpProfileLookupError(error)) {
      return { error: error.message, success: null };
    }

    throw error;
  }

  try {
    await prisma.cpProfile.upsert({
      where: {
        userId_platform: {
          userId: session.user.id,
          platform: parsed.data.platform,
        },
      },
      update: {
        handle: fetchedProfile.handle,
        displayHandle: fetchedProfile.displayHandle,
        currentRating: fetchedProfile.currentRating,
        maxRating: fetchedProfile.maxRating,
        rankTitle: fetchedProfile.rankTitle,
        country: fetchedProfile.country,
        avatarUrl: fetchedProfile.avatarUrl,
        status: "ACTIVE",
        syncError: null,
        isVerified: false,
        verificationToken: null,
        verificationField: null,
        verificationRequestedAt: null,
        verifiedAt: null,
        lastFetchedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        platform: parsed.data.platform,
        handle: fetchedProfile.handle,
        displayHandle: fetchedProfile.displayHandle,
        currentRating: fetchedProfile.currentRating,
        maxRating: fetchedProfile.maxRating,
        rankTitle: fetchedProfile.rankTitle,
        country: fetchedProfile.country,
        avatarUrl: fetchedProfile.avatarUrl,
        status: "ACTIVE",
        lastFetchedAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        error: `${getPlatformLabel(parsed.data.platform)} handle is already linked to another account.`,
        success: null,
      };
    }

    throw error;
  }

  revalidatePath("/dashboard");
  revalidateTag("public-leaderboard");

  return {
    error: null,
    success: "Handle saved.",
  };
}

export async function createVerificationChallengeAction(
  _prevState: CpProfileFormState,
  formData: FormData,
): Promise<CpProfileFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You need to log in again.", success: null };
  }

  const parsed = cpVerificationSchema.safeParse({
    platform: formData.get("platform"),
  });

  if (!parsed.success) {
    return { error: "Invalid platform.", success: null };
  }

  const profile = await getCurrentProfile(session.user.id, parsed.data.platform);

  if (!profile) {
    return { error: "Link a handle first.", success: null };
  }

  const baselineSubmissionId = await fetchLatestSubmissionMarker(parsed.data.platform, profile.handle);
  const challenge = createChallenge(parsed.data.platform, baselineSubmissionId);

  await prisma.cpProfile.update({
    where: { id: profile.id },
    data: {
      verificationToken: challenge.challengeCode,
      verificationField: serializeChallenge(challenge),
      verificationRequestedAt: new Date(),
      isVerified: false,
      verifiedAt: null,
      syncError: null,
    },
  });

  revalidatePath("/dashboard");
  revalidateTag("public-leaderboard");

  return {
    error: null,
    success: "Challenge ready.",
  };
}

export async function verifyOwnershipAction(
  _prevState: CpProfileFormState,
  formData: FormData,
): Promise<CpProfileFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You need to log in again.", success: null };
  }

  const parsed = cpVerificationSchema.safeParse({
    platform: formData.get("platform"),
  });

  if (!parsed.success) {
    return { error: "Invalid platform.", success: null };
  }

  const profile = await getCurrentProfile(session.user.id, parsed.data.platform);

  if (!profile) {
    return { error: "Link a handle first.", success: null };
  }

  const challenge = parseChallenge(profile.verificationField);

  if (!challenge || !profile.verificationRequestedAt) {
    return { error: "Generate a verification challenge first.", success: null };
  }

  const challengeDeadline = profile.verificationRequestedAt.getTime() + 15 * 60 * 1000;

  if (Date.now() > challengeDeadline) {
    return { error: "This challenge expired. Generate a new one and submit a fresh compilation error.", success: null };
  }

  let fetchedProfile;

  try {
    fetchedProfile = await fetchCpProfile(parsed.data.platform, profile.handle);
  } catch (error) {
    if (isCpProfileLookupError(error)) {
      return { error: error.message, success: null };
    }

    throw error;
  }

  const proof = await findCompilationErrorProof(parsed.data.platform, profile.handle, challenge);

  if (!proof) {
    return {
      error: "No fresh compilation error found yet. Submit a CE, then try again.",
      success: null,
    };
  }

  await prisma.cpProfile.update({
    where: { id: profile.id },
    data: {
      handle: fetchedProfile.handle,
      displayHandle: fetchedProfile.displayHandle,
      currentRating: fetchedProfile.currentRating,
      maxRating: fetchedProfile.maxRating,
      rankTitle: fetchedProfile.rankTitle,
      country: fetchedProfile.country,
      avatarUrl: fetchedProfile.avatarUrl,
      isVerified: true,
      verifiedAt: new Date(),
      syncError: null,
      lastFetchedAt: new Date(),
    },
  });

  revalidatePath("/dashboard");

  return {
    error: null,
    success: "Verified.",
  };
}

export async function unlinkCpProfileAction(_prevState: unknown, formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You need to log in again.", success: null };
  }

  const parsed = unlinkCpProfileSchema.safeParse({
    platform: formData.get("platform"),
  });

  if (!parsed.success) {
    return { error: "Invalid platform.", success: null };
  }

  await prisma.cpProfile.deleteMany({
    where: {
      userId: session.user.id,
      platform: parsed.data.platform,
    },
  });

  revalidatePath("/dashboard");
  revalidateTag("public-leaderboard");

  return { error: null, success: "Unlinked." };
}

export async function addManualProblemSolveAction(
  _prevState: ManualProblemEntryState,
  formData: FormData,
): Promise<ManualProblemEntryState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You need to log in again.", success: null };
  }

  const parsed = manualProblemSolveSchema.safeParse({
    platform: formData.get("platform"),
    problemLink: formData.get("problemUrl"),
    problemRating: formData.get("rating"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid problem data.", success: null };
  }

  let profile;

  try {
    profile = await withPrismaRetry(
      () => getCurrentProfile(session.user.id, parsed.data.platform),
      1,
    );
  } catch (error) {
    if (isTransientPrismaError(error)) {
      return {
        error: "Database connection dropped. Please try adding the problem again.",
        success: null,
      };
    }

    throw error;
  }

  if (!profile) {
    return { error: `Link your ${getPlatformLabel(parsed.data.platform)} handle first.`, success: null };
  }

  let normalized;

  try {
    normalized = normalizeManualProblem(parsed.data.platform, parsed.data.problemLink);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not parse that problem link.",
      success: null,
    };
  }

  let existingSolve;

  try {
    existingSolve = await withPrismaRetry(
      () => prisma.problemSolve.findUnique({
        where: {
          userId_platform_externalProblemId: {
            userId: session.user.id,
            platform: parsed.data.platform,
            externalProblemId: normalized.externalProblemId,
          },
        },
      }),
      1,
    );
  } catch (error) {
    if (isTransientPrismaError(error)) {
      return {
        error: "Database connection dropped. Please try adding the problem again.",
        success: null,
      };
    }

    throw error;
  }

  if (existingSolve) {
    return { error: "This problem is already counted for you.", success: null };
  }

  const submittedAt = new Date();
  const externalSubmissionId = `manual:${session.user.id}:${parsed.data.platform}:${normalized.externalProblemId}`;

  try {
    await withPrismaRetry(
      () => prisma.$transaction(async (tx) => {
        const submission = await tx.submission.create({
          data: {
            userId: session.user.id,
            cpProfileId: profile.id,
            platform: parsed.data.platform,
            externalSubmissionId,
            externalProblemId: normalized.externalProblemId,
            problemName: normalized.problemName,
            problemUrl: normalized.problemUrl,
            problemRating: parsed.data.problemRating,
            verdict: "AC",
            submittedAt,
            isAccepted: true,
            rawPayload: {
              source: "manual-entry",
              originalUrl: parsed.data.problemLink,
            },
          },
        });

        await tx.problemSolve.create({
          data: {
            userId: session.user.id,
            cpProfileId: profile.id,
            platform: parsed.data.platform,
            externalProblemId: normalized.externalProblemId,
            problemName: normalized.problemName,
            problemRating: parsed.data.problemRating,
            firstAcceptedSubmissionId: submission.id,
            firstSolvedAt: submittedAt,
            lastSeenAt: submittedAt,
          },
        });
      }),
      1,
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "This problem is already counted for you.", success: null };
    }

    if (isTransientPrismaError(error)) {
      return {
        error: "Database connection dropped while saving. Please try again.",
        success: null,
      };
    }

    throw error;
  }

  try {
    const [{ refreshUserAggregates }, { recomputeCurrentWeekForUser }] = await Promise.all([
      import("@/server/jobs/sync-user-submissions"),
      import("@/lib/scoring/weekly-score"),
    ]);

    await refreshUserAggregates(session.user.id);
    await recomputeCurrentWeekForUser(session.user.id);
  } catch (error) {
    console.error("[manual-add] post-processing failed", error);

    revalidatePath("/dashboard");
    revalidatePath("/leaderboard");
    revalidateTag("public-leaderboard");

    return {
      error: null,
      success: "Problem added. Stats are catching up and will refresh shortly.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidateTag("public-leaderboard");

  return { error: null, success: "Problem added." };
}

export async function syncMySubmissionsAction(
  _prevState?: SyncSubmissionsState,
): Promise<SyncSubmissionsState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You need to log in again.", success: null };
  }

  try {
    const { syncSpecificUser } = await import("@/server/jobs/sync-user-submissions");

    const result = await syncSpecificUser(session.user.id);

    revalidatePath("/dashboard");
    revalidatePath("/leaderboard");
    revalidateTag("public-leaderboard");

    if (result.synced === 0 && result.failed > 0) {
      return { error: "Codeforces sync failed.", success: null };
    }

    if (result.failed > 0) {
      return {
        error: null,
        success: `Codeforces sync completed with ${result.failed} issue${result.failed === 1 ? "" : "s"}.`,
      };
    }

    return { error: null, success: "Codeforces sync completed!" };
  } catch (error) {
    return { error: "An error occurred during sync.", success: null };
  }
}
