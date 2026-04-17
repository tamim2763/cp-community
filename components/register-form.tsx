"use client";

import Link from "next/link";
import { useActionState } from "react";

import { type AuthFormState, registerAction } from "@/app/actions/auth";
import { AuthSubmitButton } from "@/components/auth-submit-button";

const initialState: AuthFormState = { error: null, success: null };

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form className="auth-form" action={formAction}>
      <div className="field-group">
        <label htmlFor="name">Full name</label>
        <input id="name" name="name" type="text" placeholder="Tamim" required />
      </div>

      <div className="field-group">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required />
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
