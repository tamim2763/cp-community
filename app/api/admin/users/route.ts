import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-guard";
import { adminErrorResponse } from "@/lib/api/admin";
import { prisma } from "@/lib/prisma";
import { deleteByIdSchema } from "@/lib/validations/admin";

export async function GET() {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const adminUser = await requireAdmin();
    const body = deleteByIdSchema.parse(await request.json());

    if (body.id === adminUser.id) {
      return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: body.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
