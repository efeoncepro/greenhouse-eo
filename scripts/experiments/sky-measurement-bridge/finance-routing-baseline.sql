-- Synthetic dependencies only. Allocation enforcement and service-fact tables
-- are loaded verbatim from the current migrations by run-local.mjs.
CREATE SCHEMA greenhouse_commercial;
CREATE SCHEMA greenhouse_delivery;
CREATE TABLE greenhouse_commercial.quotations (
  quotation_id text PRIMARY KEY, hubspot_deal_id text, organization_id text, space_id text
);
CREATE TABLE greenhouse_commercial.contract_quotes (contract_id text, quotation_id text);
CREATE TABLE greenhouse_finance.purchase_orders (
  po_id text PRIMARY KEY, contract_id text, quotation_id text, organization_id text, space_id text
);
CREATE TABLE greenhouse_finance.service_entry_sheets (
  hes_id text PRIMARY KEY, purchase_order_id text, contract_id text, quotation_id text, organization_id text, space_id text
);
CREATE TABLE greenhouse_finance.income (
  income_id text PRIMARY KEY, client_id text REFERENCES greenhouse_core.clients,
  organization_id text, client_profile_id text, client_name text,
  hubspot_deal_id text, contract_id text, purchase_order_id text, quotation_id text,
  source_hes_id text, service_line text, currency text DEFAULT 'CLP',
  total_amount numeric, total_amount_clp numeric, partner_share_amount numeric DEFAULT 0,
  exchange_rate_to_clp numeric DEFAULT 1, invoice_date date, is_annulled boolean DEFAULT false
);
CREATE TABLE greenhouse_finance.expenses (
  expense_id text PRIMARY KEY, allocated_client_id text REFERENCES greenhouse_core.clients,
  space_id text, linked_income_id text, service_line text, currency text DEFAULT 'CLP',
  total_amount numeric, total_amount_clp numeric, effective_cost_amount numeric,
  effective_cost_amount_clp numeric, document_date date, payment_date date,
  payroll_entry_id text, period_year integer, period_month integer,
  cost_is_direct boolean DEFAULT true, is_annulled boolean DEFAULT false, cost_category text
);
CREATE TABLE greenhouse_finance.cost_allocations (
  allocation_id text PRIMARY KEY, expense_id text, client_id text, organization_id text,
  client_name text, space_id text, allocated_amount_clp numeric, period_year integer, period_month integer
);
-- Existence-only prerequisites for the real Finance readiness check.
CREATE TABLE greenhouse_finance.income_payments (id text);
CREATE TABLE greenhouse_finance.reconciliation_periods (id text);
CREATE TABLE greenhouse_finance.bank_statement_rows (id text);
CREATE TABLE greenhouse_finance.client_economics (
  snapshot_id text PRIMARY KEY, client_id text, organization_id text, client_name text,
  period_year integer, period_month integer, total_revenue_clp numeric, labor_cost_clp numeric,
  direct_costs_clp numeric, indirect_costs_clp numeric, gross_margin_clp numeric,
  gross_margin_percent numeric, net_margin_clp numeric, net_margin_percent numeric,
  headcount_fte numeric, revenue_per_fte numeric, cost_per_fte numeric, notes text,
  computed_at timestamptz, created_at timestamptz, updated_at timestamptz,
  UNIQUE (client_id, period_year, period_month)
);
CREATE TABLE greenhouse_serving.commercial_cost_attribution (
  member_id text, client_id text, organization_id text, client_name text,
  period_year integer, period_month integer,
  base_labor_cost_target numeric DEFAULT 0, internal_operational_cost_target numeric DEFAULT 0,
  direct_overhead_target numeric DEFAULT 0, shared_overhead_target numeric DEFAULT 0,
  fte_contribution numeric DEFAULT 1, allocation_ratio numeric DEFAULT 1,
  commercial_labor_cost_target numeric DEFAULT 0,
  commercial_direct_overhead_target numeric DEFAULT 0, commercial_shared_overhead_target numeric DEFAULT 0,
  commercial_loaded_cost_target numeric DEFAULT 0, source_of_truth text DEFAULT 'member_capacity_economics',
  rule_version text DEFAULT 'synthetic-v1', materialization_reason text, materialized_at timestamptz DEFAULT now(),
  PRIMARY KEY (member_id, client_id, period_year, period_month)
);
CREATE TABLE greenhouse_delivery.projects (
  project_record_id text PRIMARY KEY, space_id text REFERENCES greenhouse_core.spaces,
  client_id text REFERENCES greenhouse_core.clients, module_id text, project_database_source_id text,
  notion_project_id text UNIQUE, project_name text, project_status text, project_summary text,
  completion_label text, on_time_pct_source numeric, avg_rpa_source numeric, project_phase text,
  owner_member_id text, start_date date, end_date date, page_url text, active boolean, is_deleted boolean,
  source_updated_at timestamptz, synced_at timestamptz, sync_run_id text, payload_hash text,
  updated_at timestamptz DEFAULT now()
);
-- Only deletion-branch dependencies: task/sprint upserts are outside this slice.
CREATE TABLE greenhouse_delivery.tasks (
  notion_task_id text, space_id text, is_deleted boolean, sync_run_id text,
  synced_at timestamptz, updated_at timestamptz
);
CREATE TABLE greenhouse_delivery.sprints (
  notion_sprint_id text, space_id text, is_deleted boolean, sync_run_id text,
  synced_at timestamptz, updated_at timestamptz
);
-- Failure injection belongs exclusively to the experiment, never to migrations.
CREATE TABLE sky_experiment.failure_switch (enabled boolean NOT NULL);
INSERT INTO sky_experiment.failure_switch VALUES (false);
CREATE FUNCTION sky_experiment.fail_fact_insert() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM sky_experiment.failure_switch WHERE enabled) THEN
    RAISE EXCEPTION 'synthetic failure after period purge';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
