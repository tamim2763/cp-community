import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { adminErrorResponse } from "@/lib/api/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { deleteByIdSchema, resourceSchema } from "@/lib/validations/admin";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function GET() {
  try {
    await requireAdmin();

    const [categories, resources] = await Promise.all([
      prisma.resourceCategory.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.resource.findMany({
        orderBy: [{ createdAt: "desc" }],
        include: { category: { select: { id: true, name: true, slug: true } } },
      }),
    ]);

    return NextResponse.json({ categories, resources });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();
    const body = resourceSchema.parse(await request.json());

    const category = await prisma.resourceCategory.findUnique({
      where: { slug: body.categorySlug },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    const resource = await prisma.resource.create({
      data: {
        title: body.title,
        slug: `${slugify(body.title) || "resource"}-${Date.now()}`,
        description: body.description,
        url: body.url,
        categoryId: category.id,
        platform: body.platform || null,
        difficultyLevel: body.difficultyLevel ?? null,
        tags: body.tags,
        createdById: adminUser.id,
        updatedById: adminUser.id,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    revalidatePath("/resources");
    revalidateTag("public-resources");

    return NextResponse.json({ ok: true, resource });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = deleteByIdSchema.parse(await request.json());

    await prisma.resource.delete({ where: { id: body.id } });

    revalidatePath("/resources");
    revalidateTag("public-resources");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
