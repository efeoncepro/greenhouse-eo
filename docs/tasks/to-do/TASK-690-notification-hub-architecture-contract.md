# TASK-690 — Notification Hub Architecture Contract

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio-Alto`
- Type: `architecture`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (depende lógicamente de TASK-669 + TASK-671 cerradas, ambas ya en producción)
- Branch: `task/TASK-690-notification-hub-architecture-contract`
- Legacy ID: `none`

## Summary

Unificar las 3 superficies de notificación de Greenhouse (in-app bell, email, Microsoft Teams) detrás de un **Notification Hub** canónico: un solo registry de intentos, un router con preferencias por persona, y adapters per-canal que reusan el código de delivery existente. Este task entrega únicamente el **contrato arquitectónico** + tablas + interfaces vacías + reliability hookup, sin romper ningún flujo. Las fases siguientes (TASK-691 shadow, TASK-692 cutover, TASK-693 bidireccional + UI) lo implementan incrementalmente.

## Why This Task Exists

Hoy cada superficie de notificación es dueña de su propio routing, templating y observabilidad:

- `notifications.ts` projection escribe a `greenhouse_core.notifications`.
- Email lives in `src/lib/email/` con crons y helpers ad-hoc.
- Teams sender (TASK-669/671) en `teams-notify.ts`.

Consecuencias reales (visibles después de cerrar TASK-671):

1. **El loop bidireccional del bot está aislado.** El handler `notification.mark_read` de Teams cierra la bell del portal pero no afecta al email follow-up programado. Spam.
2. **No hay preferencias por persona.** Si un colaborador quiere "approvals por DM en Teams en vez de email" no hay dónde declararlo.
3. **Templating fragmentado.** Mismo evento, 3 templates en 3 archivos. Cambiar wording requiere tocar todos.
4. **No hay audit unificado.** "¿Este evento llegó por algún canal al Director Financiero?" requiere consultar 3 tablas distintas.
5. **No hay routing dinámico per-evento.** TASK-671 introdujo `recipient_kind='dynamic_user'` pero solo el adapter Teams lo aprovecha; in-app y email lo ignoran.

Sinergia clave que desbloquea: aprovechar el dispatcher Bot Framework Connector (TASK-671) + RSC consentido + cache de conversation references para que el Hub use Teams como canal de primera clase, con DMs 1:1, Action.Submit interactivo, y feedback bidireccional que cierra el loop en TODAS las superficies.

## Goal

- Spec arquitectónica `GREENHOUSE_NOTIFICATION_HUB_V1.md` v1.0 publicada (DONE en este task junto al contract).
- 3 tablas nuevas (`notification_intents`, `notification_deliveries`, `notification_preferences`) con migraciones, indices, CHECK constraints, comentarios.
- `src/lib/notifications/hub/router.ts` (pure function `decideChannels`) + tests cubriendo defaults, preferencias explícitas, quiet hours, severity gating.
- 4 adapters skeleton (`in-app`, `email`, `teams-channel`, `teams-dm`) que wrappean el código existente sin cambiarlo. Cada uno expone `deliver(intent, ctx): Promise<DeliveryOutcome>`.
- `templating.ts` con registry pattern + un template inicial (`finance.expense.approval_pending`) que prueba las 4 variantes.
- `notification_kind_defaults.ts` declarativo con los canales default por evento (clonado del comportamiento actual de las 3 projections — sin cambios de routing en V1).
- Hookup al Reliability Control Plane: nuevo módulo `'notifications.hub'` con `expectedSignalKinds=['subsystem','freshness','incident']` + `incidentDomainTag='notifications.hub'`. Inicialmente reporta `not_configured` hasta que TASK-691 active la projection en modo sombra.
- Tests + tsc + lint + build limpios. Total tests `>= current + 30`.
- Doc funcional `docs/documentation/plataforma/notification-hub.md` (lenguaje simple, no técnico) explicando el modelo a stakeholders no-ingenieros.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md` — spec canónica del contrato (creada junto a esta task).
- `docs/architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` v1.2 — transport Teams (TASK-669/671) que el adapter `teams_*` invoca.
- `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md` v1.2 — Bot Framework Connector + Action.Submit cierre del loop.
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — catálogo canónico de eventos del outbox.
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — patrón de projection (idempotencia, replay, dead-letter).
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — `members.member_id` como destinatario canónico.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — hookup del nuevo módulo `notifications.hub`.

