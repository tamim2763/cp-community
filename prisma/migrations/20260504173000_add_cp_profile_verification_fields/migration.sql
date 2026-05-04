-- AlterTable
ALTER TABLE "CpProfile"
  ADD COLUMN "verificationToken" TEXT,
  ADD COLUMN "verificationField" TEXT,
  ADD COLUMN "verificationRequestedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedAt" TIMESTAMP(3);
