# TASK-436 — Nexa Critical Push Distribution (Slack / Teams)

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
- Blocked by: `none` (TASK-435 opcional — si cierra antes, los push incluyen CTA)
- Branch: `task/TASK-436-nexa-critical-push-distribution`
- Legacy ID: —
- GitHub Issue: —
- Parent arch doc: `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` (Eje 3)

## Summary

Cambia Nexa de pull a push para señales `critical`. Un consumer adicional del outbox reacciona a `<domain>.ai_llm_enrichments.materialized` con severity crítica y empuja a Slack/Teams el insight con link a la surface. Multiplica el ROI de todos los engines existentes (ICO, Finance) y futuros (Payroll, Staff Aug). Es el cambio con mayor leverage en el programa de expansión.

## Why This Task Exists

Hoy, una anomalía crítica detectada a las 03:45 UTC espera a que un humano abra el portal o el email semanal para ser leída. En ventanas de alta sensibilidad (cierre de mes, lanzamiento comercial, renewal), 12-72 horas de retraso es la diferencia entre actuar a tiempo y explicar por qué no se actuó.

Razones adicionales:

- El outbox ya emite `<domain>.ai_llm_enrichments.materialized` con severity — la infraestructura está.
- No requiere engines nuevos, ni UI nueva, ni schema nuevo. Solo un consumer adicional.
- Multiplica el valor de cada engine Nexa (actual y futuro) sin tocarlos.

## Goal

- Consumer del outbox que filtra enrichments `critical` y empuja a Slack/Teams.
- Configuración por canal: por dominio (ICO, Finance, etc.) y por entity (Space/Client específico si existe canal dedicado).
- Deduplicación: no empujar el mismo `signal_id` dos veces aunque el enrichment se regenere.
- Rate limit por canal para evitar spam.
- Payload: narrativa corta + severity badge + CTA link (si TASK-435 está cerrada) o deep-link directo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` — contrato `critical_push` (Eje 3).
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — patrón de consumer outbox.
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` §5 — Cloud Run + Scheduler.
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — catálogo de eventos.

Reglas obligatorias:

- Solo severity `critical` va a push. `warning` y `info` se consolidan en el Weekly Digest.
- Deduplicación obligatoria — un mismo `signal_id` no se empuja dos veces.
- Rate limit por canal (default: máx 10 pushes/hora por canal).
- Secretos de Slack/Teams webhook via GCP Secret Manager siguiendo la higiene actual (`*_SECRET_REF`, scalar raw, sin `\n`).
- Nunca mandar PII en el payload — narrativa breve + link al portal donde el usuario con sesión ve el detalle completo.

## Normative Docs

- Consumers existentes del outbox (ver `src/lib/sync/outbox/` o similar; confirmar path en planning).
- `services/ops-worker/` — si el consumer se aloja aquí o en un servicio dedicado, validar.

## Dependencies & Impact

### Depends on

- Outbox operativo (lo está).
- Al menos un engine emitiendo severity `critical` — ICO y Finance ya lo hacen.

### Blocks / Impacts

- Beneficia retroactivamente a TODOS los engines Nexa (actual y futuro).
- TASK-435 si cierra antes, el payload del push incluye CTA button/link.
- Nuevos engines (TASK-433 Payroll, TASK-434 Staff Aug) automáticamente empujan críticos al cerrar esta task.

### Files owned

- Migración PG: tabla de configuración `greenhouse_ai.nexa_push_channels` + tabla de dedupe `greenhouse_ai.nexa_push_dispatches`
- `src/lib/nexa/push/` (nuevo) — dispatcher, formatters para Slack/Teams, rate limiter
- Consumer outbox: endpoint en Cloud Run `ops-worker` o servicio dedicado
- Admin UI: configuración de canales (URL webhook, mapping dominio → canal)
- Secretos en GCP Secret Manager: `NEXA_SLACK_WEBHOOK_OPS_REF`, `NEXA_SLACK_WEBHOOK_FINANCE_REF`, etc.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema configuración + dedupe

- `greenhouse_ai.nexa_push_channels`:
  - `channel_id UUID PRIMARY KEY`
  - `domain TEXT NOT NULL` (ico, finance, payroll, staff_aug, all)
  - `scope_type TEXT NULL` (space, client, organization, global)
  - `scope_id TEXT NULL`
  - `platform TEXT NOT NULL` (slack, teams)
  - `webhook_secret_ref TEXT NOT NULL`
  - `rate_limit_per_hour INT DEFAULT 10`
  - `active BOOLEAN DEFAULT TRUE`
- `greenhouse_ai.nexa_push_dispatches`:
  - `dispatch_id UUID PRIMARY KEY`
  - `signal_id TEXT NOT NULL`
  - `channel_id UUID NOT NULL`
  - `dispatched_at TIMESTAMPTZ NOT NULL`
  - `status TEXT NOT NULL` (sent, failed, rate_limited, duplicate_skipped)
  - `error_message TEXT NULL`
  - UNIQUE `(signal_id, channel_id)` para dedupe.

