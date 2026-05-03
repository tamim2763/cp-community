import nodemailer from "nodemailer";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
}

type VerificationEmailInput = {
  to: string;
  verifyUrl: string;
};

type PasswordResetEmailInput = {
  to: string;
  resetUrl: string;
};

export async function sendVerificationEmail({ to, verifyUrl }: VerificationEmailInput) {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(getRequiredEnv("SMTP_PORT"));
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const from = process.env.SMTP_FROM ?? "CP Community <no-reply@mbstu.ac.bd>";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your MBSTU CSE account",
    text: `Welcome to CP Community!\n\nVerify your email by clicking the link below:\n${verifyUrl}\n\nIf you did not request this, ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Verify your MBSTU CSE account</h2>
        <p>Welcome to CP Community! Click the button below to verify your email.</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}" style="background:#3b82f6;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Verify email</a>
        </p>
        <p>If the button does not work, copy and paste this link:</p>
        <p>${verifyUrl}</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail({ to, resetUrl }: PasswordResetEmailInput) {
  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(getRequiredEnv("SMTP_PORT"));
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const from = process.env.SMTP_FROM ?? "CP Community <no-reply@mbstu.ac.bd>";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject: "Reset your CP Community password",
    text: `We received a request to reset your password.\n\nReset it using the link below:\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Reset your CP Community password</h2>
        <p>We received a request to reset your password. Click the button below to continue.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background:#3b82f6;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;">Reset password</a>
        </p>
        <p>If the button does not work, copy and paste this link:</p>
        <p>${resetUrl}</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}
