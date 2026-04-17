"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type AuthFormState, loginAction } from "@/app/actions/auth";
import { AuthSubmitButton } from "@/components/auth-submit-button";

const initialState: AuthFormState = { error: null, success: null };

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form className="auth-form" action={formAction}>
      <div className="field-group">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required />
      </div>

      <div className="field-group">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" placeholder="••••••••" required />
      </div>

      {state?.error ? <p className="form-error">{state.error}</p> : null}

      <AuthSubmitButton label="Log in" pendingLabel="Logging in..." />

      <p className="auth-helper-text">
        Don&apos;t have an account? <Link href="/register">Create one</Link>
      </p>
    </form>
  );
}
