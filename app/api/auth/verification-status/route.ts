import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const EMAIL_RE = /^ce\d+@mbstu\.ac\.bd$/i;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ verified: false });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  });

  return NextResponse.json({ verified: !!user?.emailVerified });
}
