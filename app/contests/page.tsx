import type { Metadata } from "next";
import Image from "next/image";
import { getCachedContests } from "@/lib/public-content-cache";

export const metadata: Metadata = { title: "Contest Schedule" };
export const revalidate = 300;

const PLATFORM_META: Record<string, { label: string; icon: string; border: string }> = {
  CODEFORCES: { label: "Codeforces", icon: "/images/codeforces.svg", border: "var(--cf)" },
  CODECHEF: { label: "CodeChef", icon: "/images/codechef.svg", border: "var(--cc)" },
  ATCODER: { label: "AtCoder", icon: "/images/atcoder.svg", border: "var(--atc)" },
  CUSTOM: { label: "Custom", icon: "", border: "var(--success)" },
};

function toGoogleDate(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes[number]) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}${getPart("month")}${getPart("day")}T${getPart("hour")}${getPart("minute")}${getPart("second")}`;
}

function buildGoogleCalendarUrl(input: {
  title: string;
  start: Date;
  end: Date;
  details: string;
}) {
  const dates = `${toGoogleDate(input.start)}/${toGoogleDate(input.end)}`;
  const query = new URLSearchParams({
    text: input.title,
    dates,
    ctz: "Asia/Dhaka",
    details: input.details,
  });

  return `https://calendar.google.com/calendar/u/0/r/eventedit?${query.toString()}`;
}

function formatDuration(minutes: number | null) {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function timeUntil(start: Date) {
  const now = new Date();
  const diff = start.getTime() - now.getTime();
  if (diff < 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h ${mins}m`;
  return `in ${mins}m`;
}

export default async function ContestsPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  const params = await searchParams;
  const contests = await getCachedContests(params.platform);

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 className="page-title">📅 Contest Schedule</h1>
            {/* <p className="page-subtitle">Upcoming contests only: AtCoder Beginner Contest, CodeChef Starters, and Codeforces Div. 2/3/4</p> */}
          </div>
          <span className="badge badge-neutral">{contests.length} upcoming</span>
        </div>
      </div>

      {/* Platform filter */}
      <div className="flex gap-2" style={{ marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { key: "ALL", label: "All Platforms" },
          { key: "CODEFORCES", label: "Codeforces" },
          { key: "CODECHEF", label: "CodeChef" },
          { key: "ATCODER", label: "AtCoder" },
        ].map(({ key, label }) => (
          <a
            key={key}
            href={key === "ALL" ? "/contests" : `/contests?platform=${key}`}
            className={`btn btn-sm ${(params.platform ?? "ALL") === key ? "btn-primary" : "btn-secondary"}`}
          >
            {label}
          </a>
        ))}
      </div>

      {contests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">No upcoming contests</div>
          <div className="empty-text">
            Contest data syncs automatically every 12 hours. Check back soon or configure your CLIST API key.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          {contests.map((c) => {
            const platformKey = c.source === "MANUAL" ? "CUSTOM" : c.platform ?? null;
            const pInfo = platformKey ? PLATFORM_META[platformKey] : null;
            const startLocal = new Date(c.startTime);
            const endLocal = c.endTime
              ? new Date(c.endTime)
              : new Date(startLocal.getTime() + (c.durationMinutes ?? 120) * 60 * 1000);
            const until = timeUntil(startLocal);
            const duration = formatDuration(c.durationMinutes);
            const calendarUrl = buildGoogleCalendarUrl({
              title: c.title,
              start: startLocal,
              end: endLocal,
              details: `Contest\nName: ${c.title}\nPlatform: ${pInfo?.label ?? "Unknown"}\nURL: ${c.url}`,
            });

            return (
              <article
                key={c.id}
                className="card card-hover"
                style={{
                  display: "grid",
                  gap: 14,
                  padding: "18px 18px 16px",
                  minHeight: 190,
                  borderColor: "var(--border-2)",
                }}
              >
                {/* Top row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-2)", fontWeight: 600 }}>
                    {startLocal.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Dhaka" })}
                    {" at "}
                    {startLocal.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" })}
                  </div>
                  {duration && (
                    <span className="badge badge-neutral" style={{ fontSize: "0.72rem" }}>⏱ {duration}</span>
                  )}
                </div>

                {/* Title and platform */}
                <div style={{ display: "grid", gap: 10 }}>
                {pInfo && (
                  <span
                    title={pInfo.label}
                    aria-label={pInfo.label}
                    style={{
                      background: platformKey === "CUSTOM" ? "var(--success-soft)" : "#ffffff",
                      border: `1px solid ${pInfo.border}`,
                      padding: platformKey === "CUSTOM" ? "4px 10px" : "6px 8px",
                      borderRadius: "var(--radius-sm)",
                      width: "fit-content",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: platformKey === "CUSTOM" ? "var(--success)" : "inherit",
                      fontSize: platformKey === "CUSTOM" ? "0.75rem" : "inherit",
                      fontWeight: platformKey === "CUSTOM" ? 700 : "inherit",
                    }}
                  >
                    {platformKey === "CUSTOM" ? (
                      pInfo.label
                    ) : (
                      <Image src={pInfo.icon} alt={pInfo.label} width={22} height={22} />
                    )}
                  </span>
                )}
                  <h3 style={{ margin: 0, fontWeight: 700, color: "var(--text)", fontSize: "1.05rem", lineHeight: 1.35 }}>
                    {c.title}
                  </h3>
                </div>

                {/* Bottom row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: "auto" }}>
                  {until && (
                    <div style={{ fontSize: "0.8rem", color: "var(--accent-2)", fontWeight: 600 }}>{until}</div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <a
                      href={calendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Add ${c.title} to calendar`}
                      title="Add to Google Calendar"
                      className="btn btn-secondary btn-sm"
                      style={{ width: 36, height: 36, padding: 0, borderRadius: 10 }}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2v4" />
                        <path d="M16 2v4" />
                        <rect width="18" height="18" x="3" y="4" rx="2" />
                        <path d="M3 10h18" />
                        <path d="m9 16 2 2 4-4" />
                      </svg>
                    </a>

                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open contest page for ${c.title}`}
                      title="Open contest page"
                      className="btn btn-primary btn-sm"
                      style={{ width: 36, height: 36, padding: 0, borderRadius: 10 }}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p style={{ marginTop: 20, fontSize: "0.775rem", color: "var(--text-3)", textAlign: "center" }}>
        Contest data sourced from{" "}
        <a href="https://clist.by" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent-2)" }}>
          clist.by
        </a>{" "}
      </p>
    </div>
  );
}
