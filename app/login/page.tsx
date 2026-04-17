import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main>
      <section className="auth-shell">
        <div className="auth-card">
          <span className="badge">Auth.js credentials auth</span>
          <h1>Log in</h1>
          <p className="auth-subtitle">Access your CP community dashboard.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
