-- ============================================================
-- Migration: rls_setup
-- Purpose:   Enable PostgreSQL Row Level Security (RLS) on all
--            tenant-scoped tables.
--
-- How it works:
--   1. Each request sets: set_config('app.current_tenant_id', '<uuid>', true)
--   2. RLS policies compare each row's tenantId against that setting
--   3. PostgreSQL enforces this at the storage layer — even buggy app
--      code cannot leak cross-tenant data
--
-- Tables WITHOUT RLS (shared/public tables — intentionally exempt):
--   tenants, users, plans, system_* — these are accessed cross-tenant
--   for auth, billing, and system operations.
--
-- Tables WITH RLS (all tenant-scoped tables):
--   Every table that has a tenantId column.
-- ============================================================

-- ── Helper function ───────────────────────────────────────────────────────
-- Returns the current tenant UUID from the session config.
-- Returns NULL (not an error) when no tenant is set — this allows
-- system/admin operations to run without a tenant context.
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ── Enable RLS + create policies ─────────────────────────────────────────
-- Pattern: USING (tenant_id = current_tenant_id())
-- This means: a row is visible only if its tenantId matches the session var.
-- WITH CHECK enforces the same on INSERT/UPDATE — cannot write to another tenant.

-- tenant_members
ALTER TABLE "tenant_members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenant_members"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- refresh_tokens
ALTER TABLE "refresh_tokens" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "refresh_tokens"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- invitations
ALTER TABLE "invitations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invitations"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- subscriptions
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "subscriptions"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- invoices
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "invoices"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- invoice_line_items (no tenantId — isolated via invoiceId → invoice → tenantId)
-- Skipped: no direct tenantId column. Access controlled at service layer.

-- locations
ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "locations"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- location_business_hours
ALTER TABLE "location_business_hours" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "location_business_hours"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- whatsapp_numbers
ALTER TABLE "whatsapp_numbers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "whatsapp_numbers"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- customers
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "customers"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- conversations
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "conversations"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- messages
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "messages"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- staff
ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "staff"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- staff_schedules
ALTER TABLE "staff_schedules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "staff_schedules"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- staff_schedule_overrides
ALTER TABLE "staff_schedule_overrides" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "staff_schedule_overrides"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- services
ALTER TABLE "services" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "services"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- bookings
ALTER TABLE "bookings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "bookings"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- booking_services
ALTER TABLE "booking_services" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "booking_services"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- tenant_reminder_rules
ALTER TABLE "tenant_reminder_rules" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenant_reminder_rules"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- scheduled_reminders
ALTER TABLE "scheduled_reminders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "scheduled_reminders"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- tenant_ai_prompts
ALTER TABLE "tenant_ai_prompts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenant_ai_prompts"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- knowledge_base_documents
ALTER TABLE "knowledge_base_documents" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "knowledge_base_documents"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- knowledge_base_chunks
ALTER TABLE "knowledge_base_chunks" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "knowledge_base_chunks"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- usage_events
ALTER TABLE "usage_events" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "usage_events"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- daily_usage_aggregates
ALTER TABLE "daily_usage_aggregates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "daily_usage_aggregates"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- tenant_message_templates
ALTER TABLE "tenant_message_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "tenant_message_templates"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- notification_preferences
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "notification_preferences"
  USING ("tenantId" = current_tenant_id())
  WITH CHECK ("tenantId" = current_tenant_id());

-- audit_logs (tenantId is nullable — system logs have no tenant)
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "audit_logs"
  USING (
    "tenantId" IS NULL              -- system-level logs always visible
    OR "tenantId" = current_tenant_id()
  )
  WITH CHECK (
    "tenantId" IS NULL
    OR "tenantId" = current_tenant_id()
  );