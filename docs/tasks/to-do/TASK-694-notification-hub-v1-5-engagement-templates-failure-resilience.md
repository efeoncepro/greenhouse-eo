# TASK-694 — Notification Hub V1.5 (Engagement Metrics + Template Schema + Timezone + Ack Idempotent + Failure Matrix)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio-Alto`
- Effort: `Medio-Alto`
- Type: `implementation`
- Status real: `Diseno (creada 2026-05-05 como follow-up post Delta v0.2 de TASK-690)`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-693` (Hub end-to-end con bidireccional + UI activos en Production por al menos 7 días sin rollback)
- Branch: `task/TASK-694-notification-hub-v1-5-engagement-templates-failure-resilience`

## Summary

V1.5 follow-up del Notification Hub que cierra 5 gaps de **calidad operativa** detectados en auditoría arch-architect 2026-05-05. Issues aditivos (no rompen V1, son extensiones): engagement metrics reales (no solo delivery), template schema validation con zod + Adaptive Card 1.5 lint, timezone handling robusto para quiet hours, ack idempotente multi-canal, failure matrix downstream con tests chaos-engineering-lite.

## Why This Task Exists

V1 (TASK-690→693) cierra el Notification Hub canónico end-to-end. Pero la auditoría profunda detectó 5 issues de **calidad operativa real** que NO bloquean V1 pero degradan la experiencia y confiabilidad si no se cierran:

- V1 mide delivery (¿llegó al transport?) pero NO engagement (¿el humano lo vio/actuó?). Sin esto, un template spam-y se ve idéntico a uno crítico útil.
- V1 acepta cualquier shape de template (registry pattern libre). Un Adaptive Card mal formado pasa CI pero falla en runtime de Teams → silent failures.
- V1 declara `quiet_hours configurable con timezone propio` pero no especifica handling de DST + cross-timezone (user viaja, system en UTC).
- V1 acknowledge funciona desde Teams. Pero si user clickea simultáneamente en email + Teams (race), comportamiento indefinido.
- V1 dispatcha a 4 adapters pero NO declara qué pasa si 1 falla durante un dispatch (parallel-fail, fallback chain, partial delivery).

Cada uno es agregable después de V1 sin migration costosa. Son refinamientos.

## Goal

- Engagement tracking real persistido en `notification_intents.first_viewed_at` + `acknowledged_via_channel` con reliability signal `engagement_rate_drop`.
- Template registration valida shape via zod schemas + `adaptive-cards-templating` validator. Lint rule custom `greenhouse/no-untyped-notification-template` modo `error`.
- Timezone handling canónico con `date-fns-tz` + tests DST forward/backward + default `America/Santiago`.
- `acknowledgeIntent` idempotente multi-canal: primer ack gana, siguientes loggean pero no fallan. Test concurrency 2 acks simultáneos.
- Failure matrix table en spec §6 + chaos tests con `nock` mocks que fallan cada adapter por separado.

## Architecture Alignment

Hereda de:

- `docs/architecture/GREENHOUSE_NOTIFICATION_HUB_V1.md` (post-V1 release).
- TASK-690→693 cerradas en producción.

Patrones canónicos reusados:

- TASK-672 — reliability signal pattern (engagement metrics como signal canónico).
- TASK-768 — lint rule custom anti-patrón (precedent: `no-untokenized-expense-type-for-analytics`).
- TASK-721 — schema validation con zod (precedent: asset uploader).
- TASK-742 — defense in depth (failure matrix + chaos tests).

Reglas obligatorias:

- **NO** cambiar el contract de `recordIntent` / `recordDelivery` / `acknowledgeIntent` (backward compat con V1).
- Engagement tracking es **best-effort opt-in** — failure de tracking NO falla el delivery.
- Template schema validation es **gradual**: templates V1 existentes se migran 1 por 1 con CI gate progresivo.
- Failure matrix tests usan mocks aislados (`nock` o equivalente) — cero llamadas reales a Microsoft / SendGrid.

## Slice Scope

### Slice 1 — Engagement metrics

DDL adicional:

```sql
ALTER TABLE greenhouse_core.notification_intents
  ADD COLUMN first_viewed_at TIMESTAMPTZ,
  ADD COLUMN first_viewed_via TEXT CHECK (first_viewed_via IN ('in_app','email','teams_card','teams_dm','api')),
  ADD COLUMN engagement_action_at TIMESTAMPTZ,
  ADD COLUMN engagement_action_kind TEXT;

