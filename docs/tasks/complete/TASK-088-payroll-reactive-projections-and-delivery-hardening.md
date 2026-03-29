# TASK-088 - Payroll Reactive Projections and Delivery Hardening

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Cerrada`
- Rank: `4`
- Domain: `hr`
- GitHub Project: `Greenhouse Delivery`

## Summary

Endurecer la capa reactiva de Payroll para que la entrega de recibos, la proyección reactiva y la materialización serving tengan un contrato duradero, observables y sin drift entre docs y runtime.

La task cubre `payroll_receipts_delivery`, la cola reactiva, el fallback de export y la clarificación del contrato de `projected_payroll`.

## Delivery

- La cola reactiva ya cierra su ciclo con `pending -> completed/failed` y mantiene idempotencia por `event_id + handler`.
- El fallback BigQuery de export publica `payroll_period.exported` solo cuando la mutación realmente avanza el período.
- `projected_payroll_snapshots` quedó documentado como serving cache interno; `projected_payroll` sigue consumiendo cálculo vivo + `latestPromotion`.

## Why This Task Exists

La auditoría detectó que la proyección reactiva existe, pero su cola no se comporta todavía como una cola completa y el path de export fallback no publica el evento canónico que dispara recibos.

Además, `projected_payroll` materializa snapshots serving que la API no consume todavía como fuente servible única, así que el contrato entre cache, auditoría y superficie de lectura sigue ambiguo.

## Goal

- Hacer que la cola reactiva tenga completion/failure real y no solo intents pendientes.
- Garantizar que todo export emita `payroll_period.exported`, incluso el fallback.
- Alinear `projected_payroll` con un contrato claro de cache servible o side effect auditado.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `payroll_period.exported` sigue siendo el cierre canónico de nómina
- los eventos projected deben estar clasificados como audit-only o como consumers reales, no en una zona gris
- la cola reactiva debe ser duradera de verdad si la documentación la presenta como tal

## Dependencies & Impact

### Depends on

- `TASK-074` - promotion projected → official y contrato de promotion auditing
- `TASK-077` - receipts delivery ya está en runtime y depende del export canónico
- `TASK-086` - el cut-off operativo ya está documentado
- `TASK-087` - lifecycle oficial y freeze semantics deben estar claros
- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/refresh-queue.ts`

### Impacts to

- `TASK-063` - el brief de projected payroll debe alinearse con el contrato real
- `TASK-089` - la UI proyectada y la entrega de recibos dependen de esta semántica
- delivery reactivo de receipts, projected payroll y observabilidad

### Files owned

- `src/lib/sync/reactive-consumer.ts`
- `src/lib/sync/refresh-queue.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/projections/projected-payroll.ts`
- `src/lib/sync/projections/payroll-receipts.ts`
- `src/lib/payroll/export-payroll.ts`
- `src/lib/payroll/projected-payroll-store.ts`
- `src/lib/payroll/projected-payroll-promotion-store.ts`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Current Repo State

### Ya existe

- proyección `payroll_receipts_delivery`
- helper de promotion projected → official
- snapshots serving de projected payroll
- catálogo de eventos de nómina y proyecciones

### Gap actual

- la cola persistente no está cerrando su ciclo de vida completo
- el reactor tiene un corte temporal duro que contradice la promesa de durabilidad
- el fallback BigQuery de export no emite siempre el evento canónico
- `projected_payroll` todavía mezcla audit trail y serving cache sin declaración explícita

## Scope

### Slice 1 - Queue durability

- completar el ciclo de la projection refresh queue
- cerrar estados pendientes con completion/failure
- revisar el límite temporal del reactor

### Slice 2 - Export parity

- garantizar `payroll_period.exported` en todos los caminos de export
- validar que `payroll_receipts_delivery` se dispare sin depender del runtime escogido
- endurecer observabilidad y retries

### Slice 3 - Projected payroll contract

- declarar si `projected_payroll_snapshots` es cache servible o materialización interna
- alinear el catálogo de eventos con esa decisión
- eliminar ambigüedad entre eventos audit-only y consumers reales

## Out of Scope

- rediseño visual de nómina proyectada
- cambios al motor de cálculo oficial
- nueva semántica de compensación

## Acceptance Criteria

- [x] La cola reactiva avanza de forma verificable de `pending` a `completed` o `failed`.
- [x] El export fallback publica `payroll_period.exported` y dispara receipts como el path Postgres.
- [x] El contrato de `projected_payroll` queda explícito en docs y runtime.
- [x] Los tests cubren expiración, retries, export parity y receipts delivery.

## Verification

- `pnpm exec vitest run src/lib/sync/reactive-consumer.test.ts src/lib/sync/refresh-queue.test.ts src/lib/payroll/export-payroll.test.ts src/lib/sync/projections/payroll-receipts.test.ts`
- `pnpm lint`
- `pnpm build`
- smoke en staging de export + receipts + projected payroll (pendiente)

## Notes

- El path de fallback BigQuery ya no emite el evento canónico si la mutación no actualiza ninguna fila.
- La completitud de la queue es best-effort después del ledger reactivo; si falla el update de completion, el handler queda logueado sin reventar el resto del pipeline.
