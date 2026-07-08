# EPIC-011 — Hiring / ATS End-to-End Program

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-011-hiring-ats-end-to-end-program`
- GitHub Issue: `none`

## Summary

Coordina el programa end-to-end de `Hiring / ATS`: desde una demanda de talento (`TalentDemand`) hasta una postulación/candidato operado en pipeline, handoff aprobado y, para `internal_hire`, activación final como colaborador vía HRIS/People + onboarding readiness.

## Why This Epic Exists

Hiring cruza `Agency`, `People`, `HRIS`, `Staff Augmentation`, Identity/Access, storage privado y surfaces públicas. Si se implementa como tasks aisladas, el riesgo es alto: candidatos como identidades paralelas, vacantes públicas como pipeline separado, UI sin foundation, o seleccionados que nunca pasan a colaborador activo.

Este epic fija la secuencia obligatoria y los gates entre tasks para que el módulo nazca robusto, seguro, resiliente y escalable.

## Outcome

- Hiring queda modelado como dominio canónico `greenhouse_hiring`, no como extensión informal de HRIS o Staff Aug.
- La landing pública de careers alimenta el mismo pipeline interno, sin pipeline paralelo.
- El Hiring Desk opera `HiringApplication` como unidad visual/transaccional.
- El handoff downstream es explícito, versionado, auditable e idempotente.
- El caso `internal_hire` cierra el loop: seleccionado -> HRIS activation queue -> member/onboarding -> collaborator active.
- People 360 conserva el journey longitudinal sin duplicar identidad humana.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

## Execution Sequence

### Phase 0 — Program Coordination

- `TASK-352` — mantiene la umbrella del programa y verifica que las child tasks sigan alineadas.
- No implementa runtime directo.
- Gate para avanzar: child tasks tienen ownership, dependencias y scopes no solapados.

### Phase 1 — Foundation First

- `TASK-353` — crea foundation transaccional: `TalentDemand`, `HiringOpening`, `CandidateFacet`, `HiringApplication`, publication contract y APIs internas base.
- Debe ejecutarse antes de cualquier UI pública o interna.
- Gate para avanzar: schema `greenhouse_hiring`, service/API baseline y publication allowlist existen; `CandidateFacet` referencia `identity_profile_id`.

### Phase 2 — Public Entry + Internal Desk

- `TASK-354` — construye careers público, detail de openings y apply intake.
- `TASK-355` — construye Hiring Desk interno, Demand Desk, Pipeline Board, Application 360 y Publication Desk.
- Pueden avanzar en paralelo solo después de `TASK-353`.
- Gate para avanzar: apply público crea/reconcilia `Person` + `CandidateFacet` + `HiringApplication`; desk interno opera `HiringApplication`, no personas sueltas.

### Phase 3 — Handoff + Reactive Bridges

- `TASK-356` — crea `HiringHandoff`, eventos `hiring.*`, señales y bridges downstream hacia People/HRIS/Staff Aug.
- Debe ejecutarse después de `TASK-353`; puede integrar outputs de `TASK-354`/`TASK-355`.
- Gate para avanzar: `internal_hire` aprobado llega a cola/read-model para HRIS/People, pero Hiring no crea `member`, payroll truth, access ni placement por side effect.

### Phase 4 — Collaborator Activation Closure

- `TASK-770` — consume handoffs `internal_hire` aprobados y cierra el loop con HRIS/People: member facet sobre el mismo `identity_profile_id`, onboarding, readiness y activación final.
- Debe ejecutarse después de `TASK-356` y requiere `TASK-030`.
- Gate final: selected candidate puede terminar como collaborator active sin duplicar persona, saltarse onboarding ni activar payroll/access prematuramente.

## Child Tasks

- `TASK-352` — Program umbrella and coordination for Hiring / ATS.
- `TASK-353` — Domain foundation: aggregates, schema, services, API baseline and publication contract. **✓ complete (2026-07-07).**
- `TASK-354` — Public careers landing and apply intake.
- `TASK-355` — Internal Hiring Desk, pipeline and publication governance.
- `TASK-356` — Handoff, reactive events/signals and downstream bridges.
- `TASK-770` — HRIS/People activation closure for `internal_hire`.

### Assessment + Candidate Intake extension (Delta 2026-07-08)

- `TASK-1360` — **Assessment Engine foundation**: competency catalog + question bank + assessment templates + candidate test instances + interviewer scorecards, objective + human scoring, competency-result rollup into `hiring_application`. Seeds the real competencies (SEO, copywriting, project management, community management, leadership, vendor management + attitudinal + aptitude) and the first Account Manager template. `backend-data`. Blocked by `TASK-353`.
- `TASK-1361` — **Assessment AI Assist**: governed AI question generation + AI-proposed scoring of open/situational answers (propose → confirm, human confirms; eval baseline). `backend-data`. Blocked by `TASK-1360`.
- `TASK-1362` — **Candidate Document Capture**: hiring asset contexts (CV/portfolio) on the private assets platform + candidate identity-document linking (reuse `person_identity_documents` masked/reveal) + upload quarantine/scan for public uploads. `backend-data`. Blocked by `TASK-353`.
- `TASK-1363` — **Assessment Taking + Review Surface**: candidate-facing remote tokenized test-taking + internal rating/review surface in the desk. `ui-ux`. Blocked by `TASK-1360` (+ product-design loop).
- `TASK-1364` — **Assessment Validity Feedback Loop**: link assessment score → real hire outcome (quality-of-hire 90d/6m) to measure predictive validity; read-only, advisory, feeds EU AI-Act technical documentation. `backend-data`. Blocked by `TASK-1360`. (From the `greenhouse-talent-people-operator` review of TASK-1360 — validity gap.)
- `TASK-1365` — **Adverse-Impact & Fairness Monitoring**: privacy-safe aggregate monitoring of selection rates across groups (4/5ths) + drift; voluntary self-ID separated from the decision; observes, never adjusts; required for EU AI-Act bias testing. `backend-data`. Blocked by `TASK-1360`. (From the `greenhouse-talent-people-operator` review — fairness gap.)

## Existing Related Work

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`
- `docs/tasks/to-do/TASK-030-hris-onboarding-offboarding.md`
- `docs/tasks/to-do/TASK-763-lifecycle-onboarding-offboarding-ui-mockup-adoption.md`
- `src/lib/person-360/person-complete-360.ts`
- `src/lib/people/get-person-detail.ts`
- `src/lib/staff-augmentation/store.ts`
- `src/lib/storage/greenhouse-assets.ts`
- `src/app/api/assets/private/route.ts`

