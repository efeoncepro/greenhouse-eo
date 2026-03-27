# Finance Canonical 360 V1

## Purpose

This document is the canonical reference for the Finance 360 model currently implemented in Greenhouse.

It explains:
- which IDs are canonical
- how Finance resolves client and collaborator references
- how Finance enriches client and collaborator views from shared Greenhouse data
- which legacy references remain supported during transition
- which endpoints expose the current 360 read models

Use this document together with:
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `project_context.md`
- `Handoff.md`
- `docs/architecture/GREENHOUSE_ID_STRATEGY_V1.md`
- `docs/tasks/to-do/CODEX_TASK_Financial_Module_v2.md`

## Status

This is a backend-first implementation reference.

Current state:
- Finance keeps its own transactional tables under `greenhouse.fin_*`
- Finance no longer treats those tables as isolated identity sources
- client identity is anchored to `greenhouse.clients.client_id`
- collaborator identity is anchored to `greenhouse.team_members.member_id`
- reads are enriched from shared Greenhouse, HubSpot, Payroll, and identity tables
- legacy references are still accepted to avoid breaking existing UI and historical rows
- reconciliation, payroll-to-expense discovery, and finance form metadata now expose dedicated backend support endpoints without moving writes out of Finance

This is not yet a complete product-wide 360 UI spec.
It is the runtime contract for the current backend model.

## Canonical Keys

### Client

Canonical key:
- `greenhouse.clients.client_id`

Supporting references:
- `greenhouse.clients.hubspot_company_id`
- `greenhouse.fin_client_profiles.client_profile_id`
- `greenhouse.fin_client_profiles.hubspot_company_id`
- `greenhouse.fin_income.client_profile_id`
- `greenhouse.fin_income.hubspot_company_id`

Rule:
- `client_id` is the Finance source of truth for tenant identity
- `hubspot_company_id` is a CRM reference, not the primary identity
- `client_profile_id` remains as a Finance compatibility key, not the canonical tenant key

### Collaborator

Canonical key:
- `greenhouse.team_members.member_id`

Supporting references:
- `greenhouse.team_members.identity_profile_id`
- `greenhouse.payroll_entries.entry_id`
- `greenhouse.fin_expenses.payroll_entry_id`
- `greenhouse.fin_expenses.member_id`

Rule:
- `member_id` is the Finance source of truth for collaborator linkage
- `identity_profile_id` remains the broader cross-system identity root
- `payroll_entry_id` is a payroll reference that can be resolved to `member_id`

## Finance-Owned Tables

Finance remains the owner of these transactional tables:
- `greenhouse.fin_accounts`
- `greenhouse.fin_suppliers`
- `greenhouse.fin_client_profiles`
- `greenhouse.fin_income`
- `greenhouse.fin_expenses`
- `greenhouse.fin_reconciliation_periods`
- `greenhouse.fin_bank_statement_rows`
- `greenhouse.fin_exchange_rates`

These tables are not a problem by themselves.

The architectural rule is:
- keep Finance-owned tables for Finance workflows
- resolve identity through canonical shared tables
- build 360 views through enriched read models instead of treating `fin_*` as separate silos

## Supplier vs Provider

Finance already has a concrete vendor-facing entity today:
- `greenhouse.fin_suppliers`

That means that, in current runtime practice, many external vendors are effectively represented as Finance suppliers.

However, Finance supplier is not enough as a platform-wide object when the same external organization must also relate to:
- AI tools or suites
- identity or auth provider mappings
- admin governance
- future license, wallet, or usage models

### Current Finance meaning of Supplier

Inside Finance, `Supplier` means the payable/vendor profile used for:
- bills
- subscriptions
- payment terms
- tax identifiers
- payable expense linkage

This is a Finance-owned extension concept and remains valid.

### Recommended platform meaning of Provider

At platform level, `Provider` is the broader external organization or platform object.

Examples:
- Adobe
- Anthropic
- OpenAI
- HubSpot

Recommended relationship:
- `Provider` is the reusable cross-module object
- `fin_suppliers` is the Finance extension profile for that provider
- one Provider may map to one or more Finance supplier profiles over time if operationally needed

### Operational rule

`greenhouse.providers` now exists in runtime as the shared provider registry used by AI Tooling.

