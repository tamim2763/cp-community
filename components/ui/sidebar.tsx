"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navGroups = [
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {navGroups.map((group) => (
        <div key={group.label} className="sidebar-section">
          <div className="sidebar-label">{group.label}</div>
          {group.links.map((link) => {
            const isActive =
              link.href === "/dashboard"
                ? pathname === "/dashboard" || pathname.startsWith("/dashboard/")
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
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
