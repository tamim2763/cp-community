import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { adminErrorResponse } from "@/lib/api/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { alumniSchema, deleteByIdSchema } from "@/lib/validations/admin";

export async function GET() {
  try {
    await requireAdmin();

    const alumni = await prisma.motivationalProfile.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ alumni });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();
    const body = alumniSchema.parse(await request.json());
    const count = await prisma.motivationalProfile.count();

    const alumni = await prisma.motivationalProfile.create({
      data: {
        name: body.name,
        headline: body.headline || null,
        bio: body.bio || body.headline || body.name,
        imageUrl: body.imageUrl || null,
        linkedinUrl: body.linkedinUrl,
        batchYear: body.batchYear ?? null,
        department: body.department || null,
        achievementsText: body.achievementsText || null,
        isFeatured: body.isFeatured,
        createdById: adminUser.id,
        updatedById: adminUser.id,
        sortOrder: count,
      },
    });

    revalidatePath("/motivation");
    revalidateTag("public-motivation");

    return NextResponse.json({ ok: true, alumni });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = deleteByIdSchema.parse(await request.json());

    await prisma.motivationalProfile.delete({ where: { id: body.id } });

    revalidatePath("/motivation");
    revalidateTag("public-motivation");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
