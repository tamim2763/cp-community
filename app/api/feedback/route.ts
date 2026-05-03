import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  const body = await request.json() as { type?: string; title?: string; description?: string };

  if (!body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const validTypes = ["BUG_REPORT", "SUGGESTION", "OTHER"];
  const type = validTypes.includes(body.type ?? "") ? body.type! : "OTHER";
  const title = body.title.trim().slice(0, 120);
  const description = body.description.trim().slice(0, 2000);
  const userName = session?.user?.name ?? "Anonymous";
  const userEmail = session?.user?.email ?? "N/A";

  // Save to database
  await prisma.feedback.create({
    data: {
      userId: session?.user?.id ?? null,
      type: type as "BUG_REPORT" | "SUGGESTION" | "OTHER",
      title,
      description,
    },
  });

  // Send email notification via Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const typeLabel = type === "BUG_REPORT" ? "🐛 Bug Report" : type === "SUGGESTION" ? "💡 Suggestion" : "📝 Other";
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: "CP Community <onboarding@resend.dev>",
          to: "amimultamim24@gmail.com",
          subject: `[CP Community] ${typeLabel}: ${title}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">${typeLabel}</h2>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; font-weight: bold; color: #666;">From</td><td style="padding: 8px;">${userName} (${userEmail})</td></tr>
                <tr><td style="padding: 8px; font-weight: bold; color: #666;">Title</td><td style="padding: 8px;">${title}</td></tr>
              </table>
              <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-top: 12px;">
                <p style="margin: 0; white-space: pre-wrap;">${description}</p>
              </div>
              <hr style="margin-top: 24px; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #999;">Sent from CP Community feedback form</p>
            </div>
          `,
        }),
      });
    } catch (e) {
      console.error("[feedback] Failed to send email:", e);
      // Don't fail the request if email fails — feedback is already saved
    }
  }

  return NextResponse.json({ ok: true });
}
