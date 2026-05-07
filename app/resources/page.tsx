import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { ResourceSubmissionSection } from "@/components/submissions/resource-submission-section";
import { getCachedResources } from "@/lib/public-content-cache";

export const metadata: Metadata = { title: "Resources" };
export const revalidate = 600;

const ALLOWED_CATEGORY_SLUGS = ["problem-solving-sheets", "topic-lists-and-tracks"] as const;

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  const selectedCategory =
    params.category && ALLOWED_CATEGORY_SLUGS.includes(params.category as (typeof ALLOWED_CATEGORY_SLUGS)[number])
      ? params.category
      : undefined;

  const categories = await getCachedResources(selectedCategory);

  // If no categories seeded yet, show seed prompt
  const totalResources = categories.reduce((sum, c) => sum + c.resources.length, 0);

  return (
    <div className="page-container">
      <ResourceSubmissionSection
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
        }))}
        showSubmission={!!session?.user}
      />

      {/* Filters */}
      <div className="flex gap-2" style={{ marginBottom: 28, flexWrap: "wrap" }}>
        <Link href="/resources" className={`btn btn-sm ${!selectedCategory ? "btn-primary" : "btn-secondary"}`}>
          All
        </Link>
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/resources?category=${cat.slug}`}
            className={`btn btn-sm ${selectedCategory === cat.slug ? "btn-primary" : "btn-secondary"}`}
          >
            {cat.name}
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
                </div>
                <div className="grid-auto">
                  {cat.resources.map((res) => {
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
                        </div>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
                          {res.description}
                        </p>
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
