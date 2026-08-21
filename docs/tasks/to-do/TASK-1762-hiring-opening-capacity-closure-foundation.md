# TASK-1762 — Hiring Opening Capacity Closure and Candidate Disposition Foundation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration|command|reader|sync`
- Epic: `EPIC-011`
- Status real: `Diseño formalizado; ADR Proposed; implementación y rollout inexistentes`
- Rank: `TBD`
- Domain: `hr|data|ops`
- Blocked by: `aceptación de GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea la fuente de verdad de cupos por vacante y el cierre durable de una cohorte. El operador obtiene un preview,
confirma el efecto y un worker rechaza cada candidatura restante mediante el command canónico, emitiendo el email
empático correcto sin duplicados y sin inventar consentimiento de Banco de Talentos.

## Why This Task Exists

`TASK-1689` posee el correo individual y `TASK-1721` excluye deliberadamente capacity/opening closure. Hoy no hay
cupos declarados, run de cierre, confirmación, recuperación parcial ni causa que distinga rechazo directo de vacante
completada. Inferirlo desde `hiring_opening.status` o ejecutar un batch SQL rompería los boundaries de Hiring.

## Goal

- Modelar capacidad sin mezclarla con publicación ni persistir un contador derivado.
- Ejecutar `preview → confirm → run` con cohorte exacta, idempotencia, audit, outbox y recovery.
- Reusar la decisión/email de `TASK-1689` con copy personalizado y variante de consentimiento verdadera.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Selección, cierre de publicación y capacidad llena son hechos distintos.
- No hay rechazo masivo ni email externo sin preview fresco y confirmación humana.
- Cada aplicación cambia mediante el command canónico y conserva historia de supersede.
- `data_origin` nunca gatea comunicaciones; consentimiento sí gobierna la promesa de contacto futuro.

## Normative Docs

- `docs/tasks/complete/TASK-1689-hiring-lifecycle-transactional-emails.md`
- `docs/tasks/to-do/TASK-1721-governed-hiring-selection-journey-orchestrator.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`
- `docs/context/05_voz-tono-estilo.md`

## Dependencies & Impact

### Depends on

- `src/lib/hiring/decide.ts`, outbox/projection y email log existentes.
- `greenhouse_hiring.talent_pool_membership` y su policy vigente de consentimiento futuro.

### Blocks / Impacts

- Bloquea `TASK-1763`.
- Impacta `TASK-1721` como next action observable, sin absorber su saga de selección.
- Extiende el consumer cerrado de `TASK-1689`; no reabre esa task histórica.

### Files owned

- `src/lib/hiring/opening-capacity/**` *(nuevo)*
- `src/lib/hiring/decide.ts` y contratos/eventos de decisión, sólo en la causa allowlisted
- `src/lib/hiring/notifications/**`
- `src/emails/HiringDecisionEmail.tsx`
- `services/ops-worker` en el registro/caller del reconciler
- `migrations/*task-1762*hiring*capacity*.sql`
- reliability, capabilities, flags y docs de Hiring afectados

## Current Repo State

### Already exists

- Decisión atómica con lock, idempotency key, historia y `hiring.application.decided`.
- Email `hiring_decision_rejected` con anti-stale, dedupe y kill-switch independiente.
- Banco de Talentos con consentimiento futuro explícito, vigente y reversible.

### Gap

- No existe capacidad por opening ni cierre de cohorte.
- El recipient context no resuelve causa de decisión ni consentimiento vigente.
- No hay ledger/run por item, recovery parcial o signal de cierre atascado.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/hiring`, Vercel adapters y ops-worker compartido
- Future candidate home: `domain-package`
- Boundary: `previewHiringOpeningCapacityClosure`, `confirmHiringOpeningCapacityClosure`, status reader y reconciler; todos los consumers llaman estos primitives
- Server/browser split: DB, locks, PII, consent policy y worker son server-only; DTO preview/status es browser-safe y allowlisted
- Build impact: `none; sin SDK ni filesystem input nuevo`
- Extraction blocker: `transacciones PG, decision command, outbox, email log y auth/capabilities compartidas`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration|command|reader|sync`
- Source of truth afectado: `hiring opening capacity + application decision history + closure run ledger`
- Consumidores afectados: `Hiring Desk, Product API/MCP futuro, ops-worker, notifications, Platform Health`
- Runtime target: `local|staging|production|worker`

### Contract surface

- Contrato existente a respetar: `decideHiringApplication`, `hiring.application.decided`, email log y Talent Pool consent policy
- Contrato nuevo o modificado: capacity policy; preview/confirm/status; closure run/items; cause `capacity_filled`
- Backward compatibility: `gated`; openings sin capacity permanecen `unmanaged`
- Full API parity: UI/API/Nexa/MCP futuros consumen los mismos readers/commands; ningún adapter calcula cohorte o escribe tablas

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_opening_capacity`, `hiring_opening_closure_run`, `hiring_opening_closure_run_item`, `hiring_application` sólo vía command e historia existente
- Invariantes que no se pueden romper:
  - `target_seats > 0`; ausencia no se interpreta como uno.
  - Cupos ocupados se derivan de decisiones vigentes `selected`; no existe contador paralelo.
  - Una opening tiene como máximo un run vigente por versión/digest y cada item una terminalidad observable.
  - `selected|rejected|withdrawn` quedan fuera; `backup_selected|on_hold` requieren inclusión explícita.
  - Otras openings de la misma persona nunca cambian.
- Write-target allowlist: registrar las tres tablas nuevas en `src/lib/hiring/boundary-domain.test.ts` con justificación en el mismo PR
- Tenant/space boundary: opening/application IDs se resuelven server-side bajo capability Hiring; browser no aporta tenant ni cohorte
- Idempotency/concurrency: digest/version + idempotency key de confirmación; lock/CAS del opening; item key `runId+applicationId`; delivery at-least-once con dedupe
- Audit/outbox/history: run/items y decision history auditables; payloads sólo IDs, causa y contadores, sin PII

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `flags OFF`; openings existentes quedan unmanaged, sin backfill inferido
- Backfill plan: `none`; configuración manual explícita por opening, luego canary allowlisted
- Rollback path: flags OFF detienen nuevos confirms/reconciler; items ya decididos no se revierten; recovery reanuda pendientes y correo se pausa por kill-switch
- External coordination: aprobación Talent/Privacidad del copy y consentimiento; Operations para worker/flags/canary

### Security and access

- Auth/access gate: capabilities granulares `hiring.opening.capacity.read|confirm`; actor humano obligatorio en confirm
- Sensitive data posture: PII sólo al re-leer recipient; no viaja en preview event, logs ni signals
- Error contract: `hiring_opening_capacity_unmanaged`, `hiring_opening_capacity_not_filled`, `hiring_opening_closure_preview_stale`, `hiring_opening_closure_conflict`, `hiring_opening_closure_partial_failure`
- Abuse/rate-limit posture: cohort cap configurable, worker por lotes, retry budget, circuit breaker y kill-switch de correo

### Runtime evidence

- Local checks: state machine, cohort policy, consent variants, duplicate confirm, concurrent decision, replay y PII redaction
- DB/runtime checks: constraints/uniques, lock races, run/item reconciliation y readbacks
- Integration checks: direct reject; capacity-filled con/ sin consent; backup opt-in; worker crash/resume; email dedupe
- Reliability signals/logs: `hiring.opening.capacity_closure_stuck`, `hiring.opening.capacity_closure_partial_failed`, `hiring.opening.capacity_decision_drift`, `hiring.notification.capacity_rejection_failed`
- Production verification sequence: migration → flags OFF → dry-run preview → canary allowlisted → crash/resume drill → Talent valida emails → ampliación acotada

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, access boundary and idempotency/concurrency posture are explicit.
- [ ] Las tablas nuevas están en el allowlist deliberado de writes del dominio.
- [ ] Migration, rollout y rollback son proporcionales al efecto externo irreversible.
- [ ] Runtime evidence incluye duplicate, stale, partial failure y consent variants.
- [ ] Ningún payload/log/signal expone PII ni copy candidato-facing.

## Capability Definition of Done — Full API Parity gate

- [ ] Preview/confirm/status/reconcile son primitives gobernados, no click handlers.
- [ ] Capabilities + grants reales y coverage test nacen en el mismo PR.
- [ ] Confirm exige actor, idempotency key, versión/digest fresco, audit y errores sanitizados.
- [ ] Product API/MCP se implementan o quedan como task follow-up explícita sobre el mismo contrato.
- [ ] UI, worker y notifications no duplican reglas de cohorte, capacidad ni consentimiento.

<!-- ZONE 2 — PLAN MODE: no completar al registrar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Capacity policy y preview read-only

- Migración aditiva, constraints/allowlist, reader de capacidad y preview con categorías/exclusiones/digest.
- Configurar capacidad exige capability y audit; opening sin configuración sigue sin automatización.

### Slice 2 — Confirmación y run durable

- Command confirm con revalidación bajo lock, run/items, event/audit y status reader.
- Cero cambio de aplicaciones o email dentro de la transacción de confirmación.

### Slice 3 — Reconciler por aplicación

- Worker idempotente usa `decideHiringApplication` con causa `capacity_filled`, actor/causation y supersede válido.
- Recovery de partial failures, retry budget, quarantine y signals.

### Slice 4 — Copy y comunicación consent-aware

- Personalizar rechazo directo y “vacante completada” por nombre/vacante sin revelar score ni razón interna.
- Sólo la variante con consentimiento futuro vigente afirma Banco de Talentos; kill-switch y dedupe conservados.

### Slice 5 — API parity, rollout y operación

- Adapters governados, docs técnica/funcional/manual, flags/ledger, canary y drill de rollback/recovery.

## Out of Scope

- UI visible de preview/confirmación: `TASK-1763`.
- Revertir decisiones/emails al reabrir una vacante.
- Crear consentimiento, campañas de nurturing u outreach desde el cierre.
- Usar score, IA, ranking o `data_origin` para decidir la cohorte.
- Cambiar retención legal o borrar documentos/candidatos.

## Detailed Spec

El preview devuelve objetivo, seleccionados vigentes, cupos restantes, cohorte por estado, exclusiones, estado de
consentimiento agregado y `effectDigest`, sin PII innecesaria. Confirm sólo procede cuando capacidad está llena y el
digest sigue vigente. El run persiste un item por aplicación antes de ejecutar efectos. Cada item llama el command
individual, y el email nace únicamente desde su evento persistido. `sent` sigue significando aceptación; la entrega
se observa por el lifecycle de Resend existente.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- El preview/digest y constraints deben desplegar antes de habilitar confirm.
- El reconciler y sus signals deben estar operativos antes del primer canary con email.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Rechazar una cohorte equivocada | Hiring/data | medium | preview fresco, digest, lock, categorías visibles | `hiring.opening.capacity_decision_drift` |
| Duplicar rechazo/email en retry | outbox/email | medium | item idempotente + decision/email dedupe | duplicate invariant test |
| Run parcial queda oculto | worker/ops | medium | status por item + reconciler + signal | `hiring.opening.capacity_closure_partial_failed` |
| Prometer Banco de Talentos sin consentimiento | privacy/email | medium | policy re-read al enviar + tests negativos | consent-claim con estado no vigente |
| Correo correcto no llega | Resend | low | lifecycle existente + kill-switch/recovery | `hiring.notification.capacity_rejection_failed` |

### Feature flags / cutover

- `HIRING_OPENING_CAPACITY_CLOSURE_ENABLED` default OFF controla confirmación/ejecución.
- `HIRING_CAPACITY_REJECTION_EMAIL_ENABLED` default OFF controla sólo la variante; además aplica kill-switch por tipo.
- Revert: flags OFF; no se intenta deshacer comunicaciones ya emitidas.

### Rollback plan per slice

- Slices 1–2: flag OFF y revert de código; tablas aditivas quedan inertes.
- Slice 3: pausar reconciler; reanudar sólo tras readback de items, nunca reiniciar run.
- Slice 4: kill-switch de email; decisiones quedan auditadas.
- Slice 5: fallback a rechazo individual/manual existente.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Opening sin capacity no se autocierra ni asume un cupo.
- [ ] Seleccionar no rechaza ni notifica a terceros sin confirmación humana separada.
- [ ] Preview stale/conflict no crea run ni side effects.
- [ ] Un crash/replay converge sin decisiones ni correos duplicados.
- [ ] Sólo aplicaciones elegibles de la opening exacta cambian; backups/holds requieren inclusión explícita.
- [ ] Rechazo directo y por capacidad usan copy empático personalizado y no revelan evaluación interna.
- [ ] “Mantendremos tu perfil” aparece sólo con consentimiento futuro vigente.
- [ ] Procedencia no gatea comunicaciones y los canaries usan destinatarios allowlisted.
- [ ] Signals, flags, docs y lifecycle de entrega quedan operativos y verificados.

## Verification

- `pnpm task:lint --task TASK-1762`
- tests focales `src/lib/hiring/opening-capacity`, `decide`, `notifications` y `boundary-domain`.
- migración/readback y pruebas concurrentes PG.
- canary allowlisted con direct reject + capacity-filled con/sin consentimiento.
- `pnpm ops:lint --changed`, `pnpm qa:gates --changed`, `pnpm docs:closure-check`.

## Closing Protocol

- [ ] Lifecycle/carpeta, registry, README, EPIC-011, Handoff y changelog sincronizados.
- [ ] ADR aceptado o el estado queda honestamente bloqueado.
- [ ] Flags/ledger, runbook y estado real por runtime documentados.
- [ ] TASK-1763 recibe el DTO/command final sin duplicar reglas.

## Follow-ups

- Product API/MCP write consumer separado si no entra en Slice 5.
- Capacidad por ubicación/jornada sólo si aparece evidencia de negocio que invalide el objetivo simple por opening.
