"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminAchievements } from "@/components/admin/admin-achievements";
import { AdminAlumni } from "@/components/admin/admin-alumni";
import { AdminAnnouncements } from "@/components/admin/admin-announcements";
import { AdminContests } from "@/components/admin/admin-contests";
import { AdminJobs } from "@/components/admin/admin-jobs";
import { AdminResources } from "@/components/admin/admin-resources";
import { AdminScoring } from "@/components/admin/admin-scoring";
import { AdminUsers } from "@/components/admin/admin-users";

const tabs = [
  { key: "users", label: "Users", icon: "👥", component: AdminUsers },
  { key: "scoring", label: "Scoring", icon: "⚖️", component: AdminScoring },
  { key: "achievements", label: "Achievements", icon: "🏅", component: AdminAchievements },
  { key: "alumni", label: "Alumni", icon: "🎓", component: AdminAlumni },
  { key: "resources", label: "Resources", icon: "📚", component: AdminResources },
  { key: "contests", label: "Contests", icon: "🏆", component: AdminContests },
  { key: "jobs", label: "Jobs", icon: "💼", component: AdminJobs },
  { key: "announcements", label: "Announcements", icon: "📢", component: AdminAnnouncements },
] as const;

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("users");
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some((tab) => tab.key === tabParam)) {
      setActiveTab(tabParam as (typeof tabs)[number]["key"]);
    }
  }, [searchParams]);

  const ActiveComponent = useMemo(
    () => tabs.find((tab) => tab.key === activeTab)?.component ?? AdminUsers,
    [activeTab],
  );

  return (
    <div className="page-container-wide">
      <div className="page-header">
        <h1 className="page-title">🛠️ Admin Panel</h1>
        <p className="page-subtitle">
          Manage users, leaderboard scoring, achievements, alumni, resources, contests, jobs, and announcements.
        </p>
      </div>

      <div className="card" style={{ padding: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {tabs.map((tab) => {
            const active = tab.key === activeTab;

            return (
              <button
                key={tab.key}
                type="button"
                className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("tab", tab.key);
                  router.replace(`/admin?${params.toString()}`);
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ActiveComponent />
    </div>
  );
}
