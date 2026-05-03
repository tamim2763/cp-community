import type { Metadata } from "next";
import { auth } from "@/auth";
import Link from "next/link";
import { AchievementWall } from "@/components/achievement-wall";
import { getCachedAchievements } from "@/lib/public-content-cache";

export const metadata: Metadata = { title: "Achievement Wall" };
export const revalidate = 120;


export default async function AchievementsPage() {
  const session = await auth();
  const achievements = await getCachedAchievements();

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
        <AchievementWall achievements={achievements} />
      )}
    </div>
  );
}
