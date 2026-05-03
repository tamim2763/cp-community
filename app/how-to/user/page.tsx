import Link from "next/link";

export const metadata = { title: "How to use — User" };

export default function HowToUserPage() {
  // Google Drive video embed URL for user tutorial
  const VIDEO_EMBED = "https://drive.google.com/file/d/1A32LbE9CyLLVQ0AzXDXvMAx0KWkw9btP/preview";

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">How to use — User</h1>
        <p className="page-subtitle">A short walkthrough showing how users can link handles, sync Codeforces, and add solves.</p>
      </div>

      <div className="card">
        <div style={{ position: "relative", paddingTop: "56.25%" }}>
          <iframe
            src={VIDEO_EMBED}
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
            allowFullScreen
            title="How to use — User"
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <Link href="/dashboard" className="btn btn-secondary">Go to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
