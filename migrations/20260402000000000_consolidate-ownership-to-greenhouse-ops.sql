-- Up Migration

-- ============================================================
-- Consolidate all object ownership to greenhouse_ops
-- ============================================================
-- Problem: 5 different owners (greenhouse_migrator, greenhouse_migrator_user,
-- postgres, greenhouse_app, greenhouse_ops) across 121 tables, 7 sequences,
-- 17 views, and 12 schemas. This prevents pg_dump and causes permission
-- errors when any single user tries to ALTER objects it doesn't own.
--
-- Solution: greenhouse_ops inherits all roles (postgres, greenhouse_app,
-- greenhouse_migrator_user, greenhouse_migrator) and becomes the single
-- canonical owner. Future migrations run as greenhouse_migrator_user
-- which inherits greenhouse_migrator, and objects are reassigned to
-- greenhouse_ops after creation.
-- ============================================================

-- Up Migration

-- ── 1. Schema ownership ────────────────────────────────────────

ALTER SCHEMA greenhouse_ai OWNER TO greenhouse_ops;
ALTER SCHEMA greenhouse_core OWNER TO greenhouse_ops;
ALTER SCHEMA greenhouse_cost_intelligence OWNER TO greenhouse_ops;
ALTER SCHEMA greenhouse_crm OWNER TO greenhouse_ops;
ALTER SCHEMA greenhouse_delivery OWNER TO greenhouse_ops;
ALTER SCHEMA greenhouse_finance OWNER TO greenhouse_ops;
ALTER SCHEMA greenhouse_hr OWNER TO greenhouse_ops;
ALTER SCHEMA greenhouse_notifications OWNER TO greenhouse_ops;
ALTER SCHEMA greenhouse_payroll OWNER TO greenhouse_ops;
ALTER SCHEMA greenhouse_serving OWNER TO greenhouse_ops;
ALTER SCHEMA greenhouse_sync OWNER TO greenhouse_ops;

-- ── 2. Table ownership ─────────────────────────────────────────

-- greenhouse_ai
ALTER TABLE greenhouse_ai.credit_ledger OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_ai.credit_wallets OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_ai.member_tool_licenses OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_ai.nexa_feedback OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_ai.nexa_messages OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_ai.nexa_threads OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_ai.tool_catalog OWNER TO greenhouse_ops;

-- greenhouse_core
ALTER TABLE greenhouse_core.asset_access_log OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.assets OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.audit_events OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.auth_tokens OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.business_line_metadata OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.campaign_project_links OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.campaigns OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.client_feature_flags OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.client_service_modules OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.client_team_assignments OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.client_users OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.clients OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.departments OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.entity_source_links OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.identity_profile_source_links OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.identity_profiles OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.members OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.notion_workspace_source_bindings OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.notion_workspaces OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.organizations OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.person_memberships OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.providers OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.role_view_assignments OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.roles OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.service_history OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.service_modules OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.services OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.space_notion_sources OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.spaces OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.user_campaign_scopes OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.user_client_scopes OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.user_project_scopes OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.user_role_assignments OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.user_view_overrides OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.view_access_log OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_core.view_registry OWNER TO greenhouse_ops;

-- greenhouse_cost_intelligence
ALTER TABLE greenhouse_cost_intelligence.period_closure_config OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_cost_intelligence.period_closures OWNER TO greenhouse_ops;

-- greenhouse_crm
ALTER TABLE greenhouse_crm.companies OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_crm.contacts OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_crm.deals OWNER TO greenhouse_ops;

-- greenhouse_delivery
ALTER TABLE greenhouse_delivery.projects OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_delivery.space_property_mappings OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_delivery.sprints OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_delivery.staff_aug_events OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_delivery.staff_aug_onboarding_items OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_delivery.staff_aug_placements OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_delivery.tasks OWNER TO greenhouse_ops;

-- greenhouse_finance
ALTER TABLE greenhouse_finance.accounts OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.bank_statement_rows OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.client_economics OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.client_profiles OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.cost_allocations OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.economic_indicators OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.exchange_rates OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.expenses OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.factoring_operations OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.income OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.income_line_items OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.income_payments OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.nubox_emission_log OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.purchase_orders OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.quotes OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.reconciliation_periods OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.service_entry_sheets OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_finance.suppliers OWNER TO greenhouse_ops;

