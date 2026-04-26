# TASK-695 — Nexa Insights vía Notification Hub (delivery a Teams + In-App + Email)

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
- Blocked by: `TASK-693` (templates unificados + Action.Submit handlers + mentions activos en el Hub)
- Branch: `task/TASK-695-nexa-insights-teams-delivery`
- Legacy ID: `none`

## Summary

Activar la entrega de **Nexa Insights** (anomalías, oportunidades, churn risks, recomendaciones) por Microsoft Teams + in-app bell + email a través del Notification Hub canónico (TASK-690 a TASK-693). Nexa solo emite el evento `nexa.insight.detected` al outbox; el Hub se encarga de routing, preferencias, mentions con push, y cierre del loop bidireccional vía Action.Submit. Sin código de delivery duplicado en Nexa — la sinergia es exactamente lo que justifica que el Hub exista.

## Why This Task Exists

Hoy Nexa AI produce insights de valor pero la entrega es:

- O un email genérico que se pierde en el inbox.
- O un row mudo en `notifications` que el usuario nunca ve hasta que entra al portal.
- O nada — el insight queda en una tabla y depende de que un humano haga query manual.

Con el Hub ya operativo (post TASK-693), el costo marginal de mandar insights de Nexa por Teams DM con mention al responsible owner + botones interactivos `Crear caso / Descartar / Asignar` es bajísimo: 1 template + 2-3 handlers + opcionalmente 1 emisor del lado de Nexa si aún no publica al outbox.

El payoff es alto:

- **Push notification real al owner** del insight (no solo a un canal compartido), garantizada por el `<at>` mention dentro del DM 1:1.
- **Acción inline desde Teams** sin abrir el portal: Crear caso (Linear ticket / Finance dispute / etc.) o Descartar el insight. Cierre del loop del intent en in-app + email simultáneamente.
- **Routing dinámico per-insight** vía `recipient_kind='dynamic_user'` que TASK-671 ya soporta + `recipient_routing_rule_json={ from: 'payload.responsibleMemberId' }`.

## Goal

- Template `nexa.insight.detected` registrado en el Hub con las 4 variantes (`in_app`, `email`, `teams_card`, `teams_dm`).
- Handlers `nexa.insight.create_case`, `nexa.insight.dismiss`, opcionalmente `nexa.insight.assign` registrados en `src/lib/teams-bot/handlers/`. Cada uno actualiza `notification_intents.status` + persiste el outcome en Nexa.
- Canal phantom `nexa-insights-dm` (recipient_kind=dynamic_user) seedeado para que el adapter Teams resuelva el `responsibleMemberId` al runtime.
- Routing config (`notification-kind-defaults.ts`): `nexa.insight.detected` → `[teams_dm, in_app]` con `min_severity='warning'` por default; `[teams_card, teams_dm, in_app, email]` para `severity='critical'`.
- Validación E2E en staging: emitir un `nexa.insight.detected` de prueba con `responsibleMemberId` real → verificar push notification recibido + click "Crear caso" ejecuta + intent acknowledged en las 3 superficies.
- Doc funcional `docs/documentation/ai-tooling/nexa-insights-en-teams.md` (lenguaje simple) explicando el flow para stakeholders.

## Acceptance Criteria

### Template

- [ ] `src/lib/notifications/hub/templates/nexa-insight-detected.ts` registra las 4 variantes.
  - `in_app`: row con `severity`, `title`, `summary`, `cta_url` al detalle del insight en `/ai-tooling/nexa/insight/<id>`.
  - `email`: subject + summary + CTA + footer con link a preferences.
  - `teams_card`: Adaptive Card 1.5 con severity-styled header, summary, factset (kind, scope, confidence, occurredAt), botones `Action.OpenUrl` "Ver detalle" + `Action.Submit` "Descartar".
  - `teams_dm`: misma card + `<at>{responsible_owner}</at>` mention en el `text` del activity body para garantizar push + `Action.Submit` "Crear caso", "Descartar".

### Action.Submit handlers

- [ ] `handlers/nexa-insight-create-case.ts` — invoca el módulo destino del case (Linear, Finance, Delivery — dependiendo de `payload.caseTargetModule`), persiste el caseId, actualiza intent.
- [ ] `handlers/nexa-insight-dismiss.ts` — marca insight `dismissed_at=now()` en Nexa, actualiza intent.
- [ ] (opcional) `handlers/nexa-insight-assign.ts` — abre adaptive card input para nuevo `assigneeMemberId`, emite nuevo intent al nuevo asignado, actualiza el original como `superseded`.
- [ ] Cada handler verifica entitlement (`requiredCapabilities`) antes de ejecutar — algunos owners pueden descartar pero no crear cases.
- [ ] Cada handler es idempotente.

### Routing + canal

- [ ] `notification-kind-defaults.ts` declara `nexa.insight.*` con default `[teams_dm, in_app]`.
- [ ] Seed migración crea fila `teams_notification_channels` para canal phantom `nexa-insights-dm` con `channel_kind='teams_bot'`, `recipient_kind='dynamic_user'`, `recipient_routing_rule_json={"from":"payload.responsibleMemberId"}`, `secret_ref='greenhouse-teams-bot-client-credentials'`.
- [ ] Tests del router: insight con `severity=critical` retorna `['teams_dm', 'teams_card', 'email', 'in_app']`; insight con `severity=info` (debajo del default `min_severity=warning`) retorna `[]` (skipped).

### Mention + push

