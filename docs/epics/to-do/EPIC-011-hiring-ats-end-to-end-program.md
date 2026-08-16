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

- `TASK-354` — careers público, detalle de openings y formulario de apply. **✓ complete**; no reabrir por campos de intake.
- `TASK-355` — Hiring Desk interno, Demand Desk, Pipeline Board, Application 360 y Publication Desk. **✓ complete**.
- `TASK-1688` — corrección vertical de contacto: teléfono opcional, país de residencia explícito y mensaje persistido; paridad Careers/Growth Forms + lectura autorizada en Application 360.
- Gate para avanzar: apply público crea/reconcilia `Person` + `CandidateFacet` + `HiringApplication`; desk interno opera `HiringApplication`, no personas sueltas. `TASK-1688` no crea un pipeline nuevo ni infiere datos históricos.

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
- `TASK-354` — Public careers landing and apply intake. **✓ complete; residual de datos absorbido por TASK-1688 (2026-08-11).**
- `TASK-355` — Internal Hiring Desk, pipeline and publication governance. **✓ complete.**
- `TASK-1688` — Careers application contact completeness: persistencia/lectura de teléfono, residencia y mensaje con un único command de Hiring.
- `TASK-1714` — Reveal auditado del documento de identidad de un **candidato** (no existía: el de TASK-784 se ancla a `memberId`). **✓ complete (2026-08-15).**
- `TASK-1715` — Application 360 · panel de Documentos real: cablea el reader, el CV se lee dentro del portal y el candado queda sólo en la identidad. **✓ complete (2026-08-15).**
- `TASK-1718` — Candidate Review Packet + reader MCP delegado: lectura interna agent-safe de postulación/CV sobre App API, con identidad humana delegada, minimización, audit y provider read-only OFF por defecto.
- `TASK-1719` — Opening Assessment Policy + Stage-Triggered Assignment: binding operativo opening→template,
  assignment manual/automático, cancelación y correo único sobre commands Hiring.
- `TASK-1720` — Delegated MCP Candidate Test Assignment: proposal/confirm/cancel MCP sobre TASK-1719, con write
  scope separado y fail-closed hasta grant revocable TASK-1631.
- `TASK-1721` — Governed Hiring Selection Journey Orchestrator: proposal/confirm y saga durable que coordina la
  decisión atómica con handoff, email y activation sin saltarse gates ni duplicar commands.
- `TASK-1722` — Delegated MCP Candidate Selection Journey: tools start/status/advance/cancel sobre TASK-1721, con
  authority por step y write fail-closed hasta grant revocable TASK-1631.
- `TASK-1723` — Talent Pool Canonical Foundation + Full API Parity: membership/purpose/evidence/search/commands/API.
- `TASK-1724` — Talent Pool Consent + Candidate Self-Service: opt-in independiente, status/renew/withdrawal público.
- `TASK-1725` — Talent Pool Desk: workbench interno person-first y invitation proposal/confirm.
- `TASK-1726` — Delegated MCP Talent Pool Search/Profile: reader interno multi-host sobre App API.
- `TASK-356` — Handoff, reactive events/signals and downstream bridges.
- `TASK-770` — HRIS/People activation closure for `internal_hire`.

### Assessment + Candidate Intake extension (Delta 2026-07-08)

- `TASK-1360` — **Assessment Engine foundation**: competency catalog + question bank + assessment templates + candidate test instances + interviewer scorecards, objective + human scoring, competency-result rollup into `hiring_application`. Seeds the real competencies (SEO, copywriting, project management, community management, leadership, vendor management + attitudinal + aptitude) and the first Account Manager template. `backend-data`. Blocked by `TASK-353`.
- `TASK-1361` — **Assessment AI Assist**: governed AI question generation + AI-proposed scoring of open/situational answers (propose → confirm, human confirms; eval baseline). `backend-data`. Blocked by `TASK-1360`.
- `TASK-1362` — **Candidate Document Capture**: hiring asset contexts (CV/portfolio) on the private assets platform + candidate identity-document linking (reuse `person_identity_documents` masked/reveal) + upload quarantine/scan for public uploads. `backend-data`. Blocked by `TASK-353`.
- `TASK-1363` — **Assessment Taking + Review Surface**: candidate-facing remote tokenized test-taking + internal rating/review surface in the desk. `ui-ux`. Blocked by `TASK-1360` (+ product-design loop).
- `TASK-1364` — **Assessment Validity Feedback Loop**: link assessment score → real hire outcome (quality-of-hire 90d/6m) to measure predictive validity; read-only, advisory, feeds EU AI-Act technical documentation. `backend-data`. Blocked by `TASK-1360`. (From the `greenhouse-talent-people-operator` review of TASK-1360 — validity gap.)
- `TASK-1365` — **Adverse-Impact & Fairness Monitoring**: privacy-safe aggregate monitoring of selection rates across groups (4/5ths) + drift; voluntary self-ID separated from the decision; observes, never adjusts; required for EU AI-Act bias testing. `backend-data`. Blocked by `TASK-1360`. (From the `greenhouse-talent-people-operator` review — fairness gap.)

### Publication + Growth Forms apply extension (Delta 2026-07-09)

