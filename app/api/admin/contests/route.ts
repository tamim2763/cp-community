import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { adminErrorResponse } from "@/lib/api/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { contestSchema, deleteByIdSchema } from "@/lib/validations/admin";

export async function GET() {
  try {
    await requireAdmin();

    const contests = await prisma.contest.findMany({
      where: { source: "MANUAL" },
      orderBy: { startTime: "desc" },
      take: 100,
    });

    return NextResponse.json({ contests });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = contestSchema.parse(await request.json());

    const startTime = new Date(body.startTime);
    const endTime = new Date(startTime.getTime() + body.durationMinutes * 60 * 1000);

    const contest = await prisma.contest.create({
      data: {
        source: "MANUAL",
        title: body.title,
        platform: null,
        url: body.url,
        startTime,
        endTime,
        durationMinutes: body.durationMinutes,
        isVisible: true,
      },
    });

    revalidatePath("/contests");
    revalidateTag("public-contests");

    return NextResponse.json({ ok: true, contest });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = deleteByIdSchema.parse(await request.json());

    await prisma.contest.delete({ where: { id: body.id } });

    revalidatePath("/contests");
    revalidateTag("public-contests");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
