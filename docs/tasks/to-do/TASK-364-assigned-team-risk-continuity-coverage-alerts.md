# TASK-364 — Assigned Team Risk, Continuity & Coverage Alerts

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `delivery`
- Blocked by: `TASK-358, TASK-359, TASK-363`
- Branch: `task/TASK-364-assigned-team-risk-continuity-coverage-alerts`
- Legacy ID: `follow-on de Assigned Team health`
- GitHub Issue: `none`

## Summary

Agregar la capa enterprise de alertas y continuity signals para `Assigned Team`: riesgos de cobertura, dependencia crítica, frescura de certificaciones, capacidad frágil y señales de performance resumidas listas para cliente.

## Why This Task Exists

La arquitectura pide que `Assigned Team` no se limite a mostrar quién integra el equipo, sino también qué tan resiliente es ese equipo. Hoy hay métricas, dashboards y motores de señales repartidos por Delivery e ICO, pero no existe una traducción cliente-facing que convierta esa información en `attention needed` sin sobrerrevelar telemetría interna.

## Goal

- Publicar una lane de `attention` y `continuity` para el equipo asignado
- Traducir señales operativas a lenguaje entendible por cliente enterprise
- Preparar la base para cards premium, upsell y proactive customer success

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`

Reglas obligatorias:

- las alertas deben ser cliente-safe y policy-aware
- no usar señales internas crudas sin traducción semántica
- la continuidad debe explicarse como cobertura, redundancia y riesgo operativo, no como debugging interno

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/documentation/delivery/motor-ico-metricas-operativas.md`

## Dependencies & Impact

### Depends on

- `src/app/api/dashboard/risks/route.ts`
- `src/app/api/ico-engine/health/route.ts`
- `src/lib/ico-engine/read-metrics.ts`
- `src/lib/ico-engine/metric-trust-policy.ts`
- `src/lib/person-360/facets/delivery.ts`
- `TASK-358`
- `TASK-359`
- `TASK-363`

### Blocks / Impacts

- `TASK-365`
- `TASK-366`

### Files owned

- `src/lib/assigned-team/alerts.ts`
- `src/lib/assigned-team/continuity.ts`
- `src/app/api/team/assigned/alerts/route.ts`
- `docs/tasks/to-do/TASK-364-assigned-team-risk-continuity-coverage-alerts.md`

## Current Repo State

### Already exists

- señales de riesgo y health en dashboard/ICO
- capacidad y overcommitment ya calculados por `Team Capacity`

### Gap

- no existe attention lane específica para `Assigned Team`
- no hay score o catálogo de alertas cliente-safe por miembro/equipo
- no existe bridge entre continuidad operativa y visibilidad cliente-facing

## Scope

### Slice 1 — Alert catalog

- definir alert types: low coverage, no backup, stale certification, unstable performance, saturation risk
- mapear severity, freshness y ownership

### Slice 2 — Reader & API

- construir reader de alertas sobre capacity + delivery/ICO + trust data
- exponer API policy-aware para cards y drawers

### Slice 3 — UI contracts

- definir payloads para `AttentionListCard`, hero notices y roster badges
- cubrir estados sin alertas y degradaciones por permissions

## Out of Scope

- notificaciones push o email automáticas
- customer success playbooks operativos

## Acceptance Criteria

- [ ] Existe un catálogo enterprise de alertas para `Assigned Team`
- [ ] Las alertas se sirven desde reader policy-aware y con freshness explícita
- [ ] UI principal y consumers pueden renderizar alertas sin lógica local adicional

## Verification

- `pnpm test -- assigned-team alerts`
- `pnpm lint`
- validación manual de severities y states

## Closing Protocol

- [ ] documentar en `Handoff.md` si alguna alerta requiere coordinación con Delivery o Customer Success

## Follow-ups

- `TASK-365`
- `TASK-366`
