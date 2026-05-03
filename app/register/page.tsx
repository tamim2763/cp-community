import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main>
      <section className="auth-shell">
        <div className="auth-card">
          <h1>Create your account</h1>
          <p className="auth-subtitle">Start building your CP profile and weekly streak.</p>
          <RegisterForm />
        </div>
      </section>
    </main>
  );
}
