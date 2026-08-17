# TASK-1734 — Assessment AI Scoring at Scale + Operator-Only Exception Review

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration|sync|command|reader|api`
- Epic: `EPIC-011`
- Status real: `Diseño; TASK-1361 entrega propuesta individual, pero no existe scoring asíncrono por assessment ni revisión por excepción gobernada`
- Rank: `TBD`
- Domain: `hr|agency|data|ai|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin branch por task ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende `TASK-1361` desde sugerencias individuales bajo demanda hacia un run asíncrono exacto por
`hiring_assessment`, con scoring de todas las respuestas abiertas, abstención/triage por riesgo y confirmación
humana gobernada del conjunto elegible. El resultado, sus explicaciones y el estado de revisión son
**exclusivamente internos para operadores autorizados**: nunca llegan al postulante, al payload público ni a email.

## Why This Task Exists

Una plantilla real puede dejar diez respuestas abiertas por postulante; una cohorte de 70 personas produce 700
correcciones manuales. La foundation existente sabe proponer un score para un `responseId` y confirmar una propuesta,
pero no escucha `hiring.assessment.submitted`, no crea un run durable, no puntúa el conjunto, no calcula confianza
calibrada, no enruta excepciones ni permite una confirmación humana honesta a nivel de run.

El camino actual tampoco es apto para escala: Application 360 confirma una respuesta por vez; la lista de propuestas
es global y limitada antes de filtrar por assessment; el score sugerido puede precargar el campo humano y el baseline
de seis casos curados es un smoke del provider, no evidencia suficiente para promover revisión por excepción. Esta
task completa los gates y activa el carril masivo sin convertir IA en decisión de contratación ni duplicar el motor.

## Goal

- Crear un run idempotente por `assessmentId + answer/rubric/prompt/model-policy digest` que puntúe asíncronamente
  todas las respuestas `open_text|situational` elegibles después de `hiring.assessment.submitted`.
- Clasificar cada propuesta como `mandatory_review`, `quality_sample` o `batch_eligible` mediante una policy
  versionada, explicable y calibrada; una abstención o fallo siempre vuelve a corrección humana.
- Mantener `propose → confirm → execute`: ningún score IA entra al rollup antes de una confirmación humana gobernada;
  el command de run nunca decide, rankea, mueve etapa, asigna otro test ni envía correo.
- Garantizar por contrato y tests negativos que el postulante solo ve estados de rendición/confirmación de envío;
  nunca ve puntaje, bandas, rationale, confianza, cola, override ni resultado del test.
- Promover la capacidad únicamente después de eval suficiente y canary controlado, con flags independientes y
  rollback a la cola manual. La matriz de sign-offs (Talent/Legal/Privacy/Security/Identity/AI Platform) quedó
  **resuelta por autorización ejecutiva del CEO el 2026-08-16** (ver `## Delta 2026-08-16`): el ADR de Slice 0 la
  registra como autorización otorgada, no la recolecta. Los gates técnicos (eval, shadow, canary) no se rebajan.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- El aggregate exacto es `hiring_assessment` anclado a una `hiring_application`; nunca se puntúa por opening,
  candidato global, nombre ni posición aproximada.
- `TASK-1361` sigue siendo dueña del proposal ledger, provider adapter, prompt contract y confirm atómico; esta task
  orquesta y gobierna escala, no crea un segundo scorer.
- El texto del candidato es data no confiable. Prompt injection, PII, contenido fuera de dominio o evidencia
  insuficiente producen abstención/revisión; nunca elevan confianza.
- La confianza debe estar calibrada contra outcomes humanos por pregunta/template/version; no se acepta el
  self-report del modelo como confianza suficiente.
- El score es advisory. Ningún run auto-rechaza, auto-selecciona, rankea, mueve stage, inicia handoff, asigna test,
  envía correo ni escribe payroll/ICO.
- El postulante no recibe resultados. Las rutas públicas y candidate-facing no exponen `autoScore`, `humanScore`,
  score efectivo, competency results, AI proposals, rationale, per-criterion, confidence, risk class ni audit state.
- No mostrar el resultado no elimina la obligación de transparencia aplicable: Legal/Privacy decide el aviso sobre
  asistencia IA, pero dicho aviso nunca revela el score ni la evaluación interna.
- `propose → confirm → execute` permanece. Una confirmación de lote debe registrar qué propuestas cubre, qué muestra
  se revisó, qué excepciones se resolvieron, actor/policy/digests y por qué el conjunto era elegible; un botón
  “aceptar todo” sin esa evidencia no es supervisión humana.
- La fecha de aplicabilidad regulatoria se revalida contra fuentes oficiales al ejecutar; el diseño no rebaja gates
  por una postergación de calendario.

## Normative Docs

- `.codex/skills/greenhouse-talent-people-operator/references/assessment-interviewing.md`
- `.codex/skills/greenhouse-talent-people-operator/references/greenhouse-runtime.md`
- `docs/tasks/complete/TASK-1360-assessment-engine-foundation.md`
- `docs/tasks/complete/TASK-1361-assessment-ai-assist.md`
- `docs/tasks/complete/TASK-1363-assessment-taking-review-surface.md`
- `docs/tasks/complete/TASK-1364-assessment-validity-feedback-loop.md`
- `docs/tasks/complete/TASK-1365-assessment-adverse-impact-fairness-monitoring.md`
- `docs/tasks/to-do/TASK-1603-hiring-quality-gate-opening-binding.md`
- `docs/tasks/to-do/TASK-1604-role-scorecard-assessment-template-pack.md`
- `docs/tasks/to-do/TASK-1729-candidate-application-self-service-contract.md`
- `docs/tasks/complete/TASK-1383-assessment-engine-hardening-pre-1363.md` (dedupe por `input_digest` en el proposal
  ledger — la semántica de digests de esta task depende de ese hardening)
