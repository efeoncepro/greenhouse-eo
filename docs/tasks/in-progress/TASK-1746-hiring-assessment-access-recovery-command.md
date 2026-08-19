# TASK-1746 — Command canónico para recuperar acceso a un test de candidato

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Status real: `Slices 1, 2A, 2B y 3A validados localmente — migración/índice sin aplicar; exchange/API y rollout pendientes`
- Rank: `TBD`
- Domain: `hr|identity|delivery`
- Blocked by: `none`
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
- `candidate_test` en `assigned|sent|in_progress` es elegible; `expired` solo cuando nunca comenzó.
  Recuperar `in_progress` no reinicia ni extiende el timer. Submitted/scored/cancelled falla con código canónico.
- Un email recovery usa idempotencia nueva y no reemite `hiring.assessment.assigned`.
- Los enlaces nuevos usan fragmento → sesión HttpOnly; ningún bearer nuevo viaja en path/query.

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
- Idempotency/concurrency: row lock, recovery request idempotency key, canonical conflict responses and rate-limit global por assessment.
- Audit/outbox/history: IDs-only recovery event/audit with actor, reason code, channel and outcome; delivery is separately recorded.

### Migration, backfill and rollout

- Migration posture: `additive` para recovery audit/idempotency, sesión y redacción de payload histórico.
- Default state: `disabled` until ADR acceptance, capability grants and abuse tests pass.
- Backfill plan: none; existing tests are recovered only by an explicit new operator action.
- Rollback path: disable capability/route, retain audit; no token rollback after a deliberate recovery.
- External coordination: Privacy/Security sign-off for secure-link TTL and operator policy; Resend delivery uses TASK-1745 contracts.

### Security and access

- Auth/access gate: capabilities separadas `hiring.assessment.recover_access_email` y
  `hiring.assessment.reveal_access_link`, role-only grants and authenticated actor.
- Sensitive data posture: bearer token plus candidate contact context; no raw token persistence or logs.
- Error contract: sanitized `assessment_recovery_*` errors and no assessment-existence oracle beyond existing Hiring authorization.
- Abuse/rate-limit posture: cooldown global 60 s, máximo 3 rotaciones/24 h por assessment,
  concurrency lock, one-time operator reveal and audit.

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

- ADR aceptado 2026-08-19 con TTL email 14d, secure-link 24h start-by, sesión iniciada separada,
  retención audit 12m y capabilities/grants separados.
- Implementar contratos y errores canónicos, capabilities role-only, idempotency schema y audit/event IDs-only.

### Slice 2 — Canal email y enlace temporal

- Implementar el command transaccional con lock/rate limit. Email: delivery source distinct from assignment event, token created only in the recovery path and no duplicate dispatch.
- Secure link: one-time browser-safe response with bounded expiry, no durable raw token and no hidden UI fallback.
- Antes del command, endurecer globalmente el transporte de emails que llevan credenciales: sobre durable
  redactado, intent atómico previo a la rotación, sin batch/retry genérico y outcome honesto del proveedor.

**Checkpoint 2026-08-19 — Slice 2B email code-complete, runtime pendiente.** El command de recuperación por
email crea intent+receipt+rotación bajo la misma transacción, conserva el deadline de un test iniciado y deja
el bearer únicamente en memoria. El receipt nace ligado al delivery canónico e inmutable; si el proveedor y
el cierre local se separan por un crash, el replay reconcilia evidencia durable sin reenviar ni rotar y
Platform Health señala el drift a los 15 minutos. El tipo `hiring_assessment_access_recovery` nace desactivado
y no tiene adapter productivo: no puede habilitarse antes del fragment exchange/sesión HttpOnly de Slice 3,
la autorización server-side y el smoke de tracking. Arquitectura, Talento y Seguridad validaron el slice sin
P0/P1/P2; 90 tests focales y los gates locales quedaron verdes. No se aplicó migración, índice ni cambio runtime.

### Slice 3 — Frontera de sesión candidata y relojes

- Implementar `/public/assessment/access` con limpieza síncrona del fragmento, exchange POST same-origin,
  sesión opaca HttpOnly vinculada a la versión/hash vigente y navegación/API posteriores sin token.
- Separar start-by del enlace, deadline de respuestas y gracia de cierre; start/save/submit revalidan estado,
  consentimiento, aplicación y reloj de DB bajo el lock canónico. Una rotación invalida sesiones anteriores.
- Mantener las rutas con token en path como compatibilidad temporal. El cutover del email inicial al
  fragmento está gateado por `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` en ops-worker, default OFF;
  recovery permanece OFF y conserva el contrato fragmentado para su activación gobernada.

**Checkpoint 2026-08-19 — Slice 3A core code-complete, runtime pendiente.** Cada credencial de assessment
tiene una versión explícita y las sesiones públicas guardan únicamente un digest opaco vinculado a esa
versión; una rotación invalida las sesiones anteriores. El dominio separa start-by, plazo de respuestas y
gracia de envío, usa reloj de base de datos bajo locks y conserva 24 horas para evaluaciones sin límite.
GET/start/save/submit y SELF-ID legacy revalidan assessment→application→candidate facet, decisión y
consentimiento en una sola transacción. El cliente proyecta `databaseNowAt` con reloj monotónico, congela
respuestas durante la gracia pero conserva revisar/enviar y usa copy tipado ES/EN para tiempo de respuesta,
gracia y no-limit. Arquitectura, Talento y Seguridad cerraron sus auditorías sin P0/P1/P2; los gates focales,
ESLint, TypeScript, migration marker y diff-check están verdes. La migración no está aplicada y el tipo de
correo permanece OFF. Faltan la página de limpieza síncrona del fragmento, el exchange/cookie HttpOnly, las
rutas token-free, el adapter Product API y los smokes PG/browser antes de cualquier activación.

