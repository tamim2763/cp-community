"use client";

import { useActionState, useEffect } from "react";
import { syncMySubmissionsAction, type SyncSubmissionsState } from "@/app/actions/cp-profile";

const initialState: SyncSubmissionsState = {
  error: null,
  success: null,
};

export function SyncSubmissionsButton() {
  const [state, formAction, isPending] = useActionState(syncMySubmissionsAction, initialState);

  useEffect(() => {
    if (state.success) {
      // Could show a toast here if we had a toast system
      console.log(state.success);
    }
    if (state.error) {
      console.error(state.error);
    }
  }, [state]);

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={isPending}
        className="btn btn-secondary"
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        {isPending ? (
          <>
             <span style={{ animation: "spin 1s linear infinite" }}>🔄</span>
             Syncing...
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21v-5h5" />
            </svg>
            Sync CF Data
          </>
        )}
      </button>
    </form>
  );
}
