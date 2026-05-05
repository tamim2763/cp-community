"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { markOnboardingTutorialSeen } from "@/app/actions/user";

export function OnboardingTutorialModal({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Show modal on first load
    setIsOpen(true);
  }, []);

  async function handleSkip() {
    setIsLoading(true);
    await markOnboardingTutorialSeen(userId);
    setIsOpen(false);
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={() => handleSkip()}
    >
      <div
        className="card"
        style={{
          maxWidth: "600px",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          padding: "32px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="card-title">Welcome! 👋</div>
          <button
            onClick={handleSkip}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "var(--text-2)",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        <div className="card-subtitle" style={{ fontSize: "0.95rem" }}>
          Watch a quick tutorial to learn how to use CP Community!
        </div>

        {/* Video embed */}
        <div className="video-embed">
          <iframe
            src="https://drive.google.com/file/d/1A32LbE9CyLLVQ0AzXDXvMAx0KWkw9btP/preview"
            allowFullScreen
            title="How to use — User Tutorial"
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={handleSkip}
            disabled={isLoading}
            className="btn btn-secondary"
            style={{ flex: 1, minWidth: "120px" }}
          >
            {isLoading ? "Skipping..." : "Skip for now"}
          </button>
          <Link
            href="/how-to/user"
            className="btn btn-primary"
            style={{ flex: 1, minWidth: "120px", textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
            onClick={handleSkip}
          >
            Watch full tutorial
          </Link>
        </div>

        <div style={{ fontSize: "0.8rem", color: "var(--text-3)", textAlign: "center" }}>
          You can always access this from the "How to use" section in the sidebar.
        </div>
      </div>
    </div>
  );
}
