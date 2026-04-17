import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    title?: string;
    caption?: string;
    platform?: string;
    achievementDate?: string;
    imageUrl?: string;
    imagePublicId?: string;
  };

  if (!body.caption?.trim() || !body.imageUrl) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validPlatforms = ["CODEFORCES", "CODECHEF", "ATCODER"];
  const platform = validPlatforms.includes(body.platform ?? "") ? body.platform : null;

  await prisma.achievement.create({
    data: {
      userId: session.user.id,
      title: body.title?.trim() || null,
      caption: body.caption.trim().slice(0, 1000),
      imageUrl: body.imageUrl,
      imagePublicId: body.imagePublicId ?? null,
      platform: platform as ("CODEFORCES" | "CODECHEF" | "ATCODER") | null ?? null,
      achievementDate: body.achievementDate ? new Date(body.achievementDate) : null,
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true });
}
