import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { contestSchema } from "@/lib/validations/admin";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = contestSchema.parse(await request.json());

    const startTime = new Date(body.startTime);
    const endTime = new Date(startTime.getTime() + body.durationMinutes * 60 * 1000);

    await prisma.contest.create({
      data: {
        source: "MANUAL",
        title: body.title,
        platform: null,
        url: body.url,
        startTime,
        endTime,
        durationMinutes: body.durationMinutes,
        isVisible: false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request data." },
        { status: 400 },
      );
    }

    console.error("[contests] submit error", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
