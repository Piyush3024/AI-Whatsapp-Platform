-- AlterTable
ALTER TABLE "tenant_ai_prompts" ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'auto';

-- CreateIndex
CREATE INDEX "tenant_ai_prompts_tenantId_language_idx" ON "tenant_ai_prompts"("tenantId", "language");
