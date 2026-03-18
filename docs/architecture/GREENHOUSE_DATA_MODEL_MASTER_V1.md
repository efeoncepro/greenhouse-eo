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
- `spaces`
- `space_source_bindings`
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

### `greenhouse_ai`

Mutable AI Tooling runtime.

Main objects:
- `tool_catalog`
- `member_tool_licenses`
- `credit_wallets`
- `credit_ledger`

Anchors:
- `provider_id -> greenhouse_core.providers`
- `member_id -> greenhouse_core.members`
- `client_id -> greenhouse_core.clients`
- `created_by_user_id / assigned_by_user_id -> greenhouse_core.client_users`
- `fin_supplier_id -> greenhouse_finance.suppliers`

Rules:
- AI Tooling runtime lives in PostgreSQL, not in BigQuery
- the operational module must not depend on bootstrap DDL in request path
- seed catalog and provider visibility must exist directly in PostgreSQL so admin surfaces do not start empty
- BigQuery legacy AI tables may still exist for compatibility/backfill, but they are not the runtime truth

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
- only companies that are already client companies for Greenhouse belong in the operational Greenhouse graph
- associated contacts inherit that same boundary; non-client companies and their contacts may exist in raw or conformed, but not as tenant runtime truth

### `greenhouse_delivery`

Operational projection of delivery/work execution source data.

Current tables:
- `projects`
- `sprints`
- `tasks`
- `space_property_mappings` — config table for per-Space Notion property → conformed field mappings

Important fields:
- `notion_project_id`
- `notion_sprint_id`
- `notion_task_id`
- `project_database_source_id`

Core rule:
- one `Notion project database` belongs to one tenant delivery workspace
- that database contains project rows, tasks and sprints
- a `Notion project page` is not the tenant; it is a delivery object inside the tenant workspace

`space_property_mappings` enables config-driven normalization:
- stores how each Space's Notion property names map to conformed field names
- includes type coercion rules (16 built-in rules for handling Notion type heterogeneity)
- Spaces without entries use hardcoded default mapping (backward compatible)
- populated via `scripts/notion-schema-discovery.ts` during Space onboarding

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
- `person_360`
- `space_360`
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
- `crm_contacts`

Required next slice:
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
- a client is the commercial and contractual boundary in Greenhouse
- it can have users, members, capabilities, finance records, payroll context and CRM source references

## Space / Workspace

Canonical anchor:
- `greenhouse_core.spaces.space_id`

Important source links:
- `greenhouse_core.space_source_bindings`
- `project_database_source_id` through `binding_role = 'delivery_workspace'`

Required meaning:
- a space is the operational workspace boundary for delivery and ICO metrics
- a client-facing space is `client_space`
- an internal agency workspace like `Efeonce` is `internal_space`
- a space may exist without `client_id`
- `Agency`, `delivery`, `RpA`, `On Time`, capacity and internal execution metrics should resolve against `space_id`

## Person 360

Canonical anchor:
- `greenhouse_core.identity_profiles.profile_id`

Required meaning:
- one human profile across Greenhouse
- the person exists once, and the platform renders different contextual views of that same profile
- `People`, `Users`, `HR`, `Payroll`, `CRM contacts`, internal collaborator views and tenant participation should all resolve back to this anchor

Core facets:
- `member` facet:
  - `greenhouse_core.members.member_id`
  - internal collaborator or employee context
- `user` facet:
  - `greenhouse_core.client_users.user_id`
  - access, session, roles and scopes
- `crm_contact` facet:
  - `greenhouse_crm.contacts.contact_record_id`
  - external client/company relationship context
- `space participation` facet:
  - assignments, delivery participation, client-facing or internal workspace membership

Non-negotiable rule:
- Greenhouse must not keep treating `People` and `Users` as separate identity roots
- they are different views over the same `Person 360`
- module-specific rows may enrich a facet, but they must not replace the canonical person anchor
- the same person can appear as employee, collaborator, client-account user, CRM contact or admin principal without duplicating person identity

UI rule:
- `People` should evolve into the human-centered 360 view of the person
- `Users` should evolve into the access-and-permissions view of the same person
- both surfaces must reconcile through `identity_profile_id`

## User

Canonical anchor:
- `greenhouse_core.client_users.user_id`

Important bridge:
- `identity_profile_id -> greenhouse_core.identity_profiles`

Required meaning:
- a user belongs to a tenant
- a user may be enriched by CRM contact identity and internal identity sources
- a user is an access facet of `Person 360`, not the canonical person root

## Identity Profile

Canonical anchor:
- `greenhouse_core.identity_profiles.profile_id`

Required meaning:
- one person across systems
- source links from HubSpot, Microsoft, Google, Notion and others should converge here
- this is the canonical anchor of `Person 360`

## Member / Collaborator

Canonical anchor:
- `greenhouse_core.members.member_id`

Required meaning:
- org/collaborator runtime object
- used by HR, Payroll and Finance
- this is the internal collaborator or employee facet of `Person 360`, not a separate person identity

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

