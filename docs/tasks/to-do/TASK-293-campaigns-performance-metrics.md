# TASK-293 — Campaigns with Performance Metrics

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio-Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `9`
- Domain: `delivery`
- Blocked by: `none`
- Branch: `task/TASK-293-campaigns-performance-metrics`

## Summary

Enriquecer la vista de Campanas con metricas de delivery: OTD%, throughput, RpA, TTM, timeline planeado vs real. Enterprise marketing piensa en campanas — "como va la campana de Navidad?" no tiene respuesta cuantitativa hoy.

## Why This Task Exists

Campanas hoy solo muestra estructura (nombre, tipo, fechas, conteo de proyectos). No tiene metricas de performance, resultado ni ROI. Para un CMO de aerolinea, la campana es la unidad de negocio — no el proyecto. Sin metricas a nivel de campana, la vista es un listado inerte.

## Goal

- Cada campana muestra KPIs agregados: OTD%, throughput, RpA, assets completados
- Timeline planeado vs real visible
- TTM cuando la evidencia exista

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` — §14.2 M3

## Dependencies & Impact

### Depends on

- `greenhouse_core.campaigns` + `campaign_project_links` (PG)
- Metricas ICO existentes por proyecto (agregarlas a nivel campana)

### Blocks / Impacts

- TASK-287 (Revenue Enabled) — desglose por campana futuro

### Files owned

- `src/app/(dashboard)/campanas/page.tsx` (modificar)
- `src/app/api/campaigns/route.ts` (modificar)
- `src/views/greenhouse/` (componente de campana)

## Current Repo State

### Already exists

- Campanas page basica con cards (nombre, tipo, fechas, project count)
- API de campanas funcional
- `campaign_project_links` vincula campanas a proyectos
- Metricas ICO por proyecto disponibles en BigQuery

### Gap

- No hay agregacion de metricas a nivel de campana
- No hay timeline planeado vs real
- No hay TTM por campana

## Scope

### Slice 1 — Agregar metricas a la API

- Extender API de campanas para incluir metricas agregadas por campana
- Query: para cada campana, agregar OTD%, RpA promedio, throughput, assets completados de sus proyectos vinculados
- Incluir timeline: `planned_start_date`, `actual_start_date`, `planned_launch_date`, `actual_launch_date`

### Slice 2 — Enriquecer UI

- Agregar KPI badges en cada campaign card: OTD%, throughput, assets completados/total
- Agregar timeline mini (planeado vs real) como barra visual
- Color coding: on track (verde), delayed (amarillo), at risk (rojo)

## Out of Scope

- Campaign ROI / revenue attribution
- Crear/editar campanas desde el portal
- Campaign detail page (drill-down)

## Acceptance Criteria

- [ ] Cada campaign card muestra OTD%, throughput y assets completados/total
- [ ] Timeline planeado vs real visible como barra
- [ ] Cards con color coding por estado (on track/delayed/at risk)
- [ ] `pnpm build` pasa

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`

## Closing Protocol

- [ ] Actualizar §14.2 M3 readiness

## Follow-ups

- Campaign detail page con drill-down (task futura)
- Revenue attribution por campana