## Agent Execution Rules

- Do not start `TASK-354`, `TASK-355`, `TASK-356` or `TASK-770` before `TASK-353` is complete unless the task is explicitly limited to read-only design refresh.
- Do not create a root `candidate` identity. Use `identity_profile_id` as human root and `CandidateFacet` as recruiting facet.
- Do not create `member`, `assignment`, `placement`, payroll truth or access from `TASK-353`, `TASK-354`, `TASK-355` or the Hiring side of `TASK-356`.
- Use the shared private assets platform for CV/portfolio files: `GREENHOUSE_PRIVATE_ASSETS_BUCKET`, `greenhouse_core.assets`, `/api/assets/private`.
- The public apply flow must be rate-limited, consent-gated, sanitized, idempotent and must not leak dedupe/internal status.
- The pipeline board moves `HiringApplication`, not `Person` and not `HiringOpening`.
- `TASK-770` is the only child task that closes `internal_hire` as collaborator active, and it does so under HRIS/People ownership.

## Exit Criteria

- [ ] `TASK-353` delivered foundation and no downstream task uses mocks or parallel schema.
- [ ] `TASK-354` delivered public careers/apply without exposing internal opening metadata or unsafe assets.
- [ ] `TASK-355` delivered internal desk with `HiringApplication` as board unit and capability-aware PII handling.
- [ ] `TASK-356` delivered auditable `HiringHandoff`, versioned events and downstream signals.
- [ ] `TASK-770` delivered selected candidate -> collaborator active closure for `internal_hire`.
- [ ] People 360 shows the journey from candidate/application to member/onboarding/active without duplicate identities.
- [ ] Event catalog, architecture docs, functional docs and user manuals are updated where behavior changed.

## Non-goals

- No AI scoring/evaluation automation in the first pass.
- No Talent Pool global search in V1; it remains a follow-up after foundation + handoff.
- No client-branded microsites in V1.
- No automatic member/placement/payroll/access creation directly from Hiring.
- No replacement of HRIS onboarding runtime in this epic.

## Delta 2026-05-03

- Epic created to make the execution sequence explicit after `TASK-770` was added as the missing closure from selected candidate to active collaborator.

## Delta 2026-07-08 — Assessment (candidate testing) + Document Capture design

