# Greenhouse Data Model Master V1

## Purpose

This is the canonical snapshot of how Greenhouse data is modeled today and how it must keep evolving.

Use this document to answer:
- which store owns each kind of data
- which object is canonical in Greenhouse
- which source IDs must be preserved
- how HubSpot, Notion, PostgreSQL and BigQuery connect into the same `360` graph
- what is current state versus transition state versus target state

Read together with:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

## Operating Thesis

Greenhouse is no longer modeled as "modules reading source systems directly".

The operating model is:
- `PostgreSQL` owns mutable runtime and canonical operational graph
- `BigQuery raw` owns replayable source backups
- `BigQuery conformed` owns normalized external entities
- `BigQuery marts` owns analytics and 360 reporting
- source systems like `HubSpot` and `Notion` remain important, but no longer define runtime truth inside the portal

## Physical Model

## 1. PostgreSQL

### `greenhouse_core`

Canonical platform anchors.

Main objects:
- `clients`
- `identity_profiles`
- `identity_profile_source_links`
- `client_users`
- `members`
- `departments`
- `providers`
- `service_modules`
- `client_service_modules`
- `roles`
- `user_role_assignments`
- `entity_source_links`

Rule:
- shared identity starts here
- no module may replace these identities with local copies

### `greenhouse_hr`

Mutable HR runtime.

Main objects:
- `leave_types`
- `leave_balances`
- `leave_requests`
- `leave_request_actions`

Anchors:
- `member_id -> greenhouse_core.members`
- `reviewer_user_id -> greenhouse_core.client_users`

### `greenhouse_payroll`

Mutable payroll runtime.

Main objects:
- `compensation_versions`
- `payroll_periods`
- `payroll_entries`
- `payroll_bonus_config`

Anchors:
- `member_id -> greenhouse_core.members`
- user references -> `greenhouse_core.client_users`

### `greenhouse_finance`

Mutable finance runtime. Owns all transactional financial data.

#### Live (Slice 1)

- `accounts` — bank accounts
- `suppliers` — vendor/payable profiles (extension of `providers`)
- `exchange_rates` — daily currency rates

#### Target (Slice 2)

- `income` — invoices emitted to clients
- `income_payments` — individual collection records per invoice (replaces JSON array in BigQuery)
- `factoring_operations` — invoice factoring/assignment operations (NEW — not in BigQuery)
- `expenses` — operational expenditures (payroll, suppliers, taxes, financial costs)
- `client_profiles` — billing profile per client (compat layer, eventually absorbable into `clients`)
- `reconciliation_periods` — monthly bank reconciliation periods per account
- `bank_statement_rows` — imported bank statement lines matched against income/expenses

#### Factoring model

When a company sells an invoice to a factoring provider to collect early:

```
income (factura $1.000.000 a ClienteX, due in 30 days)
│
├── factoring_operations
│   ├── factoring_provider_id -> greenhouse_core.providers (la empresa de factoring)
│   ├── nominal_amount: $1.000.000 (valor cedido)
│   ├── advance_amount: $970.000 (lo recibido)
│   ├── fee_amount: $30.000 (comisión)
│   └── fee_rate: 3.0%
│
├── income_payments
│   └── payment_source: 'factoring_proceeds', amount: $970.000
│
└── expenses (auto-generated)
    └── expense_type: 'factoring_fee', amount: $30.000, linked to income_id
```

Key rules:
- `income.total_amount` stays at nominal value — it represents the billing fact
- `income_payments.amount` reflects actual cash received
- `factoring_operations.fee_amount` feeds into P&L as financial cost
- the factoring provider is a `greenhouse_core.providers` entry, enabling cross-module traceability

#### Anchors

- `client_id -> greenhouse_core.clients`
- `member_id -> greenhouse_core.members`
- `provider_id -> greenhouse_core.providers` (for suppliers AND factoring providers)
- `user_id references -> greenhouse_core.client_users`
- `account_id -> greenhouse_finance.accounts` (internal FK)

#### Metrics unlocked by factoring