Reglas obligatorias:

- **NO** crear projections de notificación nuevas fuera del hub. Cualquier evento que quiera notificar va por la projection canónica (TASK-692 lo cumple; en V1 los emisores actuales coexisten).
- **NO** insertar directo en `greenhouse_core.notifications` desde código de dominio (regla activa desde Fase 3 — TASK-692).
- **NO** llamar `postTeamsCard()` directo desde código de dominio una vez que el hub esté en Fase 3.
- **NO** loggear `event_payload_json` en claro a observabilidad. Pasa por `redactSensitive` (`src/lib/observability/redact.ts`) antes de surfacear.
- **Idempotencia obligatoria**: `dedup_key UNIQUE` bloquea duplicados al INSERT. Si surge un duplicado real, el caller debe usar nuevo `correlation_id`.
- **Reuso del transport TASK-671**: el adapter `teams_dm` usa `recipient_kind='dynamic_user'` con la routing rule del intent — NO crea filas estáticas en `teams_notification_channels`.
- **Reuso del action-registry TASK-671**: el handler `notification.mark_read` actualiza `notification_intents.status='acknowledged'` (refactor del placeholder actual).
- **Test pyramid**: tests unitarios del router (pure function, fácil), tests de adapters con mocks de los transports, tests integración del INSERT idempotente.

## Normative Docs

- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md` v1.0 (creada junto a este task)
- `docs/architecture/GREENHOUSE_TEAMS_NOTIFICATIONS_V1.md` v1.2 (bump a v1.3 cuando TASK-692 cierre con Teams como adapter exclusivo)
- `docs/architecture/GREENHOUSE_TEAMS_BOT_INTERACTION_V1.md` v1.2 (bump a v1.3 cuando handlers cierren el loop bidireccional vía intents)
- (a crear) `docs/documentation/plataforma/notification-hub.md` — explicación funcional para stakeholders

## Dependencies & Impact

### Depende de

- TASK-669 cerrado en producción (channel registry transport-agnostic).
- TASK-671 cerrado en producción (Bot Framework Connector dispatcher + Action.Submit endpoint + cache de conv refs + skill `teams-bot-platform`).
- Outbox + reactive projections operativos (TASK-128 / playbook).
- Reliability Control Plane operativo (TASK-635 / TASK-672).

### Bloquea / impacta

- **TASK-691 Notification Hub Shadow Mode** — dual-write para validar parity sin breakage.
- **TASK-692 Notification Hub Cutover** — invertir el flow; deprecar projections viejas.
- **TASK-693 Notification Hub Bidireccional + UI Preferences** — Action.Submit cierra el loop, settings UI.
- TASK-149 (capacity engine alerts) — gana DM 1:1 a managers afectados sin re-implementar routing.
- TASK-651 (finance approvals) — Action.Submit "Aprobar / Rechazar" inline sin abrir el portal.
- Todos los emisores existentes de notificaciones — la projection canónica los reemplaza incrementalmente.

### Files owned

- `migrations/*-create-notification-hub-tables.sql`
- `src/lib/notifications/hub/router.ts`
- `src/lib/notifications/hub/router.test.ts`
- `src/lib/notifications/hub/adapters/in-app.ts`
- `src/lib/notifications/hub/adapters/email.ts`
- `src/lib/notifications/hub/adapters/teams-channel.ts`
- `src/lib/notifications/hub/adapters/teams-dm.ts`
- `src/lib/notifications/hub/adapters/__tests__/`
- `src/lib/notifications/hub/templating.ts`
- `src/lib/notifications/hub/templates/finance-expense-approval-pending.ts`
- `src/lib/notifications/hub/notification-kind-defaults.ts`
- `src/lib/notifications/hub/persistence.ts` (intent/delivery upsert + dedup_key)
- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md`
- `docs/documentation/plataforma/notification-hub.md`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migrations + tipos Kysely

- `pnpm migrate:create create-notification-hub-tables` con DDL completa de las 3 tablas según §4 de la spec.
- `pnpm migrate:up` + `pnpm db:generate-types` para regenerar `src/types/db.d.ts`.
- Verificación con `\d greenhouse_core.notification_intents` que CHECK constraints + índices + comentarios estén aplicados.

### Slice 2 — Tipos + router pure function

- `src/types/notifications.ts` (nuevo): `NotificationChannel`, `NotificationDomain`, `NotificationSeverity`, `NotificationIntent`, `NotificationPreferenceResolution`, `RoutingDecision`.
- `src/lib/notifications/hub/router.ts`: `decideChannels(intent, preferences) -> RoutingDecision`. Pure function, sin side effects.
- `notification-kind-defaults.ts`: registry declarativo `Map<eventTypeGlob, NotificationChannel[]>`. Defaults clonados del comportamiento actual:
  - `finance.expense.approval_pending` → `[email, teams_channel]` (V1) — V3 add `teams_dm` al approver.
  - `payroll.period.calculated` → `[email]`.
  - `delivery.daily_pulse.materialized` → `[teams_channel]`.
  - `ops.error.unhandled` → `[teams_channel, email]` (severity ≥ warning).
- Tests: 12+ casos cubriendo defaults, override por preference, quiet hours respetadas, quiet hours ignoradas para `severity=critical`, glob matching (`finance.*` vs `finance.expense.*`), recipient sin preferences usa defaults, conflicto entre 2 globs (gana el más específico).

### Slice 3 — Adapters skeleton (wrappean código existente)

- `adapters/in-app.ts`: `INSERT INTO greenhouse_core.notifications` (mantiene la fila legacy + persiste `notification_id` en `delivery.adapter_target`). El día de hoy el código que escribe `notifications` lo seguirá haciendo desde la projection vieja — el adapter es el "punto único" para Fase 3.
- `adapters/email.ts`: wrapper sobre `src/lib/email/sendTransactionalEmail` (helper existente). Persiste `email_log.email_id` en `adapter_target`.
- `adapters/teams-channel.ts`: wrapper sobre `postTeamsCard(channelCode, card)` (TASK-671). Resuelve `channelCode` desde `notification-kind-defaults.ts`.
- `adapters/teams-dm.ts`: usa `postTeamsCard` con un canal phantom `teams-bot-dm` (a crear en seed) que tiene `recipient_kind='dynamic_user'` y `recipient_routing_rule_json={ from: 'payload.recipientMemberId' }`. El intent inyecta el member_id en el payload; el dispatcher TASK-671 lo resuelve.
- Tests por adapter con mocks: success path, idempotency (mismo intent_id × channel no duplica), failure persiste en `adapter_status='failed'` con razón redactada.

### Slice 4 — Persistencia + dedup

- `persistence.ts`: `recordIntent(intent, decision)` hace INSERT idempotente con `dedup_key = sha256(eventType + recipientMemberId + correlationId)`. ON CONFLICT DO NOTHING. Devuelve si fue inserción nueva o duplicado.
- `recordDelivery(intentId, channel, outcome)` upsert en `notification_deliveries`.
- `acknowledgeIntent(intentId, via, memberId)` UPDATE con guard `recipient_member_id = $memberId` (defensa contra spoofing en Action.Submit).

### Slice 5 — Templating

- `templating.ts` con `registerTemplate({ eventType, variants })` patrón clonado de `projection-registry.ts`.
- Una template inicial: `templates/finance-expense-approval-pending.ts` con las 4 variantes:
  - `in_app`: row JSON con `title`, `body`, `cta_url`, `severity`.
  - `email`: MJML / React Email + plain-text fallback.
  - `teams_card`: Adaptive Card 1.5 con botón `Action.OpenUrl`.
  - `teams_dm`: misma card + `Action.Submit` con `actionId='finance.expense.approve'` y `actionId='finance.expense.reject'` (handlers viven en `src/lib/teams-bot/handlers/` — se crean en TASK-693).

### Slice 6 — Reliability hookup

- `RELIABILITY_REGISTRY` (`src/lib/reliability/registry.ts`) gana módulo:
  - `moduleKey: 'notifications.hub'`
  - `domain: 'platform'`
  - `expectedSignalKinds: ['subsystem', 'freshness', 'incident']`
  - `incidentDomainTag: 'notifications.hub'`
  - `dependencies: ['notification_intents', 'notification_deliveries', 'teams_notification_channels', 'email transport']`
- `src/types/reliability.ts` agrega `'notifications.hub'` al union `ReliabilityModuleKey`.
- Hasta que TASK-691 active la projection, el módulo reporta `not_configured` (`expectedSignalKinds` declarado, signals 0 — el harness lo entiende).

### Slice 7 — Doc funcional

- `docs/documentation/plataforma/notification-hub.md` (nuevo) explicando:
  - Qué es y por qué existe (lenguaje simple).
  - Tabla de eventos canónicos × superficies × default.
  - Cómo configurar preferencias (placeholder hasta TASK-693).
  - FAQ: "¿Por qué a veces llega por Teams pero no por email?", "¿Cómo silencio una categoría?".
  - Link a la spec técnica.

### Slice 8 — Kill-switch foundation (no-breakage prereq de TASK-691)

Tres compromisos de no-breakage que **deben nacer en TASK-690** para que TASK-691/692 puedan ejecutarse con red de seguridad. Sin estos, las fases siguientes no tienen rollback barato.

- **Feature flag `GREENHOUSE_NOTIFICATIONS_HUB_MODE`** (env var Vercel + Cloud Run): valores `disabled | shadow | canonical`. Se lee al inicio de cada projection refresh, NO al boot — flip en Vercel se propaga en < 1 min sin redeploy.
- `src/lib/notifications/hub/mode.ts` (NUEVO): helper canónico `getNotificationsHubMode(): 'disabled' | 'shadow' | 'canonical'` con cache TTL de 30s (evita race con flips). Tests cubriendo cada modo.
- `src/lib/notifications/hub/dual-write.ts` (NUEVO): wrapper `tryShadowWrite(intent, deliveries, deps)` que cualquier projection puede invocar:
  - Si `mode==='disabled'` → no-op silencioso.
  - Si `mode==='shadow' | 'canonical'` → INSERT idempotente a `notification_intents` + `notification_deliveries`. Cualquier error pasa por `captureWithDomain(err, 'notifications.hub', { phase: mode })` y NO se propaga al caller.
- **Snapshot tests del transport actual** (regression baseline pre-Hub):
  - `src/lib/notifications/__tests__/in-app-row-shape.snapshot.test.ts` — captura el shape exacto de la row que la projection vieja escribe en `greenhouse_core.notifications` para 3 eventos canónicos. TASK-691/692 deben pasar el mismo snapshot tras integrar el adapter.
  - `src/lib/email/__tests__/transactional-email.snapshot.test.ts` — captura subject + body MJML de 2 emails canónicos.
  - `src/lib/integrations/teams/__tests__/card-shape.snapshot.test.ts` — captura el Adaptive Card 1.5 de 3 eventos canónicos.
- Documentación de **rollback procedure** en `docs/operations/notification-hub-rollback.md`:
  - Comando exacto para flip a modo anterior (`vercel env add GREENHOUSE_NOTIFICATIONS_HUB_MODE shadow --force` con cap detalle).
  - Query de verificación post-rollback (`SELECT count(*) FROM notification_intents WHERE created_at > now() - INTERVAL '5 minutes'` debe quedar plano).
  - Quién es el owner del flag en Vercel + cuáles env tienen permission.

**Sin Slice 8, las fases 2-3 no son seguras** — un bug del Hub en shadow puede tirar el delivery legacy si el dual-write no isola failures, o un cutover canonical sin flag de rollback obliga a deploy revert ante un incidente. El env var + el wrapper + los snapshots cierran ese gap antes de TASK-691.

## Out of Scope

- **Activación de la projection canónica.** En este task NO se activa `notifications-v2`. Slice 5 deja la maquinaria lista; TASK-691 la activa en modo sombra.
- **Action.Submit handlers reales para approve/reject.** Se cita el actionId en el template, pero el handler queda como placeholder. TASK-693 los entrega.
- **UI de preferences en `/settings/notifications`.** TASK-693.
- **Push notifications (mobile/web).** Out of scope V1 según la spec.
- **Aggregation / digest** (1 email diario con todos los approvals). Future task.
- **Migración de los emisores existentes a templates unificados.** Se hace incrementalmente cuando cada dominio toque su template.

## Detailed Spec

Toda la spec técnica vive en `GREENHOUSE_NOTIFICATION_HUB_V1.md` (creada junto a este task). Lecturas obligatorias antes de tocar código:

- §3 Modelo de dominio (diagrama del flujo).
- §4 Tablas canónicas (DDL exacta de las 3 tablas).
- §5 Componentes de código (interfaces TypeScript).
- §10 Reglas duras.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migración aplicada en local + Kysely types regenerados (`src/types/db.d.ts` contiene `GreenhouseCoreNotificationIntents`, `GreenhouseCoreNotificationDeliveries`, `GreenhouseCoreNotificationPreferences`).
- [ ] `decideChannels` cubierto por tests en los 12 casos del Slice 2.
- [ ] 4 adapters con tests verdes; cada uno persiste `notification_deliveries` con `adapter_status` correcto.
- [ ] `dedup_key` UNIQUE bloquea inserción duplicada (test con dos calls a `recordIntent` con el mismo trio).
- [ ] Template `finance.expense.approval_pending` renderiza las 4 variantes (test snapshot).
- [ ] `RELIABILITY_REGISTRY` lista el módulo `notifications.hub`; `getReliabilityOverview()` devuelve un módulo para él (status `not_configured` hasta TASK-691).
- [ ] `pnpm tsc --noEmit` clean.
- [ ] `pnpm lint` clean.
- [ ] `pnpm test` clean (`>= current + 30 tests`).
- [ ] `pnpm build` clean (no nuevas warnings).
- [ ] `GREENHOUSE_NOTIFICATION_HUB_V1.md` v1.0 publicado.
- [ ] `notification-hub.md` doc funcional publicado en `docs/documentation/plataforma/`.
- [ ] Ningún emisor de dominio cambiado (regla: V1 NO toca código de dominio existente).
- [ ] Ningún breakage observable en producción (tests E2E existentes pasan).

## Verification

- `pnpm migrate:status` muestra la nueva migración aplicada.
- `pnpm tsc --noEmit && pnpm lint && pnpm test`.
- `pnpm build`.
- `pnpm staging:request POST /api/admin/teams/test '{"channelCode":"ops-alerts"}'` sigue devolviendo 200 (regression de TASK-671).
- Manual: `psql -c "\d+ greenhouse_core.notification_intents"` muestra columnas + comentarios + índices.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real.
- [ ] archivo en carpeta correcta.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado con la lista de archivos creados + counts.
- [ ] `changelog.md` actualizado: nueva spec arquitectónica + 3 tablas + reliability hookup.
- [ ] chequeo de impacto cruzado sobre TASK-128, TASK-149, TASK-635, TASK-651, TASK-669, TASK-671, TASK-672.
- [ ] `TASK_ID_REGISTRY.md` actualizado a `complete`.
- [ ] TASK-691 / TASK-692 / TASK-693 creadas como follow-ups en `to-do/` con dependencia declarada en TASK-690.

## Follow-ups (tasks derivadas)

- **TASK-691 Notification Hub Shadow Mode**: dual-write desde las projections existentes a `notification_intents` + `notification_deliveries` para validar parity 1 semana sin breakage.
- **TASK-692 Notification Hub Cutover**: invertir el flow; activar `notifications-v2` projection canónica; deprecar projections viejas; hard-rule "no insert directo a `notifications`".
- **TASK-693 Notification Hub Bidireccional + UI Preferences**: Action.Submit handlers reales (`finance.expense.approve`, `notification.mark_read`) cierran el loop vía `acknowledgeIntent`; UI `/settings/notifications` con Vuexy primitives; templating unificado para los 6 eventos canónicos prioritarios.

## Open Questions

- ¿Default de `min_severity` por canal? Propuesta: `email = 'info'`, `teams_channel = 'info'`, `teams_dm = 'warning'`, `in_app = 'info'`. A confirmar con UX antes de TASK-693.
- ¿Quiet hours globales del tenant? Propuesta: respetadas para `severity ∈ {info, warning}`, ignoradas para `critical`. A confirmar con People/HR antes de TASK-693.
- ¿Aggregation V1.5 o esperar a uso real? Propuesta: dejar fuera; agregar cuando exista demanda concreta (>1000 deliveries/día/canal).
- ¿`notification_deliveries` tiene retención corta (90d) o indefinida? Propuesta: 90d con archivado a BigQuery. Confirmar cost guard antes de prod.
