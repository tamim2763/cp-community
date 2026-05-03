"use client";

import { useEffect, useMemo, useState } from "react";

type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = (await response.json()) as { users?: AdminUser[]; error?: string };

      if (!response.ok) throw new Error(data.error ?? "Failed to load users.");
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;

    return users.filter((user) =>
      [user.name, user.email, user.role].some((value) => value.toLowerCase().includes(term)),
    );
  }, [query, users]);

  async function removeUser(id: string) {
    if (!window.confirm("Remove this user? This permanently deletes their account.")) return;

    setBusyId(id);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) throw new Error(data.error ?? "Failed to remove user.");
      setUsers((current) => current.filter((user) => user.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove user.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card" style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="card-title">User management</div>
          <div className="card-subtitle">Review accounts and remove users.</div>
        </div>
        <input
          className="form-input"
          placeholder="Search by name, email, or role"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{ width: "min(340px, 100%)" }}
        />
      </div>

      {error ? <div className="form-error">{error}</div> : null}

      {loading ? (
        <div className="card-subtitle">Loading users...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-3)", fontSize: "0.8rem" }}>
                <th style={{ padding: "0 0 10px" }}>Name</th>
                <th style={{ padding: "0 0 10px" }}>Email</th>
                <th style={{ padding: "0 0 10px" }}>Role</th>
                <th style={{ padding: "0 0 10px" }}>Status</th>
                <th style={{ padding: "0 0 10px" }}>Created</th>
                <th style={{ padding: "0 0 10px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "14px 0", fontWeight: 600 }}>{user.name}</td>
                  <td style={{ padding: "14px 0", color: "var(--text-2)" }}>{user.email}</td>
                  <td style={{ padding: "14px 0" }}>{user.role}</td>
                  <td style={{ padding: "14px 0" }}>
                    <span className={`badge ${user.isActive ? "badge-success" : "badge-danger"}`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 0", color: "var(--text-2)" }}>
                    {new Date(user.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td style={{ padding: "14px 0" }}>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={busyId === user.id}
                      onClick={() => void removeUser(user.id)}
                    >
                      {busyId === user.id ? "Removing..." : "Remove"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
