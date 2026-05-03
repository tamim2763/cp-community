import { randomBytes } from "crypto";

import { CpPlatform } from "@prisma/client";

import type { VerificationChallenge } from "@/lib/cp-challenge";

const challengeCatalog: Record<
  CpPlatform,
  Omit<VerificationChallenge, "challengeCode" | "baselineSubmissionId">
> = {
  CODEFORCES: {
    problemId: "4-A",
    problemName: "Watermelon",
    problemUrl: "https://codeforces.com/problemset/problem/4/A",
  },
  CODECHEF: {
    problemId: "INTEST",
    problemName: "Enormous Input Test",
    problemUrl: "https://www.codechef.com/problems/INTEST",
  },
  ATCODER: {
    problemId: "practice_1",
    problemName: "Welcome to AtCoder",
    problemUrl: "https://atcoder.jp/contests/practice/tasks/practice_1",
  },
};

function generateVerificationToken() {
  return `ce-${randomBytes(3).toString("hex")}`;
}

export function getPlatformLabel(platform: CpPlatform) {
  switch (platform) {
    case CpPlatform.CODEFORCES:
      return "Codeforces";
    case CpPlatform.CODECHEF:
      return "CodeChef";
    case CpPlatform.ATCODER:
      return "AtCoder";
  }
}

export function createChallenge(platform: CpPlatform, baselineSubmissionId: string | null): VerificationChallenge {
  return {
    challengeCode: generateVerificationToken(),
    baselineSubmissionId,
    ...challengeCatalog[platform],
  };
}

export function getVerificationInstructions(platform: CpPlatform, challenge: VerificationChallenge) {
  if (platform === "ATCODER") {
    return `AtCoder proof: Copy this token and temporarily paste it anywhere into your AtCoder Affiliation field (Settings > Profile > Affiliation). Then click Verify.`;
  }
  return `${getPlatformLabel(platform)} proof: open ${challenge.problemName} (${challenge.problemUrl}) and submit any code that causes a Compilation Error within the next 15 minutes. Then click Verify ownership.`;
}
