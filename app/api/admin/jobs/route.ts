import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

import { adminErrorResponse } from "@/lib/api/admin";
import { requireAdmin } from "@/lib/admin-guard";
import { prisma } from "@/lib/prisma";
import { deleteByIdSchema, jobSchema } from "@/lib/validations/admin";

export async function GET() {
  try {
    await requireAdmin();

    const jobs = await prisma.job.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await requireAdmin();
    const body = jobSchema.parse(await request.json());

    const job = await prisma.job.create({
      data: {
        title: body.title,
        company: body.company,
        location: body.location || null,
        type: body.type,
        description: body.description,
        applyUrl: body.applyUrl || null,
        deadline: body.deadline ? new Date(body.deadline) : null,
        postedById: adminUser.id,
      },
    });

    revalidatePath("/jobs");
    revalidateTag("public-jobs");

    return NextResponse.json({ ok: true, job });
  } catch (error) {
    return adminErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = deleteByIdSchema.parse(await request.json());

    await prisma.job.delete({
      where: { id: body.id },
    });

    revalidatePath("/jobs");
    revalidateTag("public-jobs");

    return NextResponse.json({ ok: true });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
