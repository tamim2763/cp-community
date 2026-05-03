import { JobType } from "@prisma/client";
import { z } from "zod";

const trimmed = (min = 1, max?: number) => {
  let schema = z.string().trim().min(min);
  if (typeof max === "number") {
    schema = schema.max(max);
  }
  return schema;
};

export const deleteByIdSchema = z.object({
  id: z.string().trim().min(1, "Missing id."),
});

export const deactivateUserSchema = deleteByIdSchema;

export const scoringConfigSchema = z.object({
  multiplierBase: z.number().gt(1, "Multiplier base must be greater than 1.").max(5),
  gapStepSize: z.number().int("Gap step size must be a whole number.").min(1).max(1000),
});

export const achievementModerationSchema = z
  .object({
    id: z.string().trim().min(1),
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.string().trim().max(300).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.status === "REJECTED" && !value.rejectionReason?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "Rejection reason is required when rejecting an achievement.",
      });
    }
  });

export const alumniSchema = z.object({
  name: trimmed(),
  headline: z.string().trim().optional().default(""),
  bio: z.string().trim().optional().default(""),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        value.startsWith("data:image/") ||
        /^https?:\/\//i.test(value),
      "Upload an image or provide a valid image URL.",
    )
    .optional()
    .or(z.literal("")),
  linkedinUrl: z.string().trim().url("Enter a valid LinkedIn URL."),
  batchYear: z.number().int().min(2000).max(2100).optional().nullable(),
  department: z.string().trim().optional().default(""),
  achievementsText: z.string().trim().optional().default(""),
  isFeatured: z.boolean().optional().default(false),
});

export const resourceSchema = z.object({
  title: trimmed(),
  description: trimmed(),
  url: z.string().trim().url("Enter a valid URL."),
  categorySlug: z.string().trim().min(1, "Pick a category."),
  platform: z.string().trim().optional().default(""),
  difficultyLevel: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional().nullable(),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
});

export const contestSchema = z.object({
  title: trimmed(2, 200),
  platform: z.enum(["CODEFORCES", "CODECHEF", "ATCODER"]).nullable().optional(),
  url: z.string().trim().url("Enter a valid contest URL."),
  startTime: z.string().trim().min(1, "Start time is required."),
  durationMinutes: z.number().int().min(1).max(10080),
});

export const jobSchema = z.object({
  title: trimmed(),
  company: trimmed(),
  location: z.string().trim().optional().default(""),
  type: z.nativeEnum(JobType).default(JobType.INTERNSHIP),
  description: z.string().trim().optional().default("Details available on the application portal."),
  applyUrl: z.string().trim().url("Enter a valid apply URL.").optional().or(z.literal("")),
  deadline: z.string().trim().optional().or(z.literal("")),
});

export const announcementSchema = z
  .object({
    content: trimmed(4, 2000),
    startsAt: z.string().trim().min(1, "Start time is required."),
    endsAt: z.string().trim().min(1, "End time is required."),
  })
  .superRefine((value, ctx) => {
    const startsAt = new Date(value.startsAt);
    const endsAt = new Date(value.endsAt);

    if (Number.isNaN(startsAt.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startsAt"], message: "Invalid start time." });
    }

    if (Number.isNaN(endsAt.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "Invalid end time." });
    }

    if (!Number.isNaN(startsAt.getTime()) && !Number.isNaN(endsAt.getTime()) && endsAt <= startsAt) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "End time must be after start time." });
    }
  });