CREATE INDEX notification_intents_engagement_idx
  ON greenhouse_core.notification_intents (event_type, first_viewed_at DESC)
  WHERE first_viewed_at IS NOT NULL;
```

Helpers TS:

- `recordFirstView(intentId, channel)` — UPDATE idempotent (solo si `first_viewed_at IS NULL`).
- `recordEngagementAction(intentId, kind, channel)` — UPDATE per ack/CTA click.

Touchpoints:

- Bell del portal: GET endpoint marca first_viewed_at al render.
- Email: pixel tracking (opcional, declarar Open Q de privacy compliance).
- Teams Action.Submit: handler ya existe, agregar `recordEngagementAction`.

Reliability signal nueva: `notifications.hub.engagement_rate_drop` (kind=drift, severity=warning si engagement_rate < 30% trailing 7 días per event_type).

### Slice 2 — Template schema validation

```ts
// src/lib/notifications/hub/template-schema.ts (NUEVO)
import { z } from 'zod'

export const NotificationTemplateInAppSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
  cta_url: z.string().url().optional(),
  severity: z.enum(['info','warning','critical']),
  icon: z.string().optional(),
});

export const NotificationTemplateEmailSchema = z.object({
  subject: z.string().min(1).max(200),
  body_mjml: z.string().min(1),
  body_text: z.string().min(1),  // plain-text fallback obligatorio
  from: z.string().email(),
});

export const NotificationTemplateTeamsCardSchema = z.object({
  card_json: z.unknown(), // validado contra Adaptive Card 1.5 schema
  // ... mentions, entities[], textTemplate
});
```

Validación contra Adaptive Card 1.5 schema:

- Importar `adaptive-cards-templating` o `adaptivecards-validator` package.
- En `registerTemplate`, ejecutar validation. Si falla → throw at boot time, NO en runtime.

Lint rule custom: `eslint-plugins/greenhouse/rules/no-untyped-notification-template.mjs` modo `error`. Detecta `registerTemplate({...})` sin schema validators aplicados.

Tests por template canónico: parsear con zod + Adaptive Card validator + snapshot test.

Migration: templates V1 existentes (1 al cierre de TASK-693) migrados al nuevo shape. CI gate: ningún template puede mergear sin validation.

### Slice 3 — Timezone handling robusto

```ts
// src/lib/notifications/hub/quiet-hours.ts (NUEVO)
import { utcToZonedTime, formatInTimeZone } from 'date-fns-tz'

