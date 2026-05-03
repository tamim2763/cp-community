import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ChatRoom } from "@/components/chat/chat-room";

export const metadata: Metadata = { title: "Chat" };

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Ensure a default public room exists
  let room = await prisma.chatRoom.findFirst({
    where: { type: "PUBLIC", isArchived: false },
    orderBy: { createdAt: "asc" },
  });

  if (!room) {
    room = await prisma.chatRoom.create({
      data: { name: "General", slug: "general", type: "PUBLIC", description: "General community chat" },
    });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { roomId: room.id, deletedAt: null },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  return (
    <div style={{
      position: "fixed",
      top: "var(--nav-h)",
      left: "var(--sidebar-w)",
      right: 0,
      bottom: 0,
      display: "flex",
      overflow: "hidden",
    }}>
      {/* Chat area */}
      <ChatRoom
        roomId={room.id}
        roomName={room.name}
        initialMessages={messages.map((m) => ({
          id: m.id,
          text: m.messageText ?? "",
          createdAt: m.createdAt.toISOString(),
          isEdited: m.isEdited,
          user: { id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl },
        }))}
        currentUserId={session.user.id}
        currentUserName={session.user.name ?? "User"}
      />
    </div>
  );
}
