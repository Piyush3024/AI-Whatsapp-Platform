/*
  Warnings:

  - The values [FLAGged] on the enum `WhatsAppVerificationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "WhatsAppVerificationStatus_new" AS ENUM ('PENDING', 'VERIFIED', 'NOT_VERIFIED', 'FLAGGED');
ALTER TABLE "public"."whatsapp_numbers" ALTER COLUMN "verificationStatus" DROP DEFAULT;
ALTER TABLE "whatsapp_numbers" ALTER COLUMN "verificationStatus" TYPE "WhatsAppVerificationStatus_new" USING ("verificationStatus"::text::"WhatsAppVerificationStatus_new");
ALTER TYPE "WhatsAppVerificationStatus" RENAME TO "WhatsAppVerificationStatus_old";
ALTER TYPE "WhatsAppVerificationStatus_new" RENAME TO "WhatsAppVerificationStatus";
DROP TYPE "public"."WhatsAppVerificationStatus_old";
ALTER TABLE "whatsapp_numbers" ALTER COLUMN "verificationStatus" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "whatsapp_numbers" ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false;
