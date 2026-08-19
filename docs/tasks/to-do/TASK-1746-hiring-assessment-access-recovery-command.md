# TASK-1746 — Command canónico para recuperar acceso a un test de candidato

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-011`
- Status real: `Diseño — ADR propuesto`
- Rank: `TBD`
- Domain: `hr|identity|delivery`
- Blocked by: `ADR de recuperación aceptado y sign-off Privacy/Security del canal secure_link`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-160`

## Summary

Crear una capability gobernada que recupere acceso a un candidate test ya asignado: reenvía por email o genera un enlace temporal de copia única para un canal manual, siempre rotando el token, auditando el acto y sin duplicar el assessment.

## Why This Task Exists

El token original no es recuperable por diseño y el UI legacy solo mostró un enlace efímero. El consumer de correo rota tokens y deduplica el evento de asignación, por lo que ni un replay ni una segunda asignación son recuperación válida. La operación necesita su propio command, idempotencia, acceso fino y evidencia.

## Goal

- Restaurar acceso de una candidata sin crear un segundo test ni cambiar su candidatura.
- Mantener el token crudo fuera de persistencia/auditoría/eventos y revelar un enlace manual una sola vez.
- Ofrecer un contrato reusable para UI, CLI y futuros consumidores gobernados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ACCESS_RECOVERY_AND_EMAIL_DELIVERY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Recovery rota un token nuevo con lock transaccional; nunca devuelve ni intenta descifrar el anterior.
- Solo `candidate_test` en `assigned|sent` es elegible; iniciado, entregado, expirado o cancelado falla con código canónico.
- Un email recovery usa idempotencia nueva y no reemite `hiring.assessment.assigned`.

## Normative Docs

- `docs/issues/open/ISSUE-160-resend-webhook-delivery-lifecycle-never-operational.md`
- `docs/tasks/in-progress/TASK-1719-hiring-opening-assessment-policy-stage-triggered-assignment.md`
- `docs/tasks/complete/TASK-1689-hiring-lifecycle-transactional-emails.md`

## Dependencies & Impact

### Depends on

- `src/lib/hiring/assessment/instances.ts`
- `src/lib/hiring/notifications/send.ts`
- `src/lib/email/delivery.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`

### Blocks / Impacts

- TASK-1747 is the Application 360 consumer.
- TASK-1745 supplies provider-confirmed state but is not required for a recovery command to safely dispatch a new email.
- TASK-1719 remains owner of policy assignment and its command; this task does not fork assignment policy.

### Files owned

- `src/lib/hiring/assessment/access-recovery/**` (+ tests)
- `src/lib/hiring/assessment/instances.ts` only for extracted shared token primitives
- `src/lib/hiring/notifications/send.ts`
- `src/app/api/hiring/assessments/[assessmentId]/access-recovery/route.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/sync/event-catalog.ts`
- additive migration under `migrations/` if a dedicated recovery audit ledger is required

## Current Repo State

### Already exists

- `reissueCandidateTestTokenForEmail` atomically rotates a token for `assigned|sent` tests.
- Canonical `sendEmail` persists delivery attempts and the lifecycle email consumer deduplicates assignment events.
- Application 360 and the legacy assignment route do not provide a resend/recovery command.

### Gap