-- greenhouse_hr
ALTER TABLE greenhouse_hr.leave_balances OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hr.leave_policies OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hr.leave_request_actions OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hr.leave_requests OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_hr.leave_types OWNER TO greenhouse_ops;

-- greenhouse_notifications
ALTER TABLE greenhouse_notifications.email_deliveries OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_notifications.email_subscriptions OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_notifications.notification_log OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_notifications.notification_preferences OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_notifications.notifications OWNER TO greenhouse_ops;

-- greenhouse_payroll
ALTER TABLE greenhouse_payroll.attendance_monthly_snapshot OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.chile_afp_rates OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.chile_previred_indicators OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.chile_tax_brackets OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.compensation_versions OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.payroll_bonus_config OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.payroll_entries OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.payroll_export_packages OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.payroll_periods OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.payroll_receipts OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.previred_afp_rates OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.previred_period_indicators OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_payroll.projected_payroll_promotions OWNER TO greenhouse_ops;

-- greenhouse_serving
ALTER TABLE greenhouse_serving.commercial_cost_attribution OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.ico_member_metrics OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.ico_organization_metrics OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.member_capacity_economics OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.metric_threshold_overrides OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.operational_pl_snapshots OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.organization_operational_metrics OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.period_closure_status OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.person_operational_360 OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.projected_payroll_snapshots OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_serving.staff_aug_placement_snapshots OWNER TO greenhouse_ops;

-- greenhouse_sync
ALTER TABLE greenhouse_sync.identity_reconciliation_proposals OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.outbox_events OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.outbox_reactive_log OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.projection_refresh_queue OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.schema_migrations OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.service_sync_queue OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.source_sync_failures OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.source_sync_runs OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.source_sync_watermarks OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.webhook_deliveries OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.webhook_delivery_attempts OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.webhook_endpoints OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.webhook_inbox_events OWNER TO greenhouse_ops;
ALTER TABLE greenhouse_sync.webhook_subscriptions OWNER TO greenhouse_ops;

-- public
ALTER TABLE public.pgmigrations OWNER TO greenhouse_ops;

-- ── 3. Sequence ownership ──────────────────────────────────────

ALTER SEQUENCE greenhouse_core.campaigns_eo_id_seq OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_core.identity_profile_serial OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_core.seq_membership_public_id OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_core.seq_organization_public_id OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_core.seq_service_public_id OWNER TO greenhouse_ops;
ALTER SEQUENCE greenhouse_core.seq_space_public_id OWNER TO greenhouse_ops;
ALTER SEQUENCE public.pgmigrations_id_seq OWNER TO greenhouse_ops;

-- ── 4. View ownership ──────────────────────────────────────────

ALTER VIEW greenhouse_core.v_client_active_modules OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.client_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.client_capability_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.client_labor_cost_allocation OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.income_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.member_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.member_leave_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.member_payroll_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.notion_workspace_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.person_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.person_delivery_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.person_finance_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.person_hr_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.provider_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.provider_finance_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.session_360 OWNER TO greenhouse_ops;
ALTER VIEW greenhouse_serving.user_360 OWNER TO greenhouse_ops;

-- ── 5. Default privileges for future objects ────────────────────
-- When greenhouse_ops creates objects, grant appropriate access automatically.

-- Runtime gets DML on domain schemas
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_core GRANT SELECT, REFERENCES ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_serving GRANT SELECT ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_sync GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_hr GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_payroll GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_finance GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_delivery GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_crm GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_ai GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_notifications GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_cost_intelligence GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO greenhouse_runtime;

-- Migrator gets DDL on domain schemas
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_core GRANT ALL ON TABLES TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_serving GRANT ALL ON TABLES TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_sync GRANT ALL ON TABLES TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_hr GRANT ALL ON TABLES TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_payroll GRANT ALL ON TABLES TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_finance GRANT ALL ON TABLES TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_delivery GRANT ALL ON TABLES TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_crm GRANT ALL ON TABLES TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_ai GRANT ALL ON TABLES TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_notifications GRANT ALL ON TABLES TO greenhouse_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_cost_intelligence GRANT ALL ON TABLES TO greenhouse_migrator;

-- Sequences: runtime and migrator get USAGE
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_core GRANT USAGE ON SEQUENCES TO greenhouse_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE greenhouse_ops IN SCHEMA greenhouse_core GRANT ALL ON SEQUENCES TO greenhouse_migrator;

-- Down Migration
-- (ownership consolidation is not reversible — original owners are documented in migration comments above)
