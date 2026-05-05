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
- Status real: `Diseno (Delta v0.1 aplicado tras auditoría arch-architect 2026-05-05)`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-690` (contrato + tablas + adapters skeleton)
- Branch: `task/TASK-691-notification-hub-shadow-mode`

## Delta v0.1 (2026-05-05) — pre-flight corrections post-auditoría arch-architect

Hereda los fixes de TASK-690 Delta v0.1 (D1–D5, S1–S5, m1–m5). Adicionalmente, esta task corrige:

### S6 — Latency p95 ≤ 100ms target irreal → calibrar a 250ms

Acceptance criteria de "Fase 2 → Fase 3" declara `Reporte de latencia del dual-write: p95 ≤ 100ms`. Para INSERT a 3 tablas + idempotency check + reactive consumer wakeup bajo carga real, 100ms es agresivo y puede generar falsos rojos. **Fix**: target inicial **p95 ≤ 250ms**. Si baseline de staging muestra que se puede bajar, ajustar antes de Production. Lo importante NO es el número absoluto sino que `p95(legacy + shadow) - p95(legacy_solo) ≤ 50%` — esa delta es la métrica real.

### S7 — Cron de parity report en Cloud Scheduler, no Vercel cron

`Reporte de parity diario` declarado como "cron diario" sin home. Por TASK-775 (cron classification), un parity check de async-critical va a **Cloud Scheduler + ops-worker**, no Vercel cron (Vercel scheduled crons no corren en Staging custom env, exactamente el bug class que TASK-775 cerró). **Fix**: declarar Cloud Scheduler job `ops-notifications-hub-parity-check` (cron `0 9 * * *` America/Santiago) → endpoint `POST /notifications-hub/parity-report` en `services/ops-worker/server.ts`. Helper canónico vive en `src/lib/notifications/hub/parity-report.ts` (reusable desde ops-worker + admin endpoint manual).

### S8 — Reliability signal canónica `shadow_parity_drift`

La parity query existe pero no se materializa como signal. **Fix**: agregar al registry de TASK-690 Slice 6:

```ts
{
  name: 'commercial.engagement.shadow_parity_drift',  // → mover a 'notifications.hub.shadow_parity_drift'
  kind: 'drift',
  severity: count > 5% ? 'error' : (count > 1% ? 'warning' : 'ok'),
  steady: 0,
  current: parityDriftPercent,
  detectionQuery: '...parity SQL from docs/operations/notification-hub-shadow-parity.md...',
  runbook: 'docs/operations/notification-hub-rollback.md',
  subsystem: 'notifications.hub',
}
```

Reader vive en `src/lib/reliability/queries/notifications-hub-shadow-drift.ts` (clonado del patrón `cron-staging-drift.ts`). Visible en `/admin/operations` automáticamente. **Sin esto, el drift detectado por el cron no se rollupea al subsystem ni dispara alerts vía registry.**

### S9 — Capability granular del flag

"Cualquier engineer con permission `developer`" es muy laxo. **Fix**: declarar capability `platform.notifications.hub.flag_modify` (NEW) restricted a EFEONCE_ADMIN. Lista explícita de owners de rotation on-call documentada en `docs/operations/notification-hub-rollback.md` con email + responsabilidad horaria. Cambios al flag exigen audit log row con `capability_check_passed`, `actor_user_id`, `previous_mode`, `new_mode`, `reason ≥ 10 chars`.

### Score 4-pilar post-Delta v0.1 (estimado)

- v0.0 (original): 8.125/10 (Safety 9, Robustness 8, Resilience 8, Scalability 7.5).
- v0.1 (post-Delta): **8.625/10** estimado (Safety 9, Robustness 8.5, Resilience 9, Scalability 8).

Mejoras: signal canónica del drift (+Resilience), latency target realista (+Scalability), Cron home definido (+Resilience), capability del flag con audit (+Safety).

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

## Compromisos de no-breakage (hard rules)

Estos 3 compromisos son **obligatorios** y se verifican como acceptance criteria:

### Compromiso A — el legacy delivery siempre gana en duda

Cualquier error del Hub durante shadow NO interrumpe el delivery legacy. Patrón canónico en cada projection:

```ts
const legacyResult = await deliverLegacy(event)
if (getNotificationsHubMode() !== 'disabled') {
  tryShadowWrite(event, legacyResult).catch(err => {
    captureWithDomain(err, 'notifications.hub', { phase: 'shadow', eventType: event.type })
  })
}
return legacyResult
```

`tryShadowWrite` (de TASK-690 Slice 8) catchea internamente Y el caller agrega un `.catch` defensivo adicional. **Nada del Hub puede tirar una excepción que rompa una projection vieja**. Test: simular error en `recordIntent` y verificar que la projection vieja completa su delivery normalmente.

### Compromiso B — no se borra código viejo hasta verificar el reemplazo

En TASK-691, las projections viejas siguen siendo **dueñas exclusivas** del delivery. El borrado real es Fase 4 (TASK-693 closeout). Esta task no toca `unregisterProjection`, no borra archivos, no comenta `registerProjection`. Los `git diff` de TASK-691 son ADD-only sobre el código de notificación legacy.

### Compromiso C — no se cambia data shape de las tablas legacy

El adapter `in_app` que el Hub usa para escribir `notification_deliveries` lee los mismos datos que la projection vieja escribe en `greenhouse_core.notifications`. Pero en shadow mode, **NADIE escribe a `notifications` desde el Hub** — sigue siendo la projection vieja la que lo hace. Snapshot tests validan que la row shape no cambió (ver Slice 8 de TASK-690). Si el adapter en algún momento escribe a `notifications`, el snapshot test rompe el merge.

## CI gates de fase (Fase 1 → Fase 2)

Antes de promote `mode=shadow` al primer canal productivo, TODOS los puntos deben estar marcados con fecha y autor en el changelog:

- [ ] `pnpm tsc/lint/test/build` clean en `develop` con TASK-690 + TASK-691 mergeados.
- [ ] Migración de las 3 tablas aplicada en producción (`pnpm migrate:status` confirma).
- [ ] Smoke real `pnpm staging:request POST /api/admin/teams/test '{"channelCode":"ops-alerts"}'` devuelve 200 (regression de TASK-671 sigue pasando).
- [ ] Reliability dashboard muestra `notifications.hub` con status `not_configured` o `awaiting_data` (esperado pre-shadow).
- [ ] Feature flag `GREENHOUSE_NOTIFICATIONS_HUB_MODE=disabled` declarado en Vercel (Production + Preview + Development) con valor inicial `disabled`.
- [ ] Snapshot tests de transport (in-app row, email, Teams card) verdes con valores capturados ANTES del cambio.
- [ ] Helper `tryShadowWrite` cubierto por test que simula failure → no propaga.
- [ ] Smoke E2E parity test verde en CI por al menos 50 runs consecutivos.
- [ ] Tile `notifications.hub` en Reliability dashboard cambia a `healthy` después de 30 min con `mode=shadow` activado en staging.

## CI gates de fase (Fase 2 → Fase 3)

Antes de avanzar a TASK-692 (cutover), TODOS los puntos deben estar marcados:

- [ ] 7 días corridos de `mode=shadow` en producción.
- [ ] Parity report diario ≤ 1% de discrepancia. Documentado en `Handoff.md` con queries y counts día por día.
- [ ] Cero incidents Sentry con tag `notifications.hub` (o, si los hubo, root-cause documentado y arreglado en `develop`).
- [ ] Smoke E2E parity test verde en CI por al menos 50 runs consecutivos.
- [ ] Tile `notifications.hub` en healthy con > 100 deliveries/día.
- [ ] Snapshot tests de cada transport sin diff vs baseline pre-Hub.
- [ ] Reporte de latencia del dual-write: p95 ≤ 100ms (no debe agregar más de eso al delivery legacy).
- [ ] Verificación de `dedup_key UNIQUE`: durante 1 semana, contar cuántos INSERTs fallaron por conflict — deben ser solo replays legítimos del outbox, no casos legítimos bloqueados (revisar muestra manual).

## Rollback procedure

### Síntoma: discrepancia > 5% entre legacy y shadow detectada por parity report

1. Flip flag a `disabled`:
   ```bash
   echo -n "disabled" | vercel env add GREENHOUSE_NOTIFICATIONS_HUB_MODE production --force
   echo -n "disabled" | vercel env add GREENHOUSE_NOTIFICATIONS_HUB_MODE preview develop --force
   ```
2. Verificar propagación (< 1 min):
   ```sql
   SELECT count(*) FROM greenhouse_core.notification_intents
    WHERE created_at > now() - INTERVAL '5 minutes';
   -- después del flip, debe quedar plano (sin nuevos inserts)
   ```
3. Las projections viejas NO requieren cambio — siguen funcionando.
4. Sentry tag `notifications.hub` deja de capturar nuevos errors.
5. `develop` queda con el código del Hub pero inactivo. Investigar root-cause sin presión de incident.

### Síntoma: el dual-write rompe el delivery legacy (Compromiso A violado)

Esto NUNCA debería pasar — si pasa, hay un bug en `tryShadowWrite` o en el `.catch` defensivo del caller. Acción inmediata:

1. Flip a `disabled` (paso 1 arriba).
2. Hotfix branch que rolea atrás el call al wrapper en la projection afectada (one-liner).
3. Postmortem obligatorio en `Handoff.md` documentando el bypass del catch.

### Owner del flag

- Modificación del flag requiere acceso al team Vercel `efeonce-7670142f`.
- Owners autorizados: cualquier engineer con permission `developer` o superior.
- Cambio se documenta en `changelog.md` el mismo día (esto NO es opcional — es para audit del cutover).

## Out of Scope

- Cambiar el routing de las projections viejas (eso es TASK-692).
- Activar preferences (`notification_preferences` se escriben a vacío).
- Action.Submit handlers reales que actualicen intents (TASK-693).
