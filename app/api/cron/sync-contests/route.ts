import { NextResponse } from "next/server";

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

const PLATFORM_MAP: Record<string, string> = {
  "codeforces.com": "CODEFORCES",
  "codechef.com": "CODECHEF",
  "atcoder.jp": "ATCODER",
};

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

    const url = `${CLIST_API_BASE}/contest/?format=json&resource=codeforces.com,codechef.com,atcoder.jp&start__gte=${now.toISOString()}&start__lte=${until.toISOString()}&order_by=start&limit=100&username=${apiKey.split("|")[0]}&api_key=${apiKey.split("|")[1] ?? apiKey}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return NextResponse.json({ error: `CLIST error ${res.status}` }, { status: 500 });
    }

    const data = await res.json() as { objects: ClistContest[] };
    const { prisma } = await import("@/lib/prisma");

    let upserted = 0;
    for (const c of data.objects ?? []) {
      const platformKey = Object.keys(PLATFORM_MAP).find((k) => c.resource.includes(k));
      const platform = platformKey ? PLATFORM_MAP[platformKey] : null;

      await prisma.contest.upsert({
        where: { source_externalId: { source: "CLIST", externalId: String(c.id) } },
        create: {
          source: "CLIST",
          externalId: String(c.id),
          title: c.event,
          platform: platform as ("CODEFORCES" | "CODECHEF" | "ATCODER") | undefined ?? undefined,
          url: c.href,
          startTime: new Date(c.start),
          endTime: new Date(c.end),
          durationMinutes: Math.round(c.duration / 60),
          isVisible: true,
          importedAt: new Date(),
        },
        update: {
          title: c.event,
          startTime: new Date(c.start),
          endTime: new Date(c.end),
          durationMinutes: Math.round(c.duration / 60),
        },
      });
      upserted++;
    }

    return NextResponse.json({ ok: true, upserted });
  } catch (error) {
    console.error("[cron/sync-contests]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
