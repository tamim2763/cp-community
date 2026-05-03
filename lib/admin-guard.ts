import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export class AdminAccessError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403,
  ) {
    super(message);
    this.name = "AdminAccessError";
  }
}

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AdminAccessError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    throw new AdminAccessError("Unauthorized", 401);
  }

  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    throw new AdminAccessError("Forbidden", 403);
  }

  return user;
}
