import { getTierForRank, TIER_CSS_CLASS, TIER_EMOJI, TIER_LABELS, type Tier } from "@/lib/scoring/tier";

type TierBadgeProps = {
  rank: number;
  tier?: Tier;
  showEmoji?: boolean;
  size?: "sm" | "md";
};

export function TierBadge({ rank, tier, showEmoji = true, size = "md" }: TierBadgeProps) {
  const t = tier ?? getTierForRank(rank);
  const cssClass = TIER_CSS_CLASS[t];
  const emoji = TIER_EMOJI[t];
  const label = TIER_LABELS[t];

  return (
    <span
      className={`tier-badge ${cssClass}`}
      style={size === "sm" ? { fontSize: "0.7rem", padding: "2px 7px" } : undefined}
    >
      {showEmoji && <span>{emoji}</span>}
      {label}
    </span>
  );
}
