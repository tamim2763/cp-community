import Link from "next/link";

import { auth } from "@/auth";

const productAreas = [
  {
    title: "Leaderboard",
    description:
      "Weekly weighted rankings across Codeforces, CodeChef, and AtCoder using normalized solve data.",
  },
  {
    title: "Dashboard",
    description:
      "User progress, heatmap, streaks, platform breakdowns, and prize money summary.",
  },
  {
    title: "Community",
    description:
      "Achievements, alumni motivation, curated resources, contests, and future real-time chat.",
  },
];

const buildSteps = [
  "Wire Prisma into PostgreSQL and run the first migration.",
  "Add Auth.js credentials auth and protected routes.",
  "Build CP profile linking and submission sync jobs.",
  "Ship leaderboard and dashboard before chat.",
];

export default async function HomePage() {
  const session = await auth();

  return (
    <main>
      <div className="page-shell">
        <section className="hero">
          <span className="badge">Buddy scaffolded this</span>
          <h1>CP Community Web App</h1>
          <p>
            Next.js + Prisma boilerplate is now in place. The schema is ready,
            the app shell exists, and credentials-based auth is now wired in.
          </p>

          <div className="hero-actions">
            {session?.user ? (
              <Link className="auth-button secondary-button" href="/dashboard">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link className="auth-button secondary-button" href="/login">
                  Log in
                </Link>
                <Link className="auth-button" href="/register">
                  Create account
                </Link>
              </>
            )}
          </div>
        </section>

        <section className="grid">
          {productAreas.map((area) => (
            <article key={area.title} className="card">
              <h2>{area.title}</h2>
              <p>{area.description}</p>
            </article>
          ))}
        </section>

        <section className="grid">
          <article className="card">
            <h3 className="section-title">Current stack</h3>
            <ul className="stack-list">
              <li>Next.js 15 App Router</li>
              <li>TypeScript</li>
              <li>Prisma + PostgreSQL</li>
              <li>Seed script placeholder</li>
            </ul>
          </article>

          <article className="card">
            <h3 className="section-title">Next build steps</h3>
            <ol className="stack-list">
              {buildSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        </section>
      </div>
    </main>
  );
}
