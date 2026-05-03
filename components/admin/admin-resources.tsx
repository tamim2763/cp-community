"use client";

import { FormEvent, useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Resource = {
  id: string;
  title: string;
  description: string;
  url: string;
  platform: string | null;
  difficultyLevel: string | null;
  category: Category | null;
};

type ResourceForm = {
  title: string;
  description: string;
  url: string;
  categorySlug: string;
  platform: string;
  difficultyLevel: string;
  tags: string;
};

const initialForm: ResourceForm = {
  title: "",
  description: "",
  url: "",
  categorySlug: "",
  platform: "",
  difficultyLevel: "",
  tags: "",
};

export function AdminResources() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [form, setForm] = useState<ResourceForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadResources() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/resources", { cache: "no-store" });
      const data = (await response.json()) as {
        categories?: Category[];
        resources?: Resource[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Failed to load resources.");
      const loadedCategories = data.categories ?? [];
      setCategories(loadedCategories);
      setResources(data.resources ?? []);
      setForm((current) => ({
        ...current,
        categorySlug: current.categorySlug && loadedCategories.some((category) => category.slug === current.categorySlug)
          ? current.categorySlug
          : "",
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resources.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadResources();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        url: form.url,
        categorySlug: form.categorySlug,
        platform: form.platform,
        difficultyLevel: form.difficultyLevel.trim() ? form.difficultyLevel : undefined,
        tags: undefined,
      };

      const response = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { resource?: Resource; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to add resource.");
      setResources((current) => [data.resource!, ...current]);
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add resource.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this resource?")) return;

    try {
      const response = await fetch("/api/admin/resources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to delete resource.");
      setResources((current) => current.filter((resource) => resource.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete resource.");
    }
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <form className="card" style={{ display: "grid", gap: 14 }} onSubmit={submit}>
        <div>
          <div className="card-title">Add resource</div>
          <div className="card-subtitle">Publish practice sheets, roadmaps, and curated links.</div>
        </div>

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <input className="form-input" placeholder="Title" style={{ height: "auto" }} value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} />
          <input className="form-input" placeholder="URL" style={{ height: "auto" }} value={form.url} onChange={(e) => setForm((c) => ({ ...c, url: e.target.value }))} />
          <label className="form-field" style={{ display: "grid", gap: 8 }}>
            <span className="form-label">Category</span>
            <select className="form-input form-select" style={{
              backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><path fill="%23999" d="M4 6l4 4 4-4z"/></svg>')`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              paddingRight: "36px"
            }} value={form.categorySlug} onChange={(e) => setForm((c) => ({ ...c, categorySlug: e.target.value }))}>
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <textarea className="form-input form-textarea" placeholder="Description (e.g. Comprehensive guide to Dynamic Programming)" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />

        {error ? <div className="form-error">{error}</div> : null}

        <button type="submit" className="btn btn-primary" disabled={saving || categories.length === 0 || !form.categorySlug}>
          {saving ? "Saving..." : "Add resource"}
        </button>
      </form>

      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div className="card-title">Current resources</div>
        {loading ? (
          <div className="card-subtitle">Loading resources...</div>
        ) : resources.length === 0 ? (
          <div className="card-subtitle">No resources yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {resources.map((resource) => (
              <div key={resource.id} className="card" style={{ padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{resource.title}</div>
                  <div style={{ color: "var(--text-2)", fontSize: "0.9rem", marginTop: 4 }}>{resource.description}</div>
                  <div style={{ color: "var(--text-3)", fontSize: "0.8rem", marginTop: 6 }}>
                    {resource.category?.name ?? "Uncategorized"}
                    {resource.difficultyLevel ? ` • ${resource.difficultyLevel}` : ""}
                    {resource.platform ? ` • ${resource.platform}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <a href={resource.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Open</a>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => void remove(resource.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
