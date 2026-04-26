# TASK-692 — Notification Hub Cutover

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-691` (sombra validada con 7 días de parity sin discrepancias)
- Branch: `task/TASK-692-notification-hub-cutover`

## Summary

Invertir el flow: una sola projection canónica `notifications-v2.ts` consume el outbox, escribe el `notification_intent` y dispatcha a los adapters. Las 3 projections viejas se borran. La regla dura "no insert directo a `greenhouse_core.notifications` desde código de dominio, no llamar `postTeamsCard()` directo" se activa.

## Why This Task Exists

Después de 1 semana en sombra (TASK-691), el hub demuestra parity con las projections actuales. El cutover elimina la duplicación de routing y deja un único punto de evolución para futuros eventos.

## Goal

- `src/lib/sync/projections/notifications-v2.ts` (rewrite de `notifications.ts`) consume el outbox, escribe el intent, dispatcha vía `decideChannels` + adapters.
- Borrar `teams-notify.ts` y crons ad-hoc de email; sus emisores delegan al adapter del hub.
- Lint rule (custom o documentación reforzada) que prohíbe `INSERT INTO greenhouse_core.notifications` y `postTeamsCard()` fuera de `src/lib/notifications/hub/adapters/`.
- Métricas en Reliability: el módulo `notifications.hub` pasa de `healthy (sombra)` a `healthy (canónico)` — todas las superficies reportan via deliveries.
- Rollback documentado: feature flag `GREENHOUSE_NOTIFICATIONS_HUB_ENABLED=false` revierte al flow viejo en < 5 min sin redeploy si surge regression.

## Acceptance Criteria

- [ ] `notifications-v2.ts` registered en `projection-registry.ts`. Las 3 projections viejas borradas.
- [ ] Tests: cobertura del path completo (event → intent → 4 adapters) con mocks de transports.
- [ ] Smoke real en staging: dispara un evento de cada dominio (finance/ops/delivery/hr) y verifica que llega por TODOS los canales esperados (in-app + email + teams según defaults).
- [ ] No insertion directo a `notifications` ni call directo a `postTeamsCard` fuera de los adapters (verificado por grep o lint rule).
- [ ] Rollback flag funcional: con flag `false`, las projections viejas vuelven a tomar el control sin breakage.
- [ ] Decommission de los crons de email obsoletos.
- [ ] tsc + lint + build limpios.

## Out of Scope

- Action.Submit handlers que cierren el loop bidireccional (TASK-693).
- UI de preferences (TASK-693).
- Templating unificado per-evento (TASK-693).