Operator requirement: el dominio necesita (1) **tests que rinde el candidato** — actitudinales, de aptitud/capacidad, y de conocimiento por skill (SEO, project management, community management, copywriting, liderazgo, vendor management) — y (2) **carga de documentos** (CV, enlace de portafolio, documento de identidad). Caso vivo que fuerza el diseño: vacante de **Account Manager** que exige nociones de SEO + copywriting + liderazgo + vendor management.

### El "Assessment" son dos mecanismos, un modelo de competencias

- **Test que rinde el candidato** (nuevo): un cuestionario versionado con answer-key + scoring + mapeo a competencias, que el candidato responde remoto (link tokenizado single-use + tiempo límite).
- **Scorecard humano de entrevista** (`HiringEvaluation`, ya anticipado en la arquitectura): un entrevistador registra ratings por competencia tras la entrevista.
- Ambos producen **resultados por competencia** que ruedan hacia `hiring_application.score` / `match_score` / `explainability_json` (SSOT del número headline sigue en la postulación).

### Modelo por competencias (composición, no tests hardcodeados)

- **Catálogo de competencias** reutilizable, con dos ejes **ortogonales** (nunca en un solo enum): `category` (`attitudinal` | `aptitude` | `skill`) × `level` (`nociones` | `intermedio` | `avanzado`).
- **Banco de preguntas** por competencia+nivel, con `type` (`single_choice` | `multi_choice` | `likert` | `situational` | `open_text`). `single/multi` y `likert` = auto-corregidas; `situational`/`open_text` = corrección humana (o IA-propuesta, TASK-1361). La `answer_key` es sensible: se guarda separada y NUNCA viaja en el payload que ve el candidato (misma disciplina allowlist que el opening público de TASK-353).
- **Plantilla de test** = composición de módulos `competencia + nivel objetivo + peso`. Ejemplo Account Manager: SEO@nociones(15%) + Copywriting@intermedio(25%) + Liderazgo@intermedio(25%) + Vendor@nociones(15%) + Actitudinal(20%). Reutilizable en cada vacante equivalente.
- **Instancia de test** = plantilla enganchada a una `hiring_application` → candidato rinde → auto-score objetivo + cola de corrección humana → scorecard por competencia.

### Carga de documentos — reutilizar, no crear buckets

- **CV / portafolio (archivo)** → plataforma de assets privados existente (`greenhouse_core.assets` + `GREENHOUSE_PRIVATE_ASSETS_BUCKET`), con **contextos hiring nuevos** anclados por `application_id`/`candidate_facet_id`/`identity_profile_id` (el candidato NO tiene `member`). Portafolio como enlace = campo en `candidate_facet`.
- **Documento de identidad (cédula/RUT/pasaporte)** → **reutiliza `greenhouse_core.person_identity_documents`** (TASK-784), anclado al `identity_profile_id` del candidato, con el patrón enmascarado/revelar + capability HR `person.legal_profile.reveal_sensitive` + auditoría. Un reclutador ve enmascarado; revelar exige capability + razón + audit (mismo rigor que la PII de un empleado). La imagen escaneada va a assets como `evidence_asset_id`.
- **Timing/compliance:** identity docs se capturan **post-decisión** (cerca de la oferta/handoff), NO en el apply público. CV/portafolio sí en el apply.
- **Gap:** la plataforma de assets **no tiene quarantine/scan** hoy → net-new para uploads públicos (TASK-1362).

### Boundaries duros (arch + payroll)

- El score de assessment es **hiring-interno y ortogonal a payroll/ICO/bonus**: mide al candidato, NUNCA es KPI de delivery ni elegibilidad de bono.
- Los tests son **input a una decisión humana, NUNCA deciden solos** (no auto-rechazan) — defensibilidad legal + fairness.
- IA en scoring/generación: **propone, un humano confirma** (governed action runtime), con eval baseline. Nunca puntúa como verdad final.

### Secuencia actualizada

`353 (✓) → 354 + 355 + 1360 + 1362 (paralelo tras foundation) → 1361 (tras 1360) → 1363 (tras 1360 + product-design) → 356 → 770`

### Supersede de non-goal

El non-goal "No AI scoring/evaluation automation in the first pass" se **refina**: la evaluación (assessment) entra como capability propia; el scoring IA es gobernado (propose→confirm + eval), no automatización que decide. No se relaja el boundary de "no auto-reject".
