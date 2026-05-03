import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) return NextResponse.json([]);

  const messages = await prisma.chatMessage.findMany({
    where: { roomId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json(messages.map((m) => ({
    id: m.id,
    text: m.messageText ?? "",
    createdAt: m.createdAt.toISOString(),
    isEdited: m.isEdited,
    user: { id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl },
  })));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { roomId?: string; text?: string };
  if (!body.roomId || !body.text?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      roomId: body.roomId,
      userId: session.user.id,
      messageText: body.text.trim().slice(0, 5000),
      messageType: "TEXT",
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
  });

  return NextResponse.json({
    id: message.id,
    text: message.messageText ?? "",
    createdAt: message.createdAt.toISOString(),
    isEdited: message.isEdited,
    user: { id: message.user.id, name: message.user.name, avatarUrl: message.user.avatarUrl },
  });
}
