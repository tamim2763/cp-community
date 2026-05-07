import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { jobSchema } from "@/lib/validations/admin";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = jobSchema.parse(await request.json());

    await prisma.job.create({
      data: {
        title: body.title,
        company: body.company,
        location: body.location || null,
        type: body.type,
        description: body.description,
        applyUrl: body.applyUrl || null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        isActive: false,
        postedById: session.user.id,
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

    console.error("[jobs] submit error", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