Admission rule:
- a HubSpot company only enters the Greenhouse runtime graph when it is already part of the Greenhouse client universe
- operationally, the expected target filter is "belongs to the Greenhouse client universe and its HubSpot lifecycle confirms customer/client state"
- raw and conformed can keep broader CRM history, but `greenhouse_core` and client-facing runtime projections must stay restricted to client companies

## CRM Contact

Target operational anchor:
- `greenhouse_crm.contacts.contact_record_id`

Canonical business meaning:
- source projection of a contact that should resolve to one Greenhouse person and user context

Required relationships:
- `hubspot_contact_id -> source link`
- `contact email -> identity_profile / client_user reconciliation`
- `company membership -> client context`
- `hubspot_owner_id -> greenhouse_core.members` and then `owner_user_id` when the collaborator has a Greenhouse access principal

Non-negotiable rule:
- HubSpot contacts must be part of the Greenhouse model because user identity and tenant membership are reconciled against them
- only contacts associated with client companies should project into the Greenhouse runtime graph
- user provisioning still belongs to the Greenhouse <-> HubSpot integration/admin workflow; source sync should model and reconcile CRM contacts, not silently provision every contact as an access principal
- Greenhouse should not require the live HubSpot integration service to write directly into BigQuery; source sync owns the replication into `raw` / `conformed`

## Delivery Workspace

Target canonical meaning:
- the `Notion project database` bound to one Greenhouse `space`

Current state:
- runtime source rows expose `_source_database_id`
- legacy tenant mapping still lives mostly through `greenhouse.clients.notion_project_ids`, which currently behaves more like scoped project-page IDs than a formal workspace binding
- `greenhouse_core.spaces` now exists as the canonical target for this binding, but most runtime joins still depend on the legacy bridge or transitional projection logic

Target rule:
- delivery workspace binding must become explicit at the `space` level
- one `project_database_source_id` maps to one `space_id`
- project, sprint and task rows must carry `project_database_source_id`

## Delivery Project

Operational projection:
- `greenhouse_delivery.projects`

Required relationships:
- `notion_project_id` as source row ID
- `project_database_source_id` as workspace context
- `space_id` resolved from workspace binding
- `client_id` only when the space is client-backed

## Delivery Task

Operational projection:
- `greenhouse_delivery.tasks`

Required relationships:
- `notion_task_id`
- `notion_project_id`
- `notion_sprint_id`
- `project_database_source_id`
- `space_id`
- `assignee_member_id`

## Delivery Sprint

Operational projection:
- `greenhouse_delivery.sprints`

Required relationships:
- `notion_sprint_id`
- `project_database_source_id`
- `space_id`

## Current Transitional Rules

These are allowed today, but must be documented as transitional:

### 1. Notion tenant binding

Current practical runtime bridge:
- `greenhouse.clients.notion_project_ids`

Problem:
- it behaves as project-page scope, not as a clean tenant delivery workspace binding
- internal tenants like `space-efeonce` can overlap with client project scopes

Target:
- explicit `space -> project_database_source_id` binding

### 2. Client versus space

Current state:
- some runtime paths still use `client_id` as if it were also the workspace identifier
- internal Efeonce execution has historically used `space-efeonce` as a pseudo-client to make Agency work

Target:
- `client` remains commercial
- `space` becomes operational
- `space-efeonce` remains valid, but as `internal_space`, not as commercial client truth

### 3. HubSpot contact projection

Current state:
- raw snapshot table exists
- `crm_contacts` now projects only contacts associated with companies already admitted into the Greenhouse client universe
- reconciliation to `client_users` is conservative:
  - prefer canonical `user-hubspot-contact-<contact_id>`
  - then explicit source link
  - then unique email match inside the same tenant
- reconciliation to `identity_profiles` is conservative:
  - use the user's existing `identity_profile_id` when present
  - then explicit HubSpot source link
  - then unique email match
  - create a HubSpot-backed profile only when a linked runtime user exists and no profile is attached yet

Target:
- `greenhouse_crm.contacts` must become first-class
- contact reconciliation to `client_users` and `identity_profiles` must be explicit

### 5. HubSpot owners as collaborator identity

Current state:
- HubSpot companies, deals and contacts expose `hubspot_owner_id`
- `greenhouse.team_members` already stores `hubspot_owner_id`, `notion_user_id` and `azure_oid` as source identity anchors

Target:
- `hubspot_owner_id` must resolve to `greenhouse_core.members.member_id` as the operational owner anchor
- when the collaborator also has a Greenhouse user principal, runtime projections should also populate `owner_user_id`
- the reusable source-link layer should also be populated:
  - `entity_source_links` for `member <- hubspot owner`
  - `entity_source_links` for `user <- hubspot owner` when a principal exists
  - `identity_profile_source_links` for `identity_profile <- hubspot owner` when the collaborator already has canonical identity
- this keeps ownership comparable across CRM, delivery, HR and auth without inventing a second internal owner model

### 4. Service module normalization

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
- runtime consumers progressively moving from `client_id` to `space_id` for Agency/delivery/ICO
- explicit `space -> project_database_source_id` binding as the only canonical delivery workspace join
- runtime consumers progressively moving off legacy `notion_ops.*` and `hubspot_crm.*`
