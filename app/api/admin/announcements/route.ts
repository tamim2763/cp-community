import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { adminErrorResponse } from "@/lib/api/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { announcementSchema, deleteByIdSchema } from "@/lib/validations/admin";

export async function GET() {
  try {
    await requireAdmin();

    const announcements = await prisma.announcement.findMany({
      orderBy: { startsAt: "desc" },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();
    const body = announcementSchema.parse(await request.json());

    const announcement = await prisma.announcement.create({
      data: {
        content: body.content,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        createdById: adminUser.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    revalidatePath("/");

    return NextResponse.json({ ok: true, announcement });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = deleteByIdSchema.parse(await request.json());

    await prisma.announcement.delete({ where: { id: body.id } });

    revalidatePath("/");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