That means:
- Finance may keep using `fin_suppliers` for payable workflows
- modules may still carry `vendor` snapshot labels where needed
- new cross-module relationships should anchor to `provider_id` whenever the vendor/platform identity must survive across modules

But for ongoing cross-module design:
- do not treat `fin_suppliers.supplier_id` as the universal provider identity
- do not treat free-text `vendor` as a durable relationship key
- prefer designing new tooling, suites, identity links, or AI relationships around `provider_id`

## Resolution Rules

Runtime resolution lives in:
- `src/lib/finance/canonical.ts`

### Client resolution

Current resolver:
- `resolveFinanceClientContext()`

Accepted inputs:
- `clientId`
- `clientProfileId`
- `hubspotCompanyId`

Resolution order:
1. if `clientId` is present, treat it as the primary reference
2. derive compatible `clientProfileId` and `hubspotCompanyId` when possible
3. if only legacy references are present, resolve `clientId` from:
   - `greenhouse.clients`
   - `greenhouse.fin_client_profiles`
4. if explicit references disagree, reject with `409`
5. if a supplied identifier does not exist, reject instead of accepting a phantom link

Write-time rule:
- new writes should prefer `clientId`
- `clientProfileId` and `hubspotCompanyId` remain valid transitional inputs

### Collaborator resolution

Current resolver:
- `resolveFinanceMemberContext()`

Accepted inputs:
- `memberId`
- `payrollEntryId`

Resolution order:
1. if `memberId` is present, validate it against `greenhouse.team_members`
2. if `payrollEntryId` is present, resolve it through `greenhouse.payroll_entries`
3. derive `memberId` from payroll when needed
4. reject invalid or conflicting references

Write-time rule:
- expenses linked to payroll should end up anchored to `member_id`

## Client 360 Read Model

Primary surfaces:
- `GET /api/finance/clients`
- `GET /api/finance/clients/[id]`

### Base source

Base table:
- `greenhouse.clients`

This is the canonical active-client inventory.
Clients must still appear even if they do not have a manual Finance profile yet.

### Enrichment sources

Finance enriches the client read model with:
- `greenhouse.fin_client_profiles`
- `greenhouse.fin_income`
- `hubspot_crm.companies`
- `hubspot_crm.deals`
- `greenhouse.client_users` indirectly via tenant identity model when needed by other surfaces

### List behavior

`GET /api/finance/clients` returns a client directory built as:
1. canonical active clients from `greenhouse.clients`
2. best available Finance profile chosen by:
   - `client_id`
   - legacy `client_profile_id`
   - legacy `hubspot_company_id`
3. HubSpot enrichment for:
   - company name
   - domain
   - country
   - business line
   - service modules
4. receivables and active invoice counts from `greenhouse.fin_income`

Current list fields include:
- `clientId`
- `clientProfileId`
- `hubspotCompanyId`
- `companyName`
- `greenhouseClientName`
- `companyDomain`
- `companyCountry`
- `businessLine`
- `serviceModules`
- `legalName`
- `taxId`
- `paymentTermsDays`
- `paymentCurrency`
- `requiresPo`
- `requiresHes`
- `totalReceivable`
- `activeInvoicesCount`

### Detail behavior

`GET /api/finance/clients/[id]` supports lookup by:
- `client_id`
- `client_profile_id`
- `hubspot_company_id`

The response is organized into:
- `company`
- `financialProfile`
- `summary`
- `invoices`
- `deals`

The detail model combines:
- canonical client record from `greenhouse.clients`
- Finance profile from `greenhouse.fin_client_profiles`
- receivables and invoice history from `greenhouse.fin_income`
- deal context from `hubspot_crm.deals`

### Compatibility rule

Client detail and list must continue to work when:
- a client exists in `greenhouse.clients` but not in `fin_client_profiles`
- a historical income row only has `client_profile_id`
- a historical row only has `hubspot_company_id`

That is why current reads use canonical-first joins with legacy fallback.

## Collaborator 360 Read Model

Primary surface:
- `GET /api/people/[memberId]/finance`

Helper:
- `src/lib/people/get-person-finance-overview.ts`

### Base source

Base table:
- `greenhouse.team_members`

### Enrichment sources

The current collaborator finance overview enriches from:
- `greenhouse.team_members`
- `greenhouse.identity_profiles`
- `greenhouse.identity_profile_source_links`
- `greenhouse.client_team_assignments`
- `greenhouse.payroll_entries`
- `greenhouse.fin_expenses`

