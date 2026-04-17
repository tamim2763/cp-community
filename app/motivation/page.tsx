import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Stay Motivated" };
export const revalidate = 3600;

export default async function MotivationPage() {
  const profiles = await prisma.motivationalProfile.findMany({
    where: { isPublished: true },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
  });

  const featured = profiles.filter((p) => p.isFeatured);
  const rest = profiles.filter((p) => !p.isFeatured);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🚀 Stay Motivated</h1>
        <p className="page-subtitle">
          Alumni and seniors from our community who have excelled in competitive programming and beyond
        </p>
      </div>

      {profiles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚀</div>
          <div className="empty-title">Coming soon</div>
          <div className="empty-text">Alumni profiles will be added soon. Check back later!</div>
        </div>
      ) : (
        <>
          {/* Featured */}
          {featured.length > 0 && (
            <section className="section">
              <div className="section-title">⭐ Featured Alumni</div>
              <div className="grid-2">
                {featured.map((p) => (
                  <AlumniCard key={p.id} profile={p} featured />
                ))}
              </div>
            </section>
          )}

          {/* All */}
          {rest.length > 0 && (
            <section className="section">
              <div className="section-title">Community Members</div>
              <div className="grid-auto">
                {rest.map((p) => (
                  <AlumniCard key={p.id} profile={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

type Profile = {
  id: string;
  name: string;
  headline: string | null;
  bio: string;
  imageUrl: string | null;
  linkedinUrl: string;
  batchYear: number | null;
  department: string | null;
  achievementsText: string | null;
  isFeatured: boolean;
};

function AlumniCard({ profile, featured = false }: { profile: Profile; featured?: boolean }) {
  const initials = profile.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div
      className="card card-hover"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        ...(featured ? { borderColor: "var(--accent)", background: "rgba(59,130,246,0.04)" } : {}),
      }}
    >
      <div className="flex gap-3">
        {profile.imageUrl ? (
          <img
            src={profile.imageUrl}
            alt={profile.name}
            className="avatar avatar-lg"
            style={{ flexShrink: 0, border: "2px solid var(--border)" }}
          />
        ) : (
          <div
            className="avatar-fallback"
            style={{
              width: 56,
              height: 56,
              fontSize: "1.1rem",
              flexShrink: 0,
              background: "linear-gradient(135deg, var(--accent), var(--diamond-2))",
            }}
          >
            {initials}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)" }}>{profile.name}</div>
          {profile.headline && (
            <div style={{ fontSize: "0.8rem", color: "var(--accent-2)", marginTop: 2 }}>{profile.headline}</div>
          )}
          <div className="flex gap-2" style={{ marginTop: 6, flexWrap: "wrap" }}>
            {profile.batchYear && (
              <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>
                Batch {profile.batchYear}
              </span>
            )}
            {profile.department && (
              <span className="badge badge-neutral" style={{ fontSize: "0.68rem" }}>
                {profile.department}
              </span>
            )}
          </div>
        </div>
      </div>

      <p style={{ fontSize: "0.85rem", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
        {profile.bio}
      </p>

      {profile.achievementsText && (
        <div
          style={{
            background: "var(--success-soft)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 12px",
            fontSize: "0.8rem",
            color: "var(--success)",
            lineHeight: 1.5,
          }}
        >
          🏆 {profile.achievementsText}
        </div>
      )}

      <a
        href={profile.linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-secondary btn-sm"
        style={{ alignSelf: "flex-start" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        LinkedIn
      </a>
    </div>
  );
}
