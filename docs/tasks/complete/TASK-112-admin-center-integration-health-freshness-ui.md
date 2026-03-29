# TASK-112 - Admin Center Integration Health and Freshness UI

## Delta 2026-03-28
- Tabla "Salud e integración" reemplaza sync cards: Notion Sync, Services Sync, ICO Sync + Webhooks como filas
- Freshness como señal primaria con LinearProgress: verde <6h, amarillo 6-24h, rojo >24h, barra a 0% tras 48h
- Columnas: Integración, Estado (Chip), Freshness (LinearProgress + label), Última señal, Registros, Fallos
- Health derivado del estado del subsystem con thresholds de stale

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Status real: `Implementada`
- Rank: `39`
- Domain: `platform`

## Summary

Diseñar la siguiente iteración visual de `Cloud & Integrations` para que el dominio deje de ser solo un resumen agregado y pase a mostrar health, freshness y degradación por lane/integración.

## Why This Task Exists

`TASK-108` ya creó `Cloud & Integrations`, pero hoy la lectura sigue siendo MVP:

- faltan señales por integración/fuente
- freshness y stale data no están modelados con suficiente profundidad
- el contexto de attendance lineage, syncs y webhooks todavía no converge en una lectura operacional uniforme

Esta lane es ideal para mini-task de UI porque el problema principal es jerarquía, densidad y semántica visual.

## Goal

- Diseñar una lectura clara de health por integración.
- Incorporar freshness y degradación por lane.
- Separar overview ejecutivo de drilldown operativo.
- Preparar el patrón para vendors/fuentes futuras sin rediseñar todo el módulo.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`

Reglas obligatorias:

- no convertir la surface en consola cloud genérica
- la lectura debe priorizar salud, stale, fallback y siguiente acción
- el overview admin no reemplaza `Agency > Operations`; lo ordena

## Dependencies & Impact

### Depends on

- `TASK-108` - Admin Center Governance Shell
- `TASK-111` - Admin Center Secret Ref Governance UI (complementaria, no bloqueante)
- `src/lib/operations/get-operations-overview.ts`

### Impacts to

- `/admin/cloud-integrations`
- futura observabilidad de syncs, webhooks y attendance lineage
- follow-ups de integrations health

### Files owned

- `src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx`
- `src/components/greenhouse/admin/**`
- `src/lib/operations/get-operations-overview.ts`
- `docs/tasks/to-do/TASK-112-admin-center-integration-health-freshness-ui.md`

## Current Repo State

### Ya existe

- KPIs agregados para syncs/webhooks/secrets/pressure
- cards de sync observados
- bloque de `Attendance lineage`
- acciones operativas mínimas

### Gap actual

- no hay matriz o lista clara por integración
- freshness no se ve como señal primaria
- faltan estados comparables entre syncs, webhooks y attendance sources

## Scope

### Slice 1 - Integration overview pattern

- definir patrón primario para integrations health
- decidir entre tabla ejecutiva, cards densas o vista híbrida
- proponer lectura consistente por lane

### Slice 2 - Freshness semantics

- incorporar `last_seen`, stale threshold y fallback status
- mostrar degradación sin depender solo de color
- dejar claro cuándo mirar Admin vs Operations

### Slice 3 - Growth model

- preparar la surface para vendors/fuentes futuras
- evitar que el crecimiento rompa el shell de `Admin Center`

## Out of Scope

- implementar conectores nuevos
- cambiar pipelines runtime
- construir observabilidad backend completa
- rediseñar `Agency > Operations`

## Acceptance Criteria

- [ ] existe un brief claro para health/freshness por integración
- [ ] la UI propuesta diferencia overview ejecutivo vs drilldown operativo
- [ ] freshness/stale/fallback tienen semántica visual explícita
- [ ] el patrón es escalable para nuevas integraciones sin rediseño total

## Verification

- revisión de diseño/brief contra runtime actual de `/admin/cloud-integrations`
- sanity check de estados con `TASK-108`
- walkthrough visual del patrón propuesto