### Returned sections

Current payload sections:
- `member`
- `summary`
- `assignments`
- `identities`
- `payrollHistory`
- `expenses`

### Intent

This endpoint is read-only and exists to expose financial and payroll context for a collaborator without moving Finance writes into People.

Architectural rule:
- People remains read-first
- Finance remains the owner of Finance writes
- cross-module visibility is provided through enriched read models

## Shared Data Synergies

The current model is intentionally not silo-first.

Already shared across domains:
- client identity from `greenhouse.clients`
- collaborator identity from `greenhouse.team_members`
- payroll linkage from `greenhouse.payroll_entries`
- CRM enrichment from `hubspot_crm.companies` and `hubspot_crm.deals`
- route access through shared auth/role infrastructure

What Finance still owns:
- bank accounts
- finance supplier profiles
- exchange rates
- economic indicators (`USD_CLP`, `UF`, `UTM`, `IPC`) y su histórico operativo mínimo
- reconciliation periods and statement rows
- client billing profile extensions
- income and expense transactions

## Transitional Compatibility

The current backend supports a dual-reference period.

### Supported legacy references

Still accepted in Finance inputs and reads:
- `clientProfileId`
- `hubspotCompanyId`
- `payrollEntryId`

### Canonical destination

New writes should resolve toward:
- `client_id`
- `member_id`

### Why this exists

The transition prevents breakage in:
- existing frontend payloads
- historical Finance rows
- lists and detail views that still use `clientProfileId` in routes or UI logic

## Runtime Boundaries

### Finance must own

- financial transactions
- financial profile extensions
- banking and reconciliation data
- exchange rates
- economic indicators compartidos para consumers cross-module

### Finance must not own

- tenant identity
- collaborator identity
- auth principals
- payroll source of truth
- HubSpot source of truth

### 360 rule

360 views come from read-model composition, not table ownership transfer.

## Current Gaps

The current implementation improves canonical linkage but does not yet solve everything.

Still pending or partial:
- explicit backfill job for old rows that still lack `client_id`
- fuller client 360 spend attribution from `fin_expenses.client_id`
- broader frontend consumption of collaborator finance overview
- complete product documentation for 360 UI surfaces outside Finance and People

## Delta 2026-03-27 - Economic indicators runtime baseline

Finance dejó de quedar restringido semánticamente a `exchange_rates` como único contrato macroeconómico reutilizable.

Baseline materializado:
- helper server-side común para `USD_CLP`, `UF`, `UTM`, `IPC`
- endpoint `GET /api/finance/economic-indicators/latest`
- endpoint `GET/POST /api/finance/economic-indicators/sync`
- persistencia operacional en `greenhouse_finance.economic_indicators`
- compatibilidad mantenida con `greenhouse_finance.exchange_rates` para `USD/CLP`

Reglas derivadas:
- indicadores no FX no deben modelarse como monedas por conveniencia
- `UF`, `UTM` e `IPC` viven como catálogo de indicadores económicos, no como pares de currency
- consumers de período que necesiten reproducibilidad histórica deben leer desde esta capa antes de pedir input manual al usuario

## Source Files

Key implementation files:
- `src/lib/finance/canonical.ts`
- `src/lib/finance/reconciliation.ts`
- `src/app/api/finance/clients/route.ts`
- `src/app/api/finance/clients/[id]/route.ts`
- `src/app/api/finance/clients/sync/route.ts`
- `src/app/api/finance/income/route.ts`
- `src/app/api/finance/expenses/route.ts`
- `src/app/api/finance/expenses/bulk/route.ts`
- `src/app/api/finance/expenses/meta/route.ts`
- `src/app/api/finance/expenses/payroll-candidates/route.ts`
- `src/app/api/finance/reconciliation/[id]/candidates/route.ts`
- `src/app/api/finance/reconciliation/[id]/exclude/route.ts`
- `src/lib/people/get-person-finance-overview.ts`
- `src/app/api/people/[memberId]/finance/route.ts`

## Operational Note

If a future agent changes canonical linkage behavior, they must update:
- this document
- `project_context.md`
- `Handoff.md`

If the change is runtime-visible, also update:
- `changelog.md`
