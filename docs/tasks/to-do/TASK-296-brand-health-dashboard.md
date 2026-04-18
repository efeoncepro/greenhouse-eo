## Delta 2026-04-17 — alineación con capa de entitlements

TASK-286 fue ampliada para declarar capabilities granulares `client_portal.*` con `defaultScope: 'organization'`. Esta task ahora debe consumir esa capa al implementar la página.

- **View code:** `cliente.brand_health`
- **Capability:** `client_portal.brand_health`
- **Actions requeridas:** `view` (read-only dashboard)
- **Scope:** `organization`
- **Guard de página:** combinar `hasAuthorizedViewCode(tenant, 'cliente.brand_health')` + `can(tenant, 'client_portal.brand_health', 'view', 'organization')`.
- **Ref canónica:** `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

# TASK-296 — Brand Health Dashboard

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio-Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `12`
- Domain: `agency`
- Blocked by: `TASK-286` (view code + capability + binding + role defaults)
- Branch: `task/TASK-296-brand-health-dashboard`

## Summary

Crear dashboard de Brand Health para client_executive: Brand Consistency Score (AI), Design System impact en FTR/RpA/Cycle Time, Brand Voice compliance y trend de 6 meses. Un CMO de banco o aerolinea necesita saber que su marca se mantiene consistente en 200+ assets/mes.

## Why This Task Exists

Brand Consistency Score se calcula por AI y se persiste en BQ, pero no tiene UI client-facing. Para industrias brand-sensitive (aerolineas, banca, manufactura), la consistencia de marca es un tema de board — el CMO reporta sobre esto trimestralmente.

## Goal

- Pagina `/brand-health` con metricas de salud de marca
- Brand Consistency Score con trend
- Design System impact (correlacion con FTR, RpA, Cycle Time)
- Brand Voice compliance score

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §11.3, §14.1 V2
- `docs/architecture/Contrato_Metricas_ICO_v1.md`

Reglas obligatorias:

- No exponer component libraries, design tokens, prompts o modelos internos
- Solo exponer scores y outcomes, no IP de la agencia

## Dependencies & Impact

### Depends on

- TASK-286 (view code `cliente.brand_health`)
- `src/lib/ico-engine/methodological-accelerators.ts` — Brand Voice AI evidence
- `ico_engine.ai_metric_scores` (metric_id `brand_consistency_score`)

### Blocks / Impacts

- TASK-298 (QBR) — Brand Health snapshot en QBR

### Files owned

- `src/app/(dashboard)/brand-health/page.tsx`
- `src/app/api/brand-health/route.ts`
- `src/views/greenhouse/GreenhouseBrandHealth.tsx`

## Current Repo State

### Already exists

- `readPortfolioBrandVoiceAiEvidence()` en methodological-accelerators.ts
- `buildCreativeBrandMetricsCardData()` con 4 KPIs: FTR%, Brand Consistency%, RpA, Knowledge Base
- Policy status system (ready/degraded/blocked)
- Datos en `ico_engine.ai_metric_scores`

### Gap

- No hay pagina standalone
- No hay API dedicada
- Knowledge Base metric reservado (no implementado)
- No hay trend de 6 meses
- Design System impact es proxy (correlacion), no medicion directa

## Scope

### Slice 1 — API route

- Crear `/api/brand-health/route.ts`
- Query: Brand Consistency Score actual + historico 6 meses
- Incluir: FTR%, RpA como proxy de Design System impact
- Brand Voice evidence: average_score, scored_tasks, passing_tasks

### Slice 2 — Page y view component

- KPI cards: Brand Consistency Score, FTR%, Brand Voice compliance
- Trend chart: Brand Consistency 6 meses
- Design System impact section: correlacion FTR/RpA/Cycle Time antes vs despues
- Policy status badge (ready/degraded/blocked)

## Out of Scope

- Component library exposure
- Knowledge Base metric (reservado)
- Brand guidelines editor

## Acceptance Criteria

- [ ] Pagina `/brand-health` muestra Brand Consistency Score con trend
- [ ] Design System impact visible como correlacion con FTR/RpA
- [ ] No se expone IP interna (tokens, prompts, modelos)
- [ ] Solo visible para `client_executive`
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`

## Follow-ups

- TASK-298: Brand Health en QBR
