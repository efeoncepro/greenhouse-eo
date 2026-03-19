# PHASE_TASK_MATRIX.md

## Purpose

This document is the fast lookup for what remains in each Greenhouse phase.

Use it when:
- an agent needs to know what is still pending without reading the full architecture doc
- multiple agents need to split work by phase
- product and technical discussions need a compact execution view

Primary sources:
- `docs/roadmap/BACKLOG.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`

## Current Status (as of March 2026)

- Phase 0 (Alignment): COMPLETE
- Phase 1 (Identity/Access): COMPLETE
- Phase 2 (Executive Dashboard): COMPLETE
- Phase 3 (Delivery Context): COMPLETE
- Phase 4 (Team/Capacity): SUBSTANTIALLY COMPLETE — People module, team directory, Person 360, capacity views operational. Remaining: formal allocation model, forecasting
- Phase 5 (Campaign Intelligence): PARTIALLY — No formal campaign model. ICO Engine provides operational intelligence (10 metrics). Financial Intelligence provides economic intelligence.
- Phase 6 (Internal Efeonce): COMPLETE — Agency workspace, pulse, organizations, services, ICO Engine
- Phase 7 (Admin/Governance): SUBSTANTIALLY COMPLETE — tenants, users, roles, capabilities, AI tools. Remaining: SCIM, fine-grained scopes

## Phase 0. Alignment and Foundations — COMPLETE

All foundational tasks delivered: role matrix, KPI dictionary, semantic mart design, service module taxonomy, mapping rules from HubSpot commercial data, documentation alignment.

## Phase 1. Identity, Access, and Multi-User Model — COMPLETE

Delivered: multi-tenant identity, NextAuth sessions, role-based access, identity profiles, Postgres-first auth (V2 in progress).

## Phase 2. Executive Client Dashboard — COMPLETE

Delivered: executive dashboard with reusable card families, tenant-specific slices (Sky), capacity and market-speed views, RpA with measured/fallback source transparency.

## Phase 3. Delivery Context and Operational Drilldowns — COMPLETE

Delivered: sprint APIs, project detail with timeline and aging, delivery context views.

## Phase 4. Team and Capacity — SUBSTANTIALLY COMPLETE

Delivered: People module, team directory, Person 360 (memberships, finance, assignments), capacity views, FTE allocation engine, labor cost attribution.

Remaining:
- formal allocation model (beyond FTE-weighted distribution)
- capacity forecasting

## Phase 5. Campaign Intelligence — PARTIALLY COMPLETE

No formal campaign model exists. Intelligence is delivered through two operational engines:
- **ICO Engine** — 10 deterministic metrics (RPA, OTD%, FTR%, cycle time, cycle time variance, throughput, pipeline velocity, stuck assets, stuck asset %, CSC distribution), daily materialization, agency scorecard. ETL pipeline hardened: automated sync-conformed cron, safe DELETE pattern, configurable fase_csc, canonical space resolution, health endpoint.
- **Financial Intelligence** — cost allocation, client economics snapshots, trend analysis, margin tracking

Remaining:
- formal campaign mapping model
- campaign semantic layer
- `/campanas` routes and APIs
- campaign KPI context connected to serviceModules

## Phase 6. Internal Efeonce Visibility — COMPLETE

Delivered: Agency workspace with pulse view, organizations list and 360 detail, services view, ICO Engine tab (KPIs, charts, scorecard, stuck assets drawer), spaces view with health metrics.

## Phase 7. Admin and Governance — SUBSTANTIALLY COMPLETE

Delivered: tenant management, user administration, role assignments, capability governance, AI tool catalog and licensing, feature flags, business line and serviceModule admin.

Remaining:
- SCIM provisioning
- fine-grained scopes

## Recommended Near-Term Order

1. Complete formal campaign model (Phase 5 remainder)
2. Add SCIM provisioning and fine-grained scopes (Phase 7 remainder)
3. Build capacity forecasting (Phase 4 remainder)
4. Complete Finance Module dual-store migration (BigQuery to Postgres)

## Modules Beyond Original Phase Plan

These modules were not part of the original 7-phase plan but are now operational:

- **Finance Module** (OPERATIONAL) — dashboard, P&L, clients, income, expenses, suppliers, reconciliation, intelligence, dual-store migration in progress
- **HR Core + Payroll** (OPERATIONAL) — departments, leave, attendance, payroll with Chilean calculations, period lifecycle, Postgres-first
- **Account 360 / Organizations** (OPERATIONAL) — org hierarchy, spaces, memberships, HubSpot sync
- **AI Tooling & Credits** (OPERATIONAL) — catalog, licenses, wallets, credit metering
- **ICO Engine** (OPERATIONAL) — 10 metrics, daily materialization (automated pipeline), stuck assets, agency scorecard, health endpoint, configurable fase_csc
- **Financial Intelligence** (OPERATIONAL) — cost allocation, client economics, trend analysis
- **Conformed Data Layer** (OPERATIONAL) — config-driven property mappings, multi-client Notion normalization