### Slice 2 — Dispatcher core

- `src/lib/nexa/push/dispatcher.ts`:
  - `dispatchCritical(enrichment, channel): Promise<DispatchResult>`
  - Lógica: check dedupe → check rate limit → format payload → HTTP POST webhook → record dispatch.
- Formatters:
  - `src/lib/nexa/push/slack-formatter.ts` → Block Kit payload.
  - `src/lib/nexa/push/teams-formatter.ts` → Adaptive Card payload.
- Ambos formatters producen: severity badge, dominio, narrativa truncada, link al portal, CTA link (si disponible).

### Slice 3 — Consumer outbox

- Consumer que escucha `<domain>.ai_llm_enrichments.materialized`.
- Filtra enrichments con `severity = 'critical'` y `status = 'succeeded'`.
- Para cada enrichment, resuelve canales aplicables (domain + scope matching) y dispatcha a cada uno.
- Se aloja en `ops-worker` o servicio dedicado — decidir en planning según carga esperada.

### Slice 4 — Channel resolution

- `src/lib/nexa/push/channel-resolver.ts`:
  - Input: enrichment (domain, scope_type, scope_id, severity).
  - Output: lista de `PushChannel` activos que aplican.
  - Orden de especificidad: canal scoped específico > canal scoped global del dominio > canal `all`.
  - Un enrichment puede empujarse a múltiples canales.

### Slice 5 — Admin UI

- Surface en Admin Center → Nexa → Push Channels.
- CRUD de canales: crear canal, editar, desactivar, listar dispatches recientes.
- Input de webhook URL → se guarda en Secret Manager, se referencia via `*_SECRET_REF`.
- Test button: "Enviar mensaje de prueba a este canal".
- Guard: solo `efeonce_admin` + entitlement `admin.integrations.manage`.

### Slice 6 — Observability

- Dispatches fallidos generan notification in-app a ops admins.
- Ops Health dashboard expone: total dispatches últimas 24h, % success, canales con fallos recientes.
- Logs estructurados en Cloud Logging.

### Slice 7 — Rate limit y circuit breaker

- Rate limit por canal via consulta a `nexa_push_dispatches` últimos 60 minutos.
- Si >N failures consecutivos en un canal, marcar `active = false` temporalmente (circuit breaker).
- Admin recibe notification para re-habilitar manualmente.

## Out of Scope

- Push de severity `warning` o `info` (solo critical).
- Canales vía email individual (digest ya cubre).
- Push a canales de cliente externo (el cliente consume vía Client Portal Pulse, TASK-432).
- Respuesta interactiva al push (Slack Interactive Components, Teams actions). Follow-on si aparece demanda.
- Threading de push relacionados (agregación inteligente). Follow-on.

## Acceptance Criteria

- [ ] Migraciones aplicadas, tipos regenerados, `pg:doctor` healthy.
- [ ] Dispatcher envía correctamente un enrichment critical a Slack y a Teams en entornos de prueba.
- [ ] Dedupe funciona: mismo `signal_id` no se empuja dos veces al mismo canal aunque el enrichment se regenere.
- [ ] Rate limit funciona: N+1 pushes en una hora al mismo canal registran `rate_limited` no `sent`.
- [ ] Admin UI permite crear/editar/desactivar canales y enviar test.
- [ ] Secret Manager integration sin leak de webhook URLs en logs.
- [ ] Circuit breaker marca canales con failures repetidos como inactivos.
- [ ] `pnpm build && pnpm lint && npx tsc --noEmit && pnpm test` pasan.
- [ ] Verificación end-to-end: simular signal critical → confirmar mensaje en Slack/Teams de prueba.

## Verification

- Tests unitarios de dispatcher, formatter, channel resolver.
- Test de integración: dedupe + rate limit.
- Verificación manual en staging con webhook de Slack/Teams de prueba.

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con capítulo push distribution.
- [ ] Actualizar `GREENHOUSE_NEXA_EXPANSION_V1.md` con estado Eje 3.
- [ ] Actualizar `GREENHOUSE_EVENT_CATALOG_V1.md` si se introdujeron nuevos eventos (no debería).
- [ ] Registrar en `Handoff.md` y `changelog.md`.

## Open Questions

- ¿El dispatcher vive en `ops-worker` existente o en servicio dedicado? Si la carga esperada es <1K pushes/día, reusar `ops-worker`.
- ¿Push a un canal Slack de team vs a un usuario individual vía DM? Primera iteración: solo canales; DMs requieren bot con permisos más amplios y no aporta valor inicial.
- ¿Cómo se maneja el silencio de horario (no pushear críticos a las 3am)? Recomendación: push siempre (críticos son críticos), pero ofrecer configuración de quiet hours en v2.
- ¿Si `client_visible=true` en un enrichment, se puede configurar canal de cliente externo? Recomendación: **no** en v1 — el cliente consume vía Client Portal, no vía Slack compartido. Cambio de audiencia requiere decisión de producto separada.
