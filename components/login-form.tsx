"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";

import { type AuthFormState, loginAction, requestPasswordResetAction } from "@/app/actions/auth";
import { AuthSubmitButton } from "@/components/auth-submit-button";

const initialState: AuthFormState = { error: null, success: null };

export function LoginForm({ callbackUrl, externalError }: { callbackUrl?: string; externalError?: string | null }) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const [resetState, resetAction] = useActionState(requestPasswordResetAction, initialState);
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!externalError) return;
    setToastMessage(externalError);
    const timer = setTimeout(() => setToastMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [externalError]);

  const handleGoogleSignIn = () => {
    void signIn("google", { callbackUrl: callbackUrl ?? "/dashboard" });
  };

  const googleIcon = (
    <svg className="auth-google-icon" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="24" cy="24" r="22" fill="#fff" />
      <path
        fill="#4285F4"
        d="M35.2 24.5c0-.78-.07-1.53-.2-2.25H24v4.26h6.32a5.4 5.4 0 0 1-2.34 3.54v2.94h3.78c2.2-2.03 3.44-5.03 3.44-8.49z"
      />
      <path
        fill="#34A853"
        d="M24 36c3.24 0 5.95-1.07 7.93-2.9l-3.78-2.94c-1.05.7-2.4 1.12-4.15 1.12-3.18 0-5.88-2.14-6.85-5.02h-3.9v3.08A12 12 0 0 0 24 36z"
      />
      <path
        fill="#FBBC05"
        d="M17.15 26.26A7.2 7.2 0 0 1 16.77 24c0-.78.14-1.53.38-2.26v-3.08h-3.9A12 12 0 0 0 12 24c0 1.94.46 3.78 1.25 5.34l3.9-3.08z"
      />
      <path
        fill="#EA4335"
        d="M24 16.7c1.76 0 3.34.6 4.58 1.78l3.44-3.44C29.95 12.96 27.24 12 24 12a12 12 0 0 0-10.75 6.66l3.9 3.08C18.12 18.84 20.82 16.7 24 16.7z"
      />
    </svg>
  );

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
      {toastMessage ? (
        <div className="auth-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />

      <button type="button" className="auth-google-button" onClick={handleGoogleSignIn}>
        {googleIcon}
        Continue with Google
      </button>
      <p className="form-hint">Use your MBSTU CSE Google account.</p>

      <div className="auth-divider" role="presentation">
        <span>OR</span>
      </div>

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
