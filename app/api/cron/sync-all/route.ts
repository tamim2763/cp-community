import { NextResponse } from "next/server";
import { syncAllUsers } from "@/server/jobs/sync-user-submissions";
import { computeWeeklyScoresForAllUsers, getWeekBounds } from "@/lib/scoring/weekly-score";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[cron/sync-all] Starting submission sync...");
    const syncResult = await syncAllUsers();
    console.log(`[cron/sync-all] Sync complete: ${syncResult.synced} synced, ${syncResult.failed} failed`);

    console.log("[cron/sync-all] Computing weekly scores...");
    const { weekStart, weekEnd } = getWeekBounds();
    await computeWeeklyScoresForAllUsers(weekStart, weekEnd);
    console.log("[cron/sync-all] Weekly scores computed.");

    return NextResponse.json({
      ok: true,
      synced: syncResult.synced,
      failed: syncResult.failed,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    });
  } catch (error) {
    console.error("[cron/sync-all] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
