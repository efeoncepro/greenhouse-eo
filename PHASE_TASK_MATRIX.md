# PHASE_TASK_MATRIX.md

## Purpose

This document is the fast lookup for what remains in each Greenhouse phase.

Use it when:
- an agent needs to know what is still pending without reading the full architecture doc
- multiple agents need to split work by phase
- product and technical discussions need a compact execution view

Primary sources:
- `BACKLOG.md`
- `GREENHOUSE_ARCHITECTURE_V1.md`

## Current Status

- Phase 0: in progress
- Phase 1: completed
- Phase 2: partially started
- Phase 3: partially started
- Phase 4: not started
- Phase 5: not started
- Phase 6: partially started
- Phase 7: partially started

## Phase 0. Alignment and Foundations

Pending tasks:
- finalize role matrix
- finalize KPI dictionary
- finalize semantic mart design
- finalize service module taxonomy from HubSpot commercial data
- define mapping rules from `linea_de_servicio` and `servicios_especificos`
- keep repo documentation aligned with the master architecture document

## Phase 1. Identity, Access, and Multi-User Model

Residual follow-up:
- replace `invited` bootstrap users with real onboarding or SSO
- expand `campaignScopes` consumption once campaign routes exist

## Phase 2. Executive Client Dashboard

Pending tasks:
- review and promote the executive dashboard through `Preview`, `staging`, and `Production`
- compose dashboard widgets by `serviceModules`
- create `/api/dashboard/capacity`
- create `/api/dashboard/market-speed`
- add campaign-aware dashboard slices once `/campanas` exists

## Phase 3. Delivery Context and Operational Drilldowns

Pending tasks:
- create `/api/sprints`
- create `/api/sprints/[id]`
- build real `/sprints`
- add timeline and aging to project detail
- create `/entrega`

## Phase 4. Team and Capacity

Pending tasks:
- define source of truth for assignments
- create team and capacity semantic layer
- create `/api/team`
- create `/api/capacity`
- create `/api/capacity/roles`
- build `/equipo`

## Phase 5. Campaign Intelligence

Pending tasks:
- design campaign mapping model
- connect campaign KPI context to `serviceModules`
- create campaign semantic layer
- create `/api/campaigns`
- create `/api/campaigns/[id]`
- create `/api/campaigns/[id]/deliverables`
- create `/api/campaigns/[id]/kpis`
- build `/campanas`
- build `/campanas/[id]`

## Phase 6. Internal Efeonce Visibility

Pending tasks:
- create `/internal/clientes`
- create `/internal/clientes/[id]`
- create `/internal/capacidad`
- create `/internal/riesgos`
- create `/internal/kpis`

## Phase 7. Admin and Governance

Pending tasks:
- create `/admin/scopes`
- create `/admin/feature-flags`
- expose business line and `serviceModules` in admin governance
- add safe mutations for tenants, scopes, and flags

## Recommended Near-Term Order

1. Make `/dashboard` module-aware using `serviceModules`
2. Build `/admin/scopes` and `/admin/feature-flags`
3. Build `/api/sprints` and the real `/sprints`
4. Start team/capacity once assignment source of truth is clear
