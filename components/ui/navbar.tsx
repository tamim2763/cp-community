"use client";

import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type NavbarUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
} | null;

export function Navbar({ user }: { user: NavbarUser }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-logo">
        <div className="navbar-logo-icon">
          <Image src="/images/cse-logo.png" alt="CSE MBSTU Logo" width={32} height={32} className="navbar-logo-image" />
        </div>
        <span>CP Community</span>
      </Link>

      <div className="navbar-spacer" />

      <div className="navbar-actions">
        {user ? (
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              className="navbar-user"
              onClick={() => setMenuOpen((v) => !v)}
              style={{ background: "none" }}
            >
              <div className="navbar-avatar">{initials}</div>
              <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user.name ?? user.email}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {menuOpen && (
              
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 8px)",
                    width: 200,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-lg)",
                    padding: "8px",
                    zIndex: 200,
                    boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{ padding: "8px 10px 12px", borderBottom: "1px solid var(--border)", marginBottom: 6 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)" }}>{user.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 2 }}>{user.email}</div>
                  </div>
                  <DropItem href="/dashboard" onSelect={() => setMenuOpen(false)}>Dashboard</DropItem>
                  {user.role === "ADMIN" || user.role === "SUPER_ADMIN" ? (
                    <DropItem href="/admin" onSelect={() => setMenuOpen(false)}>Admin Panel</DropItem>
                  ) : null}
                  <div style={{ borderTop: "1px solid var(--border)", margin: "6px 0" }} />
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      background: "none",
                      border: "none",
                      color: "var(--danger)",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      textAlign: "left",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--danger-soft)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    Sign out
                  </button>
                </div>
              
            )}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/login" className="btn btn-secondary btn-sm">Log in</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Sign up</Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function DropItem({ href, children, onSelect }: { href: string; children: React.ReactNode; onSelect?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href) && href !== "/";
  return (
    <Link
      href={href as Route}
      style={{
        display: "block",
        padding: "8px 10px",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.875rem",
        fontWeight: 500,
        color: isActive ? "var(--accent-2)" : "var(--text-2)",
        background: isActive ? "var(--accent-soft)" : "none",
        transition: "all 0.15s",
      }}
      onClick={() => onSelect?.()}
      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--surface-2)"; }}
      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "none"; }}
    >
      {children}
    </Link>
  );
}
