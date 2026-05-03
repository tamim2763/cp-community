import { prisma } from "@/lib/prisma";

export const WEEKLY_SCORING_CONFIG_KEY = "weekly-scoring-config";

export type WeeklyScoringConfig = {
  multiplierBase: number;
  gapStepSize: number;
};

export const DEFAULT_WEEKLY_SCORING_CONFIG: WeeklyScoringConfig = {
  multiplierBase: 1.1,
  gapStepSize: 100,
};

export function normalizeWeeklyScoringConfig(value: unknown): WeeklyScoringConfig {
  if (!value || typeof value !== "object") {
    return DEFAULT_WEEKLY_SCORING_CONFIG;
  }

  const raw = value as Record<string, unknown>;
  const multiplierBase = typeof raw.multiplierBase === "number" ? raw.multiplierBase : Number(raw.multiplierBase);
  const gapStepSize = typeof raw.gapStepSize === "number" ? raw.gapStepSize : Number(raw.gapStepSize);

  return {
    multiplierBase:
      Number.isFinite(multiplierBase) && multiplierBase > 1 ? Number(multiplierBase.toFixed(4)) : DEFAULT_WEEKLY_SCORING_CONFIG.multiplierBase,
    gapStepSize:
      Number.isFinite(gapStepSize) && gapStepSize >= 1 ? Math.round(gapStepSize) : DEFAULT_WEEKLY_SCORING_CONFIG.gapStepSize,
  };
}

export async function getWeeklyScoringConfig(): Promise<WeeklyScoringConfig> {
  const config = await prisma.appConfig.findUnique({
    where: { key: WEEKLY_SCORING_CONFIG_KEY },
    select: { value: true },
  });

  return normalizeWeeklyScoringConfig(config?.value);
}

export async function saveWeeklyScoringConfig(input: WeeklyScoringConfig) {
  const value = normalizeWeeklyScoringConfig(input);

  return prisma.appConfig.upsert({
    where: { key: WEEKLY_SCORING_CONFIG_KEY },
    update: { value },
    create: {
      key: WEEKLY_SCORING_CONFIG_KEY,
      value,
    },
  });
}
