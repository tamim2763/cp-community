import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/ui/navbar";
import { Sidebar } from "@/components/ui/sidebar";
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

  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Navbar user={session?.user ?? null} />
          {isAuthed && <Sidebar />}
          <main className={`main-content ${isAuthed ? "with-sidebar" : ""}`}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
