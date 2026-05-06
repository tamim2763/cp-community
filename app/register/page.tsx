import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { RegisterForm } from "@/components/register-form";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const error = params.error;
  const externalError =
    error === "institutional"
      ? "Please use your MBSTU CSE email for Google sign-in."
      : error === "unverified"
        ? "Your Google account email is not verified."
        : error === "inactive"
          ? "Your account is inactive. Please contact an admin."
          : null;

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main>
      <section className="auth-shell">
        <div className="auth-card">
          <h1>Create your account</h1>
          <p className="auth-subtitle">Start building your CP profile and weekly streak.</p>
          <RegisterForm externalError={externalError} />
        </div>
      </section>
    </main>
  );
}