- `docs/tasks/to-do/TASK-1735-hiring-application-evaluation-dossier.md` (expediente de notas; frontera de rationale
  declarada en `## Delta 2026-08-16`)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- `TASK-1360` — assessment instances, responses, scoring and canonical rollup.
- `TASK-1361` — `hiring_assessment_ai_proposal`, `proposeScoreForResponse`, provider/prompt/contracts and
  `confirmAiProposal`.
- `TASK-1363` — internal review surface and public test boundary.
- `TASK-1364` / `TASK-1365` — validity/fairness evidence surfaces; their current runtime state must be verified.
- Immutable, SME-approved templates/questions; future role packs remain owned by `TASK-1604`.

### Blocks / Impacts

- Enables high-volume assessment review without assigning autonomous hiring authority.
- `TASK-1603` may consume run completeness/evidence but remains owner of the hiring quality gate.
- `TASK-1729` must preserve its explicit no-score candidate contract; this task adds negative coverage, not a new
  candidate result surface.
- A later UI task may replace the existing per-response drawer with an operator workbench over the run reader. That
  visible redesign is deliberately outside this backend-critical foundation.
- `TASK-1735` (Evaluation Dossier): el manifest/audit del run registra HECHOS estructurados (IDs, digests, reason
  codes, actor); la narrativa opcional del revisor vive como nota `kind=assessment_review` del expediente de 1735
  referenciando `runId`/`proposalId` en `context_json`. Un solo hábitat por tipo de contenido; sin duplicación.

### Files owned

- `src/lib/hiring/assessment/ai/**`
- `src/lib/hiring/assessment/scoring.ts`
- `src/lib/hiring/assessment/review.ts`
- `src/lib/sync/projections/hiring-assessment-ai-scoring.ts` (nuevo, único archivo de projection de esta task) más
  su registro en `src/lib/sync/projections/index.ts` — NO el glob completo: `index.ts` y
  `hiring-stage-assessment-assignment.ts` son Files owned de `TASK-1719`; coordinar el registro si ambas avanzan