**Checkpoint 2026-08-19 — Slice 3B session transport code-complete, rollout pendiente.** La página de acceso
elimina el fragmento antes de fetch/render, el exchange same-origin entrega una cookie `__Host-` HttpOnly y
las páginas/API posteriores derivan la evaluación sólo de esa sesión. Origin, CSP, no-store/no-referrer,
maintenance bypass acotado, trailing slash, rotación, multi-tab fence, reloj y modal accesible quedaron
cubiertos localmente; las rutas legacy siguen separadas. El email inicial no cambia por defecto: el flag
`HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` vive únicamente en ops-worker y se declara `false` en
`deploy.sh` y en el ledger. Sólo puede habilitarse después de migración+índice con readback, cuatro routes
live, Resend `click_tracking=false` verificado por API/readback y smoke del href fragmentado. No se aplicó
migración, no se desplegaron routes, no se cambió ninguna env y recovery continúa OFF.

### Slice 4 — Product API, guardrails y evidencia

- Adapter humano/capability-first por canal, rate limit, conflict handling, redacción y tests runtime/browser.
- Operator runbook, tracking gate y smokes limitados de email + enlace temporal antes de habilitar el tipo.

## Detailed Spec

- Definir `recoverCandidateTestAccess({ assessmentId, channel, reasonCode, idempotencyKey, actorUserId })` como command server-side bajo lock transaccional; el adapter exige `hiring.assessment.recover_access_email:execute` o `hiring.assessment.reveal_access_link:execute` según el canal.
- El command rechaza assessment inexistente, lineage inválida o no `candidate_test`. Permite `assigned|sent`; permite `in_progress` sólo con deadline vigente y sin extenderlo; permite `expired` sólo si nunca comenzó y venció el token. Submitted/scored/cancelled, timer agotado o application decidida fallan con códigos canónicos y sin revelar información sensible.
- En éxito crea exactamente un token nuevo y su hash, invalida el anterior atómicamente y registra un evento/audit IDs-only con actor, razón, canal, resultado y estado previo.
- `email` crea un nuevo source event/idempotency key y envía mediante la capa canónica sin reutilizar `hiring.assessment.assigned`; el resultado comunica despacho aceptado, no entrega garantizada.
- `secure_link` revela una URL bearer temporal solo en la respuesta de esa solicitud y nunca en almacenamiento durable, logs, outbox, toast, path/query string o analítica. Usa fragmento → sesión HttpOnly. No se permite combinar canales en una misma recuperación.
- Se aplican límites globales por assessment (cambiar canal no evade cooldown/cap) y la fuente de delivery redacta cualquier contexto que podría contener la URL antes de persistirlo. El bearer nunca se guarda cifrado en el ledger genérico.

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

Capability grant and route exposure stay disabled until ADR acceptance and staging evidence.
`HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` es un gate del ops-worker default OFF; ausente/OFF conserva
el link legacy y ON selecciona el fragment exchange sólo después de migración, routes live, readback de
Resend `click_tracking=false` y smoke del href. Revert by setting it OFF and redeploying the worker; issued
tokens retain their documented expiry.

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

Privacy/Security/Product approval recorded in the accepted ADR. A consented candidate/test inbox remains required for smoke.

## Progress log

- 2026-08-19 — ADR accepted after independent Architecture, Talent and Security audits. Contract
  tightened to fragment → HttpOnly session, separate capabilities, 24h manual start-by TTL,
  14d email TTL, no generic retry from token-sensitive payloads, 12m IDs-only audit retention and
  explicit in-progress recovery without timer extension.
- 2026-08-19 — Slice 1 validado localmente tras cinco ciclos de auditoría independientes de
  Arquitectura, Talento y Seguridad. Quedaron definidos: capabilities role-only separadas,
  eligibility fail-closed, receipt idempotente, audit automático append-only, locks canónicos,
  deadline inicial y diferido con reloj real, retención candidate/workforce y purga gobernada.
  Evidencia: 200 tests focales/combinados, ESLint, TypeScript, migration marker gate (586/0),
  `ops:lint --changed` y `git diff --check`. La migración no se aplicó; requiere command y smokes PG.
- 2026-08-19 — Slice 2A, transporte token-sensitive, validado localmente por Arquitectura, Talento y
  Seguridad sin P0/P1/P2. La clasificación es global para reset, invitación, verificación, magic link,
  test de candidato y verificación de Talent Pool. Los dos flows que rotan credenciales reservan un
  intent durable redactado y emiten la credencial dentro de la misma transacción; sólo el ganador llama
  al proveedor después del commit. Replays, carreras, kill switch, consentimiento concurrente, errores
  explícitos de Resend y aceptación incierta quedan fail-closed u honestamente marcados, sin retry ciego.
  Los intents `pending` envejecidos alimentan una señal global y exigen recuperación explícita.
  Evidencia: 63 tests focales, ESLint, TypeScript, migration marker gate y `git diff --check` verdes.
  El índice único no está aplicado: `scripts/operations/task-1746-create-token-intent-index.sql` debe
  ejecutarse y conservar readback `unique/valid/ready` verde antes de desplegar estos writers.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `recoverCandidateTestAccess` is the only write primitive for recovery and each channel is gated by its dedicated capability/grant.
- [ ] Recovery covers assigned/sent, a still-valid in-progress session without timer extension, and token-expired-before-start; it rotates exactly one token atomically and never creates a second assessment.
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
