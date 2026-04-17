import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  const body = await request.json() as { type?: string; title?: string; description?: string };

  if (!body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const validTypes = ["BUG_REPORT", "SUGGESTION", "OTHER"];
  const type = validTypes.includes(body.type ?? "") ? body.type! : "OTHER";

  await prisma.feedback.create({
    data: {
      userId: session?.user?.id ?? null,
      type: type as "BUG_REPORT" | "SUGGESTION" | "OTHER",
      title: body.title.trim().slice(0, 120),
      description: body.description.trim().slice(0, 2000),
    },
  });

  return NextResponse.json({ ok: true });
}
