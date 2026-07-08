# TASK-1360 — Assessment Engine Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-353`
- Branch: `task/TASK-1360-assessment-engine-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializar el motor de evaluación por competencias de `Hiring / ATS`: catálogo de competencias, banco de preguntas, plantillas de test, instancias que rinde el candidato, respuestas, scoring objetivo + humano y resultados por competencia que ruedan hacia `hiring_application`. Incluye el scorecard humano de entrevista (`HiringEvaluation`). Sin esto, el desk (TASK-355) no puede evaluar candidatos con tests reales ni scorecards estructurados.

## Why This Task Exists

TASK-353 dejó la foundation del pipeline (`talent_demand → hiring_opening → candidate_facet → hiring_application`) pero la evaluación del candidato quedó como snapshot suelto (`hiring_application.score`) sin estructura. La arquitectura ya nombró `HiringEvaluation` con la regla "no reducir la evaluación a comentarios sueltos", y operación necesita **tests que rinde el candidato** (actitudinales, de aptitud y de conocimiento por skill: SEO, copywriting, liderazgo, vendor management, etc.). Hoy no existe ningún modelo de competencias, banco de preguntas ni scoring. Caso vivo que fuerza el diseño: vacante de Account Manager que exige nociones de SEO + copywriting + liderazgo + vendor management.

## Goal

- Crear el modelo canónico de competencias (ejes ortogonales `category` × `level`) + banco de preguntas con `answer_key` sensible separada.
- Permitir componer plantillas de test por cargo (ej. Account Manager) e instanciarlas contra una `hiring_application`.
- Scoring objetivo automático + cola de corrección humana, con resultado por competencia que rueda a `hiring_application.score/match_score/explainability_json`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§`HiringEvaluation` + §`Delta 2026-07-08 — Assessment`)
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- El resultado por competencia rueda hacia `hiring_application` (SSOT del headline en la postulación); el assessment es el detalle que lo alimenta, NO una segunda verdad.
- `category` (`attitudinal|aptitude|skill`) y `level` (`nociones|intermedio|avanzado`) son ejes ortogonales: dos columnas, NUNCA un enum combinado.
- `answer_key`/`rubric` es sensible: se persiste separada y NUNCA viaja en el payload que ve el candidato (misma disciplina allowlist que `buildPublicOpeningPayload`).
- El score de assessment es hiring-interno y ortogonal a payroll/ICO/bonus. NUNCA alimenta nómina.
- El assessment es input a una decisión humana; NUNCA auto-rechaza una postulación.
- Toda capability nueva nace grantada a ≥1 rol real en el mismo PR (guard `capability-grant-coverage.test.ts`).

## Normative Docs

- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md` (§`Delta 2026-07-08`)
- `project_context.md` (§`Delta 2026-07-07 TASK-353`)
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `TASK-353` (schema `greenhouse_hiring` + `hiring_application` + store `src/lib/hiring/**`)
- `greenhouse_hiring.hiring_application` (tabla existente — rollup target)
- `src/lib/hiring/store.ts` (patrón de store + outbox transaccional)
- `src/lib/hr-evals/postgres-evals-store.ts` (blueprint de scorecard competency→response→summary) `[verificar]`

### Blocks / Impacts

- `TASK-1361` (Assessment AI Assist — consume el banco de preguntas + respuestas abiertas)
- `TASK-1363` (Assessment Taking + Review Surface — UI del motor)
- `TASK-355` (Application 360 muestra el scorecard)

### Files owned

- `migrations/<ts>_task-1360-assessment-engine.sql`
- `migrations/<ts>_task-1360-assessment-capabilities-seed.sql`
- `migrations/<ts>_task-1360-seed-competencies-and-account-manager-template.sql`
- `src/lib/hiring/assessment/**`
- `src/types/hiring-assessment.ts`
- `src/app/api/hiring/assessments/**`
- `src/config/entitlements-catalog.ts` (solo agregar capabilities hiring.assessment.*)
- `src/lib/entitlements/runtime.ts` (solo agregar grants)
- `src/lib/sync/event-catalog.ts` (solo agregar aggregate/event types)
- `src/types/db.d.ts`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- Foundation Hiring: `greenhouse_hiring` (4 aggregates) + store `src/lib/hiring/**` + outbox pattern (TASK-353).
- `hiring_application.score`/`match_score`/`explainability_json` como snapshot target del rollup.
- Blueprint de scorecard con rúbrica: `greenhouse_hr` `eval_competencies`/`eval_responses`/`eval_summaries` + `src/lib/hr-evals/**` `[verificar]` (dominio HR, evaluatee=member — NO reutilizar tablas directas, solo el shape).
- Plataforma de assets privados (para adjuntos en respuestas abiertas, vía TASK-1362).

