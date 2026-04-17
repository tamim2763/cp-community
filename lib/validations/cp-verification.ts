import { CpPlatform } from "@prisma/client";
import { z } from "zod";

export const cpVerificationSchema = z.object({
  platform: z.nativeEnum(CpPlatform),
});
