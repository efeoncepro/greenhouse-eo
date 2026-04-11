# TASK-366 — Assigned Team Observability, Freshness, Export & Enterprise Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-361, TASK-362, TASK-364, TASK-365`
- Branch: `task/TASK-366-assigned-team-enterprise-hardening-observability-export`
- Legacy ID: `hardening final de Assigned Team`
- GitHub Issue: `none`

## Summary

Cerrar `Assigned Team` con estándares enterprise: freshness visible, observability, error budgets, export cliente-safe y contratos operativos para soporte y rollout.

## Why This Task Exists

Un módulo enterprise no queda listo solo con la UI. `Assigned Team` va a combinar varias fuentes y distintos niveles de entitlement; por eso necesita trazabilidad, degradación explícita, health checks y export seguro. Si no se resuelve al final, la capability queda difícil de operar y de vender a clientes enterprise.

## Goal

- Hacer observable la capability `Assigned Team`
- Exponer freshness, lineage y error handling con calidad enterprise
- Agregar export/reporting cliente-safe donde tenga sentido

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- freshness y degradación deben estar visibles para el usuario cuando afecten decisiones
- export nunca puede saltarse policy o field masking
- observability debe apuntar a sources compartidos, no solo a la UI

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `src/app/api/internal/health/route.ts`
- `src/lib/cloud/health.ts`
- `src/lib/integrations/health.ts`
- `src/lib/alerts/slack-notify.ts`
- `src/lib/staff-augmentation/snapshots.ts`
- `src/views/greenhouse/GreenhouseInternalDashboard.tsx`
- `TASK-361`
- `TASK-362`
- `TASK-364`
- `TASK-365`

### Blocks / Impacts

- release client-facing de `Assigned Team`
- soporte operativo y customer success

### Files owned

- `src/lib/assigned-team/observability.ts`
- `src/app/api/team/assigned/export/route.ts`
- `src/app/api/team/assigned/health/route.ts`
- `docs/documentation/*`
- `docs/tasks/to-do/TASK-366-assigned-team-enterprise-hardening-observability-export.md`

## Current Repo State

### Already exists

- patterns de export en payroll y dashboards internos
- health endpoints y utilidades compartidas para cloud/integrations

### Gap

- `Assigned Team` no tiene freshness visible ni health propia
- no existe export client-safe de roster/coverage/alerts
- no hay runbook operativo ni telemetry específica de esta capability

## Scope

### Slice 1 — Freshness & health

- exponer freshness chips, staleness states y health endpoint
- registrar fallbacks y source degradation

### Slice 2 — Export

- agregar export cliente-safe de portfolio o roster resumido
- respetar policy, masking y entitlements premium

### Slice 3 — Operability

- instrumentar logs/metrics/alerts mínimos
- documentar runbook, rollout y soporte

## Out of Scope

- BI o reporting analítico profundo fuera del módulo
- automatizaciones comerciales o upsell playbooks

## Acceptance Criteria

- [ ] `Assigned Team` expone freshness y health operativa comprensible
- [ ] Existe export cliente-safe consistente con access policy
- [ ] La capability queda documentada y operable para staging/production

## Verification

- `pnpm lint`
- `pnpm test -- assigned-team hardening`
- validación manual de export y degradación visible

## Closing Protocol

- [ ] actualizar `docs/documentation/README.md` y `docs/changelog/CLIENT_CHANGELOG.md` si cambia la visibilidad de la capability

## Follow-ups

- definir roadmap de scorecards ejecutivos si el mercado lo exige
