"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import { addManualProblemSolveAction } from "@/app/actions/cp-profile";
import { CpPlatform } from "@prisma/client";

const initialState = { error: null, success: null };

export function SolveEntry() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const [ccState, ccFormAction, ccPending] = useActionState(addManualProblemSolveAction, initialState);
  const [atcState, atcFormAction, atcPending] = useActionState(addManualProblemSolveAction, initialState);

  useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!panelRef.current) return;
      if (panelRef.current.contains(target)) return;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button ref={buttonRef} className="btn btn-secondary" onClick={() => setOpen((s) => !s)} aria-expanded={open}>
        Solve entry
      </button>

      {open ? (
        <div ref={panelRef} style={{ position: "absolute", right: 0, top: "42px", width: 360, background: "var(--bg-2)", border: "1px solid var(--border-2)", borderRadius: 8, padding: 12, zIndex: 40 }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ padding: 8, borderRadius: 6, background: "var(--bg-3)" }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>CodeChef</div>
              <form action={ccFormAction} className="compact-form">
                <input type="hidden" name="platform" value={CpPlatform.CODECHEF} />
                <div className="field-group">
                  <label>Problem link</label>
                  <input name="problemUrl" type="url" placeholder="https://www.codechef.com/problems/INTEST" required />
                </div>
                <div className="field-group">
                  <label>Problem rating</label>
                  <input name="rating" type="number" min="1" placeholder="e.g. 1200" required />
                </div>
                {ccState.error ? <p className="form-error">{ccState.error}</p> : null}
                {ccState.success ? <p className="form-success">{ccState.success}</p> : null}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button className="auth-button" type="submit" disabled={ccPending}>{ccPending ? "Adding..." : "Add solved problem"}</button>
                </div>
              </form>
            </div>

            <div style={{ padding: 8, borderRadius: 6, background: "var(--bg-3)" }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>AtCoder</div>
              <form action={atcFormAction} className="compact-form">
                <input type="hidden" name="platform" value={CpPlatform.ATCODER} />
                <div className="field-group">
                  <label>Problem link</label>
                  <input name="problemUrl" type="url" placeholder="https://atcoder.jp/contests/abc086/tasks/abc086_a" required />
                </div>
                <div className="field-group">
                  <label>Problem rating</label>
                  <input name="rating" type="number" min="1" placeholder="e.g. 1200" required />
                </div>
                {atcState.error ? <p className="form-error">{atcState.error}</p> : null}
                {atcState.success ? <p className="form-success">{atcState.success}</p> : null}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                  <button className="auth-button" type="submit" disabled={atcPending}>{atcPending ? "Adding..." : "Add solved problem"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
