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

## Compromisos de no-breakage (hard rules)

Estos 3 compromisos son **obligatorios** en el cutover y se verifican como acceptance criteria. Sin ellos, una regression en producción exige revert vía deploy (lento) en lugar de flag flip (rápido).

### Compromiso A — el legacy delivery sigue disponible para rollback inmediato

En esta task las projections viejas se **comentan**, no se borran. Patrón canónico:

```ts
// src/lib/sync/projections/index.ts
import { notificationsV2Projection } from './notifications-v2'
import { notificationsLegacyProjection } from './notifications'  // mantener import
// import { teamsNotifyProjection } from './teams-notify'  // TODO: borrar en TASK-693 closeout

const mode = getNotificationsHubMode()
if (mode === 'canonical') {
  registerProjection(notificationsV2Projection)
  // legacy NO se registra
} else {
  // mode='shadow' o 'disabled' (rollback): legacy retoma el control
  registerProjection(notificationsLegacyProjection)
  // shadow continúa via tryShadowWrite que TASK-690 ya tiene
}
```

El borrado real (`git rm` + import cleanup) es Fase 4 (TASK-693 closeout), después de 7 días corridos en `mode=canonical` sin rollback.

### Compromiso B — `mode=canonical` se activa primero en STAGING, luego en PRODUCTION con ventana de observación

El flag NO se flippea simultáneamente en los 3 entornos. Orden estricto:

1. Day 0: `mode=canonical` en `Development` + `Preview (develop)`. Smoke E2E completo. CI runs N veces.
2. Day 0+1: si Development verde 24h, `mode=canonical` en Staging custom env (`dev-greenhouse.efeoncepro.com`). Tráfico real interno limitado (solo equipo Efeonce).
3. Day 0+3: si Staging verde 48h con counts comparables a producción shadow, `mode=canonical` en Production. Equipo on-call durante 4h post-flip.
4. Day 0+10: si Production verde 7 días, autoriza TASK-693.

Cada paso documentado en `Handoff.md` con timestamp + autor + métricas pre/post-flip.

### Compromiso C — data shape compatibility lock

El adapter `in_app` escribe a `greenhouse_core.notifications` con la **MISMA shape** de columnas y mismos valores que la projection vieja escribía. Cualquier UI que hoy lee `notifications` (bell del portal, queries de admin, exports) sigue funcionando idéntico. Garantizado por:

- Snapshot tests (de TASK-690 Slice 8) que comparan output del adapter vs baseline pre-Hub.
- Lint rule + grep en CI: `INSERT INTO greenhouse_core.notifications` solo permitido dentro de `src/lib/notifications/hub/adapters/in-app.ts`. Cualquier otra ocurrencia rompe el merge.
- Test de regression que dispara los 5 eventos canónicos pre/post cutover y compara los rows producidos.

Si el snapshot rompe, el cutover NO avanza hasta restaurar parity exacta — el adapter se ajusta, no la UI.

## CI gates de fase (Fase 3 → Fase 4)

Antes de avanzar a TASK-693 (bidireccional + UI), TODOS marcados:

- [ ] `mode=canonical` en Production por 7 días corridos sin rollback.
- [ ] Métricas comparables: counts diarios pre/post cutover dentro de ±5% (documentado en `Handoff.md`).
- [ ] Latencia p95 del dispatch ≤ 1.5x del legacy. Dispatch nuevo coordina N adapters; un poco más caro es esperado, no debe ser order of magnitude.
- [ ] Cero quejas de usuarios sobre notificaciones perdidas o duplicadas (revisar Slack interno + Sentry + soporte).
- [ ] Logic Apps de TASK-669 ya decommissioned. Cutover de Teams completado, NO debe haber path paralelo.
- [ ] Lint rule custom o grep CI activos: ningún `INSERT INTO greenhouse_core.notifications` ni `postTeamsCard()` fuera de `src/lib/notifications/hub/adapters/`.
- [ ] Snapshot tests del transport actual siguen verdes (regression baseline pre-Hub respetada).
- [ ] Cero incidents Sentry con tag `notifications.hub` durante los 7 días, o root-cause documentado y fix mergeado.

## Rollback procedure

### Síntoma: usuarios reportan notificaciones perdidas o duplicadas tras `mode=canonical`

1. Flip flag a `shadow`:
   ```bash
   echo -n "shadow" | vercel env add GREENHOUSE_NOTIFICATIONS_HUB_MODE production --force
   ```
2. La projection vieja retoma el delivery exclusivo (Compromiso A garantiza que el código está disponible). El Hub sigue cacheando shadow data para diagnóstico.
3. Verificar propagación (< 1 min):
   ```sql
   -- los nuevos eventos debe procesar la projection vieja
   SELECT count(*) FROM greenhouse_core.notifications
    WHERE created_at > now() - INTERVAL '5 minutes';
   -- debe seguir creciendo a ritmo normal
   ```
4. Revisar `notification_deliveries` para ver qué disparó el rollback (qué evento + canal).
5. Postmortem obligatorio en `Handoff.md` con root-cause + plan de fix antes de re-intentar canonical.

### Síntoma: el adapter `in_app` escribe rows con shape distinta a la projection vieja

Esto NUNCA debería pasar — Compromiso C lo bloquea via snapshot tests. Si pasa en producción:

1. Flip a `shadow` (paso 1 arriba).
2. Hotfix branch que ajusta el adapter para producir el shape exacto.
3. Re-correr snapshot tests + smoke E2E.
4. Re-intentar canonical solo cuando los tests están verdes.

### Síntoma: latencia p95 del dispatch supera 2x el legacy

1. NO requiere rollback inmediato — tolerable hasta 1.5x.
2. Si supera 2x: flip a `shadow` y profiling del coordinador del Hub. Causa probable: un adapter síncrono que debería ser fire-and-forget.

### Owner del flag y acceso

- Mismo que TASK-691: cualquier engineer del team Vercel `efeonce-7670142f` con permission `developer` o superior.
- Cambios SIEMPRE documentados en `changelog.md` el mismo día.
- Durante la ventana de 7 días post-cutover, **on-call rotates entre engineers** para garantizar respuesta < 30 min al rollback si surge.

## Decommission post-Fase 4 (referencia para TASK-693 closeout)

Después de 7 días en canonical sin rollback, TASK-693 closeout puede:

1. Borrar imports comentados de projections viejas (`git rm src/lib/sync/projections/notifications.ts teams-notify.ts`).
2. Quitar el `if/else` del registry — solo `notifications-v2` queda registrada.
3. Borrar el flag `GREENHOUSE_NOTIFICATIONS_HUB_MODE` de Vercel + del helper `getNotificationsHubMode()`.
4. Borrar `tryShadowWrite` y `dual-write.ts` (ya no hay shadow).
5. Cron del parity report se borra.
6. La spec `GREENHOUSE_NOTIFICATION_HUB_V1.md` bumpea a v1.1 con Delta "Cutover completado, kill-switch removido".

NO hacer estos pasos antes de los 7 días — el flag es la red de seguridad.

## Out of Scope

- Action.Submit handlers que cierren el loop bidireccional (TASK-693).
- UI de preferences (TASK-693).
- Templating unificado per-evento (TASK-693).
