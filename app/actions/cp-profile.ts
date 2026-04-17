"use server";

import { CpPlatform, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import {
  fetchCpProfile,
  fetchLatestSubmissionMarker,
  findCompilationErrorProof,
  isCpProfileLookupError,
} from "@/lib/cp-platforms";
import { prisma } from "@/lib/prisma";
import { cpVerificationSchema } from "@/lib/validations/cp-verification";
import { cpProfileSchema, unlinkCpProfileSchema } from "@/lib/validations/cp-profile";
import { parseChallenge, serializeChallenge } from "@/lib/cp-challenge";
import { createChallenge, getPlatformLabel } from "@/lib/cp-verification";

export type CpProfileFormState = {
  error: string | null;
  success: string | null;
};

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

export async function unlinkCpProfileAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    return;
  }

  const parsed = unlinkCpProfileSchema.safeParse({
    platform: formData.get("platform"),
  });

  if (!parsed.success) {
    return;
  }

  await prisma.cpProfile.deleteMany({
    where: {
      userId: session.user.id,
      platform: parsed.data.platform,
    },
  });

  revalidatePath("/dashboard");
}
