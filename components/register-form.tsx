"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { type AuthFormState, registerAction } from "@/app/actions/auth";
import { AuthSubmitButton } from "@/components/auth-submit-button";

const initialState: AuthFormState = { error: null, success: null };

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);
  const [phase, setPhase] = useState<"form" | "pending" | "verified">("form");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [pollError, setPollError] = useState<string | null>(null);
  const router = useRouter();

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
