# TASK-1383 — Assessment Engine Hardening (audit follow-ups pre-1363) + Template Versioning Contract (pre-1364)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `COMPLETE 2026-07-10 — code complete en develop local; migración APLICADA (dedupe + UNIQUEs + trigger verificados live); rollout = push normal (sin flag propio)`
- Rank: `TBD`
- Domain: `agency|hr|data`
- Blocked by: `none`
- Branch: `task/TASK-1383-assessment-engine-hardening-pre-1363`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra los defectos objetivos detectados en la auditoría 2026-07-10 de la foundation del Assessment Engine (TASK-1360/1361) ANTES de que TASK-1363 construya la superficie encima: idempotencia real de `saveResponse` (integridad del score), anti-anclaje implementado (no solo prometido), enforcement de expiración/time-limit, guard testeado del answer_key, actor del SME gate, dedupe del ledger IA, snapshot del assessment en la decisión, y el **contrato de inmutabilidad/versionado de templates** que 1364/1365 necesitan decidido antes de acumular datos.

## Why This Task Exists

Auditoría 2026-07-10 (2 lentes: código real + specs downstream) encontró que la foundation es arquitectónicamente correcta pero tiene 4 defectos en la costura exacta que TASK-1363 va a pisar el primer día (el peor: respuestas duplicadas sesgan el AVG del scoring final) y 2 riesgos de diseño no considerados por 1364/1365 (versionado de templates; score no reconstruible al momento de decidir). Endurecer ahora cuesta una sesión; hacerlo después de 1363 o con datos de validez acumulados es mucho más caro.

## Goal

- `saveResponse` idempotente a nivel DB (UNIQUE + upsert) — un autosave repetido nunca duplica ni sesga el score.
- Anti-anclaje (independent-before-debrief) implementado de verdad en `listResponses`.
- Expiración operativa: token con vencimiento + time-limit enforced + transición real a `expired`.
- `buildPublicQuestion` con test anti-leak (answer_key/rubric nunca al candidato) y `needs_human_rating` derivado del tipo real en DB.
- Templates inmutables una vez usados (trigger) + columnas de versionado (`version`, `supersedes_template_id`) — decisión pre-1364.
- La decisión (355) snapshotea el assessment server-side (score al momento de decidir, reconstruible para 1364).
- Higiene: actor del SME gate, dedupe del ledger IA, checkboxes 1360/1361, deltas a 1363/1364/1365.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§Invariantes Assessment + Doc Capture — as-built 1360/1361)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (state-machine+CHECK+audit; supersede append-only)
- `docs/tasks/complete/TASK-1360-assessment-engine-foundation.md` + `docs/tasks/complete/TASK-1361-assessment-ai-assist.md`

Reglas obligatorias: el score sigue siendo advisory (nunca auto-reject); answer_key nunca candidate-facing; IA propone/humano confirma; migración additive + forward-fix (nunca editar migraciones aplicadas).

## Normative Docs

- Auditoría fuente: conversación 2026-07-10 (2 subagentes) — hallazgos citados inline en cada slice.
- `docs/tasks/to-do/TASK-1363-assessment-taking-review-surface.md` (consumer inmediato de la costura)
- `docs/tasks/to-do/TASK-1364-assessment-validity-feedback-loop.md` + `docs/tasks/to-do/TASK-1365-assessment-adverse-impact-fairness-monitoring.md` (consumers del versionado)

## Dependencies & Impact

### Depends on

- TASK-1360/1361 (complete — es su hardening).

### Blocks / Impacts

- **TASK-1363** (deja la costura íntegra: autosave, anti-anclaje, expiración, allowlist testeada).
- **TASK-1364/1365** (versionado de templates decidido antes de acumular datos de validez/fairness).
- TASK-355 desk (la decisión snapshotea assessment — additive en `explainability_json`).

### Files owned

