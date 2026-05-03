import type { Metadata } from "next";
import { getCachedMotivation } from "@/lib/public-content-cache";

export const metadata: Metadata = { title: "Stay Motivated" };
export const revalidate = 600;

export default async function MotivationPage() {
  const alumni = await getCachedMotivation();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🚀 Stay Motivated</h1>
        <p className="page-subtitle">
          Alumni from our community who have excelled in competitive programming and beyond
        </p>
      </div>

      {alumni.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎓</div>
          <div className="empty-title">No alumni profiles yet</div>
          <div className="empty-text">Admins can publish motivational profiles from the admin panel.</div>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          {alumni.map((item) => (
            <div
              key={item.id}
              className="card card-hover"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "28px 20px 22px",
                gap: 14,
                position: "relative",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "3px solid var(--border-2)",
                  flexShrink: 0,
                  background: "var(--surface-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontWeight: 800, fontSize: "1.6rem" }}>
                    {item.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>

              <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text)", lineHeight: 1.3 }}>
                {item.name}
              </div>

              <div style={{ fontSize: "0.78rem", color: "var(--text-3)", lineHeight: 1.45, minHeight: 36 }}>
                {item.headline ?? item.bio}
              </div>

              {(item.batchYear || item.department) && (
                <div style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>
                  {item.batchYear ? `Batch ${item.batchYear}` : ""}
                  {item.batchYear && item.department ? " • " : ""}
                  {item.department ?? ""}
                </div>
              )}

              <a
                href={item.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`View ${item.name} on LinkedIn`}
                title="View LinkedIn profile"
                className="btn btn-sm"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#ffffff",
                  background: "#0a66c2",
                  textDecoration: "none",
                  marginTop: "auto",
                  border: "none",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                LinkedIn
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
