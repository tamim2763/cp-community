import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { adminErrorResponse } from "@/lib/api/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { achievementModerationSchema, deleteByIdSchema } from "@/lib/validations/admin";

export async function GET() {
  try {
    await requireAdmin();

    const [pendingAchievements, approvedAchievements] = await Promise.all([
      prisma.achievement.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              batch: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.achievement.findMany({
        where: { status: "APPROVED" },
        orderBy: { approvedAt: "desc" },
        take: 100,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              batch: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({ pendingAchievements, approvedAchievements });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const adminUser = await requireAdmin();
    const body = achievementModerationSchema.parse(await request.json());

    const achievement = await prisma.achievement.update({
      where: { id: body.id },
      data: {
        status: body.status,
        approvedById: adminUser.id,
        approvedAt: new Date(),
        rejectionReason: body.status === "REJECTED" ? body.rejectionReason?.trim() ?? null : null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    revalidatePath("/achievements");
    revalidateTag("public-achievements");

    return NextResponse.json({ ok: true, achievement });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = deleteByIdSchema.parse(await request.json());

    const deleted = await prisma.achievement.deleteMany({
      where: { id: body.id, status: "APPROVED" },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: "Approved achievement not found." }, { status: 404 });
    }

    revalidatePath("/achievements");
    revalidateTag("public-achievements");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
