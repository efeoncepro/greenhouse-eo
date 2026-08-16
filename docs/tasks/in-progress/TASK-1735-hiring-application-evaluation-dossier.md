# TASK-1735 — Hiring Application Evaluation Dossier (expediente de evaluación append-only)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
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
- Backend impact: `db`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea el **Expediente de Evaluación SMART** per-application en Hiring, en dos capas de la
misma task: (1) la foundation append-only `greenhouse_hiring.hiring_application_note` con
notas tipadas (`cv_analysis`, `assessment_review`, `interview_note`, `general`), autor y
cuerpo markdown, más su contrato programático gobernado (`GET/POST
/api/hiring/applications/[id]/notes`); y (2) la **generación agéntica del análisis**: un
command `propose` que ingiere el CV (proyección minimizada de TASK-1718), el assessment
completo (scorecard, respuestas, rationale) y el journey del postulante (stages, intake,
decisión), llama el LLM canónico (Anthropic `claude-sonnet-5` vía `generateStructuredAnthropic`)
y produce un borrador de expediente que **solo un humano confirma** (`propose → confirm →
execute`). El análisis CV-vs-assessment deja de vivir en chats efímeros y deja de armarse a
mano: el agente lo redacta, el operador lo valida, y queda persistido y auditado.

## Why This Task Exists

Caso real 2026-08-16 (EO-APP-0078): un análisis completo CV-vs-assessment producido durante
la corrección de un candidate test no tuvo dónde persistirse. El dominio hoy solo ofrece:
un campo escalar mutable `hiring_application.notes` (TASK-353) sin PATCH ni UI, el rationale
IA por respuesta en `hiring_assessment_ai_proposal` (TASK-1361, per-response, no
per-application), la razón de la decisión formal (`decide.ts`, solo al final del pipeline) y
el review packet del CV (TASK-1718, read-only, sin notas de analista). No existe una capa de
notas de evaluación estructuradas que acompañe a la application por el pipeline. El gap hace
que el criterio de evaluación se pierda entre etapas y que la entrevista/decisión no herede
el análisis previo.

## Goal

- Tabla append-only `greenhouse_hiring.hiring_application_note` operativa con trigger
  anti-mutación, tipos de nota con CHECK y grants sin UPDATE/DELETE.
- Primitive canónico server-side (`recordHiringApplicationNote` + `listHiringApplicationNotes`)
  con evento outbox sin PII, consumible por UI, Nexa y MCP por construcción (Full API Parity).
- API interna `GET/POST /api/hiring/applications/[id]/notes` gateada por capability, con
  contrato de errores canónico.
- **Generación agéntica gobernada del expediente**: command `proposeEvaluationDossier` que
  ensambla el packet (CV redactado vía proyección TASK-1718 + resultados/rationale del
  assessment + journey de stages), genera el borrador con el cliente LLM canónico de
  `src/lib/ai/` (Anthropic, default `claude-sonnet-5`, override por env var) y lo persiste
  como propuesta; `confirmEvaluationDossier` humano lo materializa como nota `source='agent'`
  con provenance completo (modelo efectivo, prompt version, input digest). El LLM nunca
  escribe una nota directo.