### Gap

- No existe modelo de competencias ni banco de preguntas.
- No existe plantilla/instancia de test ni scoring.
- No existe scorecard humano estructurado para hiring (solo el número suelto en la application).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: nuevas tablas `greenhouse_hiring.hiring_competency` / `hiring_question` / `hiring_assessment_template` / `hiring_assessment_template_module` / `hiring_assessment` / `hiring_assessment_response` / `hiring_competency_result`; rollup hacia `hiring_application`
- Consumidores afectados: UI (TASK-1363), API interna, Nexa/MCP (por parity), TASK-1361 (AI)
- Runtime target: `local` → `staging` → `production`

### Contract surface

- Contrato existente a respetar: `src/lib/hiring/store.ts` (patrón), `hiring_application` rollup fields, `publishOutboxEvent`
- Contrato nuevo: readers/commands en `src/lib/hiring/assessment/**` + rutas `/api/hiring/assessments/**` + eventos `hiring.assessment.*`
- Backward compatibility: `compatible` (additive; nuevas tablas + columnas, sin romper TASK-353)
- Full API parity: la lógica vive en `src/lib/hiring/assessment/**` (commands/readers), la UI y Nexa son clientes; writes vía command gobernado con capability

### Data model and invariants

- Entidades/tablas afectadas: `greenhouse_hiring.hiring_competency`, `hiring_question` (+ `answer_key_json` sensible), `hiring_assessment_template`, `hiring_assessment_template_module`, `hiring_assessment` (instancia: método `candidate_test|interviewer_scorecard`), `hiring_assessment_response`, `hiring_competency_result`
- Invariantes que no se pueden romper:
  - `category` × `level` ortogonales (dos columnas + CHECK cada una)
  - `answer_key_json`/`rubric_json` NUNCA en el payload candidate-facing
  - resultado por competencia rueda a `hiring_application` (rollup determinístico), no crea verdad paralela
  - score ortogonal a payroll/ICO; nunca auto-reject
  - una instancia de test pertenece a exactamente una `hiring_application`
- Tenant/space boundary: heredado de `hiring_application` (scope interno; readers filtran por el mismo predicado que TASK-353)
- Idempotency/concurrency: crear instancia idempotente por (`application_id`, `template_id`) abierta; submit de respuestas atómico; scoring en transacción; token de acceso remoto single-use (consumido en submit)
- Audit/outbox/history: eventos `hiring.assessment.{template_created,assigned,submitted,scored}` + `hiring.competency_result.updated`; respuestas append-only (supersede, no delete)

### Migration, backfill and rollout

- Migration posture: `additive` (schema nuevo + seed de competencias/plantilla + capabilities seed)
- Default state: `enabled` (additive; sin flag — nadie consume hasta TASK-1363; el candidate-facing surface es lo gateado)
- Backfill plan: `none` (no hay datos previos; solo seed de catálogo + plantilla Account Manager)
- Rollback path: `reverse migration` (DROP de tablas nuevas) + revert PR; capabilities → `deprecated_at`
- External coordination: `none` (repo-only + DB dev/staging/prod vía release pipeline)

### Security and access

- Auth/access gate: capabilities `hiring.assessment.read` (leer resultados/plantillas), `hiring.assessment.author` (crear plantillas/preguntas/asignar), `hiring.assessment.score` (registrar/corregir scoring humano). Grant a roles internos reales (internal ∪ EFEONCE_ADMIN ∪ HR_MANAGER ∪ EFEONCE_OPERATIONS ∪ EFEONCE_ACCOUNT), NUNCA `client_*`.
- Sensitive data posture: `answer_key_json` sensible (separada del payload candidato); respuestas del candidato = PII moderada (nombre/respuestas), sin exponer a `client_*`
- Error contract: `toHiringErrorResponse` (canonical es-CL, `captureWithDomain(err, 'hiring')`), NO prosa inglesa raw
- Abuse/rate-limit posture: el modo remoto (token single-use + tiempo límite) vive en TASK-1363; el engine expone el contrato de token pero el rate-limit del apply público es de esa task

### Runtime evidence

- Local checks: unit tests del scoring objetivo + rollup determinístico + test anti-leak de `answer_key` (no aparece en el payload candidato)
- DB/runtime checks: smoke contra PG dev (crear competencias → banco → plantilla AM → instancia → responder → score → verificar rollup en `hiring_application`), vía `pnpm pg:connect` + `tsx`
- Integration checks: `none` (sin providers externos; la IA es TASK-1361)
- Reliability signals/logs: outbox `hiring.assessment.*`; sin consumer reactivo en V1 (audit/observabilidad)
- Production verification sequence: migrate staging → seed verify → API smoke con agent auth → repetir en prod vía release pipeline

