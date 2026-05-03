export type SupportedContestPlatform = "CODEFORCES" | "CODECHEF" | "ATCODER";

const CODEFORCES_DIV_ROUND_RE = /\bdiv\.?\s*([234])\b/i;
const CODECHEF_STARTERS_RE = /\bstarters\b/i;
const ATCODER_BEGINNER_RE = /\batcoder\s+beginner\s+contest\b/i;

export function detectContestPlatform(resource: string): SupportedContestPlatform | null {
  if (resource.includes("codeforces.com")) return "CODEFORCES";
  if (resource.includes("codechef.com")) return "CODECHEF";
  if (resource.includes("atcoder.jp")) return "ATCODER";
  return null;
}

export function isAllowedContestTitle(platform: SupportedContestPlatform, title: string): boolean {
  const normalized = title.trim();

  switch (platform) {
    case "CODEFORCES":
      // Keep only Div. 2, Div. 3, Div. 4 rounds.
      return CODEFORCES_DIV_ROUND_RE.test(normalized);
    case "CODECHEF":
      // Keep only CodeChef Starters.
      return CODECHEF_STARTERS_RE.test(normalized);
    case "ATCODER":
      // Keep only AtCoder Beginner Contest.
      return ATCODER_BEGINNER_RE.test(normalized);
    default:
      return false;
  }
}

export function shouldShowContest(input: {
  platform: SupportedContestPlatform | null;
  title: string;
}): boolean {
  if (!input.platform) return false;
  return isAllowedContestTitle(input.platform, input.title);
}
