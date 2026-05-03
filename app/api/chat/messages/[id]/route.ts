import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH — edit a message (only by the author) */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const body = await request.json() as { text?: string };
  const newText = body.text?.trim();
  if (!newText) return NextResponse.json({ error: "Text required" }, { status: 400 });

  const msg = await prisma.chatMessage.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (msg.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (msg.deletedAt) return NextResponse.json({ error: "Message is deleted" }, { status: 400 });

  const updated = await prisma.chatMessage.update({
    where: { id },
    data: {
      messageText: newText.slice(0, 5000),
      isEdited: true,
      editedAt: new Date(),
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({
    id: updated.id,
    text: updated.messageText ?? "",
    createdAt: updated.createdAt.toISOString(),
    isEdited: updated.isEdited,
    user: { id: updated.user.id, name: updated.user.name, avatarUrl: updated.user.avatarUrl },
  });
}

/** DELETE — soft-delete a message (only by the author) */
export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  const msg = await prisma.chatMessage.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (msg.userId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.chatMessage.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
