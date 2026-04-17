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

  const rooms = await prisma.chatRoom.findMany({
    where: { type: { in: ["PUBLIC", "ANNOUNCEMENT"] }, isArchived: false },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div style={{ display: "flex", height: "calc(100vh - var(--nav-h))", overflow: "hidden" }}>
      {/* Room list */}
      <div
        style={{
          width: 200,
          flexShrink: 0,
          background: "var(--bg-2)",
          borderRight: "1px solid var(--border)",
          padding: "16px 0",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "0 12px 8px",
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "var(--text-3)",
          }}
        >
          Rooms
        </div>
        {rooms.map((r) => (
          <a
            key={r.id}
            href={`/chat`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              fontSize: "0.875rem",
              fontWeight: r.id === room!.id ? 700 : 500,
              color: r.id === room!.id ? "var(--accent-2)" : "var(--text-2)",
              background: r.id === room!.id ? "var(--accent-soft)" : "none",
              borderRadius: "var(--radius-sm)",
              margin: "0 8px",
            }}
          >
            <span>#</span>
            {r.name}
          </a>
        ))}
      </div>

      {/* Chat area */}
      <ChatRoom
        roomId={room.id}
        roomName={room.name}
        initialMessages={messages.map((m) => ({
          id: m.id,
          text: m.messageText ?? "",
          createdAt: m.createdAt.toISOString(),
          user: { id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl },
        }))}
        currentUserId={session.user.id}
        currentUserName={session.user.name ?? "User"}
      />
    </div>
  );
}
