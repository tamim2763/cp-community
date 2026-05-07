import type { Metadata } from "next";
import { auth } from "@/auth";
import { JobSubmissionSection } from "@/components/submissions/job-submission-section";
import { getCachedJobs } from "@/lib/public-content-cache";

export const metadata: Metadata = { title: "Jobs & Internships" };
export const revalidate = 600;

const TYPE_LABELS: Record<string, string> = {
  INTERNSHIP: "Internship",
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  REMOTE: "Remote",
};

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  INTERNSHIP: { bg: "rgba(59,130,246,0.1)", color: "var(--accent-2)" },
  FULL_TIME: { bg: "var(--success-soft)", color: "var(--success)" },
  PART_TIME: { bg: "var(--warning-soft)", color: "var(--warning)" },
  CONTRACT: { bg: "rgba(201,124,65,0.1)", color: "var(--bronze)" },
  REMOTE: { bg: "rgba(103,232,249,0.1)", color: "var(--diamond-2)" },
};

function getDhakaStartOfToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const getPart = (type: Intl.DateTimeFormatPartTypes[number]) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");

  return new Date(`${year}-${month}-${day}T00:00:00+06:00`);
}

export default async function JobsPage() {
  const session = await auth();
  const jobs = await getCachedJobs();
  const dhakaStartOfToday = getDhakaStartOfToday();

  return (
    <div className="page-container">
      <JobSubmissionSection showSubmission={!!session?.user} />

      {jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💼</div>
          <div className="empty-title">No listings yet</div>
          <div className="empty-text">
            Admins will post opportunities here. Stay tuned!
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {jobs.map((job) => {
            const typeColor = TYPE_COLORS[job.type] ?? TYPE_COLORS.INTERNSHIP;
            const isExpired = job.deadline && new Date(job.deadline) < dhakaStartOfToday;

            return (
              <div
                key={job.id}
                className="card card-hover"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  opacity: isExpired ? 0.6 : 1,
                }}
              >
                <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--text)" }}>
                      {job.title}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-2)", marginTop: 2 }}>
                      {job.company}
                      {job.location && (
                        <span style={{ color: "var(--text-3)" }}> · {job.location}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
                    <span
                      style={{
                        ...typeColor,
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      {TYPE_LABELS[job.type]}
                    </span>
                    {isExpired && (
                      <span className="badge badge-danger" style={{ fontSize: "0.7rem" }}>Expired</span>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: "0.875rem", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
                  {job.description}
                </p>

                <div className="flex items-center justify-between" style={{ flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                  <div style={{ fontSize: "0.775rem", color: "var(--text-3)" }}>
                    {job.deadline
                      ? `Deadline: ${new Date(job.deadline).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}`
                      : "No deadline specified"}
                  </div>
                  {job.applyUrl && !isExpired && (
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                    >
                      Apply →
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
