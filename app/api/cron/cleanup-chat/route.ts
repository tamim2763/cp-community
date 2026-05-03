import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Cron job to delete chat messages older than 30 days.
 * Call daily: GET /api/cron/cleanup-chat?secret=YOUR_CRON_SECRET
 */
export async function GET(request: Request) {
  const secret =
    request.headers.get("x-cron-secret") ??
    new URL(request.url).searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    // Delete attachments of old messages first (foreign key)
    await prisma.messageAttachment.deleteMany({
      where: { message: { createdAt: { lt: cutoff } } },
    });

    // Delete old messages
    const result = await prisma.chatMessage.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return NextResponse.json({
      ok: true,
      deletedMessages: result.count,
      cutoffDate: cutoff.toISOString(),
    });
  } catch (error) {
    console.error("[cron/cleanup-chat]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
