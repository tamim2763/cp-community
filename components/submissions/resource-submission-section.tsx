"use client";

import { FormEvent, useMemo, useState } from "react";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type ResourceForm = {
  title: string;
  description: string;
  url: string;
  categorySlug: string;
};

const initialForm: ResourceForm = {
  title: "",
  description: "",
  url: "",
  categorySlug: "",
};

type Props = {
  categories: Category[];
  showSubmission: boolean;
};

export function ResourceSubmissionSection({ categories, showSubmission }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ResourceForm>(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
    }));
  }, [categories]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setToastMessage(null);

    try {
      const response = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          url: form.url,
          categorySlug: form.categorySlug,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to submit resource.");
      }
      setForm(initialForm);
      setOpen(false);
      setToastMessage("Submitted for review. You will see it once approved.");
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit resource.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">📚 Resources</h1>
            <p className="page-subtitle">Curated competitive programming resources organized by topic</p>
          </div>
          {showSubmission ? (
            <button type="button" className="btn btn-primary" onClick={() => setOpen((value) => !value)}>
              {open ? "Close" : "Add resource"}
            </button>
          ) : null}
        </div>
      </div>

      {toastMessage ? (
        <div className="submission-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}

      {showSubmission && open ? (
        <form className="card" style={{ display: "grid", gap: 14 }} onSubmit={submit}>
          <div>
            <div className="card-title">Add resource</div>
            <div className="card-subtitle">Submissions are reviewed by admins before publishing.</div>
          </div>

          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <input
              className="form-input"
              placeholder="Title"
              style={{ height: "auto" }}
              value={form.title}
              onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
              required
            />
            <input
              className="form-input"
              placeholder="URL"
              style={{ height: "auto" }}
              value={form.url}
              onChange={(e) => setForm((current) => ({ ...current, url: e.target.value }))}
              required
            />
            <label className="form-field" style={{ display: "grid", gap: 8 }}>
              <span className="form-label">Category</span>
              <select
                className="form-input form-select"
                style={{
                  backgroundImage:
                    "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"16\" height=\"16\" viewBox=\"0 0 16 16\"><path fill=\"%23999\" d=\"M4 6l4 4 4-4z\"/></svg>')",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 10px center",
                  paddingRight: "36px",
                }}
                value={form.categorySlug}
                onChange={(e) => setForm((current) => ({ ...current, categorySlug: e.target.value }))}
                required
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <textarea
            className="form-input form-textarea"
            placeholder="Description (e.g. Comprehensive guide to Dynamic Programming)"
            value={form.description}
            onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
            required
          />

          {error ? <div className="form-error">{error}</div> : null}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving || categoryOptions.length === 0}
          >
            {saving ? "Submitting..." : "Submit resource"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
