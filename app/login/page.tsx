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
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = normalizeCallbackUrl(params.callbackUrl);

  if (session?.user) {
    redirect(callbackUrl as never);
  }

  return (
    <main>
      <section className="auth-shell">
        <div className="auth-card">
          <h1>Log in</h1>
          <p className="auth-subtitle">Access your CP community dashboard.</p>
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </section>
    </main>
  );
}
