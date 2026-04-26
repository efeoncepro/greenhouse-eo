# TASK-693 — Notification Hub Bidireccional + UI Preferences + Mentions

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
- Blocked by: `TASK-692` (cutover con projection canónica activa)
- Branch: `task/TASK-693-notification-hub-bidirectional-ui`

## Summary

Cierre del loop end-to-end del Notification Hub: (1) los Action.Submit handlers del bot Teams (TASK-671) actualizan `notification_intents.status='acknowledged'` cuando el usuario clickea una acción, sincronizando in-app + email + Teams; (2) UI de preferencias en `/settings/notifications` para que cada persona configure su mix de canales por categoría; (3) templates unificados per-evento con las 4 variantes (in-app/email/teams_card/teams_dm); (4) **mentions y notificaciones push** vía `<at>` tags + `entities[]` en el activity body para approvals que requieren acción inmediata.

## Why This Task Exists

TASK-692 deja el hub canónico pero mudo: solo dispatcha. El valor para usuario final aparece cuando:

- El click en "Aprobar" desde Teams cierra el loop sin tener que abrir el portal.
- Cada persona puede silenciar `delivery.daily_pulse.*` sin romper `finance.*`.
- Los approvals llegan con mention al approver para garantizar push notification (sin mention, un card en canal no pinguea — ver §13 de la spec).
- El mismo evento renderiza con copy adecuado al canal (un email de approval es más largo que un card de Teams).

## Goal

### Acceptance — Bidirectional handlers

- [ ] `src/lib/teams-bot/handlers/notification-mark-read.ts` refactor: el handler ya no es no-op; llama `acknowledgeIntent(intentId, 'teams_action_submit', principal.userId)` con guard `recipient_member_id = principal.memberId` (defensa anti-spoofing).
- [ ] `handlers/finance-expense-approve.ts` (NUEVO) — actualiza `expense.status='approved'` + actualiza intent + emite `finance.expense.approved` al outbox para que el approval llegue a quien corresponde como notificación.
- [ ] `handlers/ops-alert-snooze.ts` refactor: ya no es no-op; persiste snooze en tabla nueva `notification_snoozes` que el router consulta antes de dispatchar.
- [ ] La bell del portal se actualiza en tiempo real (≤ 5s) cuando el intent se acknowledge desde Teams.

### Acceptance — UI Preferences

- [ ] Página `/settings/notifications` con Vuexy primitives:
  - Toggle global por canal (in-app / email / teams_dm / teams_channel).
  - Override granular por categoría de evento (finance / ops / delivery / hr).
  - Quiet hours configurable con timezone propio.
  - `min_severity` por canal.
- [ ] API route `PATCH /api/me/notification-preferences` con auth via `requireTenantContext`.
- [ ] Tests E2E: cambio de preference se refleja en el siguiente intent dispatchado.
- [ ] Doc funcional `docs/documentation/people/preferencias-notificaciones.md` (lenguaje simple).

### Acceptance — Templating unificado

- [ ] Templates registrados para los 6 event_types prioritarios:
  - `finance.expense.approval_pending`
  - `finance.expense.approved`
  - `ops.alert.raised`
  - `delivery.daily_pulse.materialized`
  - `payroll.period.calculated`
  - `notification.assigned` (genérico para Sentry assigns, Notion task assigns, etc.)
- [ ] Cada template entrega 4 variantes coherentes en wording (greenhouse-ux-writing).

### Acceptance — Mentions y notificaciones push (§13 spec)

- [ ] `NotificationTemplate.variants.teams_card` y `teams_dm` retornan `TeamsTemplateOutput { card, mentions, textTemplate, alsoActivityFeed }`.
- [ ] Adapter `teams-channel.ts` y `teams-dm.ts` construyen el activity body con `text` + `entities[]`:
  - `mentioned.id` con prefijo `"29:"` obligatorio.
  - `text` y `<at>` tag coinciden exactamente.
  - `textFormat: "xml"`.
- [ ] Validación de membership: si el aadObjectId del mention no es miembro del team, el adapter dropea el mention y loggea `mention_dropped_not_in_team` en `notification_deliveries.adapter_response_json`. No falla el send.
- [ ] Channel-wide mention solo si `severity ∈ {warning, critical}` y la preference `disable_channel_wide_mentions` no está activa para ese channel_code.
- [ ] Tests: validar `entities[].mentioned.id` empieza con `29:`, mismatch entre `text` y `<at>` tag dispara warning, severity=info no agrega channel-wide mention.
- [ ] Smoke real en staging: emitir un `finance.expense.approval_pending` que mencione al approver real → verificar que el approver recibe push notification de Teams.

## Out of Scope

- Push notifications mobile/web (sin app/PWA del lado de Greenhouse).
- Aggregation / digest (1 email diario con todos los approvals).
- AI-assisted prioritization.
- Multi-tenant externo (clientes Globe).
