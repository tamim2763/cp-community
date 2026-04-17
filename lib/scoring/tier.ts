/**
 * Tier assignment based on weekly rank.
 * Rank 1       → Diamond
 * Rank 2–3     → Platinum
 * Rank 4–10    → Gold
 * Rank 11–25   → Silver
 * Rank 26+     → Bronze
 */

export type Tier = "DIAMOND" | "PLATINUM" | "GOLD" | "SILVER" | "BRONZE";

export function getTierForRank(rank: number): Tier {
  if (rank === 1) return "DIAMOND";
  if (rank <= 3) return "PLATINUM";
  if (rank <= 10) return "GOLD";
  if (rank <= 25) return "SILVER";
  return "BRONZE";
}

export const TIER_LABELS: Record<Tier, string> = {
  DIAMOND: "Diamond",
  PLATINUM: "Platinum",
  GOLD: "Gold",
  SILVER: "Silver",
  BRONZE: "Bronze",
};

export const TIER_EMOJI: Record<Tier, string> = {
  DIAMOND: "💎",
  PLATINUM: "🪙",
  GOLD: "🥇",
  SILVER: "🥈",
  BRONZE: "🥉",
};

export const TIER_CSS_CLASS: Record<Tier, string> = {
  DIAMOND: "tier-diamond",
  PLATINUM: "tier-platinum",
  GOLD: "tier-gold",
  SILVER: "tier-silver",
  BRONZE: "tier-bronze",
};
