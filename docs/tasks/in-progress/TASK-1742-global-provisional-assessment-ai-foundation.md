# TASK-1742 — Global Provisional Assessment AI Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `integration`
- Epic: `EPIC-011`
- Status real: `Operativa en producción y en observación: global_provisional activo para todas las vacantes, worker/scheduler saludables y canary exacto verde; lifecycle permanece in-progress hasta registrar cooldown, rollback/residual cero y sign-offs/risk acceptance trazables. SALVEDAD agregada 2026-08-26: la afirmación «canary exacto verde» tiene corte al 2026-08-18 y AL DÍA SIGUIENTE entraron dos fixes correctivos al mismo carril (c7474b068 «dejar cerrar un run cuyo trabajo humano ya terminó» y 05a5daf48 «Sonnet 5 vuelve a calificar candidatos»); no hay registro de que el canary se re-verificara después. Re-verificarlo es pendiente de cierre`
- Rank: `1`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende el run asíncrono de TASK-1734 con un modo `global_provisional` operator-only para que todos los candidate tests de todas las vacantes obtengan evaluación IA automática sin materializar propuestas no calibradas como scores efectivos. Cierra sanitización de PII embebida, señales adversariales, evidence binding, App API/backfill y rollout/rollback verificable.

## Why This Task Exists

El motor ya existe, pero encenderlo con la policy apagada obliga a revisar todas las respuestas y encender `batch_eligible` salta el promotion gate. Además, el texto libre puede contener PII autodeclarada, no existe una proyección provisional separada ni un command App API para recuperar assessments enviados con enqueue OFF. El operador necesita análisis inmediato sin convertir una propuesta no calibrada en verdad canónica.

## Goal

- Hacer elegibles automáticamente todos los candidate tests enviados, sin configuración por vacante.
- Exponer una evaluación provisional interna útil sin escribir `human_score`, finalizar el assessment ni alterar el rollup.
- Habilitar un rollout global acotado, reversible, auditable y seguro frente a PII, prompt injection, IDOR, replays y costos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- `provisional` y `effective` son autoridades distintas: ninguna propuesta IA entra a `human_score`, rollup, ranking o decisión sin confirmación gobernada.
- El postulante nunca recibe score, banda, rationale, confianza ni estado de revisión; tampoco clientes, emails o payloads públicos.
- El worker reutiliza run, proposal ledger, provider adapter, commands y audit de TASK-1361/1734; no nace un motor paralelo.
- Toda promoción más allá de provisional exige evidencia vigente por versión de template, rúbrica, prompt, modelo y policy.

## Normative Docs

- `docs/operations/runbooks/assessment-ai-scoring-rollout.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/documentation/hr/gold-set-rubrica-de-anclaje.md`
- `docs/manual-de-uso/hr/calificar-gold-set-de-referencia.md`
- `docs/tasks/complete/TASK-1361-assessment-ai-assisted-scoring.md`
- `docs/tasks/complete/TASK-1734-assessment-ai-scale-operator-exception-review.md`
- `docs/tasks/complete/TASK-1738-assessment-ai-review-workbench.md`

## Dependencies & Impact

### Depends on

- TASK-1360 — assessment engine y rollup canónico.
- TASK-1361 — proposal ledger, scorer y confirmación individual.
- TASK-1734 — run durable, risk router, manifest, worker, flags y rollback.
- TASK-1738 — workbench operator-only que consumirá la proyección provisional.

### Blocks / Impacts

- TASK-1743 cerró como consumer UI del resultado provisional.
- Recalibra parcialmente el rollout de TASK-1734 mediante ADR/delta explícito; no reabre ni reescribe su historia.
- Impacta ops-worker, App API, flag ledger, runbook y señales de confiabilidad.

### Files owned

- `src/lib/hiring/assessment/ai/**`
- `src/lib/sync/projections/hiring-assessment-ai-scoring.ts`
- `src/app/api/hiring/assessments/ai/**`
- `services/ops-worker/**`
- `scripts/hiring/**assessment-ai**`
- `docs/architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`
- `docs/operations/runbooks/assessment-ai-scoring-rollout.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/documentation/hr/**assessment-ai**`
- `docs/manual-de-uso/hr/**assessment-ai**`

## Current Repo State