- `TASK-1371` — **Hiring Vacancy Publication Operator Command**: structured backend-data operator `dryRun|execute|publish` for publishing openings from approved briefs without release/SQL/UI-only flow. Adds structured public fields (`public_work_mode`, `public_hiring_region`, location, `public_area`, `public_skill_tags`, optional compensation band), publish guards, CLI/API internal surface and idempotency via the API Platform command ledger. **✓ complete/released (PR #152, 2026-07-09).**
- `TASK-1372` — **Growth Forms Application Upload + ATS Projection Foundation**: complete local; Growth Forms is now the application-form source of truth for CV/private upload and the `growth_hiring_application_from_submission` projection into Hiring/ATS.
- `TASK-1373` — **Careers Apply Native Growth Form Migration**: complete/staging live; `/public/careers/[publicId]/apply` renders the native `<greenhouse-form>` behind `CAREERS_NATIVE_GROWTH_FORM_ENABLED`, with production still OFF pending explicit release sign-off.

### Contact completeness correction (Delta 2026-08-11)

- `TASK-1688` — corrección del contrato que detectó la auditoría de postulaciones reales: teléfono y mensaje alcanzaban el schema pero el command no los persistía, y país de residencia no existía. Exige ADR antes de migrar, no permite inferencia/backfill histórico y gobierna ambas entradas públicas hacia el mismo command/reader.

### Agent-safe candidate review extension (Delta 2026-08-15)

- `TASK-1718` agrega la fundación programática para que un agente interno autorizado revise una aplicación y
  su CV sin automatizar la UI. Greenhouse conserva source of truth, autorización por usuario/recurso, texto
  derivado y audit; `mcp.efeonce.org` conserva sólo transporte/routing.
- La task es read-only e internal-only: no asigna assessments, no envía correos, no mueve etapas, no rankea y
  no decide. `TASK-1608`/`TASK-1610` pueden consumirla después, pero sus claims y gates de Talent Assurance no
  se adelantan ni se reinterpretan aquí.
- Gate: provider, reader y worker nacen deshabilitados; no se habilita una opening real sin ADR, revisión
  Security/Privacy, identidad humana delegada, allow/deny/revocation y pruebas de IDOR/prompt-injection/PII.

### Candidate test policy, automation and MCP write extension (Delta 2026-08-15)

- `TASK-1719` extrae el binding operativo opening→assessment template a EPIC-011, donde pertenece el runtime de
  Hiring. Manual propose→confirm y entrada a etapa ejecutan el mismo command; el ops-worker reusa el email live de
  `TASK-1689`, con idempotencia, hold/accommodation, cancelación y reconciliation.
- `TASK-1603` conserva el quality gate de Talent Assurance y consume esa policy para completeness/evidence; no
  crea una segunda tabla o binding.
- `TASK-1720` federa assignment/cancellation en MCP con tools propose→confirm. Reader y writes tienen flags/scopes
  separados; el write nunca se concede al PKCE público y permanece fail-closed hasta el grant de `TASK-1631`.

### Governed selection journey and MCP extension (Delta 2026-08-15)

- `TASK-1721` agrega coordinación durable sobre los owners existentes: TASK-355 conserva la decisión atómica,
  TASK-356 materializa/aprueba handoff, TASK-1689 entrega correo y TASK-770 activa internal-hire. El journey usa
  checkpoints/readback/reconciliation y se detiene ante cada gate; nunca simula una transacción distribuida.
- `TASK-1722` federa ese primitive en MCP con start/status/advance/cancel propose→confirm. La confirmación inicial
  no autoriza handoff ni activation; cada boundary recibe una authority/capability nueva.
- Gate: TASK-1603 debe gobernar evidence completeness antes del confirm productivo; MCP permanece fail-closed hasta
  TASK-1631 y nunca agrega write scope al cliente PKCE público compartido.

### Talent Pool Full API Parity extension (Delta 2026-08-16)

- `TASK-1723` convierte el follow-up histórico de búsqueda global en un recurso person-first sin identidad paralela:
  separa discoverability/contactability, importa cohortes existentes fail-closed y entrega readers/commands/API únicos.
- `TASK-1724` obtiene consentimiento futuro independiente y withdrawal self-service; el consentimiento actual del apply
  sigue limitado al proceso y no se reinterpreta. Corrige además el enlace público de privacidad.
- `TASK-1725` entrega el consumer humano como evidence workbench; `TASK-1726` entrega el mismo read contract a cualquier
  host MCP estándar autorizado mediante el provider Hiring de TASK-1718. El gateway no posee datos ni policy.
- V1 cubre candidatos externos/históricos. Internal bench/freelancers/partners requieren adapters posteriores; no se
  representan como implementados. Ningún slice rankea, auto-decide, expone contacto/CV en búsqueda o habilita B2B.

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
- [x] `TASK-354` delivered public careers/apply without exposing internal opening metadata or unsafe assets; contact persistence residual is owned by `TASK-1688`.
- [x] `TASK-355` delivered internal desk with `HiringApplication` as board unit and capability-aware PII handling.
- [ ] `TASK-356` delivered auditable `HiringHandoff`, versioned events and downstream signals.
- [ ] `TASK-770` delivered selected candidate -> collaborator active closure for `internal_hire`.
- [ ] People 360 shows the journey from candidate/application to member/onboarding/active without duplicate identities.
- [ ] Event catalog, architecture docs, functional docs and user manuals are updated where behavior changed.
- [ ] `TASK-1723`–`TASK-1726` entregan Talent Pool person-first, consentimiento/withdrawal, Desk y MCP read-only con
      Full API Parity, sin duplicar identidad, policy, documentos ni lógica entre consumers.

## Non-goals

- No AI scoring/evaluation automation in the first pass.
- No semantic/embedding search, opaque fit ranking, automated shortlist or Talent Pool access for external clients in V1.
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
