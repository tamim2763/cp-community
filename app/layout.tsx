import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/ui/app-shell";
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
        <AppShell
          user={session?.user ?? null}
          isAuthed={isAuthed}
          shouldShowOnboarding={shouldShowOnboarding}
          onboardingUserId={session?.user?.id}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