### Already exists

- Pipeline `submitted → outbox → enqueue → run → drain → provider → risk router → workbench → confirm` durable e idempotente.
- Proposals versionadas, manifest append-only, anti-leak candidate-facing, rollback y reliability signals.
- Flags del run declarados default OFF y scheduler pausado.

### Gap

- No existe modo/proyección `global_provisional`, sanitizer determinístico de PII embebida, signals adversariales completas, evidence binding mecánico ni App API/backfill exacto.
- Con policy OFF todo es `mandatory_review`; con policy ON el runtime no prueba que la evidencia de promoción siga vigente.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/hiring/assessment/ai/** + services/ops-worker + App API Next.js`
- Future candidate home: `domain-package`
- Boundary: `start/get/reconcile provisional scoring run + provisional reader; UI/API/worker son consumidores`
- Server/browser split: `contracts/DTO browser-safe; DB, provider, sanitizer, policy evidence y secrets server-only`
- Build impact: `sin servicio ni SDK pesado nuevo; ops-worker y Vercel siguen siendo los runtimes existentes`
- Extraction blocker: `transacción de confirmación/rollup en PostgreSQL, auth App API y provider runtime compartido`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_hiring.hiring_assessment_ai_scoring_run/items/events + proposal ledger; score efectivo permanece en assessment responses`
- Consumidores afectados: `UI/API/cron/worker`
- Runtime target: `local|staging|production|worker|cron`

### Contract surface

- Contrato existente a respetar: `src/lib/hiring/assessment/ai/scoring-run/**`, ADR de TASK-1734 y public denylist.
- Contrato nuevo o modificado: `global_provisional` mode, provisional projection/reader, governed start/backfill App API y policy-evidence binding.
- Backward compatibility: `gated`
- Full API parity: `commands/readers canónicos bajo src/lib; routes, CLI, worker y UI delegan sin lógica paralela.`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_assessment_ai_scoring_run`, `hiring_assessment_ai_scoring_run_item`, `hiring_assessment_ai_scoring_run_event`, `hiring_assessment_response_ai_score_proposal`.
- Invariantes que no se pueden romper:
  - El provisional nunca escribe `human_score`, no finaliza assessment y no altera `hiring_application.score`.
  - Candidate/public/client/email nunca reciben proposal, score, rationale, confidence o review state.
  - Ningún run rankea, decide, mueve stage, asigna test, envía email ni ejecuta handoff.
- Tenant/space boundary: `assessmentId exacto deriva application/opening/space; capability y ownership se revalidan en cada reader/command; cross-application responde 404.`
- Idempotency/concurrency: `input digest + unique active run + lease/attempts existentes; backfill dry-run/apply con idempotency key y batch acotado.`
- Audit/outbox/history: `run/item/event/proposal append-only; actor, reason, policy/model/prompt/rubric versions y digests.`

### Migration, backfill and rollout

- Migration posture: `additive si el modo/evidence binding requiere columnas o policy row; sin reescritura destructiva.`
- Default state: `flag OFF`
- Backfill plan: `dry-run → assessmentId exacto de Lucero → readback → batches acotados de submitted sin run; nunca replay global del outbox ni SQL manual.`
- Rollback path: `ocultar provisional → confirm OFF → enqueue OFF → pausar scheduler → cancel/reconcile → cola manual; conservar propuestas/audit.`
- External coordination: `Vercel env + ops-worker deploy/env + Cloud Scheduler + provider budget + release control plane.`

### Security and access

- Auth/access gate: `session + capability hiring.assessment.ai.score/read/confirm existente; App API de backfill con capability fina y actor/reason.`
- Sensitive data posture: `respuestas PII-capable/untrusted; packet allowlisted, redacción determinística antes de egress y raw content fuera de logs.`
- Error contract: `errores canónicos sanitizados; no raw provider output/errors ni candidate text en logs.`
- Abuse/rate-limit posture: `batch limits, quotas, daily cost cap, replay guard, lease, timeout, retry cap y circuit breaker.`

### Runtime evidence

- Local checks: `tests focales de sanitizer, packet exacto, risk router, state machine, commands/readers, public anti-leak e idempotencia.`
- DB/runtime checks: `migration verify, dry-run/readback de backlog y exact assessmentId de Lucero.`
- Integration checks: `provider synthetic shadow, staging worker/scheduler smoke, rollback rehearsal y production canary exacto.`
- Reliability signals/logs: `backlog age, provider/schema failures, abstention, override delta, orphan runs, cost/latency y provisional canonical-mutation guard.`
- Production verification sequence: `shadow sintético → global provisional concurrencia 1 → Lucero → cooldown 24–48h → nuevos envíos globales → backlog acotado.`

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [x] La lógica provisional y de backfill vive en primitives server-side, no en la UI.
- [x] Read y write tienen capability fina, idempotencia, audit, errores canónicos y observabilidad.
- [x] App API y CLI/worker consumen el mismo command/reader.
- [x] El write conserva `propose → confirm → execute` para cualquier materialización efectiva.
- [x] Cero integración Nexa/MCP específica dentro de esta task.

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

### Slice 1 — ADR y modos gobernados

- Añadir una decisión superseding/delta que separe `provisional` de `effective` y modele `disabled|synthetic_shadow|global_provisional|exception_canary|calibrated_batch`.
- Atar mecánicamente cualquier modo superior a provisional a evidencia vigente por template/rubric/model/prompt/policy.

### Slice 2 — Packet seguro y routing adversarial

- Unificar sanitizer/redactor pre-egress para texto libre y retirar fallback inseguro.
- Detectar PII/injection/off-topic/OOD/malformed y abstener/rutear fail-closed con tests de payload exacto.

### Slice 3 — Proyección provisional y App API

- Derivar score/cobertura provisional sin mutar score efectivo.
- Exponer reader y commands start/backfill/reconcile con exact assessmentId, dry-run/apply, batch cap, actor/reason e idempotencia.

### Slice 4 — Worker, señales y rollback

- Cablear `submitted` global sin allowlist de vacantes, límites de costo/concurrencia y stop conditions.
- Extender señales, runbook, ledger y ensayo de rollback con residual cero.

### Slice 5 — Rollout y canary real

- Shadow sintético, deploy con flags OFF, activar `global_provisional` con concurrencia 1 y ejecutar Lucero como canary exacto.
- Habilitar nuevos envíos de todas las vacantes y backfill acotado solo después del cooldown/readback verde.

## Out of Scope

- Mostrar resultados al postulante o enviarle emails de score.
- Ranking, hire/reject recommendation, stage moves, decisiones, handoff o asignación de tests.
- Autoentrenamiento online, ajuste de modelo con datos crudos o presentar outcomes sesgados como gold truth.
- Activar `calibrated_batch` para una versión que no haya pasado su promotion gate.
- MCP/Nexa/B2B/client access.

## Detailed Spec

`global_provisional` permite generar y leer propuestas agregadas, pero mantiene byte-for-byte sin cambios `human_score`, rollup efectivo, assessment finalization y application stage. Todo cambio de modelo/prompt/rúbrica/policy invalida evidencia previa y degrada el segmento a provisional. El backlog se recupera por command exacto/bounded, nunca por replay indiscriminado o SQL.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5. Ninguna respuesta real sale al proveedor antes de cerrar Slice 2; ningún flag productivo se activa antes de shadow, rollback rehearsal y anti-leak verdes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| PII/instruction egress | provider/privacy | high | sanitizer determinístico + abstención + packet tests | `hiring.assessment_ai.packet_blocked` |
| Provisional muta score efectivo | DB/hiring | medium | reader separado + invariant tests + signal | `hiring.assessment_ai.provisional_mutation` |
| Backfill duplica run/gasto | cron/outbox | medium | exact ID, digest, unique/lease, dry-run | duplicate/orphan signal |
| Resultado llega al candidato | public/email | low | denylist + negative probes | contract test/probe rojo |
| Costo/backlog global | worker/provider | medium | concurrency 1, cost cap, circuit breaker | cost/backlog signals |

### Feature flags / cutover

- Mantener flags de TASK-1734 default OFF y añadir/derivar un modo gobernado cuyo máximo inicial sea `global_provisional`.
- `calibrated_batch` falla cerrado sin evidence binding vigente.
- Candidate visibility no tiene flag: permanece prohibida en todos los modos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | modo `disabled`/revert ADR+config antes de rollout | inmediato | sí |
| Slice 2 | enqueue OFF; no egress real | inmediato | sí |
| Slice 3 | ocultar reader provisional y deshabilitar command | <10 min | sí |
| Slice 4 | confirm OFF → enqueue OFF → scheduler pause → cancel/reconcile | <15 min | sí |
| Slice 5 | secuencia anterior + readback manual/residual cero | <30 min | sí |

### Production verification sequence

1. Tests y migration local/staging; deploy con flags OFF.
2. Shadow sintético adversarial y probes candidate/public/email.
3. Ensayo de rollback y residual cero.
4. Activar `global_provisional`, concurrencia 1 y budget acotado.
5. Start exacto de Lucero; verificar propuesta/cobertura y cero mutación canónica.
6. Cooldown 24–48h con señales verdes.
7. Mantener elegibilidad para todos los nuevos candidate tests y abrir backlog por batches acotados.

### Out-of-band coordination required

- Actualización de env/deploy en Vercel y ops-worker, Cloud Scheduler, provider budget y release manifest.
- Sign-off/risk acceptance de Talent, Privacy/Security y operador para el modo provisional global; no habilita `calibrated_batch`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Todos los nuevos candidate tests de todas las vacantes generan run/propuesta o abstención explícita sin allowlist por opening.
- [x] El provisional se deriva separado y no modifica `human_score`, assessment status/finalization, rollup o application score/stage.
- [x] Sanitizer único elimina PII embebida y bloquea/rutea injection, malformed, off-topic y OOD antes del provider; tests inspeccionan el payload exacto.
- [x] App API/CLI permite dry-run y start/backfill exacto/acotado con capability, actor, reason, idempotencia y readback.
- [x] Policy evidence binding impide mecánicamente `exception_canary|calibrated_batch` con evidencia ausente o stale.
- [ ] Replays no duplican runs, scores ni gasto y rollback deja residual cero sin borrar audit. Los tests de replay están verdes; falta registrar un ensayo productivo de rollback con residual cero.
- [x] Candidate/public/client/email negative probes prueban cero score, rationale, confianza o review state.
- [x] Lucero queda evaluada en `global_provisional` y el runtime prueba cero mutación efectiva.
- [x] No existe ranking, stage move, decisión, test assignment, email, handoff, MCP ni B2B access desde este carril.
- [ ] Staging y production evidencian flags, scheduler y cost cap reales; falta cerrar cooldown y ensayo productivo de rollback/señales residuales.

## Evidencia operativa — 2026-08-18

- Release productivo: SHA `7e7a474217eb1bdd1f68f9dffa94c20333cefb6f`, run `32193134959`, Vercel `Ready`.
- `ops-worker-00584-r4x` sirve el SHA exacto; el watchdog verificó 4/4 workers sincronizados.
- `ops-assessment-ai-drain` está activo cada dos minutos y sus POST observados responden `200`.
- Runtime efectivo: `global_provisional`, enqueue/master ON, exception policy OFF, concurrencia `1`, cap diario `1000`.
- Canary exacto: application `happ-031318c2-02ce-4623-8ada-6970cf4a8fb4`, assessment `asmt-bbe4ea36-2f90-4d7c-b295-91663d3be254`; run/proyección leídos sin materializar score efectivo.
- `exception_canary` y `calibrated_batch` permanecen fail-closed por falta de evidence digest vigente; no son condición de este rollout provisional.
- Pendiente de cierre administrativo: cooldown documentado, rollback/residual cero y sign-offs/risk acceptance trazables de Talent/Privacy/Security.

## Verification

- `pnpm task:lint --task TASK-1742`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm qa:gates --changed`
- provider synthetic shadow + App API allow/deny/IDOR/replay probes
- DB readback de Lucero y canonical-mutation guard
- production flag/scheduler/signal/rollback evidence

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] ADR, runbook, flag ledger y manual funcional reflejan el modo real y su evidencia de rollout.

## Follow-ups

- TASK-1743 consume la proyección provisional en Application 360.
- `calibrated_batch` permanece gated por evidencia válida por versión; no es condición de cierre de este bootstrap provisional.

## Open Questions

- Ninguna: el operador autorizó cobertura global, rollout end-to-end y resultado exclusivamente interno.