### Acceptance criteria additions

- [ ] Source of truth (tablas assessment) + contract surface (`src/lib/hiring/assessment/**`, `/api/hiring/assessments/**`) + consumers nombrados con paths reales.
- [ ] Invariantes (ortogonalidad category/level, answer_key sensible, rollup determinístico, no-payroll) explícitos y con test.
- [ ] Migration additive + rollback (reverse migration) explícito.
- [ ] Evidencia DB real: smoke de la cadena completa contra PG dev.
- [ ] Canonical errors + audit/outbox + sin leak de answer_key.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `src/lib/hiring/assessment/**` (commands/readers), no en UI.
- [ ] Modelada como aggregates/commands (crear plantilla, asignar instancia, submit, score), no click-handlers.
- [ ] Read = readers canónicos; write = commands con capability fina + idempotencia + outbox + errores canónicos.
- [ ] Capabilities `hiring.assessment.{read,author,score}` + grant a ≥1 rol real + coverage test en el MISMO PR.
- [ ] Camino programático: Product API `/api/hiring/assessments/**`; Nexa/MCP por construcción.
- [ ] Writes aptos para `propose → confirm → execute` (la IA de TASK-1361 lo usa).
- [ ] Un primitive, muchos consumers (UI/Nexa/CLI/AI) sin lógica duplicada.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Competency catalog + question bank

- Migración: `hiring_competency` (`competency_id`, `key` UNIQUE, `name`, `category` CHECK `attitudinal|aptitude|skill`, `description`, `status`) + `hiring_question` (`question_id`, `competency_id` FK, `level` CHECK `nociones|intermedio|avanzado`, `type` CHECK `single_choice|multi_choice|likert|situational|open_text`, `prompt`, `options_json`, `answer_key_json`, `rubric_json`, `status` CHECK incluye `draft|sme_review|active|retired`).
- Seed de competencias reales (revisado con `greenhouse-talent-people-operator`): **skill** — SEO, copywriting, project_management, community_management, leadership, vendor_management, **client_relationship_comm** (relación con cliente + comunicación), **commercial_acumen** (crecimiento de cuenta / upsell), **delivery_coordination**; **attitudinal** — ownership, communication, collaboration, **composure_pressure** (compostura bajo presión del cliente); **aptitude** — numerical, verbal, logical. (Las 5 competencias AM `client_relationship_comm`/`commercial_acumen`/`delivery_coordination`/`ownership`/`composure_pressure` son el backbone real del Account Manager — ver plantilla en Slice 2.)
- **Política de tipo por defecto (validez, Sackett 2022 — work sample > MCQ):** para una `skill` a nivel `intermedio`/`avanzado` el tipo por defecto es **work-sample/situational** (`open_text`/`situational`), NO `single_choice`. El MCQ (`single/multi_choice`) se reserva para `nociones`/conocimiento factual. El `likert` actitudinal se auto-reporta (deseabilidad social) → **triangular siempre con un `situational` (SJT)** de la misma competencia.
- **Gate de gobernanza de contenido (SME):** una pregunta nace `draft` → requiere revisión de experto (SME) por competencia → `active`. Un banco de preguntas sin validar = test inválido. El gate SME se cruza con TASK-1361 (la IA propone, un SME confirma antes de `active`).
- Reader masked (sin `answer_key_json`) + reader interno full (con capability).

### Slice 2 — Assessment templates + composition

- Migración: `hiring_assessment_template` (`template_id`, `name`, `role_hint`, `status`) + `hiring_assessment_template_module` (`template_id` FK, `competency_id` FK, `target_level`, `weight`).
- Command para crear/editar plantilla + módulos (capability `hiring.assessment.author`).
- Seed: plantilla **"Account Manager L2"** (revisada con `greenhouse-talent-people-operator` — el rol es principalmente relación/comercial/coordinación; los 4 skills pedidos son conocimiento de apoyo, 38% combinado): `client_relationship_comm@intermedio(20)` + `commercial_acumen@intermedio(15)` + `copywriting@intermedio(12, work-sample)` + `leadership@intermedio(10, SJT+entrevista)` + `ownership@attitudinal(10, SJT)` + `composure_pressure@attitudinal(10, SJT)` + `seo@nociones(8)` + `vendor_management@nociones(8)` + `delivery_coordination@intermedio(7)` = 100. Work sample integrado recomendado (un caso de cliente que toca comunicación+copy+SEO+vendor+ownership a la vez) documentado en el brief de la vacante.

