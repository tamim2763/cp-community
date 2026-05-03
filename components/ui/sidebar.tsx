"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navGroups: Array<{
  label: string;
  links: Array<{ href: Route; label: string; icon: string }>;
}> = [
  {
    label: "Main",
    links: [
      { href: "/dashboard", label: "Dashboard", icon: "📊" },
      { href: "/leaderboard", label: "Leaderboard", icon: "🏆" },
    ],
  },
  {
    label: "Community",
    links: [
      { href: "/achievements", label: "Achievements", icon: "🎖️" },
      { href: "/motivation", label: "Stay Motivated", icon: "🚀" },
      { href: "/chat", label: "Chat", icon: "💬" },
    ],
  },
  {
    label: "Resources",
    links: [
      { href: "/resources", label: "Resources", icon: "📚" },
      { href: "/contests", label: "Contests", icon: "📅" },
      { href: "/jobs", label: "Jobs", icon: "💼" },
    ],
  },
  {
    label: "Help",
    links: [
      { href: "/feedback", label: "Bug / Suggest", icon: "🐛" },
    ],
  },
];

export function Sidebar({ user }: { user?: { role?: string } | null }) {
  const pathname = usePathname();

  // Clone navGroups so we can append the How to use group locally
  const groups = [...navGroups];
  groups.push({
    label: "How to use",
    links: [
      { href: "/how-to/user", label: "User", icon: "📺" },
      { href: "/how-to/admin", label: "Admin", icon: "🛠️" },
    ],
  });

  return (
    <aside className="sidebar">
      {groups.map((group) => (
        <div key={group.label} className="sidebar-section">
          <div className="sidebar-label">{group.label}</div>
          {group.links.map((link) => {
            // Admin link should only be visible to admins
            if (group.label === "How to use" && link.label === "Admin") {
              const role = user?.role ?? null;
              if (!(role === "ADMIN" || role === "SUPER_ADMIN")) return null;
            }

            const isActive =
              link.href === "/dashboard"
                ? pathname === "/dashboard" || pathname.startsWith("/dashboard/")
                : pathname.startsWith(link.href as string);
            return (
              <Link
                key={String(link.href)}
                href={link.href}
                className={`sidebar-link ${isActive ? "active" : ""}`}
              >
                <span style={{ fontSize: "1rem", lineHeight: 1 }}>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
