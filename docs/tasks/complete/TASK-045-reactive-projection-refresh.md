# TASK-045 - Reactive Projection Refresh

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Cerrada`
- Rank: `33`
- Domain: `platform`
- GitHub Project: `Greenhouse Delivery`

## Summary

Extender el patrón reactivo basado en outbox para refrescar de forma uniforme las nuevas proyecciones cross-module de persona y organización, evitando que cada snapshot nuevo nazca con su propio mecanismo aislado de cron, backfill o invalidación parcial.

## Why This Task Exists

El repo ya tiene infraestructura potente:

- `TASK-006` cerró webhook infrastructure reusable
- `TASK-012` cerró outbox event expansion y un consumer reactivo base

Pero el siguiente nivel de madurez todavía no está cerrado: cuando nuevas proyecciones como `person operational serving` u `organization executive snapshot` dependan de múltiples cambios de dominio, el portal necesita una forma homogénea de refrescarlas sin caer en soluciones ad hoc.

## Goal

- Crear un patrón genérico de refresh reactivo para proyecciones serving
- Mapear eventos de dominio a proyecciones afectadas con granularidad útil
- Reducir dependencia de crons aislados para mantener frescos los snapshots core
- Añadir observabilidad de refresh, retries y degradaciones

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- los eventos de dominio siguen publicándose en outbox; el refresh reactivo no debe introducir otro bus paralelo
- cada proyección debe declarar qué eventos la invalidan o recomputan
- el refresh reactivo debe ser idempotente, observable y seguro frente a reprocesos

## Dependencies & Impact

### Depends on

- `TASK-012 - Outbox Event Expansion`
- `TASK-006 - Webhook Infrastructure MVP`
- `TASK-042 - Person Operational Serving Cutover`
- `TASK-043 - Person 360 Runtime Consolidation`
- `TASK-044 - Organization Executive Snapshot`
- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/publish-event.ts`
- `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md`

### Impacts to

- refresh de proyecciones de persona y organización
- `TASK-040 - Data Node Architecture v2`
- `TASK-023 - Notification System`
- cualquier lane futura que agregue snapshots derivados en `greenhouse_serving`

### Files owned

- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/projection-refresh.ts`
- `src/app/api/cron/outbox-react/route.ts`
- `src/app/api/internal/projections/**`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/roadmap/GREENHOUSE_RUNTIME_SYNERGY_GAPS_V1.md`

## Current Repo State

### Ya existe

- outbox y catálogo de eventos ya están materializados
- existe consumer reactivo base para parte de `organization_360`
- existen crons y backfills separados para varias proyecciones del sistema

### Gap actual

- no hay un framework explícito de refresh reactivo para nuevas proyecciones serving
- cada snapshot nuevo corre riesgo de resolver frescura por su cuenta
- falta observabilidad central de refresh, retries y lag de proyecciones

## Scope

### Slice 1 - Registry de proyecciones

- definir registro de proyecciones y eventos que las invalidan
- formalizar handlers idempotentes por tipo de proyección
- documentar granularidad mínima de refresh

### Slice 2 - Runtime reactivo

- extender consumer reactivo para ejecutar refresh de proyecciones registradas
- agregar retries, tracking y dead-letter/skip cuando aplique
- soportar recompute dirigido por entidad o período, no solo refresh global

### Slice 3 - Observabilidad y operación

- exponer logs o endpoints internos para estado del refresh de proyecciones
- medir lag y fallos por proyección
- dejar playbook operativo para backfill y reprocess manual cuando falle el path reactivo

## Out of Scope

- reemplazar crons de source sync que siguen siendo necesarios para ingestión externa
- exponer eventos externos nuevos a terceros
- rediseñar webhook infrastructure
- resolver BI analítico histórico fuera de las proyecciones operativas core

## Acceptance Criteria

- [ ] existe un registro explícito de proyecciones refreshables y sus eventos gatilladores
- [ ] el consumer reactivo soporta refresh dirigido para al menos persona y organización
- [ ] el refresh reactivo es idempotente y observable
- [ ] existen métricas o endpoints internos para inspeccionar lag, retries y fallos
- [ ] `pnpm lint` pasa sin nuevos errores
- [ ] `pnpm test` cubre dispatch reactivo y refresh dirigido
- [ ] `npx tsc --noEmit` no introduce errores nuevos

## Verification

- `pnpm lint`
- `pnpm test`
- `npx tsc --noEmit`
- smoke manual de refresh reactivo disparado por al menos un evento de persona y uno de organización
