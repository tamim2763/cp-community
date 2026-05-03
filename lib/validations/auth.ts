import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z
      .string()
      .email("Enter a valid email address.")
      .regex(/^ce\d+@mbstu\.ac\.bd$/i, "Use your MBSTU CSE email (ceXXXXX@mbstu.ac.bd)."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string().min(6, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const passwordResetRequestSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Missing reset token."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string().min(6, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