- `migrations/<ts>_task-1383-assessment-hardening.sql`
- `src/lib/hiring/assessment/{instances,scoring,store}.ts` + tests
- `src/lib/hiring/assessment/ai/{proposal-store,generate-questions,score-response}.ts` (dedupe propose)
- `src/lib/hiring/decide.ts` (snapshot assessment — solo enriquecer `prerequisitesSnapshot`)
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (delta)
- `docs/tasks/{complete/TASK-1360*,complete/TASK-1361*,to-do/TASK-1363*,to-do/TASK-1364*,to-do/TASK-1365*}` (deltas/checkboxes)

## Current Repo State

### Already exists (verificado 2026-07-10 por auditoría contra código + PG vivo)

- Motor completo 1360/1361: tablas (7+1), tokens sha256, estados CHECK `assigned→sent→in_progress→submitted→scored|expired`, `computeObjectiveScore` puro, `rollupCompetencyResultsToApplication` único, propose→confirm IA atómico, capabilities + grants + seeds.
- `listPeerScorecardResults` SÍ implementa el gating independent-before-debrief (patrón a reusar).
- `hiring_competency_result` tiene UNIQUE(assessment_id, competency_id); `hiring_assessment_response` NO tiene UNIQUE alguno.

### Gap (los 10 hallazgos, mapeados a slices)