- No business capability represents recovery, source event, actor/reason, channel, rate limit or one-time secure-link reveal.
- Generic delivery payload handling must be reviewed so token-bearing context is not retained durably.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/hiring/assessment/**`, Product API route and existing notifications worker path.
- Future candidate home: `domain-package`
- Boundary: `recoverCandidateTestAccess` command plus browser-safe recovery DTO.
- Server/browser split: token generation/hash, DB, email and audit are server-only; browser receives a link only for the explicit one-time secure-link response.
- Build impact: `none` — reuse existing crypto/email stack.
- Extraction blocker: one DB transaction binds assessment state, token hash and audit; email dispatch uses the established provider adapter.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_hiring.hiring_assessment` token/state plus append-only recovery audit.
- Consumidores afectados: `UI/API/worker/CLI`
- Runtime target: `production|worker`

### Contract surface

- Contrato existente a respetar: `assignCandidateTest`, `reissueCandidateTestTokenForEmail`, `sendEmail`, TASK-1719 assignment command.
- Contrato nuevo o modificado: `recoverCandidateTestAccess` and a thin Product API adapter; recovery audit/event/DTO.
- Backward compatibility: `compatible` — no old token is readable and no existing test is duplicated.
- Full API parity: UI and future governed-action consumers invoke the same command; no recovery logic lives in React.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_assessment`, `greenhouse_notifications.email_deliveries`, recovery audit/event store introduced only if needed.
- Invariantes que no se pueden romper:
  - Exactly one active token per assessment; every successful recovery invalidates its predecessor atomically.
  - Raw token/link is absent from Postgres audit, outbox, logs and durable delivery payloads.
  - Email and secure-link are mutually exclusive actions per recovery request.
- Tenant/space boundary: authenticated actor plus assessment→application→opening lineage; no cross-application recovery.
- Idempotency/concurrency: row lock, recovery request idempotency key, canonical conflict responses and rate-limit per assessment/channel.
- Audit/outbox/history: IDs-only recovery event/audit with actor, reason code, channel and outcome; delivery is separately recorded.

### Migration, backfill and rollout

- Migration posture: `additive` only for durable recovery audit/idempotency if existing audit cannot meet the contract.
- Default state: `disabled` until ADR acceptance, capability grants and abuse tests pass.
- Backfill plan: none; existing tests are recovered only by an explicit new operator action.
- Rollback path: disable capability/route, retain audit; no token rollback after a deliberate recovery.
- External coordination: Privacy/Security sign-off for secure-link TTL and operator policy; Resend delivery uses TASK-1745 contracts.

### Security and access

- Auth/access gate: dedicated `hiring.assessment.recover_access` capability, role-only grants and authenticated actor.
- Sensitive data posture: bearer token plus candidate contact context; no raw token persistence or logs.
- Error contract: sanitized `assessment_recovery_*` errors and no assessment-existence oracle beyond existing Hiring authorization.
- Abuse/rate-limit posture: per-assessment recovery cooldown, concurrency lock, one-time reveal and audit.

### Runtime evidence

- Local checks: token rotation/hash, status guard, concurrent recovery, replay/idempotency, permission and no-leak tests.
- DB/runtime checks: audit/event and one-active-token assertion on PG.
- Integration checks: email recovery against a consented inbox and one-time manual-link smoke.
- Reliability signals/logs: recovery failure/rate-limit and unconfirmed delivery signals.
- Production verification sequence: capability OFF → staging smoke → limited authorized cohort → production smoke → observe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato, capability y recovery audit

- Aceptar el ADR, definir reason/channel/TTL policy and register the dedicated capability/grants.
- Implementar command, error contract, idempotency, lock and IDs-only audit/outbox.

### Slice 2 — Canal email y enlace temporal

- Email: delivery source distinct from assignment event, token created only in the recovery path and no duplicate dispatch.
- Secure link: one-time browser-safe response with bounded expiry, no durable raw token and no hidden UI fallback.

### Slice 3 — Guardrails y evidencia

- Rate limit, conflict handling, secret/token redaction and runtime tests.
- Operator runbook for candidate recovery and a limited production smoke.

## Detailed Spec

- Definir `recoverCandidateTestAccess({ assessmentId, channel, reasonCode, idempotencyKey, actorUserId })` como command server-side bajo lock transaccional; el actor requiere `hiring.assessment.recover_access:execute`.
- El command rechaza assessment inexistente, ajeno a la candidatura, no `candidate_test`, o en estado distinto de `assigned|sent`, con códigos canónicos y sin revelar información sensible.
- En éxito crea exactamente un token nuevo y su hash, invalida el anterior atómicamente y registra un evento/audit IDs-only con actor, razón, canal, resultado y estado previo.
- `email` crea un nuevo source event/idempotency key y envía mediante la capa canónica sin reutilizar `hiring.assessment.assigned`; el resultado comunica despacho aceptado, no entrega garantizada.
- `secure_link` revela una URL bearer temporal solo en la respuesta de esa solicitud y nunca en almacenamiento durable, logs, outbox, toast, query string o analítica. No se permite combinar canales en una misma recuperación.
- Se aplican límites por assessment/canal y la fuente de delivery redacts/encripta cualquier contexto que podría contener la URL antes de persistirlo.

## Out of Scope

- Direct WhatsApp integration or storage of chat content.
- Automatic recovery/resend without a human act.
- Reassigning/cancelling a test as a substitute for recovery.
- Candidate ranking, stage movement or AI decision.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- ADR acceptance and capability definition MUST precede token-emitting code.
- Slice 1 → Slice 2 → Slice 3; TASK-1747 starts only after the API/DTO contract is stable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Token leaks via audit/log | security | medium | server-only token, redaction tests, IDs-only events | token-leak test/capture |
| Duplicate or conflicting recovery | assessment | medium | lock + idempotency + cooldown | recovery_conflict |
| Unauthorized bearer-link sharing | access | medium | fine capability, one-time reveal, bounded TTL/audit | recovery_access_denied |

### Feature flags / cutover

Capability grant and route exposure stay disabled until ADR acceptance and staging evidence. Revert by revoking capability/route exposure; issued tokens retain their documented expiry.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | disable capability/route | <5 min | sí |
| 2 | disable channel exposure; do not revive invalidated token | <5 min | parcial |
| 3 | revert signal/runbook updates | <5 min | sí |

### Production verification sequence

1. Verify command and no-leak tests locally and against PG.
2. Enable only for authorized test operator in staging; execute email and one-time link smokes.
3. Review delivery/audit evidence, then enable production for a named limited cohort.
4. Monitor recovery and delivery signals for seven days.

### Out-of-band coordination required

Privacy/Security approval of manual bearer-link TTL and retention; consented candidate/test inbox for smoke.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `recoverCandidateTestAccess` is the only write primitive for recovery and is gated by a dedicated capability/grant.
- [ ] Recovery is allowed only for unstarted candidate tests, rotates exactly one token atomically and never creates a second assessment.
- [ ] Email resend has a new idempotency source; a secure link is returned once only and both preserve no raw token in durable stores/logs/events.
- [ ] Recovery has actor, reason code, channel, result and rate-limit evidence without candidate-sensitive narrative.
- [ ] Staging and production smokes prove email recovery and manual-link recovery against a consented account.
- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.
- [ ] Lógica en el primitive, no en la UI; capability, grants and programmatic path ship together.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- tests focales assessment/notifications/entitlements
- PG transaction smoke and secret-redaction assertions
- consented email + secure-link runtime smoke

## Closing Protocol

- [ ] Lifecycle, README and registry reflect reality.
- [ ] ADR status, architecture, operator manual and copy contracts are synchronized.
- [ ] Handoff/changelog describe actual rollout and privacy sign-off.
- [ ] `pnpm docs:closure-check` and `pnpm docs:context-check:strict` pass last.

## Follow-ups

- TASK-1747.
