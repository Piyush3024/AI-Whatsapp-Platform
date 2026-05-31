-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'HUMAN_HANDOFF', 'CLOSED');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX "conversations_tenantId_status_idx" ON "conversations"("tenantId", "status");