- factoring cost per period: `SUM(fee_amount)`
- average factoring rate: `AVG(fee_rate)`
- % revenue factored vs collected direct
- real DSO (days sales outstanding) vs nominal DSO
- net margin impact: nominal revenue minus factoring costs
- exposure per factoring provider

### `greenhouse_crm`

Operational projection of commercial source data.

Current tables:
- `companies`
- `deals`

Required next slice:
- `contacts`
- optionally a membership bridge like `company_contacts` if the runtime needs explicit many-to-many context

Core rule:
- `HubSpot Company` maps to one `Greenhouse Client/Tenant`
- `HubSpot Contact` must map to one `Greenhouse User` and ideally one `Identity Profile`
- company-contact membership is commercial context, not a replacement for tenant membership

### `greenhouse_delivery`

Operational projection of delivery/work execution source data.

Current tables:
- `projects`
- `sprints`
- `tasks`

Important fields:
- `notion_project_id`
- `notion_sprint_id`
- `notion_task_id`
- `project_database_source_id`

Core rule:
- one `Notion project database` belongs to one tenant delivery workspace
- that database contains project rows, tasks and sprints
- a `Notion project page` is not the tenant; it is a delivery object inside the tenant workspace

### `greenhouse_sync`

Control plane and publication layer.

Current objects:
- `schema_migrations`
- `outbox_events`
- `source_sync_runs`
- `source_sync_watermarks`
- `source_sync_failures`

Rule:
- every cross-system sync must register control-plane state here

### `greenhouse_serving`

Read-only serving views.

Current views:
- `client_360`
- `member_360`
- `provider_360`
- `user_360`
- `client_capability_360`
- `member_payroll_360`
- `provider_finance_360`

Target views (with Finance Slice 2):
- `income_360` — invoice with client context, payment status, factoring status, collection summary

Rule:
- these are read models only
- no runtime workflow writes into this schema

## 2. BigQuery

### Legacy datasets still in use

- `greenhouse`
- `notion_ops`
- `hubspot_crm`

These still matter during migration, but they are no longer the target runtime architecture.

### `greenhouse_raw`

Append-only backups of source-system payloads.

Current tables:
- `notion_projects_snapshots`
- `notion_tasks_snapshots`
- `notion_sprints_snapshots`
- `notion_people_snapshots`
- `notion_databases_snapshots`
- `hubspot_companies_snapshots`
- `hubspot_deals_snapshots`
- `hubspot_contacts_snapshots`
- `hubspot_owners_snapshots`
- `hubspot_line_items_snapshots`

### `greenhouse_conformed`

Normalized external entities.

Current tables:
- `delivery_projects`
- `delivery_tasks`
- `delivery_sprints`
- `crm_companies`
- `crm_deals`

Required next slice:
- `crm_contacts`
- if needed, `crm_company_contacts`

### `greenhouse_marts`

Analytical layer for dashboards and 360 reporting.

Current principle:
- marts should read from `raw`, `conformed` and PostgreSQL-published truths
- runtime modules should not read marts for write-heavy flows

## Canonical Object Graph

## Client / Tenant

Canonical anchor:
- `greenhouse_core.clients.client_id`

Important source links:
- `hubspot_company_id`
- future delivery workspace binding for `notion project database`

Required meaning:
- a client is the tenant boundary in Greenhouse
- it can have users, members, capabilities, finance records, payroll context and CRM source references

## User

Canonical anchor:
- `greenhouse_core.client_users.user_id`

Important bridge:
- `identity_profile_id -> greenhouse_core.identity_profiles`

Required meaning:
- a user belongs to a tenant
- a user may be enriched by CRM contact identity and internal identity sources

## Identity Profile

Canonical anchor:
- `greenhouse_core.identity_profiles.profile_id`

Required meaning:
- one person across systems
- source links from HubSpot, Microsoft, Google, Notion and others should converge here

## Member / Collaborator

Canonical anchor:
- `greenhouse_core.members.member_id`

Required meaning:
- org/collaborator runtime object
- used by HR, Payroll and Finance

## Provider

Canonical anchor:
- `greenhouse_core.providers.provider_id`

