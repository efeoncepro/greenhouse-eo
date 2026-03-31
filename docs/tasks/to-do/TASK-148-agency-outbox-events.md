# TASK-148 — Agency Outbox Event Emission

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P1 |
| Impact | Medio |
| Effort | Bajo |
| Status real | `Diseño` |
| Rank | — |
| Domain | Agency / Events |
| Sequence | Agency Layer V2 — Phase 2 |

## Summary

Emit outbox events for agency mutations: team assignments created/updated/removed, service lifecycle changes (stage transitions), space configuration changes. Enable reactive downstream consumers (serving view projections, notifications, intelligence layer). Today Agency only observes events — it does not emit its own.

## Architecture Reference

`docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md` §7.3 Idempotencia, `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Dependencies & Impact

- **Depende de:** Outbox infrastructure (exists — `greenhouse_core.outbox_events`), Event Catalog (exists)
- **Impacta a:** TASK-149 (Capacity Engine reacts to assignment events), TASK-150 (Health Score refreshes on events), TASK-152 (Anomaly Detection triggered by events), TASK-160 (Enterprise Hardening — reactive projections)
- **Archivos owned:** `src/lib/agency/agency-events.ts`

## Scope

### Slice 1 — Event catalog extension (~2h)

Define agency event types in Event Catalog: `agency.team_assignment.created`, `agency.team_assignment.updated`, `agency.team_assignment.removed`, `agency.service.stage_changed`, `agency.service.created`, `agency.service.updated`, `agency.space.config_changed`. Document payload schemas.

### Slice 2 — Emit from stores (~3h)

Wire outbox emission into existing mutation paths: team assignment CRUD (`/api/agency/services` and team assignment endpoints), service lifecycle actions, space updates. Use existing `emitOutboxEvent()` pattern. Ensure idempotency keys on all emissions.

## Acceptance Criteria

- [ ] Team assignment mutations emit `agency.team_assignment.*` events
- [ ] Service stage transitions emit `agency.service.stage_changed`
- [ ] Service CRUD emits `agency.service.created/updated`
- [ ] Events appear in `greenhouse_core.outbox_events` with correct payloads
- [ ] Idempotency keys prevent duplicate event emission on retries
- [ ] Event catalog documentation updated with agency events

## File Reference

| Archivo | Cambio |
|---------|--------|
| `src/lib/agency/agency-events.ts` | New — event type definitions + emit helpers |
| `src/app/api/agency/services/route.ts` | Add outbox emission on create/update |
| `src/app/api/agency/services/[serviceId]/route.ts` | Add outbox emission on lifecycle changes |
| `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` | Extend with agency event types |
