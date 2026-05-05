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
- Status real: `Diseno (Delta v0.1 aplicado tras auditoría arch-architect 2026-05-05)`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-692` (cutover con projection canónica activa)
- Branch: `task/TASK-693-notification-hub-bidirectional-ui`

## Delta v0.1 (2026-05-05) — pre-flight corrections post-auditoría arch-architect

Hereda Deltas de TASK-690/691/692. Adicionalmente para bidireccional + UI + mentions:

### S13 — Resolver namespace collision de `notification_preferences`

Heredado de TASK-690 D6 (S4): la tabla legacy `greenhouse_notifications.notification_preferences` (TASK-128 era) ya existe con shape `(preference_id, user_id, category, email_enabled, in_app_enabled, muted_until, updated_at)`. La nueva del Hub (Delta TASK-690 recomienda renombrar a `greenhouse_core.notification_hub_preferences`) tiene shape distinta (per channel + quiet hours + min_severity).

**Fix UI**: el wizard `/settings/notifications` lee/escribe `greenhouse_core.notification_hub_preferences` (nueva, canónica). Migration path para migrar legacy preferences: helper `migrateLegacyPreferencesToHub(userId)` opcional, ejecutable per-user al primer save desde el wizard nuevo. Sin esto, los users con preferences viejas pierden config al cambiar a UI nueva.

### S14 — `aadObjectId` rotation handling (Open Q nuevo)

Microsoft Entra Object IDs **pueden rotar** raramente (re-creación del usuario, soft-delete + restore, tenant migration). El adapter `teams-channel.ts` / `teams-dm.ts` dropea silenciosamente cuando mention no es miembro. **Riesgo no tratado**: si rotation real ocurre, los mentions quedan apuntando a IDs viejos sin reconciliation.

**Fix V1**: declarar reliability signal `notifications.hub.stale_member_aadid` (kind=`drift`, severity=`warning` si > 0). Reader query:

```sql
SELECT m.member_id, m.azure_oid AS persisted_aadid, ...
FROM greenhouse_core.members m
JOIN greenhouse_commercial.engagement_audit_log eal
  ON eal.payload_json->>'recipientMemberId' = m.member_id
WHERE eal.event_kind = 'progress_snapshot_recorded'
  AND eal.payload_json->>'mention_dropped_not_in_team' = 'true'
  AND eal.occurred_at > NOW() - INTERVAL '7 days';
```

Si emite warning, runbook manual: re-fetch ObjectID via Graph API + update `members.azure_oid`. **Fix V2**: reconciliation cron automático (out of scope V1, declarar Open Q).

### S15 — Action.Submit handler `finance.expense.approve` necesita capability check

Acceptance criteria dice "actualiza `expense.status='approved'` + intent". **Falta**: el handler debe validar que `principal.userId` tiene capability `finance.expense.approve` ANTES de mutar. Sin esto, cualquier user con acceso al chat de Teams puede aprobar expenses ajenos. **Fix**: declarar en acceptance criteria explícito: handler invoca `assertCapability(principal, 'finance.expense.approve')` antes del UPDATE. Si fail → audit log + reject card update.

### S16 — Test E2E mentions con membership real

Smoke real en staging "emitir un `finance.expense.approval_pending` que mencione al approver real" debe verificar **3 escenarios**:
1. Approver es miembro del team → mention OK + push notification recibido.
2. Approver NO es miembro del team → mention dropped silenciosamente + log `mention_dropped_not_in_team` + delivery sigue success.
3. `aadObjectId` stale (simulado) → mention dropped + reliability signal `stale_member_aadid` emite.

Sin los 3 escenarios, el test E2E no cubre el path real de Microsoft Teams.

### Score 4-pilar post-Delta v0.1 (estimado)

- v0.0 (original): 7.625/10 (Safety 8, Robustness 7.5, Resilience 7.5, Scalability 7.5).
- v0.1 (post-Delta): **8.5/10** estimado (Safety 9, Robustness 8.5, Resilience 8.5, Scalability 8).

Mejoras: capability check anti-spoofing en handler (+Safety), `aadObjectId` rotation con signal (+Resilience), namespace collision resuelta (+Robustness), test E2E cubre 3 escenarios reales (+Robustness).

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
