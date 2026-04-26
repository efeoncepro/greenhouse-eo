# TASK-687 — Public Tender Notifications And Reliability Signals

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `TASK-675`, `TASK-682`, `TASK-684`
- Branch: `task/TASK-687-public-tender-notifications-reliability`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Agrega notificaciones y senales operativas para oportunidades publicas: nuevos matches relevantes, deadlines cercanos, cambios de documentos/estado, sync failures y stale data. Debe integrarse con Teams/notifications y Reliability sin ruido excesivo.

## Why This Task Exists

La utilidad real del modulo depende de actuar a tiempo. Las oportunidades y plazos pierden valor si el equipo las ve tarde o si el sync falla silenciosamente.

## Goal

- Publicar eventos relevantes de discovery/decision/deadline/document changes.
- Integrar notificaciones con canales existentes.
- Exponer health/freshness del modulo a Reliability/Ops.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_PUBLIC_PROCUREMENT_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

Reglas obligatorias:

- No enviar secretos ni documentos privados por Teams.
- Notificaciones deben ser deduplicadas y rate-limited.
- Health debe distinguir stale/partial/degraded/unavailable.
- Usar `greenhouse-agent`; copy de mensajes requiere `greenhouse-ux-content-accessibility`.

## Normative Docs

- `docs/operations/azure-teams-notifications.md`
- `docs/research/RESEARCH-007-commercial-public-tenders-module.md`

## Dependencies & Impact

### Depends on

- `TASK-675`
- `TASK-682`
- `TASK-684`

### Blocks / Impacts

- Operacion diaria del modulo.
- Platform Health/API Platform future read surfaces.

### Files owned

- `src/lib/commercial/public-procurement/`
- `src/lib/reliability/`
- `src/lib/notifications/`
- `src/app/api/cron/`

## Current Repo State

### Already exists

- Reliability y Teams notification docs/runtime existen en el repo.
- Source sync runs/watermarks existen en `greenhouse_sync`.

### Gap

- Public Procurement no emite notificaciones ni health signals.

## Scope

### Slice 1 — Event Selection

- Definir eventos notificables y thresholds.
- Agregar dedupe keys y severity.

### Slice 2 — Notifications

- Integrar con canal Teams/notifications existente.
- Mensajes con links a workbench y sin payload sensible.

### Slice 3 — Reliability Signals

- Exponer freshness, failed runs, deadlines at risk y document download health.

## Out of Scope

- UI completa de settings de notificaciones.
- Webhooks externos para clientes.

## Acceptance Criteria

- [ ] Nuevas oportunidades high-score generan notificacion deduplicada.
- [ ] Deadlines cercanos generan alerta configurable o threshold documentado.
- [ ] Sync/document failures aparecen como health signals.
- [ ] Mensajes no incluyen secretos ni adjuntos privados.

## Verification

- Tests de event selection/dedupe.
- `pnpm lint`
- `pnpm build`
- Smoke en canal/test sink si existe.

## Closing Protocol

- [ ] Lifecycle y carpeta sincronizados.
- [ ] README de tasks actualizado.
- [ ] Handoff actualizado.
- [ ] Docs operativas actualizadas.

## Follow-ups

- Settings UI de notificaciones si se requiere.
