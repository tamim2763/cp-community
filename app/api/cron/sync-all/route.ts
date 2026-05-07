import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { syncAllUsers } from "@/server/jobs/sync-user-submissions";
import { computeWeeklyScoresForAllUsers, getWeekBounds } from "@/lib/scoring/weekly-score";
import { prisma } from "@/lib/prisma";

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

    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());

    const getPart = (type: Intl.DateTimeFormatPartTypes[number]) =>
      parts.find((part) => part.type === type)?.value ?? "";

    const year = getPart("year");
    const month = getPart("month");
    const day = getPart("day");
    const startOfToday = new Date(`${year}-${month}-${day}T00:00:00+06:00`);

    const expiredJobs = await prisma.job.updateMany({
      where: { isActive: true, deadline: { lt: startOfToday } },
      data: { isActive: false },
    });

    if (expiredJobs.count > 0) {
      revalidatePath("/jobs");
      revalidateTag("public-jobs");
      console.log(`[cron/sync-all] Deactivated ${expiredJobs.count} expired jobs.`);
    }

    return NextResponse.json({
      ok: true,
      synced: syncResult.synced,
      failed: syncResult.failed,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      expiredJobsDeactivated: expiredJobs.count,
    });
  } catch (error) {
    console.error("[cron/sync-all] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
