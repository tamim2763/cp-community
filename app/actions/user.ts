"use server";

import { prisma } from "@/lib/prisma";

export async function markOnboardingTutorialSeen(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { hasSeenOnboardingTutorial: true },
    });
    return { success: true };
  } catch (error) {
    console.error("[markOnboardingTutorialSeen]", error);
    return { success: false, error: "Failed to mark tutorial as seen" };
  }
}
