/**
 * Tier assignment based on weekly rank.
 * Rank 1 → Gold
 * Rank 2 → Silver
 * Rank 3 → Bronze
 * Rank 4+ → no tier
 */

export type Tier = "GOLD" | "SILVER" | "BRONZE";

export function getTierForRank(rank: number): Tier | null {
  if (rank === 1) return "GOLD";
  if (rank === 2) return "SILVER";
  if (rank === 3) return "BRONZE";
  return null;
}

export const TIER_LABELS: Record<Tier, string> = {
  GOLD: "Gold",
  SILVER: "Silver",
  BRONZE: "Bronze",
};

export const TIER_EMOJI: Record<Tier, string> = {
  GOLD: "🥇",
  SILVER: "🥈",
  BRONZE: "🥉",
};

export const TIER_CSS_CLASS: Record<Tier, string> = {
  GOLD: "tier-gold",
  SILVER: "tier-silver",
  BRONZE: "tier-bronze",
};