- [ ] El template `teams_dm` retorna `TeamsTemplateOutput` con `mentions: [{ aadObjectId, displayName }]` resuelto via `resolveTeamsUserForMember(responsibleMemberId)`.
- [ ] Adapter Teams construye `entities[]` con `mentioned.id = "29:" + aadObjectId` y `text` con `<at>{displayName}</at>` matching exacto.
- [ ] Smoke real: enviar insight de prueba a un member real → verificar push notification recibido (campana Teams) + click handler ejecuta.

### Emitter (lado Nexa)

- [ ] Si Nexa aún no publica `nexa.insight.detected` al outbox: agregar el emit en el path donde produce insights, con payload `{ insightId, severity, kind, scope, summary, responsibleMemberId, caseTargetModule?, occurredAt }`.
- [ ] Si ya lo publica: validar que el payload tiene los campos requeridos por el template (especialmente `responsibleMemberId`).
- [ ] Test unitario del emit + test E2E que verifica el insight llega al hub e intents se generan.

### Reliability hookup

- [ ] El módulo `notifications.hub` ya incluye los signals; verificar que `nexa.insight.detected` aparece como event_type en `getOperationsOverview()` con counts diarios. Sin código nuevo — herencia del Hub.
- [ ] Dashboard tile "Notification Hub" muestra row "Nexa Insights" en el breakdown si hay tráfico.

### Doc

- [ ] `docs/documentation/ai-tooling/nexa-insights-en-teams.md` explicando para stakeholders no-técnicos:
  - Qué insights llegan por Teams, cuáles solo por bell.
  - Cómo silenciar / cambiar canales en `/settings/notifications`.
  - Qué hacen los botones del card.
- [ ] Spec relacionada (si existe `GREENHOUSE_NEXA_*` arquitectónico) actualizada con el delta de delivery.

## Out of Scope

- Cambiar la lógica de detección de insights de Nexa (qué se considera insight, cómo se calcula severity). Eso vive en Nexa.
- Aggregation / digest diario de insights (ej. "5 insights pendientes hoy"). Future task cuando exista demanda.
- Multi-tenant: insights cross-cliente para Globe accounts. Out of scope V1.
- Otras superficies (Slack, push web/mobile). Si surge, son adapters adicionales del Hub, no específicos de Nexa.

## Dependencies & Impact

### Depende de

- TASK-690 / TASK-691 / TASK-692 / TASK-693 cerradas (Hub canónico operativo + handlers + mentions).
- TASK-671 cerrado (Bot Framework Connector dispatcher en producción — ya está).
- Nexa AI module operativo y emitiendo insights (verificar estado al iniciar la task).

### Impacta

- Nexa AI module: gana canal de delivery sin código de routing.
- TASK-693: agrega 1 evento al template registry (nexa.insight.detected sería el 7º template prioritario, no parte de los 6 base de TASK-693).
- Casos derivados: insights de finance / delivery / commercial / hr ganan delivery uniforme.

### Files owned

- `src/lib/notifications/hub/templates/nexa-insight-detected.ts`
- `src/lib/teams-bot/handlers/nexa-insight-create-case.ts`
- `src/lib/teams-bot/handlers/nexa-insight-dismiss.ts`
- `src/lib/teams-bot/handlers/nexa-insight-assign.ts` (opcional)
- `migrations/<ts>_seed-nexa-insights-dm-channel.sql`
- `docs/documentation/ai-tooling/nexa-insights-en-teams.md`

## Verification

- `pnpm tsc --noEmit && pnpm lint && pnpm test`.
- `pnpm staging:request POST /api/admin/teams/test '{"channelCode":"nexa-insights-dm", "eventPayload":{"responsibleMemberId":"<test member>"}}'` → HTTP 200 con DM entregado.
- E2E manual: emitir insight real en staging → recibir push en Teams Desktop con `<at>` correcto → click "Crear caso" → verificar Linear/Finance ticket creado + intent acknowledged + bell del portal vacía.

## Orden de implementación recomendado

1. **TASK-690** Notification Hub Architecture Contract — tablas + adapters skeleton.
2. **TASK-691** Shadow + **TASK-692** Cutover — projection canónica activa.
3. **TASK-693** Notification Hub Bidireccional + UI + Mentions — entrega `action-registry`, handlers reales, contrato Action.Submit, mentions/push.
4. **(opcional) TASK-385** Email Scaling Cloud Run — necesario solo si los insights de Nexa generan broadcasts grandes.
5. **ESTA task (TASK-695)** — agrega 1 template + 2-3 handlers + canal phantom + emit del lado de Nexa si aún no publica al outbox. Consumer del trabajo del Hub, no productor de infrastructure.

Si Nexa ship insights antes de que TASK-693 cierre, hay 2 opciones temporales:
- Esperar (recomendado).
- Subir un dispatcher ad-hoc a Teams que se borra en TASK-692 cutover (deuda explícita).

## Open Questions

- ¿Cuál es el cap por owner de insights/día por DM antes de aplicar throttling? Propuesta: 5 DMs/día, resto solo bell. Confirmar con UX.
- ¿`Action.Submit` "Crear caso" debe abrir un dialog de confirmación con detalles del case antes de ejecutar, o ejecutar directo? Propuesta: directo si `severity=info|warning`, dialog si `severity=critical`. Confirmar con design.
- ¿Insights de scope `space|organization` van al canal del team (`teams_card`) además del DM al owner? Propuesta: sí, severity ≥ warning. Confirmar.
