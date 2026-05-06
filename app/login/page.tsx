import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/login-form";

function normalizeCallbackUrl(value?: string): `/${string}` {
  if (!value) return "/dashboard";
  if (value.startsWith("/")) return value as `/${string}`;

  try {
    const parsed = new URL(value);
    const pathname = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return pathname.startsWith("/") ? (pathname as `/${string}`) : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = normalizeCallbackUrl(params.callbackUrl);
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
    redirect(callbackUrl as never);
  }

  return (
    <main>
      <section className="auth-shell">
        <div className="auth-card">
          <h1>Log in</h1>
          <p className="auth-subtitle">Access your CP community dashboard.</p>
          <LoginForm callbackUrl={callbackUrl} externalError={externalError} />
        </div>
      </section>
    </main>
  );
}