### Slice 3 — Assessment instance + responses

- Migración: `hiring_assessment` (`assessment_id`, `application_id` FK, `template_id` FK nullable, `method` CHECK `candidate_test|interviewer_scorecard`, `evaluator_user_id` nullable, `status` CHECK `assigned|sent|in_progress|submitted|scored|expired`, `access_token_hash` nullable, `time_limit_minutes` nullable, **`accommodations_json`** (tiempo extra / formato accesible), `started_at`, `submitted_at`) + `hiring_assessment_response` (`response_id`, `assessment_id` FK, `question_id` FK nullable, `competency_id` FK, `answer_json`, `auto_score`, `needs_human_rating`).
- Commands: asignar instancia (idempotente por application+template abierta), registrar respuestas (submit atómico), token single-use para el modo remoto.
- **Anti-anclaje del scorecard humano (`interviewer_scorecard`):** un evaluador NO puede ver los ratings de otros evaluadores de la misma application hasta haber enviado el suyo (independiente antes del debrief — reduce anchoring/groupthink, sube validez). Enforce en el reader (filtra ratings ajenos mientras el propio esté abierto).

### Slice 4 — Scoring + competency-result rollup

- Migración: `hiring_competency_result` (`result_id`, `assessment_id` FK, `competency_id` FK, `score`, `level_achieved`).
- Scoring objetivo automático (single/multi/likert contra `answer_key_json`); cola de corrección humana para `situational`/`open_text` (capability `hiring.assessment.score`).
- Rollup determinístico: al scorear, actualizar `hiring_application.score`/`match_score`/`explainability_json` (agregación ponderada por template weights). Helper canónico único, sin recomputo en callsites.

### Slice 5 — Capabilities + API baseline

- Capabilities `hiring.assessment.{read,author,score}` en catálogo + grants en runtime + seed `capabilities_registry` + coverage test.
- Rutas internas `/api/hiring/assessments/**` (templates, instances, responses, score) dual-gate.
- Aggregate/event types en `event-catalog` + eventos en los writes.

## Out of Scope

- Superficie candidate-facing / desk UI (TASK-1363).
- Generación IA de preguntas + corrección IA de respuestas (TASK-1361).
- Carga de documentos/adjuntos en respuestas (TASK-1362 provee la plataforma; el wiring del adjunto en una respuesta puede referenciarse pero el upload es de 1362).
- Handoff/decision downstream (TASK-356).

## Detailed Spec

El detalle de schema por tabla, enums y el ejemplo Account Manager viven en `EPIC-011 → Delta 2026-07-08` y `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md → Delta 2026-07-08`. Reglas de implementación:

- Espejar el patrón de `src/lib/hiring/store.ts` (SQL crudo parametrizado + normalizadores + `HiringValidationError` + outbox transaccional).
- Migración con marker `-- Up Migration`, DO block anti pre-up-marker, GRANTs a los 3 roles DB, DDL solo en Up.
- El rollup a `hiring_application` es un helper único (`rollupCompetencyResultsToApplication`); ningún callsite recomputa el score.
- `answer_key_json` NUNCA en el reader candidate-facing ni en el payload de la instancia enviada; test anti-leak obligatorio (mirror de `publication.test.ts`).

### Refinamientos de validez/fairness (revisión `greenhouse-talent-people-operator`, 2026)

- **Work-sample-first** para `skill@intermedio+` (default `open_text`/`situational`, no MCQ) — la entrevista estructurada + work sample son los predictores más fuertes (Sackett, Zhang, Berry & Lievens 2022, que revisó Schmidt-Hunter). MCQ solo para `nociones`/conocimiento factual.
- **SME content gate**: pregunta `draft → sme_review → active`; nada entra al banco activo sin revisión de experto (cruza con TASK-1361 propose→confirm).
- **Independent-before-debrief** en el scorecard humano (anti-anclaje).
- **Likert triangulado con SJT** (deseabilidad social del auto-reporte).
- **Accommodations** por instancia (tiempo extra / formato accesible) — accesibilidad del test (WCAG, compone con `a11y-architect`).
- **AI-Act awareness**: como el scoring puede asistirse con IA (TASK-1361), el eval baseline + audit trail de este engine alimentan la documentación técnica exigida (hiring-AI = alto riesgo desde 2-ago-2026). El score es SIEMPRE advisory; el humano decide (human oversight).
- **Loop de validez y fairness monitoring** quedan como tasks follow-up (ver Follow-ups): el engine debe dejar los datos (scores + outcome-linkable + audit) para que esas capacidades se construyan encima.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (competency+question) → Slice 2 (template) → Slice 3 (instance+response) → Slice 4 (scoring+rollup) → Slice 5 (capabilities+API).
- Slice 4 depende de 1-3; el rollup a `hiring_application` NO puede shippear antes de que las respuestas existan (Slice 3).
- Slice 5 (capabilities) puede prepararse en paralelo pero las rutas requieren los commands de 1-4.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| `answer_key` filtrada al candidato | UI / API | medium | Reader masked + test anti-leak + allowlist en payload de instancia | test rojo en CI; sin signal runtime |
| Rollup dobla/pisa el score real del application | migration / data | medium | Helper único determinístico + test de rollup; additive sobre snapshot existente | drift visible en Application 360 |
| Score de assessment contamina payroll/ICO | payroll | low | Boundary duro documentado + gate `pnpm vitest run src/lib/payroll` verde | regresión en tests payroll |
| Capability sin grant → 403 latente | identity | low | Grant + coverage test mismo PR | `capability-grant-coverage.test.ts` rojo |

