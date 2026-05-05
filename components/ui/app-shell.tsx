"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Navbar, type NavbarUser } from "@/components/ui/navbar";
import { Sidebar } from "@/components/ui/sidebar";
import { OnboardingTutorialModal } from "@/components/onboarding-tutorial-modal";

type AppShellProps = {
  user: NavbarUser;
  isAuthed: boolean;
  shouldShowOnboarding: boolean;
  onboardingUserId?: string;
  children: React.ReactNode;
};

export function AppShell({
  user,
  isAuthed,
  shouldShowOnboarding,
  onboardingUserId,
  children,
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="app-shell">
      <Navbar
        user={user}
        onToggleSidebar={isAuthed ? () => setSidebarOpen((v) => !v) : undefined}
      />
      {isAuthed && (
        <>
          <Sidebar
            user={user}
            isOpen={sidebarOpen}
            onNavigate={() => setSidebarOpen(false)}
          />
          <button
            className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          />
        </>
      )}
      <main className={`main-content ${isAuthed ? "with-sidebar" : ""}`}>
        {shouldShowOnboarding && onboardingUserId ? (
          <OnboardingTutorialModal userId={onboardingUserId} />
        ) : null}
        {children}
      </main>
    </div>
  );
}
