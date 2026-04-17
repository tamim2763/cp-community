import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Link from "next/link";

export const metadata: Metadata = { title: "Achievement Wall" };
export const revalidate = 120;

const PLATFORM_LABELS: Record<string, string> = {
  CODEFORCES: "Codeforces",
  CODECHEF: "CodeChef",
  ATCODER: "AtCoder",
};

export default async function AchievementsPage() {
  const session = await auth();

  const achievements = await prisma.achievement.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, username: true, avatarUrl: true, batch: true } },
    },
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">🎖️ Achievement Wall</h1>
            <p className="page-subtitle">Celebrating wins from our community</p>
          </div>
          {session?.user && (
            <Link href="/achievements/new" className="btn btn-primary">
              + Share Achievement
            </Link>
          )}
        </div>
      </div>

      {achievements.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎖️</div>
          <div className="empty-title">No achievements yet</div>
          <div className="empty-text">
            Be the first to share a win! Achievements appear here after admin approval.
          </div>
          {session?.user && (
            <Link href="/achievements/new" className="btn btn-primary" style={{ marginTop: 8 }}>
              Share your first achievement
            </Link>
          )}
        </div>
      ) : (
        <div className="grid-auto">
          {achievements.map((a) => {
            const initials = a.user.name.slice(0, 2).toUpperCase();
            return (
              <div key={a.id} className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {a.imageUrl && (
                  <div style={{ borderRadius: "var(--radius)", overflow: "hidden", lineHeight: 0 }}>
                    <img
                      src={a.imageUrl}
                      alt={a.title ?? "Achievement"}
                      style={{ width: "100%", height: 180, objectFit: "cover" }}
                    />
                  </div>
                )}

                {a.platform && (
                  <span
                    className={`platform-chip platform-${a.platform.toLowerCase().replace("codeforces", "cf").replace("codechef", "cc").replace("atcoder", "atc")}`}
                    style={{ alignSelf: "flex-start" }}
                  >
                    {PLATFORM_LABELS[a.platform] ?? a.platform}
                  </span>
                )}

                {a.title && (
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)" }}>
                    {a.title}
                  </div>
                )}

                <p style={{ fontSize: "0.85rem", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
                  {a.caption}
                </p>

                <div className="flex items-center gap-2" style={{ marginTop: "auto" }}>
                  <div
                    className="avatar-fallback"
                    style={{
                      width: 28,
                      height: 28,
                      fontSize: "0.65rem",
                      background: "linear-gradient(135deg, var(--accent), var(--diamond-2))",
                    }}
                  >
                    {a.user.avatarUrl ? (
                      <img src={a.user.avatarUrl} alt="" className="avatar avatar-xs" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text)" }}>
                      {a.user.name}
                    </div>
                    {a.achievementDate && (
                      <div style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>
                        {new Date(a.achievementDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
