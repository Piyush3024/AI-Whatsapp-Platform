-- DropIndex
DROP INDEX "audit_logs_tenantId_idx";

-- DropIndex
DROP INDEX "bookings_tenantId_idx";

-- DropIndex
DROP INDEX "conversations_tenantId_idx";

-- DropIndex
DROP INDEX "customers_tenantId_idx";

-- DropIndex
DROP INDEX "daily_usage_aggregates_tenantId_idx";

-- DropIndex
DROP INDEX "knowledge_base_chunks_embedding_hnsw_idx";

-- DropIndex
DROP INDEX "knowledge_base_chunks_tenantId_idx";

-- DropIndex
DROP INDEX "knowledge_base_documents_tenantId_idx";

-- DropIndex
DROP INDEX "messages_tenantId_idx";

-- DropIndex
DROP INDEX "notification_preferences_tenantId_idx";

-- DropIndex
DROP INDEX "notifications_tenantId_idx";

-- DropIndex
DROP INDEX "scheduled_reminders_tenantId_idx";

-- DropIndex
DROP INDEX "tenant_ai_prompts_tenantId_idx";

-- DropIndex
DROP INDEX "tenant_members_tenantId_idx";

-- DropIndex
DROP INDEX "tenant_reminder_rules_tenantId_idx";

-- DropIndex
DROP INDEX "usage_events_tenantId_idx";

-- CreateIndex
CREATE INDEX "invoices_stripeInvoiceId_idx" ON "invoices"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "subscriptions_stripeSubscriptionId_idx" ON "subscriptions"("stripeSubscriptionId");
