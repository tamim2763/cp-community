export type VerificationChallenge = {
  challengeCode: string;
  problemId: string;
  problemName: string;
  problemUrl: string;
  baselineSubmissionId: string | null;
};

export function serializeChallenge(challenge: VerificationChallenge) {
  return JSON.stringify(challenge);
}

export function parseChallenge(value: string | null): VerificationChallenge | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as VerificationChallenge;
    if (!parsed.problemId || !parsed.problemUrl || !parsed.problemName || !parsed.challengeCode) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
