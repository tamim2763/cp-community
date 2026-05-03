"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type AuthFormState, resetPasswordAction } from "@/app/actions/auth";
import { AuthSubmitButton } from "@/components/auth-submit-button";

const initialState: AuthFormState = { error: null, success: null };

type Props = {
  token: string;
};

export function ResetPasswordForm({ token }: Props) {
  const [state, formAction] = useActionState(resetPasswordAction, initialState);

  if (state.success) {
    return (
      <div className="auth-form" style={{ gap: 14, textAlign: "center" }}>
        <div style={{ fontSize: "2rem" }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--success)" }}>Password updated</div>
        <p className="auth-subtitle" style={{ margin: 0 }}>
          You can log in with your new password.
        </p>
        <p className="auth-helper-text">
          <Link href="/login">Log in</Link>
        </p>
      </div>
    );
  }

  return (
    <form className="auth-form" action={formAction}>
      <input type="hidden" name="token" value={token} />

      <div className="field-group">
        <label htmlFor="password">New password</label>
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

      <AuthSubmitButton label="Reset password" pendingLabel="Resetting..." />
    </form>
  );
}
