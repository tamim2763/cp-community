import { NextResponse } from "next/server";
import { detectContestPlatform, shouldShowContest } from "@/lib/contests/allowlist";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";
export const maxDuration = 60;

const CLIST_API_BASE = "https://clist.by/api/v4";

type ClistContest = {
  id: number;
  event: string;
  href: string;
  resource: string;
  start: string;
  end: string;
  duration: number;
};

/** clist.by returns UTC times without the Z suffix (e.g. "2026-04-28T14:35:00").
 *  Without Z, new Date() treats it as local time, causing a timezone shift.
 *  This forces UTC interpretation. */
function parseClistDate(ts: string): Date {
  if (!ts.endsWith("Z") && !ts.includes("+")) {
    return new Date(ts + "Z");
  }
  return new Date(ts);
}

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.CLIST_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "CLIST_API_KEY not configured" }, { status: 500 });
  }

  try {
    const now = new Date();
    const until = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks ahead

    const url = `${CLIST_API_BASE}/contest/?format=json&resource__in=codeforces.com,codechef.com,atcoder.jp&start__gte=${now.toISOString()}&start__lte=${until.toISOString()}&order_by=start&limit=100&username=${apiKey.split("|")[0]}&api_key=${apiKey.split("|")[1] ?? apiKey}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return NextResponse.json({ error: `CLIST error ${res.status}` }, { status: 500 });
    }

    const data = await res.json() as { objects: ClistContest[] };
    const { prisma } = await import("@/lib/prisma");

    let upserted = 0;
    let allowed = 0;
    let hidden = 0;

    for (const c of data.objects ?? []) {
      const platform = detectContestPlatform(c.resource);
      const isVisible = shouldShowContest({ platform, title: c.event });

      if (isVisible) allowed++;
      else hidden++;

      await prisma.contest.upsert({
        where: { source_externalId: { source: "CLIST", externalId: String(c.id) } },
        create: {
          source: "CLIST",
          externalId: String(c.id),
          title: c.event,
          platform: platform ?? undefined,
          url: c.href,
          startTime: parseClistDate(c.start),
          endTime: parseClistDate(c.end),
          durationMinutes: Math.round(c.duration / 60),
          isVisible,
          importedAt: new Date(),
        },
        update: {
          title: c.event,
          platform: platform ?? undefined,
          startTime: parseClistDate(c.start),
          endTime: parseClistDate(c.end),
          durationMinutes: Math.round(c.duration / 60),
          isVisible,
        },
      });
      upserted++;
    }

    revalidateTag("public-contests");

    return NextResponse.json({
      ok: true,
      fetched: data.objects?.length ?? 0,
      upserted,
      allowed,
      hidden,
    });
  } catch (error) {
    console.error("[cron/sync-contests]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