### Feature flags / cutover

- Sin flag — additive, immediate cutover. Nadie consume el engine hasta TASK-1363 (el candidate-facing surface es lo que se gatea/rate-limita). Razón: crear catálogo + plantillas + scoring interno no tiene blast radius productivo hasta que exista una superficie que lo exponga.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-4 | reverse migration (DROP tablas nuevas) + revert PR | <15 min | si (additive, sin datos productivos) |
| Slice 5 | capabilities → `deprecated_at` + revert grants/rutas | <10 min | si |

### Production verification sequence

1. `pnpm migrate:up` staging + verify 7 tablas + seed de competencias/plantilla existen.
2. Deploy code staging + smoke API con agent auth (crear instancia → responder → score → verificar rollup en application).
3. Verify boundary: `pnpm vitest run src/lib/payroll` verde (score no contamina payroll).
4. Repetir 1-3 en producción vía release pipeline.

### Out-of-band coordination required

- N/A — repo-only + DB vía release pipeline.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existen las tablas del motor (competency, question, template, template_module, assessment, response, competency_result) en `greenhouse_hiring`, additive sobre TASK-353.
- [ ] `category` y `level` son columnas separadas con CHECK; ningún enum combinado.
- [ ] `answer_key_json`/`rubric_json` NUNCA aparece en el reader/payload candidate-facing (test anti-leak verde).
- [ ] Existe la plantilla seed "Account Manager L2" con los 5 módulos ponderados.
- [ ] Scoring objetivo automático + cola de corrección humana funcionan; el resultado por competencia rueda a `hiring_application.score/match_score/explainability_json` vía helper único.
- [ ] El score de assessment NO alimenta payroll/ICO ni auto-rechaza (boundary con test).
- [ ] Capabilities `hiring.assessment.{read,author,score}` en catálogo + grants a roles reales + coverage test verde.
- [ ] Rutas `/api/hiring/assessments/**` dual-gate con errores canónicos es-CL.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm vitest run src/lib/payroll src/lib/hiring` (boundary + dominio verdes)
- Smoke DB real: cadena competencia→banco→plantilla→instancia→respuesta→score→rollup contra PG dev
- `pnpm pg:connect:status` + verify de tablas/seed

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomar, `complete` al cerrar)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1361/1363/355)
- [ ] delta en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` si el schema final difiere del diseño
- [ ] `GREENHOUSE_EVENT_CATALOG_V1.md` delta con eventos `hiring.assessment.*`

## Follow-ups

- `TASK-1361` (AI assist sobre el banco/respuestas)
- `TASK-1363` (superficie de rendición + review)
- `TASK-1364` (validity feedback loop: assessment score → quality-of-hire a 90d/6m) — cierra el loop "¿el test predice?"
- `TASK-1365` (adverse-impact & fairness monitoring: tasas de selección por grupo + drift) — requisito de bias testing del EU AI Act
- Banco de preguntas real por competencia (contenido, work-sample-first) — requiere SME por skill (gate `sme_review`)

## Open Questions

- ¿El scorecard humano (`interviewer_scorecard`) comparte la tabla `hiring_assessment` con `method` o merece tabla propia? Diseño actual: comparte con dimensión `method` (un modelo, dos mecanismos). Confirmar en Discovery si la divergencia de campos justifica separar.
- ¿Nivel de granularidad del `hiring_competency_result` — por competencia solamente, o también por pregunta? Diseño actual: por competencia (rollup); el detalle por pregunta vive en `hiring_assessment_response`.
