import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AdminAccessError } from "@/lib/admin-guard";

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminAccessError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: error.issues[0]?.message ?? "Invalid request data.",
        issues: error.issues,
      },
      { status: 400 },
    );
  }

  console.error("[admin] unexpected error", error);
  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}
