import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resourceSchema } from "@/lib/validations/admin";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = resourceSchema.parse(await request.json());

    const category = await prisma.resourceCategory.findUnique({
      where: { slug: body.categorySlug },
      select: { id: true },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found." }, { status: 404 });
    }

    await prisma.resource.create({
      data: {
        title: body.title,
        slug: `${slugify(body.title) || "resource"}-${Date.now()}`,
        description: body.description,
        url: body.url,
        categoryId: category.id,
        platform: body.platform || null,
        difficultyLevel: body.difficultyLevel ?? null,
        tags: body.tags,
        isPublished: false,
        createdById: session.user.id,
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

    console.error("[resources] submit error", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