1. `saveResponse` INSERT plano sin ON CONFLICT ni UNIQUE (docstring miente) → S1+S2.
2. `listResponses` hace `void viewerUserId` (anti-anclaje prometido, no implementado) → S2.
3. `buildPublicQuestion` huérfano sin test anti-leak → S2/S4.
4. `expired`/`time_limit_minutes` sin enforcement; token sin vencimiento → S1+S2.
5. `transitionQuestionStatus` descarta el actor (`void actorUserId`) → S1+S2.
6. `needs_human_rating` derivado del type del caller, no del real en DB → S2.
7. Ledger IA sin UNIQUE `input_digest` (propose repetido duplica cola) → S1+S2.
8. `submitAssessment` acepta submit desde `assigned`/`sent` (candidate_test sin start) → S2.
9. Templates editables in-place con instancias (mezcla versiones para 1364/1365) → S1+S3.
10. `decide.ts` no snapshotea el assessment (score al decidir no reconstruible) → S3.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/hiring/assessment/** (server-only, hardening in-place del dominio existente)`
- Future candidate home: `remain-shared`
- Boundary: `dominio hiring/assessment; único write cross-dominio ya existente = rollup a hiring_application (sin cambios de boundary)`
- Server/browser split: `server-only (sin cambios)`
- Build impact: `nulo (sin deps nuevas ni deployables)`
- Extraction blocker: `ninguno nuevo`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (migración additive con dedupe + fixes de dominio; sin superficie nueva)
- Impacto principal: `migration` + `command`/`reader` fixes
- Source of truth afectado: `greenhouse_hiring.hiring_assessment_response` (UNIQUE nuevos), `hiring_assessment` (token_expires_at), `hiring_question` (actor SME), `hiring_assessment_template` (version/supersedes + inmutabilidad), `hiring_assessment_ai_proposal` (dedupe)
- Consumidores afectados: TASK-1363 (costura), TASK-1364/1365 (versionado), desk 355 (snapshot en decide)
- Runtime target: Vercel (dominio server-only); sin worker

### Contract surface

- Se respeta todo contrato existente; cambios additive/endurecimiento: `saveResponse` (upsert, misma firma), `listResponses` (mismo shape, ahora filtra por viewer), `assignCandidateTest` (setea `token_expires_at`), `resolveAssessmentByToken`/`startAssessment`/`saveResponse`/`submitAssessment` (enforcement de expiración → transición a `expired`), `transitionQuestionStatus` (persiste actor), propose IA (dedupe → retorna la proposal pendiente existente), `decideHiringApplication` (enriquece `prerequisitesSnapshot.assessment` server-side).
- **Contrato nuevo (versionado):** templates con `version` (default 1) + `supersedes_template_id`; una vez que un template tiene instancias, su contenido y sus módulos son INMUTABLES (trigger DB); editar = crear versión nueva que supersede. Invariante documentado en arch doc.
- Backward compatibility: `additive` (firmas estables; DEFAULTs; dedupe previo a UNIQUE).

### Data model and invariants

- UNIQUE parciales en `hiring_assessment_response`: `(assessment_id, question_id) WHERE question_id IS NOT NULL` y `(assessment_id, competency_id) WHERE question_id IS NULL` — con dedupe previo (conservar la más reciente).
- `hiring_assessment.token_expires_at` TIMESTAMPTZ nullable; assign lo setea (+14 días); resolve/start/save/submit lo validan.
- Deadline de rendición = `started_at + time_limit_minutes` (sin columna nueva); vencido → transición a `expired` (loud, auditable por status).
- `hiring_question.status_changed_by/at` (SME gate auditable).
- UNIQUE parcial `hiring_assessment_ai_proposal (kind, input_digest) WHERE status='proposed'`.
- Trigger de inmutabilidad: UPDATE de columnas de contenido del template o UPDATE/DELETE de sus módulos con instancias existentes → RAISE (se permite `active`).
- Tenant/access: sin cambios (superficie interna existente).
- Idempotency: upsert por los UNIQUE nuevos; replay de submit/finalize ya idempotente por estado.

### Migration, backfill and rollout

- Migration posture: `additive` + dedupe determinístico previo a los UNIQUE (marker `-- Up Migration`, DO block anti pre-up-marker, GRANTs, Down solo undo).
- Default state: sin flag — son fixes de correctitud sobre superficie interna aún sin tráfico real (0 assessments productivos verificado en auditoría); las tasks consumers (1363) siguen flag-gated aguas arriba.
- Backfill: solo el dedupe in-migration. Rollback: reverse migration (DROP índices/columnas/trigger) + revert PR.
- External coordination: ninguna.

### Security and access

- Sin capabilities nuevas. Error contract existente del dominio (es-CL + códigos). `captureWithDomain(err,'hiring',…)`.
- Answer_key: test anti-leak obligatorio de `buildPublicQuestion` (S4).

### Runtime evidence

- `pnpm test` focal + full; live tests del dominio contra PG (proxy) ejercitando: upsert idempotente, anti-anclaje, expiración (token + time-limit), trigger de inmutabilidad, dedupe IA.
- `pnpm migrate:up` + verificación `information_schema` (UNIQUEs/columnas/trigger).

### Acceptance criteria additions

- [x] Autosave repetido (mismo assessment+question) = 1 fila; el AVG del finalize no cambia con replays.
- [x] Un evaluador con scorecard abierto NO recibe respuestas de otros evaluadores vía `listResponses`.
- [x] Token vencido / time-limit excedido → instancia `expired` y writes rechazados con código.
- [x] `buildPublicQuestion` testeado: output sin `answerKey`/`rubric`.
- [x] Template con instancias es inmutable (trigger verificado vivo); `version`/`supersedes_template_id` existen.
- [x] `decideHiringApplication` persiste `prerequisitesSnapshot.assessment` derivado del server (score/matchScore/scoredInstances/capturedAt).
- [x] Propose IA repetido con mismo `input_digest` retorna la proposal pendiente (no duplica).
- [x] SME gate registra actor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — EXECUTION LOG
     ═══════════════════════════════════════════════════════════ -->

### Execution Log (2026-07-10, Claude — local-first develop, misma sesión de la auditoría)

- **S1** (`34a031823`): migración `20260710202351833` — dedupe determinístico + 3 UNIQUE parciales + `token_expires_at` + `status_changed_by/at` + UNIQUE del ledger IA + `version`/`supersedes_template_id` + 2 triggers de inmutabilidad. Aplicada + verificada (pg_indexes/information_schema/DO guards).
- **S2-S3** (`1b89fe37b`): upserts (saveResponse/recordScorecardRating), anti-anclaje real en listResponses, expiración enforced (resolve/start/save/submit, auto-start del timer, submit solo in_progress), needs_human_rating del tipo real, actor SME, dedupe propose IA, snapshot server-side del assessment en decideHiringApplication.
- **S4**: tests — anti-leak buildPublicQuestion (unit) + guards de contrato + **6 live guards E2E contra PG real VERDES** (idempotencia 3-saves=1-fila, expiración time-limit→expired, anti-anclaje abierto/cerrado, upsert de rating, inmutabilidad de template/módulos, dedupe IA). decide.test.ts actualizado (COUNT del snapshot).
- **Higiene**: checkboxes 1360/1361 marcados con nota de auditoría; deltas a 1363 (costura endurecida + contratos de UI), 1364/1365 (versionado resuelto); delta + invariante de versionado en HIRING_ATS arch doc.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migración additive (dedupe + UNIQUEs + columnas + trigger de inmutabilidad + dedupe IA)

Todo el DDL del Data model (arriba) en una migración: dedupe de respuestas (conservar la más reciente por clave) → UNIQUE parciales → `token_expires_at` → `status_changed_by/at` → UNIQUE parcial del ledger IA (con dedupe previo de proposals `proposed` duplicadas) → columnas `version`/`supersedes_template_id` + trigger de inmutabilidad de templates. DO block + GRANTs + `db.d.ts`.

### Slice 2 — Fixes de dominio (la costura de 1363)

- `saveResponse`: upsert ON CONFLICT por los UNIQUE nuevos; `needs_human_rating` derivado del type REAL en DB cuando hay `questionId` (fallback al declarado solo para respuestas ad-hoc sin pregunta); valida expiración.
- `recordScorecardRating`: upsert por `(assessment_id, competency_id)` (verificar impl actual; alinear).
- `listResponses`: implementar el gating independent-before-debrief reusando el patrón de `listPeerScorecardResults` (scorecards: si el viewer no cerró el suyo, no ve respuestas ajenas de la misma application).
- Expiración: `assignCandidateTest` setea `token_expires_at` (+14d); `resolveAssessmentByToken`/`startAssessment`/`saveResponse`/`submitAssessment` validan token vencido y deadline `started_at + time_limit_minutes` → transición a `expired` + error con código.
- `submitAssessment`: candidate_test exige `in_progress` (scorecard conserva su camino actual — verificar y no romper `finalizeAssessment`).
- `transitionQuestionStatus`: persiste `status_changed_by/at`.
- Propose IA: si existe proposal `proposed` con mismo `(kind, input_digest)` → retornarla (no duplicar).

### Slice 3 — Snapshot del assessment en la decisión + contrato de versionado

- `decideHiringApplication`: dentro de su tx (ya tiene el row FOR UPDATE), derivar `prerequisitesSnapshot.assessment = {score, matchScore, scoredInstances, capturedAt}` del estado real (NUNCA confiar el snapshot al caller). Additive al shape del history.
- Documentar el invariante de versionado de templates en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (delta): template usado = inmutable; editar = nueva versión con `supersedes_template_id`; 1364/1365 correlacionan por template_id sabiendo que un id = un contenido congelado.

### Slice 4 — Tests + higiene documental

- Tests: anti-leak `buildPublicQuestion`; idempotencia `saveResponse` (unit + live); anti-anclaje `listResponses`; expiración (token + time-limit, live); trigger inmutabilidad (live); dedupe propose IA; snapshot en decide.
- Higiene: marcar Acceptance Criteria de 1360/1361 (as-built verificado por auditoría) con nota; `## Delta` a 1363 (costura endurecida), 1364/1365 (versionado decidido); nota del banco de preguntas SME + actionKey Nexa como follow-ups con dueño.

## Out of Scope

- La superficie de rendición/review (TASK-1363) y cualquier UI.
- Correr el eval baseline IA / flip de `HIRING_ASSESSMENT_AI_ENABLED` (gate del operador: eval + sign-off HR/Legal).
- El contenido real del banco de preguntas (SME) — queda como follow-up con dueño declarado.
- 1364/1365 en sí (solo se les deja el contrato de versionado).
- Authoring UI de versiones de template (V1: crear template nuevo con `supersedes_template_id`).

## Detailed Spec

Los 10 hallazgos numerados en `Current Repo State > Gap` son la spec: cada uno cita archivo/línea verificados en la auditoría 2026-07-10. Decisión de diseño clave (versionado): **inmutabilidad por trigger + supersede explícito** (patrón OTB/append-only del repo) en lugar de tabla de versiones — el costo es mínimo hoy (no existe update-path de templates) y garantiza a nivel de datos que `template_id` = contenido congelado, que es exactamente lo que 1364/1365 necesitan para correlacionar sin mezclar versiones.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

S1 (DDL + dedupe) ANTES que S2 (los upserts dependen de los UNIQUE). S3/S4 tras S2. No hay flag: correctitud interna sin tráfico productivo (verificado 0 assessments reales).

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Signal |
|---|---|---|---|---|
| Dedupe borra la respuesta equivocada | data | Baja | conservar la más reciente por created_at; dominio sin tráfico real; live test | count pre/post en migración |
| UNIQUE rompe un flujo existente | assessment | Baja | live tests del dominio ya existentes + nuevos | `pnpm test` full |
| Trigger de inmutabilidad bloquea un write legítimo | assessment | Baja | permite `active`; solo bloquea contenido/módulos con instancias | live test del trigger |
| Snapshot en decide cambia shape del history | desk 355 | Baja | additive (`prerequisitesSnapshot.assessment`); tests de decide existentes verdes | `decide.test.ts` |

### Feature flags / cutover

N/A — fixes de correctitud additive sobre superficie interna sin tráfico; los consumers siguen gated aguas arriba (1363: superficie inexistente; IA: flag OFF).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 migración | reverse (DROP índices/columnas/trigger) | ~min | Sí |
| 2-3 dominio | revert PR | ~min | Sí |
| 4 tests/docs | revert PR | ~min | Sí |

### Production verification sequence

`pnpm migrate:up` + verify information_schema → tests full → live tests del dominio contra PG → (rollout del código con el próximo push/release normal — sin pasos extra).

### Out-of-band coordination required

Ninguna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Los 8 criterios binarios del Backend/Data Contract (arriba) verdes.
- [x] Migración aplicada + verificada (`information_schema`: 3 UNIQUEs parciales, 4 columnas, 1 trigger).
- [x] `pnpm test` full verde; live tests del dominio assessment verdes contra PG.
- [x] Docstrings ya no prometen lo que el código no hace (saveResponse/listResponses).
- [x] Deltas cruzados dejados en 1363/1364/1365 + checkboxes 1360/1361 saneados.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test` (full) · `pnpm build`
- `pnpm migrate:up` + verificación `information_schema`
- Live tests: `pnpm vitest run src/lib/hiring/assessment` con proxy PG activo
- `pnpm qa:gates --changed` + `pnpm docs:closure-check`

## Closing Protocol

- [x] Lifecycle/carpeta sync; README + TASK_ID_REGISTRY; Handoff + changelog.
- [x] `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` delta (hardening + invariante de versionado).
- [x] Deltas a TASK-1363/1364/1365; checkboxes 1360/1361.

## Follow-ups

- Banco de preguntas real por competencia (contenido SME, gate `sme_review`) — sin task aún; dueño: People Ops + SME por skill.
- Nexa actionKey `confirm_assessment_ai_proposal` (deferido de 1361) — task propia cuando el action runtime lo priorice.
- Correr eval baseline IA + sign-off HR/Legal → flip `HIRING_ASSESSMENT_AI_ENABLED` (gate operador, ya en el ledger).
