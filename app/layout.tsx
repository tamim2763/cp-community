import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/ui/navbar";
import { Sidebar } from "@/components/ui/sidebar";
import { OnboardingTutorialModal } from "@/components/onboarding-tutorial-modal";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: { default: "CP Community", template: "%s | CP Community" },
  description: "Competitive programming community — leaderboard, resources, achievements, and more.",
  keywords: ["competitive programming", "codeforces", "atcoder", "codechef", "leaderboard"],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const isAuthed = !!session?.user;
  const shouldShowOnboarding = isAuthed && session?.user && !session.user.hasSeenOnboardingTutorial;

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <div className="app-shell">
          <Navbar user={session?.user ?? null} />
          {isAuthed && <Sidebar user={session?.user ?? null} />}
          <main className={`main-content ${isAuthed ? "with-sidebar" : ""}`}>
            {shouldShowOnboarding && <OnboardingTutorialModal userId={session.user!.id} />}
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
