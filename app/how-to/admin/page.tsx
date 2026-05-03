import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";

export const metadata = { title: "How to use — Admin" };

export default async function HowToAdminPage() {
  // enforce admin access server-side
  await requireAdmin();

  // Google Drive video embed URL for admin tutorial
  const VIDEO_EMBED = "https://drive.google.com/file/d/1nQLwWR4R7qxZOZWlY4AFcJv8pC9IDpXa/preview";

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">How to use — Admin</h1>
        <p className="page-subtitle">Admin walkthrough: managing users, achievements, and site settings.</p>
      </div>

      <div className="card">
        <div style={{ position: "relative", paddingTop: "56.25%", marginBottom: 16 }}>
          <iframe
            src={VIDEO_EMBED}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
            allowFullScreen
            title="How to use — Admin"
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/admin" className="btn btn-secondary">Go to Admin panel</Link>
        </div>
      </div>
    </div>
  );
}