- Boundaries de privacidad declarados y verificados: internal-only, nunca candidate-facing,
  nunca dentro del review packet MCP de TASK-1718, sin atributos demográficos; el packet al
  provider es minimizado (sin contacto, sin identidad legal, sin self-ID).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (dominio + §Candidate document capture)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`

Reglas obligatorias:

- Append-only real: sin UPDATE/DELETE en grants ni en código; corrección = nota nueva que
  referencia la anterior.
- Internal-only por diseño: ninguna nota llega a superficie candidate-facing (TASK-1729/1730
  lo exigen para el estado público) ni al review packet MCP (TASK-1718 excluye "notas
  internas libres" de su allowlist — esta task preserva esa exclusión).
- Payload de outbox sin PII: solo IDs (patrón TASK-1689); el consumer re-lee de PG si necesita.
- Las notas son narrativa, no score: no tocan `score`/`match_score`/`explainability_json`
  (rollup de TASK-1360) ni duplican el rationale del proposal ledger de TASK-1361 (si una
  nota nace de una sugerencia IA, referencia el `proposal_id` en `context_json`).
- Errores API vía `canonicalErrorResponse`/`toHiringErrorResponse`; nada de prose en inglés.
- **Reglas del carril LLM** (espejo de TASK-1361/1734): cliente canónico de `src/lib/ai/`
  (NUNCA SDK propio en el dominio); el CV y las respuestas del candidato son texto NO
  confiable (prompt injection → el output se descarta o degrada, nunca eleva confianza);
  el packet al provider es allowlisted y minimizado (sin nombre/contacto/CV crudo/identidad/
  self-ID demográfico); el borrador cita evidencia de sus fuentes y declara qué NO pudo
  verificar; flag default-OFF registrado en el ledger; el digest de la propuesta captura el
  modelo EFECTIVO resuelto, no el default.
- El borrador agéntico es advisory puro: no rankea, no decide, no mueve stage, no envía
  email, y jamás se materializa como nota sin confirmación humana explícita.

## Normative Docs

- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (patrón outbox + capability⇒grant+coverage)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `greenhouse_hiring.hiring_application` (TASK-353, `migrations/20260707235655376_task-353-hiring-ats-domain-foundation.sql`)
- Patrón seed de capability: `migrations/20260815175034133_task-1714-candidate-identity-reveal-capability.sql`
- Patrón tabla append-only del dominio: `migrations/20260816084127971_task-1726-talent-pool-access-audit.sql` (trigger guard + grants) y `migrations/20260816123000000_task-1718-candidate-review-packet.sql`
- Catálogo de eventos: `src/lib/sync/event-catalog.ts` (bloque hiring)
- **Input de CV para la capa smart**: proyección minimizada/redactada de TASK-1718
  (`src/lib/hiring/candidate-review/readers.ts` → `getCandidateReviewPacket` /
  `candidate_document_review_projection`) — el agente NUNCA lee el PDF crudo del bucket
- **Cliente LLM canónico**: `generateStructuredAnthropic` (`src/lib/ai/`, mismo helper que
  TASK-1361) + patrón de config/flag/prompt-contract de
  `src/lib/hiring/assessment/ai/config.ts`
- Inputs de assessment/journey: readers existentes de `src/lib/hiring/assessment/**`
  (scorecard, responses, competency results) + stage/decision history de la application

### Blocks / Impacts

- Follow-up UI (`ui-ux`): tab/sección "Expediente" en `Application360View.tsx` — se crea como
  task consumer cuando exista dirección de diseño (esta task deja el contrato listo).
- TASK-1718 (in-progress): NO se modifica su packet; el test de allowlist debe seguir verde
  demostrando que las notas quedan fuera.
- TASK-1721 (to-do, selection journey): podrá leer el expediente como insumo del debrief; no
  se adelantan sus gates.
- TASK-1734 (to-do, AI scoring at scale): comparte el principio "resultado/rationale nunca
  candidate-facing"; sin archivos compartidos.

### Files owned

- `migrations/` (nuevas migraciones TASK-1735: tabla de notas + tabla de propuestas de dossier)
- `src/lib/hiring/application-notes.ts` (nuevo) + `src/lib/hiring/index.ts` (delta export)
- `src/lib/hiring/dossier-ai/` (nuevo: packet assembler, prompt contract, config/flag,
  propose/confirm commands)
- `src/app/api/hiring/applications/[id]/notes/route.ts` (nuevo)
- `src/app/api/hiring/applications/[id]/dossier/route.ts` (nuevo: propose GET/POST + confirm)
- `src/types/hiring.ts` (delta: tipos de nota + dossier)
- `src/config/entitlements-catalog.ts` (delta: capability nueva)
- `src/lib/entitlements/runtime.ts` (delta: grant)
- `src/lib/sync/event-catalog.ts` (delta: eventos nuevos)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila del flag nuevo)
- `docs/documentation/hr/` (delta funcional) + `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (delta §Expediente)

## Current Repo State

### Already exists

- Store del dominio con patrón tx + outbox: `src/lib/hiring/store.ts` (`runQuery` :42,
  `publishOutboxEvent` dentro de la misma tx, p.ej. :712-716; catch `23505` para carreras).
- Campo escalar mutable `hiring_application.notes` (TASK-353) — nota simple, sin autor, sin
  historia; coexiste, no se migra.
- Rationale IA per-response: `greenhouse_hiring.hiring_assessment_ai_proposal` (TASK-1361,
  append-only, flag `HIRING_ASSESSMENT_AI_ENABLED`).
- Razón de decisión formal replay-safe: `src/lib/hiring/decide.ts` (snapshot en la application).
- Patrón API canónico: `src/app/api/hiring/applications/[id]/route.ts`
  (`requireInternalTenantContext` → `can()` → `canonicalErrorResponse`/`toHiringErrorResponse`).
- 20 capabilities `hiring.*` en `src/config/entitlements-catalog.ts:2205-2242` con grants en
  `src/lib/entitlements/runtime.ts` (tier operador :525-588; tier gobernanza role-only :594-655)
  y coverage test `src/lib/entitlements/capability-grant-coverage.test.ts`.
- Tablas append-only gemelas con trigger guard en el mismo schema:
  `talent_pool_access_audit` (función `greenhouse_hiring.prevent_talent_pool_history_mutation`)
  y `candidate_review_access_audit`.
- Vista `src/views/greenhouse/hiring/Application360View.tsx` con tabs
  (`overview|assessment|documents|decision|activity`); el tab `activity` es un timeline
  sintético sin persistencia — superficie natural del futuro consumer UI.
- Review packet agent-safe TASK-1718: `src/lib/hiring/candidate-review/` + lane
  `src/app/api/platform/app/hiring/.../review-packet/route.ts` (excluye notas internas).
  Su proyección `candidate_document_review_projection` entrega el TEXTO del CV ya extraído,
  minimizado y redactado — el input exacto que la capa smart necesita, sin tocar el PDF.
- Stack LLM del dominio ya probado: `generateStructuredAnthropic` + patrón
  config/flag/prompt-contract/sanitizer de `src/lib/hiring/assessment/ai/`
  (`config.ts`, `contracts.ts`, `prompt.ts`, `providers.ts`) — TASK-1361; default
  `claude-sonnet-5` con override por env var. La capa dossier replica ese patrón, no lo bifurca.
- Ledger de propuestas IA como patrón de referencia: `hiring_assessment_ai_proposal`
  (proposed_json + provider/model/prompt_version/input_digest + status terminal-once).
- Copy dictionaries del dominio: `src/lib/copy/dictionaries/es-CL/{hiringDesk,hiringAssessment}.ts`.

### Gap

- No existe tabla de notas de evaluación per-application, ni endpoint `notes`, ni evento
  `hiring.application.note_*`, ni capability de anotación: el expediente es greenfield sobre
  patrones ya establecidos.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/hiring/** + src/app/api/hiring/** (runtime portal Vercel)`
- Future candidate home: `domain-package`
- Boundary: `commands recordHiringApplicationNote + proposeEvaluationDossier + confirmEvaluationDossier, reader listHiringApplicationNotes; consumers autorizados: API interna hiring, futura UI Application 360 y lane MCP gobernado`
- Server/browser split: `dominio y stores server-only ('server-only' en src/lib/hiring); el browser consume la API route`
- Build impact: `none`
- Extraction blocker: `transaccion PG compartida con hiring_application y outbox en la misma tx`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `db`
- Source of truth afectado: `greenhouse_hiring.hiring_application_note` (nueva tabla)
- Consumidores afectados: `API interna hiring; futura UI Application 360; Nexa/MCP vía contrato gobernado (follow-up)`
- Runtime target: `local → staging → production (portal Vercel)`

### Contract surface

- Contrato existente a respetar: `src/app/api/hiring/applications/[id]/route.ts` (auth/capability/error pattern) + `src/lib/hiring/error-response.ts` + readers de TASK-1718 (CV projection) y `src/lib/hiring/assessment/**`
- Contrato nuevo o modificado: `GET/POST /api/hiring/applications/[id]/notes` + command `recordHiringApplicationNote` + reader `listHiringApplicationNotes` + evento `hiring.application.note_recorded`; **capa smart**: commands `proposeEvaluationDossier`/`confirmEvaluationDossier` + tabla `hiring_application_dossier_proposal` + `GET/POST /api/hiring/applications/[id]/dossier` + eventos `hiring.application.dossier_proposed|dossier_confirmed`
- Backward compatibility: `compatible` (aditivo; el campo escalar `notes` de TASK-353 no se toca)
- Full API parity: `la lógica vive en src/lib/hiring/application-notes.ts y src/lib/hiring/dossier-ai/; las rutas API son consumers delgados; la futura UI, Nexa y el lane MCP consumen los mismos primitives — el flujo agéntico ES el propose→confirm→execute del governed action runtime, no una integración Nexa-específica`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_hiring.hiring_application_note` (nueva); FK a `greenhouse_hiring.hiring_application`
- Invariantes que no se pueden romper:
  - Append-only: trigger `BEFORE UPDATE OR DELETE` que aborta; grants solo `SELECT, INSERT`.
  - `kind` restringido por CHECK a `('cv_analysis','assessment_review','interview_note','general')`.
  - `body_md` no vacío y ≤ 8000 chars (CHECK).
  - `author_user_id` obligatorio; `source` CHECK `('human','agent')`.
  - Internal-only: ninguna ruta pública/candidate-facing ni el review packet de TASK-1718 exponen filas de esta tabla.
  - Sin atributos demográficos en el cuerpo (boundary de fairness TASK-1365 — regla documental + copy del manual; no hay parser).
  - No duplica rationale IA: nota derivada de una sugerencia referencia `proposal_id` en `context_json`.
- Tenant/space boundary: `requireInternalTenantContext` + validación de que la application existe; sin scoping adicional (dominio interno single-tenant operador)
- Idempotency/concurrency: `INSERT único en una tx corta; un reintento crea una segunda nota visible (benigno: narrativa append-only, sin side effects financieros ni de estado); sin idempotency key por diseño declarado`
- Audit/outbox/history: `evento outbox hiring.application.note_recorded con payload {noteId, applicationId, kind, actorUserId} — IDs only, sin cuerpo`

### Migration, backfill and rollout

- Migration posture: `additive` (dos tablas nuevas + seed de capability; sin backfill)
- Default state: `notas: enabled (superficie interna capability-gated, aditiva). Capa smart: flag HIRING_EVALUATION_DOSSIER_AI_ENABLED default OFF, Vercel-only (el propose corre en request; sin consumer async en V1), fila en el ledger en el mismo PR`
- Backfill plan: `none — tablas nacen vacías`
- Rollback path: `capa smart: flag OFF (las propuestas quedan en el ledger, sin efecto). Foundation: revert PR + down migration (DROP TABLE + deprecate capability)`
- External coordination: `flag en Vercel (staging + production) al momento del flip; sin secrets nuevos (reusa greenhouse-anthropic vía src/lib/ai); sin providers nuevos`

### Security and access

- Auth/access gate: `lectura: capability hiring.application.read; escritura de notas Y propose/confirm del dossier: capability nueva hiring.application.annotate (execute) granteada en el mismo PR al tier gobernanza (EFEONCE_ADMIN, HR_MANAGER, EFEONCE_OPERATIONS); el propose además exige flag ON`
- Sensitive data posture: `las notas son datos personales de evaluación del candidato: internal-only, sin demográficos, sin exposición pública ni MCP; sin valores de identidad legal. El packet al provider LLM es allowlisted y minimizado: texto redactado del CV (proyección 1718), respuestas/rúbricas/scores del assessment y journey de stages — NUNCA nombre completo/contacto/identidad legal/self-ID; el texto del candidato se trata como no confiable (prompt injection)`
- Error contract: `canonicalErrorResponse + toHiringErrorResponse; HiringValidationError con codes estables; captureWithDomain para fallas; errores del provider nunca exponen payload crudo`
- Abuse/rate-limit posture: `notas: sin rate limit dedicado (superficie interna capability-gated, CHECK de longitud). Dossier propose: bounded — un propose activo por application+input digest (idempotente), timeout de provider, retry acotado, costo por llamada observable`

### Runtime evidence

- Local checks: `vitest focal de application-notes y dossier-ai (packet allowlist, sanitizer, idempotencia por digest, confirm terminal-once, prompt-injection sintético) + capability-grant-coverage.test.ts verde`
- DB/runtime checks: `bloques DO anti pre-up-marker en ambas migraciones + SELECT post-migrate contra information_schema + pnpm db:generate-types`
- Integration checks: `pnpm staging:request POST /api/hiring/applications/<id>/notes + GET de vuelta; propose/confirm de dossier sobre application sintética con flag ON en staging (provider smoke real acotado)`
- Reliability signals/logs: `sin signal nuevo — el evento outbox queda observable vía sync.outbox.* existentes; rationale: superficie interna sin SLA propio`
- Production verification sequence: `ver Rollout Plan`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Command/reader en `src/lib/hiring/application-notes.ts`.
- [ ] **Modelada como aggregate/recurso/command**, no como click-handler.
- [ ] **Read** como reader canónico; **write** como command con capability fina, errores canónicos y outbox.
- [ ] **Capability + grant en el MISMO PR**: registry + catalog TS + grant a ≥1 rol real + coverage test (TASK-873/935).
- [ ] **Camino programático declarado:** API interna ahora; lane `api/platform/app`/MCP como follow-up explícito con boundary de privacidad.
- [ ] **Write apto para `propose → confirm → execute`** (una nota propuesta por agente la confirma un humano; el command es el punto único de mutación).
- [ ] **Un primitive, muchos consumers:** cero lógica duplicada por consumer.
- [ ] **Parity check = SÍ** al cierre.

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

### Slice 1 — Migración + capability

- Migración `pnpm migrate:create task-1735-hiring-application-note`: tabla
  `greenhouse_hiring.hiring_application_note` (`note_id` `'hnote-' || gen_random_uuid()`,
  `application_id` FK, `kind` CHECK, `body_md` CHECK no vacío ≤8000, `author_user_id`,
  `source` CHECK `('human','agent')`, `context_json JSONB DEFAULT '{}'`, `created_at`),
  índice `(application_id, created_at DESC)`, trigger append-only (mirror del patrón
  `talent_pool_access_audit`), `OWNER TO greenhouse_ops`, `GRANT SELECT, INSERT` a runtime,
  bloque DO anti pre-up-marker; Down = DROP.
- Seed de capability `hiring.application.annotate` en `capabilities_registry`
  (patrón TASK-1714) + entry en `entitlements-catalog.ts` + grant tier gobernanza en
  `runtime.ts` + `capability-grant-coverage.test.ts` verde.
- `pnpm db:generate-types` y commit conjunto.

### Slice 2 — Primitive de dominio + evento

- `src/lib/hiring/application-notes.ts` (`import 'server-only'`): command
  `recordHiringApplicationNote({applicationId, kind, bodyMd, authorUserId, source, contextJson?})`
  con validaciones (`HiringValidationError` codes estables), verificación de application
  existente, INSERT + `publishOutboxEvent` en la misma tx; reader
  `listHiringApplicationNotes(applicationId)` ordenado `created_at DESC`.
- Evento `hiringApplicationNoteRecorded: 'hiring.application.note_recorded'` en
  `src/lib/sync/event-catalog.ts` (no reactivo: sin consumer, sin email).
- Tipos en `src/types/hiring.ts` + tests unitarios focales.

### Slice 3 — API routes

- `src/app/api/hiring/applications/[id]/notes/route.ts`: GET (capability
  `hiring.application.read`) → lista; POST (capability `hiring.application.annotate`) →
  crea y retorna la nota; body inválido → `hiringInvalidBodyResponse`; errores →
  `toHiringErrorResponse`.
- Test del route handler + verificación de que el review packet de TASK-1718 sigue sin
  exponer notas (su test de allowlist permanece verde sin modificación).

### Slice 4 — Smart dossier: propuesta agéntica (packet + LLM + ledger)

- Migración segunda tabla `greenhouse_hiring.hiring_application_dossier_proposal` (espejo del
  patrón TASK-1361: `proposal_id` `'hdsp-'`, `application_id` FK, `proposed_json`,
  `provider`, `model` (efectivo resuelto), `prompt_version`, `input_digest`, `status`
  CHECK `('proposed','confirmed','rejected')` terminal-once, `decision_note`, `confirmed_by/at`).
- `src/lib/hiring/dossier-ai/packet.ts`: assembler que reúne (a) texto redactado del CV desde
  la proyección TASK-1718 (si `status != 'ready'` → propose falla honesto con code estable),
  (b) assessment: competency results, respuestas con scores efectivos y rationale IA
  existente (referenciado por id), (c) journey: stages con timestamps, fuente, intake events
  y decisión si existe. Allowlist explícita; sin contacto/identidad/self-ID.
- `src/lib/hiring/dossier-ai/generate.ts`: prompt contract `hiring_evaluation_dossier.v1` +
  llamada vía `generateStructuredAnthropic` (default `claude-sonnet-5`, override env
  `HIRING_DOSSIER_AI_MODEL`); output estructurado: resumen ejecutivo, coherencias
  CV↔assessment con evidencia citada, gaps/red flags con evidencia, focos de entrevista
  sugeridos, y sección explícita "no verificable con las fuentes". Sanitizer estricto.
- Command `proposeEvaluationDossier(applicationId, actorUserId)`: flag-gated + capability
  `hiring.application.annotate`; idempotente por `applicationId + input_digest` (mismo
  estado de fuentes → misma propuesta, sin segunda llamada al provider); persiste propuesta
  + outbox `hiring.application.dossier_proposed` (IDs only).

### Slice 5 — Smart dossier: confirmación humana + API

- Command `confirmEvaluationDossier(proposalId, decision, editedBodyMd?, decisionNote?)`:
  atómico — marca la propuesta `confirmed|rejected` (terminal-once, FOR UPDATE) y, si
  confirma, materializa la nota vía `recordHiringApplicationNote` con `source='agent'`,
  `kind` derivado del contenido (`cv_analysis`/`assessment_review`) y
  `context_json.{dossierProposalId, inputDigest, model, promptVersion}` en la MISMA tx.
  El humano puede editar el cuerpo antes de confirmar (el editado es lo que se persiste;
  la propuesta original queda inmutable en el ledger).
- `GET/POST /api/hiring/applications/[id]/dossier`: POST propose, GET estado/propuesta
  vigente, POST confirm/reject — mismo patrón auth/error que notes.
- Tests: propose idempotente (digest), stale digest fuerza nueva propuesta, confirm
  terminal-once, packet sin campos prohibidos (test de allowlist del provider packet),
  prompt-injection en CV sintético → output degradado/rechazado, flag OFF → 409 estable.

### Slice 6 — Documentación y cierre

- Delta §Expediente de Evaluación en `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`;
  delta funcional en `docs/documentation/hr/`; nota de manual breve (cómo registrar/leer
  notas vía API) en `docs/manual-de-uso/hr/` o delta al manual de Hiring existente.
- Registry/README/EPIC-011/Handoff/changelog sincronizados; chequeo de impacto cruzado
  (delta en TASK-1721 si aplica).

## Out of Scope

- La UI del expediente (tab/sección en Application 360, incluida la superficie de revisar/
  confirmar el borrador agéntico) — task consumer `ui-ux` follow-up con su wireframe robusto;
  mientras tanto el flujo opera por API (`staging:request`/Nexa/MCP futuro).
- Exponer notas en el review packet MCP de TASK-1718 o en cualquier lane
  `api/platform/app|ecosystem` — decisión futura con audit content-free propio.
- Edición o borrado de notas (append-only; corrección = nota nueva).
- Cualquier superficie candidate-facing, email o notificación derivada de notas o del dossier.
- Migrar o deprecar el campo escalar `hiring_application.notes` de TASK-353.
- Auto-confirmación del borrador agéntico o cualquier bypass del confirm humano; scoring de
  respuestas (dueño: TASK-1361/1734 — el dossier LEE scores, jamás los produce); trigger
  automático del propose por evento (V1 es on-demand por operador; el enqueue reactivo
  post-assessment es follow-up).
- Leer el PDF crudo del CV desde el bucket (el input es la proyección redactada de TASK-1718).

## Detailed Spec

Modelo de datos (referencia para el agente; el DDL final vive en la migración):

```sql
CREATE TABLE greenhouse_hiring.hiring_application_note (
  note_id         TEXT PRIMARY KEY DEFAULT ('hnote-' || gen_random_uuid()::text),
  application_id  TEXT NOT NULL REFERENCES greenhouse_hiring.hiring_application(application_id) ON DELETE RESTRICT,
  kind            TEXT NOT NULL CHECK (kind IN ('cv_analysis','assessment_review','interview_note','general')),
  body_md         TEXT NOT NULL CHECK (length(body_md) BETWEEN 1 AND 8000),
  author_user_id  TEXT NOT NULL,
  source          TEXT NOT NULL DEFAULT 'human' CHECK (source IN ('human','agent')),
  context_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

`context_json` transporta referencias opcionales (`{"assessmentId": "asmt-…"}`,
`{"proposalId": "aip-…"}`, `{"supersedesNoteId": "hnote-…"}`) — nunca cuerpos duplicados.

Relación con superficies vecinas (sinergias EPIC-011):

| Vecino | Relación |
|---|---|
| Scorecard entrevistador (TASK-1360) | Las notas `interview_note` son narrativa; los ratings viven en `hiring_assessment_response`. El invariante anti-anclaje del scorecard no se debilita: una nota no expone ratings ajenos pre-submit (ver Open Questions). |
| Proposal ledger IA (TASK-1361) | Nota derivada de IA referencia `proposalId`; no copia rationale. |
| Review packet MCP (TASK-1718) | Exclusión preservada: notas jamás en el packet. |
| Decisión formal (`decide.ts`) | La razón de decisión no es una nota; el expediente puede mostrarla read-only en la UI futura. |
| Talent Pool (TASK-1723) | Las notas no alimentan búsqueda ni evidencia del pool. |
| Fairness (TASK-1365) | Prohibido capturar atributos demográficos en notas (regla documental + manual). |
| Cuenta candidata (TASK-1729/1730) | El estado público nunca filtra notas — la tabla nace internal-only. |

### Superficie UI del consumer (contrato de placement para la task follow-up)

El expediente vive en la **Application 360** (`/agency/hiring/applications/[applicationId]`,
`src/views/greenhouse/hiring/Application360View.tsx`, view code
`gestion.hiring_application_detail`) — NO en un perfil de persona/usuario. Racional: la nota
es un juicio sobre ESA candidatura (application-scoped por FK), no un atributo permanente de
la persona; una postulación futura de la misma persona arranca con expediente propio.

- **Anclaje**: la vista hoy tiene tabs `overview | assessment | documents | decision |
  activity`; el tab `activity` es un timeline SINTÉTICO sin persistencia (derivado de
  createdAt/stage/decisionHistory). La task `ui-ux` decide entre (a) tab nuevo "Expediente"
  o (b) convertir `activity` en el expediente real (notas persistidas intercaladas con los
  eventos de etapa) — decisión de diseño con wireframe robusto, no se resuelve aquí.
- **Momento smart en la UI**: con el assessment corregido, el operador dispara "Generar
  análisis" (propose), revisa el borrador con su evidencia citada y la sección "no
  verificable", edita si corresponde y confirma — la nota queda en el expediente y se
  consulta durante entrevista y decisión.
- **Visibilidad**: solo operadores internos con capability (`hiring.application.read` para
  leer; `hiring.application.annotate` para escribir/proponer/confirmar — tier gobernanza).
  El candidato JAMÁS: ni portal candidato (TASK-1729/1730), ni email, ni review packet MCP.
- **Puente persona**: la historia longitudinal per-persona es de People 360
  (TASK-1732/1733) — podrá ENLAZAR a los expedientes de cada application, pero las notas
  siguen viviendo en su candidatura (sin proyección person-scoped en esta task).
- **Interim sin UI**: el flujo completo es operable por API desde el día uno del backend
  (Full API Parity) — Nexa o un agente en sesión pueden proponer/confirmar expedientes vía
  `/api/hiring/applications/[id]/dossier` y `/notes` antes de que exista la superficie.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (migración + capability) → Slice 2 (primitive + evento) → Slice 3 (API notes) →
  Slice 4 (dossier propose) → Slice 5 (dossier confirm + API) → Slice 6 (docs/cierre).
- Slice 3 no puede mergearse sin el coverage test de capability verde de Slice 1 (una ruta
  gateada por capability sin grant es una ruta muerta).
- Slice 4/5 no pueden mergearse sin Slice 2 (el confirm materializa vía
  `recordHiringApplicationNote`; sin el primitive de notas no hay execute).
- El flag del dossier permanece OFF hasta que los tests de packet-allowlist y
  prompt-injection de Slice 5 estén verdes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Notas se filtran a superficie agéntica (review packet / lane app) | identity | low | No se toca el packet; test de allowlist TASK-1718 permanece verde; Out of Scope explícito | no signal — emerge en review del PR y test de allowlist |
| PII en payload de outbox | outbox | low | Payload IDs-only por contrato (patrón TASK-1689) + test del command | no signal — emerge en test focal |
| Capability sin grant (ruta muerta) o grant demasiado amplio | identity | low | `capability-grant-coverage.test.ts` + grant tier gobernanza explícito en el PR | test rojo en CI |
| Nota `interview_note` debilita anti-anclaje del scorecard | UI | medium | Notas no renderizan ratings ajenos; Open Question para el consumer UI antes de exponer notas cross-evaluador pre-submit | no signal — gate documental en la task UI |
| Migración registrada sin ejecutar (pre-up-marker bug) | migration | low | Bloque DO con RAISE EXCEPTION + SELECT post-migrate | migración falla loud en apply |
| PII del candidato en el packet al provider (nombre/contacto/identidad/self-ID) | AI / privacy | medium | Packet allowlisted desde la proyección redactada 1718 + test de campos prohibidos + errores provider sin payload crudo | test de allowlist rojo |
| Prompt injection en el CV manipula el borrador | AI | medium | CV = texto no confiable; sanitizer estricto del output; suite adversarial sintética; humano confirma SIEMPRE | output degradado/rechazado observable en el ledger |
| Borrador con afirmaciones no soportadas (alucinación sobre el candidato) | hiring / derechos | high | Output exige evidencia citada por afirmación + sección "no verificable"; el humano edita antes de confirmar; propuesta original inmutable en el ledger para auditar drift | delta edición-humana alto (propuesta vs nota confirmada) |
| Doble llamada al provider por reintento (costo) | provider | low | Idempotencia por `applicationId + input_digest`; propose activo único | segunda fila `proposed` mismo digest |

### Feature flags / cutover

- Foundation de notas: sin flag — additive, immediate cutover; el "flag" efectivo es el
  grant de la capability `hiring.application.annotate` (revocable vía entitlements
  governance sin deploy).
- Capa smart: `HIRING_EVALUATION_DOSSIER_AI_ENABLED` default **OFF**, Vercel-only (staging +
  production; sin lectura en workers en V1), registrada en
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR que la declara. OFF → el
  propose retorna 409 estable; notas manuales y confirm de propuestas existentes siguen
  operables. Modelo por `HIRING_DOSSIER_AI_MODEL` (default `claude-sonnet-5`); el digest
  captura el modelo efectivo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` (DROP TABLE) + revert PR + deprecate capability en registry | <15 min | si |
| Slice 2 | revert PR (primitive sin consumers aún) | <10 min | si |
| Slice 3 | revert PR (ruta aditiva gateada) | <10 min | si |
| Slice 4 | flag OFF (propuestas quedan inertes en el ledger) + revert PR si aplica | <10 min | si |
| Slice 5 | flag OFF + revert PR; notas ya confirmadas permanecen (append-only, decisión humana registrada) | <10 min | si (propuestas), notas confirmadas se preservan por diseño |
| Slice 6 | revert de docs | <5 min | si |

### Production verification sequence

1. `pnpm pg:connect:migrate` en staging + SELECT contra `information_schema.tables` y
   `pg_trigger` verificando tabla + trigger append-only.
2. Deploy a staging + `pnpm staging:request POST /api/hiring/applications/<id-test>/notes`
   con la persona agente superadmin → 200 con nota; GET → la lista; intento UPDATE/DELETE
   directo por SQL (sesión ops) → rechazado por trigger.
3. Verificar con la persona `agent-collaborator` (sin capability) → 403 canónico.
4. Verificar que `GET /api/platform/app/hiring/applications/[id]/review-packet` NO incluye
   notas ni propuestas de dossier (allowlist TASK-1718 intacta).
5. Capa smart en staging: flag ON en staging → `POST .../dossier` (propose) sobre una
   application sintética con CV y assessment reales de prueba → inspeccionar el borrador
   (evidencia citada, sección no-verificable, cero campos prohibidos en el packet loggeado
   de test) → confirm con edición → la nota `source='agent'` aparece en `GET .../notes` con
   provenance completo. Repetir propose → verifica idempotencia (mismo digest, sin segunda
   llamada al provider).
6. Promoción a producción vía release control plane; flag prod OFF inicialmente; repetir
   smoke 2-5 en prod con una application de prueba antes de prender el flag prod.

### Out-of-band coordination required

N/A — repo-only change (migración Cloud SQL vía carril canónico incluida; sin secrets,
sin providers externos, sin coordinación de operadores más allá del manual nuevo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `greenhouse_hiring.hiring_application_note` existe con CHECKs de `kind`/`body_md`/`source`, trigger append-only activo y grants sin UPDATE/DELETE (verificado por SELECT a catálogos PG).
- [ ] Capability `hiring.application.annotate` seedeada en registry + catalog TS + grant al tier gobernanza en el mismo PR, con `capability-grant-coverage.test.ts` verde.
- [ ] `recordHiringApplicationNote` inserta y publica `hiring.application.note_recorded` (payload IDs-only) en la misma transacción; test focal lo demuestra.
- [ ] `POST /api/hiring/applications/[id]/notes` retorna 403 canónico sin capability, 400 canónico con body inválido, 200 con nota creada; `GET` lista ordenada `created_at DESC`.
- [ ] El review packet de TASK-1718 sigue sin exponer notas (test de allowlist verde sin modificación).
- [ ] Smoke staging ejecutado con evidencia (`staging:request` POST + GET + 403 de persona sin capability).
- [ ] `proposeEvaluationDossier` genera un borrador estructurado desde CV redactado (proyección 1718) + assessment + journey, con evidencia citada y sección "no verificable"; el packet al provider pasa el test de campos prohibidos (sin nombre/contacto/identidad/self-ID).
- [ ] El propose es idempotente por `applicationId + input_digest` (mismo estado de fuentes = cero llamadas adicionales al provider) y un cambio en las fuentes invalida el digest.
- [ ] Ningún borrador se materializa como nota sin `confirmEvaluationDossier` humano (terminal-once); la nota confirmada lleva `source='agent'` + `context_json` con proposalId/digest/modelo efectivo/prompt version, y la propuesta original queda inmutable.
- [ ] Suite adversarial mínima verde: prompt injection en CV sintético produce output degradado/rechazado, nunca un borrador confiado; flag OFF produce 409 estable y deja operables notas manuales y confirms pendientes.
- [ ] `HIRING_EVALUATION_DOSSIER_AI_ENABLED` registrado en el Feature Flag State Ledger con runtime ownership (Vercel-only) en el mismo PR.
- [ ] Documentación triple proporcional actualizada (delta arquitectura + funcional + manual, incluido cómo operar propose/confirm por API).

## Verification

- `pnpm local:check` (lint + tsc)
- `pnpm vitest run src/lib/hiring src/lib/entitlements` (focal)
- `pnpm migrate:status` + SELECT de verificación post-migrate
- `pnpm test` + `pnpm build` como gate final de cierre (TASK_CLOSING_QUALITY_GATE_V1)
- Smoke staging vía `pnpm staging:request` (secuencia del Rollout Plan)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] EPIC-011 actualizado con el estado de esta task y el follow-up UI declarado
- [ ] Migración verificada aplicada en staging y producción (no solo "Migrations complete!")

## Follow-ups

- Task consumer `ui-ux`: tab/sección "Expediente" en Application 360 con la superficie de
  revisar/editar/confirmar el borrador agéntico (wireframe robusto + dirección de diseño +
  GVC; el tab `activity` sintético existente es el punto de anclaje).
- Trigger reactivo del propose (encolar borrador automáticamente al `hiring.assessment.scored`
  vía outbox/ops-worker) — V1 es on-demand; el enqueue async hereda el patrón de TASK-1734 y
  se coordina con su run aggregate.
- Decisión gobernada sobre exponer notas read-only en lane `api/platform/app`/MCP con audit
  content-free (hoy excluido por diseño).
- Métrica de calidad del borrador: medir el delta de edición humana (propuesta vs nota
  confirmada) como señal de drift del prompt/modelo.

## Delta 2026-08-16 (2) — re-scope CEO: el expediente nace SMART

Por directiva del CEO (2026-08-16, sesión de operador): la generación agéntica del análisis
**entra al alcance de esta task** — deja de ser follow-up. El agente ingiere CV (proyección
redactada TASK-1718) + assessment completo + journey del postulante y arma el borrador; la
validación es humana (`propose → confirm → execute`), el LLM nunca escribe la nota directo.
Motor: cliente canónico de `src/lib/ai/` (`generateStructuredAnthropic`), modelo default
**`claude-sonnet-5`** con override `HIRING_DOSSIER_AI_MODEL`; flag
`HIRING_EVALUATION_DOSSIER_AI_ENABLED` default OFF. Effort sube de `Medio` a `Alto`;
se agregaron Slices 4-5 (propose/confirm), tabla `hiring_application_dossier_proposal`,
riesgos AI en la matriz y criterios de aceptación de la capa smart. Caso fuente: el análisis
CV-vs-assessment de EO-APP-0078 hecho a mano en esta misma sesión.

## Delta 2026-08-16

- Frontera con `TASK-1734` (AI Scoring at Scale) declarada en ambas direcciones tras su auditoría cross-task: el
  manifest/audit del run de 1734 registra HECHOS estructurados (IDs, digests, reason codes, actor); la narrativa del
  revisor al resolver un `mandatory_review` vive como nota `kind=assessment_review` de ESTE expediente con
  `context_json.{runId,proposalId}`. Un solo hábitat por tipo de contenido — el expediente no duplica el manifest y
  el manifest no acumula prosa. 1734 referencia esta task en sus Normative Docs y Blocks/Impacts.

## Open Questions

- Visibilidad de `interview_note` entre evaluadores antes del submit del scorecard propio:
  el invariante anti-anclaje de TASK-1360 aplica a ratings; decidir en la task UI si las
  notas de entrevista se ocultan cross-evaluador hasta el debrief para no debilitar su
  espíritu.
- Retención/redacción: si el candidato ejerce derechos de privacidad, definir con
  `legal-privacy-ip-operator` el tratamiento del expediente (fuera de alcance aquí; las
  notas no guardan identidad legal ni demográficos).