Required meaning:
- shared vendor/provider object reused by Finance, AI Tooling, and Factoring
- a provider can have a `greenhouse_finance.suppliers` extension (payable profile)
- a provider can appear as factoring counterparty in `greenhouse_finance.factoring_operations`
- the same `provider_id` enables cross-domain analytics: vendor spend, factoring exposure, AI tool costs

## Service Module

Canonical anchor:
- `greenhouse_core.service_modules.module_id`

Required meaning:
- canonical business capability or product line
- CRM, Finance and reporting should resolve toward this ID whenever possible

## CRM Company

Current operational anchor:
- `greenhouse_crm.companies.company_record_id`

Canonical business meaning:
- source projection of a company that should resolve to one `client_id`

Required relationship:
- `hubspot_company_id -> greenhouse_core.clients.hubspot_company_id`

## CRM Contact

Target operational anchor:
- `greenhouse_crm.contacts.contact_record_id`

Canonical business meaning:
- source projection of a contact that should resolve to one Greenhouse person and user context

Required relationships:
- `hubspot_contact_id -> source link`
- `contact email -> identity_profile / client_user reconciliation`
- `company membership -> client context`

Non-negotiable rule:
- HubSpot contacts must be part of the Greenhouse model because user identity and tenant membership are reconciled against them

## Delivery Workspace

Target canonical meaning:
- the tenant-scoped `Notion project database` used to operate ICO metrics and execution context for a client

Current state:
- runtime source rows expose `_source_database_id`
- legacy tenant mapping still lives mostly through `greenhouse.clients.notion_project_ids`, which currently behaves more like scoped project-page IDs than a formal workspace binding

Target rule:
- delivery workspace binding must become explicit and tenant-level
- project, sprint and task rows must carry `project_database_source_id`

## Delivery Project

Operational projection:
- `greenhouse_delivery.projects`

Required relationships:
- `notion_project_id` as source row ID
- `project_database_source_id` as workspace/tenant context
- `client_id` resolved from tenant binding

## Delivery Task

Operational projection:
- `greenhouse_delivery.tasks`

Required relationships:
- `notion_task_id`
- `notion_project_id`
- `notion_sprint_id`
- `project_database_source_id`
- `assignee_member_id`

## Delivery Sprint

Operational projection:
- `greenhouse_delivery.sprints`

Required relationships:
- `notion_sprint_id`
- `project_database_source_id`

## Current Transitional Rules

These are allowed today, but must be documented as transitional:

### 1. Notion tenant binding

Current practical runtime bridge:
- `greenhouse.clients.notion_project_ids`

Problem:
- it behaves as project-page scope, not as a clean tenant delivery workspace binding
- internal tenants like `space-efeonce` can overlap with client project scopes

Target:
- explicit tenant binding to `project_database_source_id`

### 2. HubSpot contact projection

Current state:
- raw snapshot table exists
- operational projection is still pending

Target:
- `greenhouse_crm.contacts` must become first-class
- contact reconciliation to `client_users` and `identity_profiles` must be explicit

### 3. Service module normalization

Current state:
- some HubSpot `linea_de_servicio` values resolve cleanly to `module_code`
- some values still do not

Target:
- keep `module_code` as source-facing normalized value
- keep `module_id` as canonical value
- do not invent runtime logic that depends only on source labels

## Non-Negotiable Modeling Rules

1. Every shared business object must resolve to a canonical Greenhouse ID.
2. Source IDs must remain stored, but as source references, never as replacement identities.
3. Every new domain table must declare whether it is:
   - canonical anchor
   - domain extension
   - source projection
   - serving view
   - analytical mart
4. If data comes from HubSpot or Notion and affects runtime, it must first land in:
   - `greenhouse_raw`
   - then `greenhouse_conformed`
   - then PostgreSQL projection if runtime needs it
5. If a relationship is required for 360, it must be documented here before agents normalize it ad hoc in code.

## Immediate Follow-Ups

The next mandatory slices for coherence are:
- `greenhouse_crm.contacts`
- contact reconciliation to `client_users` and `identity_profiles`
- explicit tenant binding for `project_database_source_id`
- runtime consumers progressively moving off legacy `notion_ops.*` and `hubspot_crm.*`