- `services/ops-worker/**` only if Slice 0 confirms this existing runtime as the correct workload home
- `src/app/api/hiring/assessments/ai/**`
- `src/app/api/public/assessment/**` negative boundary tests only; no result endpoint or candidate UI
- `migrations/**`
- `scripts/hiring/**` for eval/canary/rollback tooling
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/documentation/hr/**` and `docs/manual-de-uso/hr/**` for operator-only operation and rollback

## Current Repo State

### Already exists

- `src/lib/hiring/assessment/ai/score-response.ts` proposes one score from an exact `responseId` and writes the
  existing proposal ledger.
- `src/lib/hiring/assessment/ai/confirm.ts` applies a confirmed proposal atomically through `recordHumanScore`.
- `src/lib/hiring/assessment/scoring.ts` blocks `finalizeAssessment` while human-rated responses remain pending and
  keeps the application rollup advisory.
- `src/lib/hiring/assessment/ai/eval/eval-runner.ts` reports MAE, within-tolerance and Pearson; the V1 fixture has
  only six curated cases and remains a provider smoke, not the promotion dataset for exception review.
- `hiring.assessment.submitted` already exists and has an ops-worker consumer for the internal People notification;
  it does not enqueue AI scoring.
- Public assessment DTOs do not intentionally include scores/rubrics/answer keys; the candidate result anti-leak
  contract must be expanded to every new field and consumer introduced here.

### Gap

- No durable scoring run, bounded async trigger, batch enumeration, retry/reconciliation or run-level readback.
- No calibrated confidence/abstention/risk class, evidence-quote validation, PII redaction, prompt-injection suite or
  quality-sample selection.
- No exact assessment-scoped proposal reader for high-volume use and no governed batch confirmation manifest.
- No promotion-grade eval per question/template/version; six easy curated cases cannot justify reduced human review.
- No independent flags for async generation, exception-review policy and run confirmation, nor run-specific
  reliability signals/rollback evidence.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/hiring/assessment/ai/**` for canonical behavior, current governed API adapters under
  `src/app/api/hiring/assessments/ai/**`, and the existing approved Cloud Run worker pattern for async execution
- Future candidate home: `domain-package`
- Boundary: `startAssessmentAiScoringRun`, `getAssessmentAiScoringRun`, `listAssessmentAiReviewItems`,
  `confirmAssessmentAiScoringRun` and `cancel/retry` commands; portal/Nexa/MCP/worker are consumers only
- Server/browser split: DB, prompts, raw answers, rubrics, provider SDK, secrets and policy evaluation stay
  server-only; browser-safe DTOs are operator-only and omit raw provider payloads/secrets
- Build impact: provider SDKs are reused; no new heavy dependency or filesystem runtime input. Worker build inputs
  must pass the canonical build/runtime dependency gates if the current service is extended
- Extraction blocker: transactionality between proposal confirmation, response scoring and assessment finalization;
  exact internal identity/capability context and provider credentials remain server-side

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `sync|command|reader|migration`
- Source of truth afectado: `greenhouse_hiring.hiring_assessment`, `hiring_assessment_response`,
  `hiring_assessment_ai_proposal` and a new additive run/readback aggregate defined by the accepted ADR
- Consumidores afectados: `ops-worker`, Hiring App API, Application 360/operator consumers, Nexa/MCP only through
  the same capability contract; public candidate consumers are explicit deny surfaces
- Runtime target: `local → staging shadow → controlled production canary → production`

### Contract surface

- Contrato existente a respetar: `src/lib/hiring/assessment/ai/**`, `src/lib/hiring/assessment/scoring.ts`,
  `src/lib/hiring/assessment/review.ts`, `/api/hiring/assessments/ai/**`, event `hiring.assessment.submitted`
- Contrato nuevo o modificado: durable assessment-scoring run aggregate; start/status/retry/cancel/confirm commands;
  exact assessment-scoped review reader; async submitted-event adapter; versioned risk-routing policy and output DTO
- Backward compatibility: `gated`; manual correction and individual confirm remain the fallback and source-compatible
- Full API parity: domain commands/readers own behavior. UI, worker, Nexa, MCP, scripts and tests call the same
  primitives; no consumer reimplements scoring, risk routing, confirmation or finalization

### Data model and invariants

- Entidades/tablas/views afectadas: existing assessment/response/proposal tables plus additive
  `greenhouse_hiring.hiring_assessment_ai_scoring_run` and run-item/history structures finalized by ADR
- Invariantes que no se pueden romper:
  - one active run per exact assessment + policy/input digest; retries resume/reconcile and never double-score
  - run items reference exact response/application/assessment lineage and an immutable proposal/input digest
  - AI proposal is not an effective score until governed human confirmation; provenance remains reconstructible
  - mandatory exceptions and required blind quality sample are closed before a run can confirm/finalize
  - candidate/public/client payloads and emails never contain result, score, rationale, confidence or review state
  - no ranking, hiring decision, stage move, test assignment, email, handoff, payroll or ICO write
- Tenant/space boundary: internal delegated user/service identity + exact `applicationId → assessmentId → responseId`;
  capabilities are resource/purpose checked, never merely “internal” or a caller-supplied ID
- Idempotency/concurrency: unique run digest; outbox/event dedupe; per-run lock/lease; terminal-once confirm/cancel;
  `FOR UPDATE` or equivalent around confirm/finalize; stale answer/rubric/model digest forces a new run/review
- Audit/outbox/history: append-only run lifecycle, item routing, human sample/exception decisions, batch-confirm
  manifest, provider/model/prompt/policy/input hashes and existing proposal events; no raw answer/PII in logs/events

### Migration, backfill and rollout

- Migration posture: `additive`; no destructive rewrite of responses/proposals and no reinterpretation of old scores
- Default state: all new run/exception/confirm flags `OFF`; first execution is synthetic shadow-only
- Backfill plan: none for real historical candidates by default. Any evaluation dataset import is anonymized,
  purpose-approved, allowlisted and dry-run/apply with deletion/retention contract
- Rollback path: disable async enqueue first, drain/cancel in-flight runs, disable run confirm, preserve proposals/audit,
  and return every unresolved item to the existing manual queue; reverse migration only before any retained evidence
- External coordination: provider retention/training/data residency review; env/secrets in every actual runtime;
  autorización ejecutiva del CEO registrada (2026-08-16, ver Delta) en lugar de la matriz de sign-offs, más named
  canary owner

### Security and access

- Auth/access gate: existing `hiring.assessment.ai_assist` for proposal execution plus a narrower run/confirm
  capability if ADR confirms separation; `hiring.assessment.score` remains required for score application. Never
  grant to public candidate, `client_*`, shared PKCE or broad routeGroup `internal`
- Sensitive data posture: candidate answers are PII-capable untrusted text. Provider packet is allowlisted and
  minimized; names/contact/CV/stage/decision/protected data are excluded; embedded PII is redacted or abstained
- Error contract: canonical Hiring errors with stable codes; public routes stay generic and never reveal scoring
  existence/status; raw provider errors/output and candidate text never enter logs
- Abuse/rate-limit posture: per-assessment idempotency, provider quota/cost cap, bounded concurrency, timeout,
  circuit breaker, retry budget and fail-closed manual fallback

### Runtime evidence

- Local checks: contract/sanitizer/policy/state-machine tests; static candidate anti-leak tests; prompt-injection/PII
  adversarial corpus; concurrency/idempotency tests; provider mocks
- DB/runtime checks: migration verify; synthetic submitted assessment → one run → all eligible items → exceptions /
  sample → confirm → canonical rollup; replay/stale/cancel/provider-failure/rollback cases
- Integration checks: provider smoke with synthetic responses; worker enqueue/drain/readback; App API allow/deny and
  revoked capability; candidate/public/email negative probes
- Reliability signals/logs: run backlog/stuck, provider/schema failure, abstention, override delta, sample disagreement,
  question/template drift, cost/latency and orphan/reconciliation signals with PII-free dimensions
- Production verification sequence: accepted ADR/policy → promotion-grade eval → deploy flags OFF → staging shadow →
  controlled synthetic canary → one allowlisted template/opening with named owner → cooldown/readback → bounded rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Scoring-run/risk/confirm logic lives in `src/lib/hiring/assessment/ai/**`, never in UI, worker adapter or route.
- [ ] Run is an aggregate/resource with governed commands/readers, not a button or endpoint chain.
- [ ] Reads are exact-assessment scoped; writes have fine capability, idempotency, audit/outbox, canonical errors and
  readback.
- [ ] Any new capability and grants land together with coverage tests; no broad `internal` or `client_*` grant.
- [ ] App API path is declared and consumes the primitive; Nexa/MCP are optional adapters, never alternate logic.
- [ ] Batch confirmation is `propose → confirm → execute` with a durable manifest and human authority.
- [ ] Worker/UI/scripts/tests consume one primitive; no duplicate scorer or policy engine.
- [ ] Parity check = SÍ before declaring the capability complete.

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

### Slice 0 — ADR, policy and runtime placement gate

- Proponer y aceptar un ADR que defina run-level human confirmation, abstention, mandatory review, quality sample,
  score provenance, contestability, retention and rollback without weakening no-auto-decision.
- Verify actual flag/provider/runtime state rather than trusting docs; choose the existing approved async workload
  placement. No LLM fan-out inline in Vercel and no new service before the placement decision.
- Registrar en el ADR la autorización ejecutiva del CEO (2026-08-16, ver Delta) como resolución de la matriz de
  sign-offs, y definir los owners operativos que sí siguen pendientes (canary owner nombrado, rubric owners, rater
  training). MCP solo entra si un adapter se solicita después vía task nueva.

### Slice 1 — Durable exact-assessment scoring run

- Add the run aggregate/migration, immutable input/policy digest, state machine, leases/locks, item lineage and
  append-only lifecycle/audit.
- Implement start/status/retry/cancel/reconcile primitives and exact assessment-scoped readers.
- Make event handling idempotent: duplicate/replayed `hiring.assessment.submitted` yields the same active/completed
  run, not duplicate provider calls or proposals.

### Slice 2 — Minimal packet, scoring fan-out and risk router

- Enumerate only human-rated pending responses from the exact submitted assessment; generate one existing
  `response_score` proposal per current answer/rubric/prompt/model digest with bounded concurrency/cost/retry.
- Extend the output contract with criterion evidence, missing evidence and routing signals. Validate cited evidence
  against answer text and abstain on malformed/unsafe/out-of-distribution content.
- Add PII minimization/redaction, prompt-injection defenses and fail-closed manual fallback.

### Slice 3 — Promotion-grade eval and policy thresholds

- Replace the six-case smoke as promotion evidence with a versioned, privacy-approved dataset stratified by
  question/template/score band and difficult/adversarial cases.
- Use two independent trained human ratings plus adjudication; measure human-human and AI-human agreement, MAE,
  calibrated tolerance/abstention, band confusion, repeat stability, question-level failures and confidence bounds.
- Define thresholds and minimum evidence in the accepted policy; do not invent a universal sample size or rely on
  Pearson alone. Protected-group analysis uses `TASK-1365` only when lawful, consented and sufficiently aggregated.
- Cláusula explícita de (no-)dependencia: `TASK-1365` está code-complete con prod OFF y cero data demográfica real
  hoy — el fairness check es best-effort con lo que 1365 tenga disponible y su ausencia NO bloquea el resto de los
  gates de promoción de esta task (si Legal exige lo contrario al ejecutar, se registra en el ADR y se re-secuencia).

### Slice 4 — Operator-only exception and batch confirmation contract

- Expose `mandatory_review`, blind `quality_sample` and `batch_eligible` items with stable reason codes, evidence,
  provenance and coverage. Never return candidate identity fields unnecessary to review.
- Implement governed run confirmation: all mandatory items resolved, required blind sample completed, policy/model /
  rubric versions still current, actor has score authority and confirmation manifest is append-only.
- Apply confirmed scores through the canonical TASK-1361/TASK-1360 path and finalize only when completion gates pass.
  No silent rewrite of a previously finalized assessment.

### Slice 5 — Candidate/result anti-leak and consumer boundaries

- Add static and runtime negative tests across public assessment GET/POST, submitted confirmation, lifecycle emails,
  candidate self-service contracts and client/ecosystem DTOs: no score/result/proposal/rationale/confidence/review state.
- Keep the operator reader behind exact resource + purpose + capability checks; test IDOR, cross-application access,
  revoked actor, stale session and `404` anti-oracle behavior where existence would leak.
- Document clearly: the candidate is told only that the test was submitted; results are internal and not displayed.

### Slice 6 — Shadow, canary, monitoring and rollback

- Introduce independent default-OFF flags for enqueue/scoring, exception policy and run confirmation in every runtime
  that executes them; map each flag in the ledger.
- Run shadow first, then synthetic canary, then one allowlisted template/opening with named Talent owner and cooldown.
- Prove rollback to manual review with in-flight reconciliation, zero lost responses and preserved audit; monitor
  backlog, abstention, override/sample disagreement, drift, failures, latency and cost before wider rollout.

## Out of Scope

- Showing any score, result, competency band, explanation or review status to the postulante.
- Candidate result emails, candidate portal scorecards or public/client result APIs.
- Ranking candidates, recommendations to hire/reject, stage moves, decision, handoff, test assignment or email.
- Reading CV, portfolio, contact, identity documents, notes, compensation expectation or protected attributes for
  scoring; `TASK-1718` remains the separate candidate-review/CV contract.
- Creating or editing assessment questions/templates/rubrics; `TASK-1604` and SME governance own content quality.
- Implementing a new operator UI/workbench, wireframe or GVC. A UI consumer follows the backend contract in a
  separate `ui-ux` task if the existing Application 360 surface is insufficient.
- MCP tools or B2B/client access. Any future adapter requires its own task, scopes, delegated identity and canary.
- Fully autonomous scoring that bypasses a human run confirmation, auto-hire or auto-reject.

## Detailed Spec

### Run-level confirmation semantics

The task reduces 700 independent grading decisions without pretending that a blind “accept all” click is oversight.
The agent proposes every eligible score. A versioned router sends uncertain/risky cases to mandatory review and
selects a blind quality sample among otherwise eligible cases. The operator may confirm the remaining set only after
the manifest proves those gates closed. Confirmation applies the covered proposals atomically/idempotently through
the canonical score command and records proposal IDs, digests, policy, model, sample and actor.

An individual proposal remains confirmable through the existing route. Turning the run feature off leaves that path
and the fully manual queue available. A run never mutates a response whose answer/rubric/model-policy digest changed
after proposal creation; it becomes stale and requires a new proposal/review.

### Risk-routing minimum signals

- low/uncalibrated confidence for the exact question/template/version;
- response empty, too short, off-topic, multilingual/out-of-distribution or structurally malformed;
- prompt injection, embedded PII/protected data or unsupported external claim;
- missing/incomplete rubric, criterion without exact evidence or contradictory criterion scores;
- high-weight competency or score inside the policy-defined decision-near band;
- model/prompt/rubric version without current eval, provider/schema degradation or drift alert;
- random blind quality sample and any candidate/operator contestation.

Self-reported model confidence can be stored as a signal but never determines eligibility alone.

### Candidate-facing contract

The candidate-facing test surface can communicate `in_progress`, save/submit feedback and a generic submitted
confirmation. It must not communicate whether objective/open answers scored well, whether AI was confident, whether
an operator reviewed the test or which competency passed. Transparency copy about the use of AI, if required by
Legal/Privacy, is separate from result disclosure and contains no individualized evaluation.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 MUST close before migrations, async wiring or policy implementation.
- Slice 1 → Slice 2 → Slice 3. No exception-review activation before promotion-grade eval.
- Slice 4 depends on Slices 1–3; Slice 5 negative boundaries must close before any non-synthetic canary.
- Slice 6 starts shadow-only; run confirmation remains OFF until the prior technical gates (eval, shadow, canary)
  are evidenced. La autorización ejecutiva ya está registrada (Delta 2026-08-16); los gates técnicos no se rebajan.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| IA incorrecta materializada a escala | hiring / derechos | high | eval por pregunta, abstention, mandatory review, blind sample, human run confirm | override/sample disagreement + score drift |
| Resultado filtrado al candidato | public / candidate privacy | medium | candidate DTO denylist+allowlist, boundary tests, no result route/email | contract test rojo / public payload probe |
| Prompt injection o PII enviada al provider | AI / privacy | high | packet allowlist, redaction/abstention, adversarial eval, provider review | injection/PII abstention rate |
| IDOR/cross-application scoring | identity / hiring | medium | exact lineage + resource/purpose capability + negative tests | denied cross-scope attempts |
| Doble scoring por replay/concurrencia | DB / outbox | medium | unique digest, locks/leases, terminal-once confirmation, reconciliation | duplicate/orphan run signal |
| Rubber-stamp humano | governance | high | mandatory exception closure + blind sample + durable manifest; no raw accept-all | zero-time confirmations / sample miss |
| Provider/worker degradado deja cola perdida | ops | medium | bounded retries, circuit breaker, manual fallback, stuck/backlog signals | run stuck/provider failure |
| Costo o latencia no acotados | provider / ops | medium | concurrency, quota, cost cap, timeout, canary | cost/run and queue latency |

### Feature flags / cutover

- Reuse `HIRING_ASSESSMENT_AI_ENABLED` only as the existing proposal/provider master gate after verifying its live
  state in each runtime.
- Add separate default-OFF flags for async run enqueue/scoring, exception-review eligibility and run confirmation;
  exact names are finalized in Slice 0 and registered with runtime ownership in the flag ledger.
- Candidate result visibility has no feature flag: it is prohibited by contract in every state.
- Revert sequence: confirm OFF → enqueue OFF → drain/cancel/reconcile runs → manual queue readback.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | Revert docs/ADR before acceptance; accepted ADR is superseded, never silently rewritten | same day | sí, via supersede |
| 1 | Flags OFF, stop run creation, preserve additive rows/audit; revert code | <15 min after env propagation | sí |
| 2 | Scoring flag OFF; unresolved items return to manual queue; preserve proposals | <10 min | sí |
| 3 | No cutover; failed eval blocks promotion | immediate | sí |
| 4 | Run-confirm flag OFF; individual/manual confirmation remains | <10 min | sí |
| 5 | Stop rollout on any leak test/probe; no candidate result data is retained client-side | immediate | sí |
| 6 | Execute documented stop/drain/reconcile and verify zero orphan responses | <30 min target | sí |

### Production verification sequence

1. Accept ADR/policy registrando la autorización ejecutiva del CEO (2026-08-16); verify provider terms, flags and
   actual workload runtime.
2. Apply additive migration in staging; deploy with all new flags OFF; verify manual path bit-for-bit.
3. Run promotion-grade eval and adversarial suite; publish versioned evidence and explicit pass/fail.
4. Enable shadow enqueue/scoring for synthetic assessments only; verify exact packet, run/retry/readback and no score
   mutation.
5. Exercise mandatory review, blind sample, batch confirm and rollback with synthetic applications; probe every
   candidate/public/email surface for absence of results.
6. Canary one allowlisted template/opening only after the prior technical gates (la autorización ejecutiva ya está
   registrada); no stage/decision/email automation. Cooldown and review all items during the canary.
7. Promote exception policy gradually only if override/sample/drift/backlog/error/cost gates remain green; otherwise
   revert to full manual confirmation.

### Out-of-band coordination required

**La AUTORIDAD de aprobación de todas estas áreas quedó resuelta por autorización ejecutiva del CEO (2026-08-16,
ver Delta) — no hay que recolectar firmas.** Las ACTIVIDADES operativas listadas siguen siendo trabajo real a
ejecutar dentro de la task (ya autorizado):

- Talent: rubric owners, rater training, gold-set adjudication and canary ownership.
- Legal/Privacy: provider terms/DPA, retention y candidate transparency notice (la obligación regulatoria de
  transparencia hacia el candidato NO desaparece con la autorización interna; el aviso nunca revela el score).
- Security/Identity: threat model, resource/purpose capabilities, service identity, revocation and audit review.
- AI Platform/Ops: provider/model approval, secrets, runtime placement, quotas, monitoring and rollback rehearsal.
- MCP is not required for V1 unless a separate adapter task is approved.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR accepted before implementation fixes the run-level confirmation, abstention/sample policy, provenance,
  contestability, retention, workload placement and rollback.
- [ ] One exact submitted assessment produces at most one active run for the same policy/input digest; replay,
  retry, concurrent delivery and stale inputs are covered by DB/live tests.
- [ ] Every eligible human-rated response yields a proposal or explicit abstention/failure reason; no item disappears
  from manual review.
- [ ] Mandatory-review and blind quality-sample gates are closed before run confirmation; the confirmation manifest
  is append-only, attributable and reconstructible.
- [ ] No AI proposal enters canonical scoring/rollup without human run or individual confirmation through the
  governed command; no score triggers ranking, stage, decision, email, handoff, payroll or ICO.
- [ ] Promotion evidence includes dual independent human rating + adjudication and reports agreement/error,
  calibration/abstention, band confusion, repeat stability and question/template failures with confidence bounds;
  the six-case V1 fixture is not used alone as a production promotion gate.
- [ ] Prompt-injection, evidence-fabrication, PII, long/short/off-topic/multilingual and provider/schema degradation
  suites demonstrate abstention or mandatory review, never unsafe batch eligibility.
- [ ] Provider packet tests prove name/email/phone/CV/contact/stage/decision/protected data are absent and logs/events
  contain only approved hashes/codes/metrics.
- [ ] Exact `applicationId → assessmentId → responseId` authorization tests cover allow, deny, cross-application,
  revoked actor, stale session and anti-oracle behavior.
- [ ] Public test endpoints, candidate self-service contracts, lifecycle emails and all candidate/client DTOs pass
  negative tests proving they never expose score, result, competency bands, rationale, confidence, proposal or review
  status. The candidate sees only a generic submitted confirmation.
- [ ] Separate default-OFF flags exist for async scoring, exception eligibility and run confirmation in every executing
  runtime; the flag ledger names runtime ownership, rollout and rollback.
- [ ] Synthetic shadow + canary + rollback evidence demonstrates zero lost/duplicate responses, manual fallback and
  no orphan/in-flight run after drain/reconciliation.
- [ ] Reliability signals cover backlog/stuck, provider/schema failure, abstention, override/sample disagreement,
  question/template drift, latency/cost and reconciliation without PII.
- [ ] La autorización ejecutiva del CEO (2026-08-16, ver `## Delta 2026-08-16`) está registrada en el ADR de Slice 0
  como resolución de la matriz de sign-offs antes de cualquier cutover con candidatos reales; MCP/B2B remain out of
  scope.
- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Verification

- `pnpm codex:task-hook TASK-1734`
- `pnpm task:lint --task TASK-1734`
- `pnpm worker:build-contract-gate`
- `pnpm worker:runtime-deps-gate`
- focal Vitest suites for assessment AI state/contracts/scoring/public boundary/capabilities
- migration apply/verify plus synthetic PG concurrency/replay/reconciliation smoke
- provider smoke and versioned eval report using synthetic/privacy-approved data
- App API allow/deny/revoked tests and candidate/public/email negative probes
- staging shadow/canary/rollback evidence with flags and runtime state verified live
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` as the final documentation gate

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Architecture, API reference, feature flag ledger, operator manual and candidate-facing privacy/functional docs
  reflect the final internal-only result contract and actual rollout state.
- [ ] Runtime claims were verified against Vercel/Cloud Run/Postgres/provider evidence, not inferred from task/docs.

## Follow-ups

- Separate `ui-ux` task for an operator exception-review workbench, honest provisional coverage and anti-anchoring
  once this backend contract is stable; it must not create any candidate result surface.
- Optional Nexa/MCP adapter only through a new task with delegated human identity, exact assessment scope and no B2B /
  client grant by default.
- Extend promotion datasets as `TASK-1604` activates each new role/template; no template inherits approval from
  another template or model/prompt version.
- Atadura mecánica flag↔promotion-gate (auditoría 2026-08-16): hoy el flip de
  `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED` es procedural (runbook + ledger). Follow-up: una policy row
  con evidencia del promotion gate (reporte de eval aprobado, versionado) que el drain verifique en runtime
  antes de honrar la policy — un flip sin evidencia degrada a `mandatory_review` para todo.
- Parity de adapters para `start`/`reconcile` manual vía App API (`api/platform/app/*`): hoy los commands
  existen como primitive canónica pero solo el evento de outbox / CLI los invoca; falta el contrato
  programático gobernado para operador/Nexa/MCP (Full API Parity a nivel capability).
- Asimetría del carril individual `TASK-1361` (auditoría 2026-08-16): `score-response.ts` hace fallback
  `JSON.stringify(answer)` hacia el provider cuando la respuesta no matchea la allowlist `text|value`,
  mientras el drain ABSTIENE (`answer_malformed`) sin gasto. Alinear el carril individual al abstain del
  drain (misma allowlist, cero payload no-allowlisted al provider).

## Delta 2026-08-16 — Slice 3 harness code-complete

Slice 3 queda **code-complete como HARNESS + gate bloqueante**; la evidencia de promoción NO existe aún y el
gate lo hace explícito:

- `src/lib/hiring/assessment/ai/eval/promotion-eval.ts` — runner puro de eval de promoción (runOne inyectable):
  MAE + Pearson IA-humano (adjudicado), acuerdo humano-humano (MAE/Pearson entre raters A/B) como piso, acuerdo
  relativo (ratio IA-humano / humano-humano), tolerancia calibrada por banda, matriz de confusión por banda con
  no-adyacentes = 0 duro, repeat stability (N corridas → stddev), abstención estándar vs adversarial separadas,
  fallos por pregunta/template con IC 95% bootstrap determinístico, reporte JSON + markdown y blockers con código
  estable (incluye guard `human_human_agreement_implausible` cuando MAE humano-humano = 0 — anti ratings copiados).
- Formato de dataset documentado en `eval/__fixtures__/promotion-dataset.schema.md`; fixture
  `promotion-dataset.synthetic.v1.json` (16 casos, 12 estándar estratificados 2 templates × 3 bandas + 4
  adversariales) marcado `synthetic: true` — SOLO prueba el harness, jamás promueve.
- Gate mecánico `scripts/hiring/assessment-ai-promotion-gate.mjs` (`pnpm hiring:ai:promotion-gate`): exit 1 con
  dataset sintético / sin doble-rating+adjudicación / estratos bajo mínimo / cualquier blocker métrico; verificado
  end-to-end con `pnpm hiring:ai:promotion-eval -- --mock` (reportes en `.eval-reports/`, gitignored). CLI
  `hiring:ai:promotion-eval` corre provider real o `--mock` determinístico.
- Thresholds en la policy: `getAiRunPromotionThresholds()` en `scoring-run/config.ts` (tolerancia por banda,
  ratio máximo de MAE IA-humano vs humano-humano, confusión no adyacente = 0 SIN override, abstención, repeat
  stability, mínimos por estrato). **Valores provisionales del harness: los definitivos los fija la policy
  aceptada con el dataset humano real** (documentado en código; los mínimos por estrato NO son un N universal).
- Protected-group (TASK-1365): hook DECLARADO como interface (`PromotionFairnessHook`) sin implementación —
  best-effort, su ausencia no bloquea (cláusula de la spec).
- **Pendiente explícitamente HUMANO (Talent, en curso)**: gold set con doble rating independiente + rater
  training + adjudicación — owner nombrado pendiente de asignación por el CEO. Ningún agente puede fabricar esos
  ratings; el gate bloquea la promoción hasta que ese dataset exista y pase.

## Delta 2026-08-16

Auditoría spec↔runtime + coherencia cross-task (dos subagentes, sesión operador 2026-08-16). El agente que tome
esta task DEBE leer este delta antes de Discovery — corrige supuestos de la spec contra el estado real:

1. **Autorización ejecutiva (CEO):** la matriz de sign-offs Talent/Legal/Privacy/Security/Identity/AI Platform quedó
   **resuelta por autorización explícita del CEO el 2026-08-16** en sesión de operador. Slice 0 la registra en el
   ADR como autorización otorgada; ninguna firma adicional bloquea el avance. Los gates TÉCNICOS (promotion-grade
   eval, shadow, canary, anti-leak tests, flags default-OFF) permanecen intactos y NO se rebajan. La obligación
   regulatoria de transparencia hacia el candidato (aviso de uso de IA, sin revelar score) sigue vigente como
   actividad de la task.
2. **El master gate ya está ON en Production:** `HIRING_ASSESSMENT_AI_ENABLED` fue prendido en Vercel Production el
   2026-07-16 con autorización del operador (ledger Delta línea ~18) — la spec fue escrita como si siguiera
   bloqueado. Las filas per-flag del ledger están stale (dicen Prod OFF) y contradicen su propia Delta: verificar
   live con `vercel env pull` como manda la spec, y corregir el ledger de paso. El shadow-first de los flags NUEVOS
   es aún más crítico partiendo de un master gate abierto.
3. **Backlog de proposals huérfanas ya existe:** cuando un score se aplica por el carril manual directo
   (`recordHumanScore` + `finalizeAssessment` sin pasar por confirm — caso real EO-ASM-0050, 2026-08-16), las
   proposals `proposed` quedan huérfanas para siempre: ni expiración ni reconciliación, y el confirm posterior al
   finalize falla 409 sin transicionarlas. El run aggregate de Slice 1 debe reconciliar también el backlog huérfano
   pre-existente, no solo el flujo nuevo.
4. **El flag NO gatea confirm/reject** (por diseño, `ai/config.ts:5-7`): apagar el master flag no drena ni bloquea
   la cola — el plan de rollback (drain/cancel) debe operar por los flags nuevos y comandos de run, no por el master.
5. **El digest del run captura el modelo EFECTIVO:** `HIRING_ASSESSMENT_AI_SCORING_MODEL` (env var) puede divergir
   del default `claude-sonnet-5` por runtime; el input/policy digest usa el modelo resuelto, nunca el default.
6. **Slice 5 parte de cobertura cero, no "expande":** no existe ningún test de `PublicAssessmentView` ni del route
   público `/api/public/assessment/[token]`; el anti-leak actual es estructural (hardening.test.ts cubre solo
   `buildPublicQuestion`). Presupuestar la suite completa.
7. **Claims verificados exactos** (evidencia en la sesión de auditoría): reader de proposals global con LIMIT 50 y
   filtro client-side en Application 360 (`listAiProposals`, `proposal-store.ts:240-272`); el score IA precarga el
   input humano (`Application360View.tsx:459` — anclaje real hoy); el output contract ya trae `rationale` +
   `perCriterion` opcional (`ai/contracts.ts:118-140`) — lo que falta es evidencia citada VALIDADA contra el texto
   y señales de routing.
8. **Frontera con TASK-1735 (Evaluation Dossier):** manifest/audit del run = hechos estructurados; narrativa del
   revisor = nota `kind=assessment_review` de 1735 con `context_json.{runId,proposalId}`. Referencia mutua declarada
   en ambas tasks; no duplicar rationale en dos hábitats.
9. **Anti-anclaje en `mandatory_review`:** la quality sample es blind, pero el carril mandatory expone la propuesta
   antes del juicio humano. Mientras el workbench UI llega (follow-up), el manifest DEBE registrar si el revisor vio
   la propuesta antes de emitir su score — costo marginal, preserva la evidencia de supervisión honesta.
10. **Secuenciación:** esta task es paralelizable con TASK-1719/1721 (`Blocked by: none` es correcto — el scoring
    corre sobre `hiring.assessment.submitted` exista o no la policy de asignación); declarado también en EPIC-011.

## Delta 2026-08-17 — Bug de dominio: `per_criterion_contradictory` medía la escala equivocada

Descubierto al ejercitar el **primer run de scoring con datos reales** (14 items, ledger
`greenhouse_hiring.hiring_assessment_ai_proposal`). La task está `complete`: esto es un delta correctivo del
carril de riesgo, no una reapertura.

**Síntoma.** La señal `per_criterion_contradictory` disparaba en **11 de 14 items** — y disparaba justo en las
respuestas BUENAS. Con el carril de excepción encendido, `batch_eligible` quedaba prácticamente muerto: el
operador terminaba revisando todo a mano, o sea el subsistema perdía su razón de ser (revisar por excepción, no
revisar todo). Fail-closed sigue siendo la postura correcta, pero un fail-closed que se dispara por diseño en el
caso sano no es conservador: es ruido que entrena al operador a ignorar la señal.

**Causa raíz: contrato implícito de `perCriterion`.** Dos capas leían la misma estructura con escalas distintas:

- El scorer devolvía **aportes ponderados que SUMAN el score global** (dato real: global `91` = `18+25+25+23`),
  siguiendo la rúbrica del banco, que declara su escala en el propio texto:
  `"0-100 (25 puntos por criterio; parcial permitido)"`.
- El router comparaba el score global contra el **promedio** de esos aportes (`risk-router.ts`, `mean`). Con 4
  criterios de 25 puntos, un `91` sano tiene promedio `22.75` → delta `68` ≫ `25` → contradicción falsa **por
  construcción**. Cuanto mejor la respuesta, más "contradictoria" se veía.

Ninguna de las dos capas estaba equivocada por sí sola: el prompt v1 pedía *"un `perCriterion` con el puntaje por
criterio"* y el JSON Schema declaraba `score: 0–100` por criterio. Ambas lecturas (aporte vs nota independiente)
eran válidas. El modelo mismo alternaba entre ellas según la calidad de la respuesta. **Un contrato implícito no es
un contrato** — el bug no fue un `mean` mal tipeado, fue que nadie declaró la escala.

**Fix — hacer explícita la escala, no parchar la comparación:**

1. **Contrato** (`ai/contracts.ts`): se declara `RESPONSE_SCORE_CRITERION_SCALE = 'weighted_contribution'`. Cada
   criterio lleva `weight` (puntos máximos, suman 100) y `score` (aporte obtenido, `0..weight`). El JSON Schema
   exige `weight`. El sanitizer normaliza: `weight` ausente ⇒ reparto equitativo de 100; `score` se clampa a
   `[0, weight]` — un aporte no puede exceder su propio peso, así que un criterio calificado en escala propia
   0–100 queda acotado en la frontera de enforcement en vez de colarse como sano.
2. **Prompt** (`ai/prompt.ts`): pide la escala explícitamente (respeta los pesos que la rúbrica declare; si no los
   declara, reparte 100 en partes iguales; la suma de aportes debe dar el global; nunca una escala propia por
   criterio). `HIRING_ASSESSMENT_SCORING_PROMPT_VERSION` sube a **`hiring_assessment_ai_scoring.v2`**: las
   proposals v1 quedan **stale** por `promptVersion` distinto — comportamiento correcto, no se reinterpretan bajo
   la escala nueva.
3. **Consumidor único** (`summarizeCriterionContribution`): traduce aportes → score global implicado,
   renormalizando por el total de pesos (una rúbrica cuyos pesos no suman 100 sigue implicando un score
   comparable). Ningún consumidor rederiva la agregación por su cuenta.
4. **Router** (`risk-router.ts`): compara el global contra el **implicado**, no contra el promedio. La señal ahora
   detecta contradicción del AGREGADO — un criterio suelto lejos del global no es contradicción, es varianza
   legítima de la rúbrica.
5. **Policy version**: `hiring_assessment_ai_risk_policy.v1` → **`v1_1`** (evolución de una señal ⇒ bump; los runs
   con la policy vieja quedan stale, nunca se reinterpretan). Se usa `v1_1` y no `v2` porque `v2` sigue reservado
   para la calibración del Slice 3.
6. **UI**: el workbench muestra el aporte sobre su peso (`18 / 25`). Sin denominador el operador no puede saber si
   `18` es bueno — la escala tiene que ser legible donde se juzga.

**Verificación con los datos reales** (replay de los 14 proposals del ledger por el router corregido):
`per_criterion_contradictory` pasa de **11/14 a 2/14**, y los 2 que quedan son contradicciones REALES del modelo
bajo el prompt ambiguo (global `21` con aportes que implican `65`; global `18` con aportes que implican `55`) —
exactamente los items que un humano debe mirar. `batch_eligible` recupera 12/14 con la policy encendida.

**Regresión cubierta** (`risk-router.test.ts`, `contracts.test.ts`): el caso real sano (aportes que suman el
global) NO dispara; el caso real contradictorio SÍ; un criterio suelto en 0 no dispara; pesos que no suman 100 se
renormalizan; el sanitizer valida la escala nueva y acota el drift de escala propia.

**Lección transferible.** Cuando dos capas comparten una estructura de datos numérica, la escala es parte del
contrato — no del contexto. Si el prompt no la declara y el schema admite dos lecturas, el modelo elegirá una por
respuesta y el consumidor asumirá la otra; el síntoma aparecerá recién con datos reales, con build y tests verdes.

## Open Questions

- Does the accepted policy confirm at one assessment per operator action or permit a bounded multi-assessment cohort?
  Default safe assumption: one exact assessment until canary evidence supports a broader boundary.
- Which existing Cloud Run lane owns the bounded provider fan-out without turning `ops-worker` into a catch-all?
  Slice 0 must decide from measured duration/concurrency/build inputs before implementation.
- Which candidate transparency notice is required in each hiring jurisdiction? Legal/Privacy owns the notice; the
  individualized result remains internal regardless of that answer.