export function isWithinQuietHours(
  preference: NotificationPreference,
  atUtc: Date = new Date(),
  defaultTimezone: string = 'America/Santiago',
): { withinQuiet: boolean; effectiveTimezone: string } {
  const tz = preference.timezone ?? defaultTimezone;
  const localTime = utcToZonedTime(atUtc, tz);
  // ... handle DST forward (2:30 AM no existe) + DST backward (1:30 AM dos veces)
}
```

Tests canónicos:

- DST forward Chile (octubre — 24:00 salta a 1:00 AM): quiet hours `00:00-06:00` no silencia 1:30 AM ese día.
- DST backward Chile (abril — 24:00 vuelve a 23:00): quiet hours silencia ambas instancias de 23:30.
- Cross-timezone: user declara `Europe/Madrid` quiet `22:00-08:00`, evento llega en UTC 04:00 → en Madrid es 06:00 (silencio activo).
- Default fallback: user sin timezone declarado → `America/Santiago`.

Reliability signal nueva: `notifications.hub.quiet_hours_violations` detecta dispatches a users en quiet window con severity != critical (whitelist B4 de Delta v0.2). Steady=0.

### Slice 4 — `acknowledgeIntent` idempotente multi-canal

Refactor `src/lib/notifications/hub/persistence.ts`:

```ts
acknowledgeIntent(intentId, viaChannel, memberId): Promise<{
  wasAlreadyAcknowledged: boolean;
  originalAckTime?: Date;
  originalAckChannel?: NotificationChannel;
}>
```

Implementación:

- Optimistic update: `UPDATE notification_intents SET status='acknowledged', ack_via_channel=$1, ack_by_member_id=$2, ack_at=NOW() WHERE intent_id=$3 AND status='pending' RETURNING ack_at`.
- Si N rows = 0 → ya estaba ack. Hacer SELECT y devolver `{ wasAlreadyAcknowledged: true, originalAckTime, originalAckChannel }`.
- Si N rows = 1 → primera ack, devolver `{ wasAlreadyAcknowledged: false }`.

Tests concurrency:

- 2 acks simultáneos del mismo intent desde 2 canales (Teams + email) → uno gana, otro detecta duplicate sin error.
- Race: ack arriving before delivery completed → guard `recipient_member_id = $memberId` rechaza.

Audit log: cada ack (incluyendo "ya estaba ack") emite outbox event `service.engagement.intent_acknowledged` v1 con `was_duplicate` flag.

### Slice 5 — Failure matrix downstream + chaos tests

Tabla canónica en `GREENHOUSE_NOTIFICATION_HUB_V1.md` §6:

| Adapter falla | Otros adapters | Intent status | Reactive consumer |
|---|---|---|---|
| `email` (SendGrid 503) | Continúan | `partially_delivered` | Retry email solo, max 3 |
| `teams_channel` (Microsoft 429) | Continúan | `partially_delivered` | Backoff exponencial + dead_letter |
| `teams_dm` (404 user not in tenant) | Continúan | `partially_delivered` | NO retry (deterministic fail) |
| `in_app` (Postgres lock contention) | Bloquean | `pending` | Retry tx con backoff |
| Todos fallan | N/A | `failed` | dead_letter + alert |

Helper canónico: `dispatchToAdapters(intent, decision)` con `Promise.allSettled` + per-adapter timeout 5s + circuit breaker en `email_bounce_rate > 30%`.

Chaos tests con `nock`:

- Mock SendGrid devuelve 503 → email adapter fail, otros 3 success → intent `partially_delivered`.
- Mock Bot Framework devuelve 429 → backoff verificable.
- Mock simultaneous 4-channel failure → intent `failed`, dead_letter, alert.

Reliability signal nueva: `notifications.hub.partial_delivery_rate` (kind=drift, warning si > 5% trailing 7d) — detecta degradación silenciosa.

## Acceptance Criteria

- [ ] Engagement metrics persistidos + signal `engagement_rate_drop` registrada.
- [ ] Template schema validation activa para todos los templates (gradient migration).
- [ ] Lint rule `greenhouse/no-untyped-notification-template` modo error.
- [ ] DST + cross-timezone tests verde (4 escenarios canónicos).
- [ ] Concurrency tests `acknowledgeIntent` verde (2 acks simultáneos, race conditions).
- [ ] Failure matrix table publicada en §6 de spec + 5 chaos tests verde.
- [ ] `notifications.hub.partial_delivery_rate` signal registrada.
- [ ] tsc + lint + build limpios.
- [ ] Tests `>= current + 40`.

## Verification

- `pnpm test src/lib/notifications/hub/` con todos los tests verdes.
- `pnpm staging:request POST /api/admin/notifications/test-failure-matrix` ejecuta los 5 escenarios chaos en staging y devuelve summary JSON.
- Manual: revisar `/admin/operations` muestra 4 nuevas signals bajo subsystem `notifications.hub`.

## Out of Scope

- Email pixel tracking si compliance dice no (declarar Open Q en spec).
- AI-assisted prioritization de templates.
- Cross-tenant aggregation.

## References

- TASK-690 Delta v0.2 §B1-B5 (los 5 bloqueantes V1).
- TASK-690→693 (V1 base).
- Spec `GREENHOUSE_NOTIFICATION_HUB_V1.md` post-V1.

## Open Questions

- ¿Email open tracking via pixel — privacy compliance OK con Ley 21.719 + GDPR? Decisión pre-Slice 1.
- ¿Engagement signal threshold per event_type, no global? Probable sí — eventos de approval esperan 100% engagement, daily_pulse < 50% es normal.
- ¿Timezone canonical también para weekly progress snapshots (TASK-805)? Reuso del helper en otros módulos sería útil.
