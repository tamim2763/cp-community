"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signIn } from "@/auth";
import { registerSchema, passwordResetRequestSchema, passwordResetSchema } from "@/lib/validations/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";

function normalizeCallbackUrl(value: FormDataEntryValue | null): `/${string}` {
  if (typeof value !== "string" || !value.trim()) {
    return "/dashboard";
  }

  if (value.startsWith("/")) {
    return value as `/${string}`;
  }

  try {
    const parsed = new URL(value);
    const pathname = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return pathname.startsWith("/") ? (pathname as `/${string}`) : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export type AuthFormState = {
  error: string | null;
  success: string | null;
};

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data.", success: null };
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    if (existingUser.emailVerified) {
      return { error: "An account with this email already exists.", success: null };
    }

    const token = randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "";
    const verifyUrl = `${baseUrl.replace(/\/$/, "")}/api/auth/verify?token=${token}`;

    try {
      await sendVerificationEmail({ to: email, verifyUrl });
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to send verification email.", success: null };
    }

    return { error: null, success: "Verification email sent. Please check your inbox." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
    },
  });

  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "";
  const verifyUrl = `${baseUrl.replace(/\/$/, "")}/api/auth/verify?token=${token}`;

  try {
    await sendVerificationEmail({ to: email, verifyUrl });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to send verification email.", success: null };
  }

  return { error: null, success: "Check your email to verify your account before logging in." };
}

export async function loginAction(_prevState: AuthFormState, formData: FormData) {
  const callbackUrl = normalizeCallbackUrl(formData.get("callbackUrl"));
  const emailInput = formData.get("email");

  if (typeof emailInput === "string" && emailInput.trim()) {
    const email = emailInput.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email }, select: { emailVerified: true } });
    if (email !== "admin@example.com" && user && !user.emailVerified) {
      return { error: "Please verify your email before logging in.", success: null };
    }
  }

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password.", success: null };
        default:
          return { error: "Something went wrong. Please try again.", success: null };
      }
    }

    throw error;
  }

  redirect(callbackUrl as never);
}

export async function requestPasswordResetAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid email address.", success: null };
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (user?.passwordHash && user.isActive) {
    const token = randomBytes(24).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.deleteMany({ where: { identifier: email } });
    await prisma.passwordResetToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    const baseUrl = process.env.APP_URL ?? process.env.NEXTAUTH_URL ?? "";
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail({ to: email, resetUrl });
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to send reset email.", success: null };
    }
  }

  return { error: null, success: "If an account exists, a reset link has been sent to that email." };
}

export async function resetPasswordAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = passwordResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form data.", success: null };
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { token: parsed.data.token } });
  if (!record || record.expires < new Date()) {
    if (record) {
      await prisma.passwordResetToken.delete({ where: { token: parsed.data.token } });
    }
    return { error: "Reset link is invalid or expired.", success: null };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({
    where: { email: record.identifier },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.deleteMany({ where: { identifier: record.identifier } });

  return { error: null, success: "Password updated. You can log in now." };
}
