import { NextResponse } from "next/server";

import { adminErrorResponse } from "@/lib/api/admin";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getWeeklyScoringConfig,
  saveWeeklyScoringConfig,
} from "@/lib/scoring/config";
import { scoringConfigSchema } from "@/lib/validations/admin";
import { recomputeAllUserAggregates } from "@/server/jobs/sync-user-submissions";

export async function GET() {
  try {
    await requireAdmin();
    const config = await getWeeklyScoringConfig();

    return NextResponse.json({ config });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const body = scoringConfigSchema.parse(await request.json());

    await saveWeeklyScoringConfig(body);
    await recomputeAllUserAggregates();

    return NextResponse.json({ ok: true, config: body });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
