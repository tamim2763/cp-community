import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";

  return (
    <main>
      <section className="auth-shell">
        <div className="auth-card">
          <h1>Reset password</h1>
          <p className="auth-subtitle">Set a new password for your account.</p>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <p className="form-error">Reset link is missing or invalid.</p>
          )}
        </div>
      </section>
    </main>
  );
}
