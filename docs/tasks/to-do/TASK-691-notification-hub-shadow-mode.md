# TASK-691 — Notification Hub Shadow Mode

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-690` (contrato + tablas + adapters skeleton)
- Branch: `task/TASK-691-notification-hub-shadow-mode`

## Summary

Activar el Notification Hub en **modo sombra**: las 3 projections existentes (in-app, email, Teams) siguen siendo dueñas de su delivery, pero EN PARALELO escriben un `notification_intent` + `notification_delivery` en las tablas del hub para validar parity de routing y observabilidad sin tocar UX. 1 semana de dual-write con métricas comparativas → decisión go/no-go para TASK-692 (cutover).

## Why This Task Exists

TASK-690 entrega la maquinaria pero no la activa. Saltar directo al cutover sin shadow es de alto riesgo: silencia notificaciones que hoy llegan, o duplica las que no deberían. Shadow mode permite:

- Comparar 1:1 lo que las projections viejas envían vs lo que el hub habría decidido enviar.
- Detectar reglas de routing implícitas que no quedaron capturadas en `notification-kind-defaults.ts`.
- Medir latencia y throughput del INSERT a las 3 tablas nuevas bajo carga real.
- Validar que el `dedup_key` UNIQUE no bloquea casos legítimos.

## Goal

- Cada projection existente (`notifications.ts`, `teams-notify.ts`, los crons de email) llama a `recordIntent(intent)` + `recordDelivery(intentId, channel, outcome)` ANTES o DESPUÉS de su delivery actual (best-effort, no bloquea).
- Métricas en Admin Ops Health: tile "Notification Hub (sombra)" muestra counts de intents/deliveries por canal × dominio en 24h. Status `awaiting_data` los primeros 30 min, `healthy` después.
- Reporte de parity diario: query SQL en `docs/operations/notification-hub-shadow-parity.md` que compara `notifications` legacy vs `notification_deliveries` adapter=`in_app`. Discrepancias > 1% disparan alerta vía dispatcher Teams (sí, dogfooding).
- 1 semana corrida sin discrepancias críticas → ready para TASK-692.

## Acceptance Criteria

- [ ] 3 projections existentes hacen dual-write a `notification_intents` + `notification_deliveries` con error-handling best-effort (failure no rompe el delivery legacy).
- [ ] Reliability module `notifications.hub` reporta status `healthy` con signals `subsystem` (counts), `freshness` (last_dispatched_at), `incident` (Sentry tag `notifications.hub`).
- [ ] Query de parity documentada y corre como cron diario.
- [ ] Tests: para cada projection, un test que verifica que el dual-write se ejecuta incluso si el delivery legacy falla, y vice-versa.
- [ ] 7 días de tráfico productivo sin discrepancias > 1%.
- [ ] tsc + lint + build limpios.

## Out of Scope

- Cambiar el routing de las projections viejas (eso es TASK-692).
- Activar preferences (`notification_preferences` se escriben a vacío).
- Action.Submit handlers reales que actualicen intents (TASK-693).
