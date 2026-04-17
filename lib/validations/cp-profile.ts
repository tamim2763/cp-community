import { CpPlatform } from "@prisma/client";
import { z } from "zod";

const platformHandleRules: Record<CpPlatform, RegExp> = {
  CODEFORCES: /^[A-Za-z0-9_.-]{3,24}$/,
  CODECHEF: /^[A-Za-z0-9_.-]{3,24}$/,
  ATCODER: /^[A-Za-z0-9_-]{3,24}$/,
};

export const cpProfileSchema = z
  .object({
    platform: z.nativeEnum(CpPlatform),
    handle: z
      .string()
      .trim()
      .min(3, "Handle must be at least 3 characters.")
      .max(24, "Handle must be at most 24 characters."),
  })
  .superRefine(({ platform, handle }, ctx) => {
    if (!platformHandleRules[platform].test(handle)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["handle"],
        message:
          platform === CpPlatform.ATCODER
            ? "AtCoder handle can use letters, numbers, underscores, and hyphens."
            : "Handle can use letters, numbers, dots, underscores, and hyphens.",
      });
    }
  });

export const unlinkCpProfileSchema = z.object({
  platform: z.nativeEnum(CpPlatform),
});
