"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useActionState, useEffect, useState } from "react";

import { type AuthFormState, registerAction } from "@/app/actions/auth";
import { AuthSubmitButton } from "@/components/auth-submit-button";

const initialState: AuthFormState = { error: null, success: null };

export function RegisterForm({ externalError }: { externalError?: string | null }) {
  const [state, formAction] = useActionState(registerAction, initialState);
  const [phase, setPhase] = useState<"form" | "pending" | "verified">("form");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [pollError, setPollError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!externalError) return;
    setToastMessage(externalError);
    const timer = setTimeout(() => setToastMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [externalError]);

  const handleGoogleSignIn = () => {
    void signIn("google", { callbackUrl: "/dashboard" });
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

  useEffect(() => {
    if (state?.error) {
      setPhase("form");
      setPollError(null);
    }

    if (state?.success && submittedEmail) {
      setPhase("pending");
    }
  }, [state, submittedEmail]);

  useEffect(() => {
    if (phase !== "pending" || !submittedEmail) return;

    let active = true;

    async function checkVerification() {
      try {
        const response = await fetch("/api/auth/verification-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: submittedEmail }),
          cache: "no-store",
        });
        const data = (await response.json()) as { verified?: boolean };
        if (!active) return;
        if (data.verified) {
          setPhase("verified");
        }
      } catch (error) {
        if (!active) return;
        setPollError(error instanceof Error ? error.message : "Failed to check verification.");
      }
    }

    const interval = setInterval(checkVerification, 4000);
    void checkVerification();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [phase, submittedEmail]);

  useEffect(() => {
    if (phase !== "verified") return;
    const timer = setTimeout(() => {
      router.push("/login?verified=1");
    }, 6000);
    return () => clearTimeout(timer);
  }, [phase, router]);

  if (phase === "pending") {
    return (
      <div className="auth-form" style={{ gap: 18, textAlign: "center" }}>
        <div className="auth-spinner" aria-hidden="true" />
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem" }}>Waiting for verification</div>
          <p className="auth-subtitle" style={{ margin: "6px 0 0" }}>
            We sent a verification link to <strong>{submittedEmail}</strong>. If you do not see it,
            check your spam folder.
          </p>
        </div>
        <p className="form-hint">Once you verify, this page will update automatically.</p>
        {pollError ? <p className="form-error">{pollError}</p> : null}
        <p className="auth-helper-text">
          Entered the wrong email? <Link href="/register">Start over</Link>
        </p>
      </div>
    );
  }

  if (phase === "verified") {
    return (
      <div className="auth-form" style={{ gap: 14, textAlign: "center" }}>
        <div style={{ fontSize: "2rem" }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--success)" }}>Verified!</div>
        <p className="auth-subtitle" style={{ margin: 0 }}>
          Your email is confirmed. Redirecting to login...
        </p>
      </div>
    );
  }

  return (
    <form
      className="auth-form"
      action={formAction}
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "").trim();
        setSubmittedEmail(email);
        setPhase("pending");
        setPollError(null);
      }}
    >
      {toastMessage ? (
        <div className="auth-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
      <button type="button" className="auth-google-button" onClick={handleGoogleSignIn}>
        {googleIcon}
        Continue with Google
      </button>
      <p className="form-hint">Use your MBSTU CSE Google account.</p>

      <div className="auth-divider" role="presentation">
        <span>OR</span>
      </div>

      <div className="field-group">
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" type="text" placeholder="Your name" required />
      </div>

      <div className="field-group">
        <label htmlFor="email">Email</label>
        <p className="form-hint">Use your MBSTU CSE email address.</p>
        <input id="email" name="email" type="email" placeholder="ce.....@mbstu.ac.bd" required />
      </div>

      <div className="field-group">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" placeholder="Minimum 6 characters" required />
      </div>

      <div className="field-group">
        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Repeat your password"
          required
        />
      </div>

      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.success ? <p className="form-success">{state.success}</p> : null}

      <AuthSubmitButton label="Create account" pendingLabel="Creating account..." />

      <p className="auth-helper-text">
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </form>
  );
}
