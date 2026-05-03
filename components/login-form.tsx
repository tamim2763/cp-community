"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { type AuthFormState, loginAction, requestPasswordResetAction } from "@/app/actions/auth";
import { AuthSubmitButton } from "@/components/auth-submit-button";

const initialState: AuthFormState = { error: null, success: null };

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [resetState, resetAction] = useActionState(requestPasswordResetAction, initialState);
  const [mode, setMode] = useState<"login" | "reset">("login");

  if (mode === "reset") {
    return (
      <form className="auth-form" action={resetAction}>
        <div className="field-group">
          <label htmlFor="reset-email">Enter the email address of your account</label>
          <input id="reset-email" name="email" type="email" placeholder="ce.....@mbstu.ac.bd" required />
        </div>

        {resetState?.error ? <p className="form-error">{resetState.error}</p> : null}
        {resetState?.success ? <p className="form-success">{resetState.success}</p> : null}

        <AuthSubmitButton label="Send reset link" pendingLabel="Sending..." />

        <p className="auth-helper-text">
          Remember your password?{" "}
          <button type="button" className="auth-link-button" onClick={() => setMode("login")}>
            Log in
          </button>
        </p>
      </form>
    );
  }

  return (
    <form className="auth-form" action={formAction}>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />

      <div className="field-group">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="ce.....@mbstu.ac.bd" required />
      </div>

      <div className="field-group">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" placeholder="••••••••" required />
      </div>

      <p className="auth-helper-text" style={{ textAlign: "right" }}>
        <button type="button" className="auth-link-button" onClick={() => setMode("reset")}>
          Forgot password?
        </button>
      </p>

      {state?.error ? <p className="form-error">{state.error}</p> : null}

      <AuthSubmitButton label="Log in" pendingLabel="Logging in..." />

      <p className="auth-helper-text">
        Don&apos;t have an account? <Link href="/register">Create one</Link>
      </p>
    </form>
  );
}
