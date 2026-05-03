import Link from "next/link";

import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();

  return (
    <main>
      <div className="page-shell homepage-shell">
        <div className="page-container homepage-container">
          <section className="homepage-hero">
            <div className="homepage-hero-copy">
              <h1>Build consistency, compete weekly, and grow the community together.</h1>
              <p>
                A focused platform for tracking progress, sharing resources and staying connected.
              </p>

              <div className="hero-actions">
                {session?.user ? (
                  <>
                    <Link className="auth-button" href="/dashboard">
                      Go to dashboard
                    </Link>
                    <Link className="auth-button secondary-button" href="/leaderboard">
                      View leaderboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link className="auth-button" href="/register">
                      Join the community
                    </Link>
                    <Link className="auth-button secondary-button" href="/login">
                      Log in
                    </Link>
                  </>
                )}
              </div>

              
            </div>

            
          </section>

        </div>
      </div>
    </main>
  );
}
