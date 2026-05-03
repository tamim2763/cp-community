"use client";

import { FormEvent, useEffect, useState } from "react";

type ScoringConfig = {
  multiplierBase: number;
  gapStepSize: number;
};

const DEFAULT_CONFIG: ScoringConfig = {
  multiplierBase: 1.1,
  gapStepSize: 100,
};

export function AdminScoring() {
  const [config, setConfig] = useState<ScoringConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/scoring", { cache: "no-store" });
        const data = (await response.json()) as { config?: ScoringConfig; error?: string };

        if (!response.ok) throw new Error(data.error ?? "Failed to load scoring config.");
        setConfig(data.config ?? DEFAULT_CONFIG);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load scoring config.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/scoring", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(data.error ?? "Failed to save scoring config.");
      setSuccess("Scoring config saved. Existing aggregates were recomputed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save scoring config.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card" style={{ display: "grid", gap: 16 }}>
      <div>
        <div className="card-title">Leaderboard scoring</div>
        <div className="card-subtitle">
          Weighted score uses base<sup>steps</sup>, where steps = ceil(|problem rating - user rating| / gap step size).
        </div>
      </div>

      {loading ? (
        <div className="card-subtitle">Loading scoring config...</div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 16, maxWidth: 560 }}>
          <div className="form-field">
            <label className="form-label">Multiplier base</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              min="1.01"
              value={config.multiplierBase}
              onChange={(event) =>
                setConfig((current) => ({ ...current, multiplierBase: Number(event.target.value) }))
              }
            />
            <div className="form-hint">Example: 1.10 means each harder step adds 10% more weight.</div>
          </div>

          <div className="form-field">
            <label className="form-label">Gap step size</label>
            <input
              className="form-input"
              type="number"
              min="1"
              value={config.gapStepSize}
              onChange={(event) =>
                setConfig((current) => ({ ...current, gapStepSize: Number(event.target.value) }))
              }
            />
            <div className="form-hint">Example: 100 means every 100 rating gap counts as one step.</div>
          </div>

          {error ? <div className="form-error">{error}</div> : null}
          {success ? <div className="form-success">{success}</div> : null}

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving and recomputing..." : "Save scoring config"}
          </button>
        </form>
      )}
    </section>
  );
}
