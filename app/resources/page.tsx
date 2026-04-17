import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const metadata: Metadata = { title: "Resources" };
export const revalidate = 600;

const DIFFICULTY_COLORS = {
  BEGINNER: { bg: "var(--success-soft)", color: "var(--success)" },
  INTERMEDIATE: { bg: "var(--warning-soft)", color: "var(--warning)" },
  ADVANCED: { bg: "var(--danger-soft)", color: "var(--danger)" },
};

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; difficulty?: string }>;
}) {
  const params = await searchParams;

  const categories = await prisma.resourceCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      resources: {
        where: {
          isPublished: true,
          ...(params.difficulty ? { difficultyLevel: params.difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" } : {}),
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    ...(params.category ? { where: { slug: params.category } } : {}),
  });

  // If no categories seeded yet, show seed prompt
  const totalResources = categories.reduce((sum, c) => sum + c.resources.length, 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📚 Resources</h1>
        <p className="page-subtitle">Curated competitive programming resources organized by topic</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2" style={{ marginBottom: 28, flexWrap: "wrap" }}>
        <Link href="/resources" className={`btn btn-sm ${!params.category ? "btn-primary" : "btn-secondary"}`}>
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/resources?category=${cat.slug}`}
            className={`btn btn-sm ${params.category === cat.slug ? "btn-primary" : "btn-secondary"}`}
          >
            {cat.name}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        {(["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const).map((level) => (
          <Link
            key={level}
            href={`/resources${params.category ? `?category=${params.category}&` : "?"}difficulty=${level}`}
            style={{
              ...DIFFICULTY_COLORS[level],
              padding: "5px 12px",
              borderRadius: "var(--radius-sm)",
              fontSize: "0.75rem",
              fontWeight: 700,
              border: "1px solid transparent",
              opacity: params.difficulty === level ? 1 : 0.6,
            }}
          >
            {level.charAt(0) + level.slice(1).toLowerCase()}
          </Link>
        ))}
      </div>

      {totalResources === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <div className="empty-title">Resources coming soon</div>
          <div className="empty-text">Admins can add resources from the admin panel.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 32 }}>
          {categories
            .filter((c) => c.resources.length > 0)
            .map((cat) => (
              <section key={cat.id}>
                <div className="section-title" style={{ marginBottom: 16 }}>
                  {cat.name}
                  {cat.description && (
                    <span style={{ fontWeight: 400, color: "var(--text-3)", fontSize: "0.8rem", marginLeft: 8 }}>
                      {cat.description}
                    </span>
                  )}
                </div>
                <div className="grid-auto">
                  {cat.resources.map((res) => {
                    const diffColor = res.difficultyLevel
                      ? DIFFICULTY_COLORS[res.difficultyLevel]
                      : null;
                    const tags = Array.isArray(res.tags) ? res.tags as string[] : [];
                    return (
                      <a
                        key={res.id}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card card-hover"
                        style={{ display: "flex", flexDirection: "column", gap: 10, textDecoration: "none" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="card-title" style={{ fontSize: "0.9rem" }}>{res.title}</div>
                          {diffColor && (
                            <span
                              style={{
                                ...diffColor,
                                padding: "2px 8px",
                                borderRadius: 999,
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {res.difficultyLevel!.charAt(0) + res.difficultyLevel!.slice(1).toLowerCase()}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
                          {res.description}
                        </p>
                        {tags.length > 0 && (
                          <div className="flex gap-2" style={{ flexWrap: "wrap", marginTop: "auto" }}>
                            {tags.slice(0, 4).map((tag) => (
                              <span key={tag} className="badge badge-neutral" style={{ fontSize: "0.65rem" }}>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--accent-2)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <span>↗</span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {new URL(res.url).hostname}
                          </span>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}
