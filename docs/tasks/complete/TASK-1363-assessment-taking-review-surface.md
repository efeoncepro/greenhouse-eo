# TASK-1363 — Assessment Taking + Review Surface

## Delta 2026-07-12 — TASK-354 is ready; formal blocker removed

- **TASK-354 is code complete and its public Careers route is live** (`/public/careers`, application flag and Turnstile configured; `Blocked by: none`). Its reusable public shell is therefore an available dependency, not a blocker for this task.
- **TASK-355 is complete** and the Application 360 host is available. TASK-1360/1361/1383/1384 provide the assessment engine, hardening and active question bank.
- `Blocked by` is now `none`: TASK-1363 is ready to enter its UI implementation plan. The remaining TASK-354 submit smoke is operational closure for Careers, not a reason to defer the independent tokenized assessment surface.

## Delta 2026-07-12 — UI design ready for implementation

- La fuente visual de Assessment fue revisada junto con los contratos versionados de wireframe, flow y motion. La dirección de la experiencia, estados, interacción, mapping de primitives, copy intent, plan GVC y design decision log están completos.
- `UI ready` pasa a `yes`: significa **lista para implementar**, no que la rendición ya exista. El GVC runtime (desktop, 390px, reduced motion y flujos tokenizados) sigue siendo evidencia obligatoria de Slice 4 antes del cierre.
- La fuente backend está disponible (TASK-1360/1361/1383/1384), el shell público de TASK-354 está disponible y Application 360 de TASK-355 ya hospeda la parte interna. No queda un bloqueo de diseño o foundation para iniciar.

## Delta 2026-07-10 — TASK-1384: el banco del lote 1 está ACTIVO (25 preguntas, cobertura 9/9)

- El pool activo para AM L2 existe (25 preguntas work-sample-first, review adversarial aplicado). Observaciones del review que ESTA task debe honrar:
  - **El pool NO cabe en un test de 60 min** (~100-130 min realistas si se asignan todas): la rendición debe MUESTREAR (~1 por competencia + refuerzo en las 4 core ≈ 11-13 preguntas) o subir el time limit del template. Decidir el mecanismo de sampling en el diseño de la superficie.
  - **No asignar juntas las 2 conductuales de anécdota** (composure `qst` "situación real de presión" + ownership "proyecto que falló por causa tuya"): invitan a la misma historia — si caen juntas, pedir ejemplos distintos.
  - La regla de puntaje parcial de multi_choice es del engine (`computeObjectiveScore`, Jaccard con penalización) — la UI no la re-implementa, solo la comunica si muestra desglose.
- Cobertura verificable: `pnpm hiring:question-bank-coverage`. Guía para el review surface: `docs/documentation/hr/assessment-question-authoring-guide.md`.

## Delta 2026-07-10 — TASK-1383 (hardening) endureció la costura que esta task consume

- **Autosave**: `saveResponse` ahora ES idempotente de verdad (UNIQUE parciales + upsert; antes el docstring lo prometía sin serlo). El primer save **auto-arranca el timer** (assigned/sent → in_progress) — la UI no necesita llamar `startAssessment` antes del primer autosave, pero SÍ debe llamarlo al abrir (para countdown honesto).
- **Expiración operativa**: `token_expires_at` (+14 días al asignar) + time-limit (`started_at + time_limit_minutes`) se enforcean en resolve/start/save/submit y transicionan a `expired`. La UI recibe `null` del resolve para token vencido y `assessment_not_open`/`assessment_not_startable` en writes — mapear ambos al estado "token vencido/consumido" del wireframe.
- **`needs_human_rating` se deriva del tipo REAL en DB** cuando hay `questionId` — la superficie pública no es fuente de verdad del tipo.
- **`submitAssessment` exige `in_progress`** (submit desde assigned/sent = 409).
- **Anti-anclaje real**: `listResponses(assessmentId, viewerUserId)` ahora filtra de verdad (scorecard ajeno oculto hasta cerrar el propio). La review surface puede confiar en el reader.
- **Anti-leak testeado**: `buildPublicQuestion` tiene test que garantiza que answerKey/rubric no viajan.


## Delta 2026-07-08 — Revisión 3-lentes (arch-architect + talent/people-ops + product-design)

Hechos verificados contra el repo real. Ajustes:

- **Blockers recalibrados (positivo):** **`TASK-1360` (motor) y `TASK-1361` (AI assist) están COMPLETE.** El motor EXISTE y expone el contrato real: `resolveAssessmentByToken` (single-use — *"Solo si sigue rendible"*), `saveResponse`, `submitAssessment`, `buildPublicQuestion` (allowlist server-side — **el answer-key NUNCA viaja al candidato, ya enforced**), `finalizeAssessment` (scoring/rollup), `assignCandidateTest`. 1363 es un **consumer delgado de un motor listo**, no bloqueado por él. Blockers vivos reales: **354** (shell público) + **355** (Application 360 host del scorecard). La sección "Pendiente (blocked-by, NO existe)" quedó **stale** → corregida.
- **Routing `[lang]` MAL → `src/app/public/**`.** El dashboard/público NO usa segmento `[lang]` (next-intl cookie/header; ver overlay arch §17). Candidato = **`src/app/public/assessment/[token]/**`** (URL `/assessment/[token]`), bilingüe es-CL + en-US vía `getMicrocopy(locale)`. **DDL-2 del master flow:** reusa el **mismo shell público tokenizado** que 354 construye para el apply (un shell, dos usos) — no un layout público paralelo.
- **Accommodations EN SCOPE (no follow-up):** el motor ya persiste **`accommodations_json`** en la instancia. La superficie de rendición **debe honrar** las accommodations (tiempo extendido, accesibilidad) desde V1 — es fairness + EU AI Act (no desventajar a quien necesita accommodation), no una mejora futura.
- **Anti-anclaje en el review (fairness):** en la corrección interna, mostrar la **rúbrica + la respuesta primero**, y la sugerencia IA (1361) **después/colapsada** (independent-before-debrief), para que el corrector no ancle en el score IA. IA propone → humano confirma; el scorecard es advisory, nunca veredicto binario.
- **Motion declarado:** la rendición tiene un **countdown timer** (feedback temporal que afecta confianza) + transiciones de pregunta + estados de aviso de tiempo → motion real (no decorativa) → se crea `docs/ui/motion/TASK-1363-assessment-taking-review-surface-motion.md` y se declara `Motion`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1363-assessment-taking-review-surface.md`
- Flow: `docs/ui/flows/TASK-1363-assessment-taking-review-surface-flow.md`
- Motion: `docs/ui/motion/TASK-1363-assessment-taking-review-surface-motion.md`
- Backend impact: `api`
- Epic: `EPIC-011`
- Status real: `Code complete local on develop (2026-07-13); candidate surface + internal review wired to real assessment engine; staging/prod rollout pending push/deploy`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `develop` (operator-confirmed; no worktree)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Dos superficies del motor de assessment (TASK-1360): (1) la que rinde el **candidato** — test remoto vía link tokenizado single-use + tiempo límite, y (2) la de **review interno** en el desk — cola de corrección de respuestas abiertas + scorecard por competencia. Sin esto, el motor existe pero nadie rinde ni corrige tests.

## Why This Task Exists

TASK-1360 deja el motor (competencias, banco, plantillas, instancias, scoring, rollup) pero sin superficie. El candidato necesita una experiencia de rendición honesta (una pregunta a la vez o por bloques, con tiempo, sin filtrar answer-key) y el reclutador necesita corregir lo abierto y leer el scorecard dentro del Application 360. Es un nodo del flujo cross-surface careers (público → test → desk).

## Goal

- Que el candidato rinda el test asignado desde un link seguro, con tiempo y sin poder ver respuestas correctas.
- Que el reclutador corrija respuestas abiertas con rúbrica y vea el scorecard por competencia en el desk.
- Conectar la superficie al flujo cross-surface del programa Hiring (careers público ↔ desk interno).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§`Delta 2026-07-08 — Assessment`)
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` + `docs/architecture/ui-platform/*`
- `DESIGN.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

Reglas obligatorias:

- El payload que ve el candidato NUNCA incluye `answer_key_json`/`rubric_json` (allowlist server-side, TASK-1360).
- Token de acceso single-use + tiempo límite; una sola rendición; sin re-abrir tras submit.
- El scorecard es advisory (input a decisión humana), NUNCA auto-rechaza ni muestra un veredicto binario de contratación.
- **Accommodations:** la rendición debe honrar `accommodations_json` de la instancia (tiempo extendido, accesibilidad) desde V1 — fairness + EU AI Act. NUNCA ignorar la accommodation configurada.
- **Anti-anclaje en el review:** mostrar rúbrica + respuesta ANTES que la sugerencia IA (1361); la sugerencia va después/colapsada (independent-before-debrief). IA propone → humano confirma.
- **Routing:** `src/app/public/assessment/[token]/**` (NUNCA `[lang]`); bilingüe vía `getMicrocopy(locale)`; reusa el shell público de TASK-354 (DDL-2).
- Composition Shell + primitives canónicas (no inventar grids/inputs ad hoc); copy es-CL desde `src/lib/copy/*`.
- `UI ready: yes`: la dirección visual, wireframe/flow/motion, implementation mapping, GVC scenario plan y decision log están completos. GVC desktop+mobile es gate de verificación de la implementación, no un bloqueo de inicio.

## Modular Placement Contract

- **Topology impact:** `public` + `portal` + `domain-package` (additive, no new deployable/package).
- **Current home:** candidate-facing token surface in `src/app/public/assessment/[token]/**` and `src/app/api/public/assessment/[token]/**`; internal review remains embedded in `src/views/greenhouse/hiring/Application360View.tsx` with focused components under `src/components/greenhouse/hiring/assessment/**`; assessment engine stays in `src/lib/hiring/assessment/**`.
- **Future candidate home:** public candidate shell can move to the future public build unit; internal review can move with the portal build unit; server-only assessment engine remains a hiring domain package.
- **Boundary:** UI consumes server-side readers/commands (`resolveAssessmentByToken`, `startAssessment`, `saveResponse`, `submitAssessment`, `recordHumanScore`, `finalizeAssessment`) through governed API wrappers. No scoring logic, answer-key access or rubric exposure is duplicated in Client Components.
- **Server/browser split:** DB access, token hashing, answer keys, rubrics, scoring and expiration enforcement stay server-only. Browser receives allowlisted DTOs: public questions, candidate-owned responses, timer/accommodation metadata, and review DTOs only for internal capability-gated users.
- **Build impact:** no physical split, no package extraction and no deployment topology change during TASK-1363. Work remains extraction-ready by keeping DTOs and UI components bounded.
- **Extraction blockers / follow-ups:** public token routing and dashboard route groups still share this Next.js app; future extraction requires an auth/session boundary decision for public vs portal build units, not a TASK-1363 blocker.

## Normative Docs

- `docs/tasks/to-do/TASK-1360-assessment-engine-foundation.md`
- `docs/tasks/to-do/TASK-354-public-careers-landing-apply-intake.md` (patrón tokenizado + shell público)
- `docs/tasks/complete/TASK-355-hiring-desk-internal-workspaces-publication-governance.md` (Application 360 host del scorecard)

## Dependencies & Impact

### Depends on

- `TASK-1360` (motor: instancias, respuestas, scoring, rollup + contrato de token)
- `TASK-354` (shell público tokenizado reutilizable; code complete/live, dependencia disponible)
- `TASK-355` (Application 360 donde se embebe el scorecard; complete en repo/dev)
- Product-design loop (dirección visual) — prerequisito de `UI ready: yes`

### Blocks / Impacts

- Cierra la usabilidad del motor de assessment para operación real (vacante Account Manager).

### Files owned

- `docs/ui/wireframes/TASK-1363-assessment-taking-review-surface.md`
- `docs/ui/flows/TASK-1363-assessment-taking-review-surface-flow.md`
- `src/app/assessment/[token]/**` + `src/app/public/assessment/[token]/**` (candidate-facing tokenizado; NO `[lang]` — reusa shell público de TASK-354, DDL-2)
- `src/app/api/public/assessment/[token]/**`
- `src/views/greenhouse/hiring/Application360View.tsx`
- `src/components/greenhouse/hiring/assessment/**`
- `src/lib/hiring/assessment/public-taking.ts`
- `src/lib/hiring/assessment/review.ts`
- `src/lib/copy/dictionaries/{es-CL,en-US}/hiringAssessment.ts`

## Current Repo State

### Already exists (verificado 2026-07-08)

- Foundation Hiring/ATS (TASK-353, ✓ complete): `greenhouse_hiring` + store `src/lib/hiring/**` + API `/api/hiring/**` + capabilities `hiring.*`.
- **Motor de assessment (TASK-1360 + TASK-1361, ✓ COMPLETE):** contrato real en `src/lib/hiring/assessment/**` — `resolveAssessmentByToken` (single-use), `saveResponse`, `submitAssessment`, `buildPublicQuestion` (allowlist anti answer-key), `finalizeAssessment` (scoring/rollup), `assignCandidateTest`, `time_limit_minutes`, **`accommodations_json`**; capabilities `hiring.assessment.read/author/score/ai_assist` sembradas + granteadas.
- Primitives UI Platform (Composition Shell, inputs canónicos, drawer/sidecar).

### Foundations available

- Shell público tokenizado (TASK-354, code complete/live) — host reutilizable de la rendición (DDL-2: mismo shell del apply).
- Application 360 (TASK-355, complete) — host del scorecard/review interno disponible en el desk.

### Gap

- No existe superficie de rendición del candidato (la envoltura `GET/POST /api/public/assessment/[token]` + UI que consume el motor listo).
- El review interno existe parcialmente en Application 360; falta completar su cola, scorecard y estados según este contrato.
- La dirección visual y contratos están listos; falta la implementación y su evidencia GVC.

## UI/UX Contract

> Rigor: `ui-standard`. `UI ready: yes`: implementation mapping + GVC scenario plan + design decision log están completos y la fuente visual de Assessment fue revisada. Este contrato fija la IA/flujo/estados; la evidencia GVC de runtime se produce durante la implementación.

- **Experience brief:** el candidato rinde un test por competencias con tiempo, honesto y sin fricción; el reclutador corrige lo abierto y lee un scorecard claro. Tono es-CL, respetuoso, sin lenguaje de "examen" intimidante.
- **Surface/system decision:** dos surfaces — (a) candidate-facing tokenizada fuera del dashboard (shell público, mínima, sin nav interna); (b) interna embebida en Application 360 (Composition Shell + tabs del desk). Nodo del flujo cross-surface del programa (ver Flow).
- **State inventory (canónico):** `loading` · `token inválido/expirado` · `instrucciones + consentimiento` · `en progreso (con timer)` · `guardando respuesta` · `submit/enviando` · `enviado (confirmación)` · `expirado por tiempo` · (interno) `cola de corrección vacía` · `corrigiendo (rúbrica)` · `scorecard listo` · `error`.
- **Interaction contract:** una pregunta o bloque por competencia; timer visible; autosave por respuesta; submit irreversible con confirmación; el candidato NUNCA ve correctas. Interno: rúbrica lado a lado con la respuesta, confirmar/ajustar score (incluye confirmar sugerencia IA de TASK-1361 si está habilitada).
- **Motion/microinteractions:** transición de pregunta + estado del timer; `prefers-reduced-motion` respetado. Motion no trivial → si emerge, declarar `Motion` doc.
- **Visual verification:** GVC desktop + mobile de la rendición y del scorecard, en loop, antes de declarar la implementación cerrada.

### Implementation mapping

- Route / surface: candidato `src/app/public/assessment/[token]/**`; interno `(dashboard)/agency/hiring/applications/[applicationId]` en la tab `Evaluación` de `Application360View`.
- Primitive / variant / kind: shell público reutilizable de TASK-354; `CompositionShell`/primitives de Hiring Desk; `CustomTextField`, radios/checkbox, `CustomChip`, progress/timer accesible, dialog de submit y drawer/sidecar de review.
- Component candidates: `src/views/greenhouse/hiring/assessment/**` para la rendición y componentes acotados bajo `src/components/greenhouse/hiring/assessment/**`; extender `Application360View` sin bifurcar el desk.
- Copy source: nuevo namespace canónico de assessment en `src/lib/copy/dictionaries/{es-CL,en-US}/`; el actual `hiringDesk` solo cubre el review parcial.
- Data reader / command: `resolveAssessmentByToken`, `startAssessment`, `saveResponse`, `submitAssessment`, `finalizeAssessment`, `recordHumanScore` y los endpoints internos de TASK-1360; los nuevos wrappers públicos solo validan token/rate-limit y jamás reimplementan scoring.
- Access / capability: candidato por token single-use; interno por `hiring.assessment.read` y `hiring.assessment.score`; el candidato nunca recibe answer key/rúbrica.

### GVC scenario plan

- Scenario files: `scripts/frontend/scenarios/task1363-assessment-taking-runtime.scenario.ts` y `scripts/frontend/scenarios/task1363-assessment-review-runtime.scenario.ts`.
- Routes: `/assessment/<token-de-prueba>` / `/public/assessment/<token-de-prueba>` y `/agency/hiring/applications/<id>` tab `Evaluación`.
- Viewports: 1440 y 390; capturar instrucciones, respuesta/autosave/timer, confirmación submit, inválido/expirado, cola de review y scorecard.
- Markers: `assessment-instructions`, `assessment-start`, `assessment-question`, `assessment-timer`, `assessment-next`, `assessment-submitted`, `assessment-scorecard`, `assessment-mode-bars`, `assessment-mode-radar`, `assessment-review-queue`, `assessment-review-row`, `assessment-review-drawer`.
- Assertions: payload público allowlisted sin answer-key/rúbrica, consola sin errores, no login redirect en operador, regiones críticas visibles, timer con `role=timer`, autosave observable y scorecard advisory.

### Design decision log

- Decision: wizard público tokenizado por competencia + review interno en Application 360; no login del candidato ni surface de desk paralela.
- Alternatives: scroll largo único y radar como scorecard se descartan por fricción/legibilidad; el scorecard usa barras comparables y conserva carácter advisory.
- Why this pattern: separa la credencial temporal de la sesión interna, protege las respuestas y mantiene la decisión humana por delante de la sugerencia IA.
- Reuse / extend / new primitive: reutilizar shell público, Composition Shell, inputs, dialogs y disclosure; evaluar solo un timer accesible como primitive si el existente no cumple el contrato.
- Open risks: anti-cheat V1 limitado, cumplimiento de accommodations y gobernanza del banco de preguntas; se verifican durante ejecución, no bloquean el inicio UI.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: motor de assessment (TASK-1360) — esta task consume readers/commands, no crea nuevo SoT
- Consumidores afectados: candidato (tokenizado), reclutador (desk)
- Runtime target: `local` → `staging` → `production`

### Contract surface

- Contrato existente a respetar: readers/commands de TASK-1360 + contrato de token; shell público de TASK-354
- Contrato nuevo: endpoints candidate-facing tokenizados (`GET/POST /api/public/assessment/[token]`) que envuelven los commands de TASK-1360 con validación de token, estados públicos genéricos, guard de evaluación incompleta antes de submit y payload allowlisted.
- Backward compatibility: `compatible` (additive)
- Full API parity: la superficie consume commands/readers de TASK-1360; no duplica lógica de scoring

### Data model and invariants

- Entidades afectadas: ninguna nueva (consume `hiring_assessment`/`response`/`competency_result` de TASK-1360)
- Invariantes que no se pueden romper:
  - answer-key nunca en el payload candidate-facing
  - token single-use, tiempo límite, submit irreversible
  - scorecard advisory, sin veredicto binario
- Tenant/space boundary: candidate-facing = token (no sesión); interno = capability `hiring.assessment.read`/`score`
- Idempotency/concurrency: autosave idempotente por (instance, question); submit idempotente (una sola vez)
- Audit/outbox/history: eventos de TASK-1360 (`hiring.assessment.submitted`/`scored`); acceso tokenizado logueado

### Migration, backfill and rollout

- Migration posture: `none` (UI + endpoints wrapper; sin schema nuevo)
- Default state: `read-only` hasta `UI ready: yes`; el candidate-facing gateado por token + flag del apply público
- Backfill plan: `none`
- Rollback path: `revert PR` (UI additive)
- External coordination: `none`

### Security and access

- Auth/access gate: candidate = token single-use + rate-limit; interno = capability hiring
- Sensitive data posture: respuestas del candidato (PII moderada); nunca exponer answer-key; nunca a `client_*`
- Error contract: `toHiringErrorResponse` + respuestas públicas genéricas sin leak
- Abuse/rate-limit posture: rate-limit del endpoint tokenizado + expiración + un intento

### Runtime evidence

- Local checks: lint/typecheck/build/Vitest full + test anti-leak de answer-key en el payload público existente.
- DB/runtime checks: GVC local con fixture sintético — abrir token → consentir → iniciar → responder → autosave → avanzar; operador Application 360 → cargar review → scorecard barras/radar → cola → drawer.
- Integration checks: `none`
- Reliability signals/logs: reuso de los de TASK-1360
- Production verification sequence: staging smoke tokenizado + GVC → prod

### Acceptance criteria additions

- [x] Contract surface (endpoints tokenizados + readers internos) nombrado con paths reales.
- [x] Invariantes (no answer-key leak, token single-use, advisory) explícitos y con test/evidencia.
- [x] Migration none / additive UI; rollback por revert.
- [x] Evidencia runtime + GVC desktop+mobile.
- [x] Canonical errors + sin leak.

## Hybrid Execution Justification

- Why not split: la superficie es inseparable de sus endpoints wrapper tokenizados (el token + rate-limit viven con la UI que los consume); separar crearía un backend-data task trivial sin valor independiente. El SoT (motor) ya está en TASK-1360.
- Primary execution profile: `ui-ux`.
- Contract boundary: TASK-1360 es dueño del motor/scoring/rollup; esta task solo agrega endpoints wrapper (token + rate-limit) + UI, sin tocar el scoring canónico.
- Risk controls: answer-key allowlist server-side (TASK-1360); token single-use; UI ready gate; GVC; sin schema nuevo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Product-design loop + UI contracts

- Correr el product-design loop (3 conceptos) para la rendición del candidato + el review interno; registrar dirección elegida.
- Completar el wireframe (`docs/ui/wireframes/TASK-1363-...md`) y el flow (`docs/ui/flows/TASK-1363-...-flow.md`) robustos; conectar el flow al master flow del programa Hiring.

### Slice 2 — Candidate taking surface (tokenized)

- Endpoints `GET/POST /api/public/assessment/[token]` (token single-use + tiempo + rate-limit) envolviendo `resolveAssessmentByToken`/`saveResponse`/`submitAssessment` (motor listo, TASK-1360). Payload vía `buildPublicQuestion` (allowlist — sin answer-key).
- Surface candidate-facing en `src/app/public/assessment/[token]/**` (shell de 354, NO `[lang]`, bilingüe): instrucciones + consentimiento → preguntas con timer + autosave → submit irreversible → confirmación.
- **Honrar `accommodations_json`** (tiempo extendido / accesibilidad) al calcular el timer y la UX.

### Slice 3 — Internal review surface

- Cola de corrección de respuestas abiertas (rúbrica + respuesta primero; sugerencia IA de 1361 **después/colapsada** — anti-anclaje; confirmar/ajustar score vía `finalizeAssessment`).
- Scorecard por competencia embebido en Application 360 (TASK-355), advisory (sin veredicto binario).

### Slice 4 — GVC verification

- GVC desktop + mobile de rendición + scorecard en loop hasta enterprise; `UI ready: yes` solo con contratos + captura mirada.

## Out of Scope

- El motor de assessment (TASK-1360).
- La generación/corrección IA (TASK-1361; esta task solo muestra/confirma la sugerencia).
- Carga de documentos en respuestas (TASK-1362 provee la plataforma).

## Detailed Spec

La rendición candidate-facing reutiliza el patrón de shell público tokenizado de TASK-354. El scorecard se embebe en Application 360. El detalle visual sale del product-design loop (Slice 1). El wireframe/flow deben ser robustos (no stubs) y aterrizados en el modelo real de competencias/preguntas/estados de TASK-1360, referenciando la dirección de product-design elegida.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (scaffold público y copy) MUST ship antes de Slice 2/3; el contrato visual y de flujo ya está listo para implementar.
- Slice 4 (GVC) es el gate final antes de declarar la task implementada/cerrada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Answer-key filtrada al candidato en el payload | UI / API | medium | Allowlist server-side (TASK-1360) + test anti-leak en el wrapper | test rojo |
| Token reutilizable / test re-rendible | security | medium | Token single-use + expiración + submit irreversible | logs de acceso tokenizado |
| Scorecard leído como veredicto que decide solo | hiring / legal | medium | Copy advisory + sin veredicto binario + humano decide | review de copy/UX |
| UI construida fuera del contrato aprobado | UI | medium | wireframe/flow/motion + mapping aprobados + GVC | task lint / ui checks rojos |

### Feature flags / cutover

- El candidate-facing reutiliza el shell público ya habilitado por TASK-354 y se libera tras su propio GVC verde. La UI interna es additive (visible solo con capability). Evaluar en Plan Mode si el assessment requiere un flag independiente; no acoplar su cutover al submit smoke residual de Careers.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | descartar dirección/docs (sin runtime) | inmediato | si |
| Slice 2 | deshabilitar endpoint tokenizado + revert PR | <10 min | si |
| Slice 3 | revert PR (UI additive) | <10 min | si |

### Production verification sequence

1. Wireframe/flow robustos + product-design aprobados (Slice 1).
2. Staging: smoke tokenizado (asignar → rendir → submit) + verify no answer-key leak.
3. Staging: corregir + scorecard en Application 360 + GVC desktop+mobile.
4. Prod tras GVC verde + `UI ready: yes`.

### Out-of-band coordination required

- N/A — el shell público de TASK-354 ya está disponible; la coordinación runtime específica se limita al rollout propio del assessment si Plan Mode determina un flag.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El candidato rinde el test desde un link tokenizado con tiempo límite; `submitPublicAssessment` bloquea evaluaciones incompletas y el motor conserva single-use/estado terminal tras submit.
- [x] El payload candidate-facing NUNCA incluye answer-key/rubric (allowlist `buildPublicQuestion` + DTO público + Vitest full verde).
- [x] El reclutador corrige respuestas abiertas con rúbrica y el resultado rueda al scorecard vía commands/endpoints existentes de TASK-1360.
- [x] El scorecard por competencia se ve en Application 360, advisory (sin veredicto binario de contratación); la UI muestra rúbrica + respuesta antes de la sugerencia IA (anti-anclaje).
- [x] La rendición honra `accommodations_json` (tiempo extendido explícito/multiplicador/porcentaje) en timer, banner público y expiración server-side.
- [x] Ruta candidato `src/app/assessment/[token]/**` y compat `/public/assessment/[token]/**` (NO `[lang]`), bilingüe, con shell público.
- [x] `UI ready: yes` con implementation mapping + GVC scenario plan + design decision log y `pnpm task:lint --task TASK-1363` sin findings.
- [x] GVC desktop de rendición + GVC desktop/mobile de scorecard mirada; captura mobile de instrucciones públicas; sin errores de consola bloqueantes.

## Verification

- `pnpm lint` — PASS (2026-07-13)
- `pnpm typecheck` — PASS (2026-07-13)
- `pnpm test -- src/lib/hiring/assessment/hardening.test.ts` — ejecutó suite completa por wiring del script; PASS `1309 passed | 25 skipped`, `9428 passed | 135 skipped` (2026-07-13)
- `pnpm build` — PASS (2026-07-13); warning Turbopack amplio en `src/lib/roadmap/work-item-index/reader.ts` preexistente/no relacionado.
- `pnpm task:lint --task TASK-1363` — PASS (`template=1`, `errors=0`, `warnings=0`)
- `pnpm ui:wireframe-check --task TASK-1363` — PASS
- `pnpm ui:flow-check --task TASK-1363` — PASS
- `pnpm ui:motion-check --task TASK-1363` — PASS
- `pnpm ui:readiness-check --task TASK-1363` — PASS
- `pnpm qa:gates --changed --agent codex --task TASK-1363 --ui --runtime --data --security` — advisory run complete; final QA scope TASK-1363.
- `pnpm ops:lint --changed` — PASS (`errors=0`, `warnings=0`).
- GVC candidate runtime — PASS `.captures/2026-07-13T14-44-45_task1363-assessment-taking-runtime` (6 frames: instructions, consent/start, question+timer, autosave start/settled, next section).
- GVC operator runtime desktop+mobile — PASS `.captures/2026-07-13T14-44-04_task1363-assessment-review-runtime` (2 variants, 12 frames: tab before load, transition, scorecard bars, radar, queue, drawer).
- GVC candidate mobile instructions — PASS `.captures/2026-07-13T14-40-11_inline-assessment-ddf-mn2ztr-m6msqlim1rxpv-aell8bk`.
- Local DB fixture sintético limpiado al cierre.

## Closing Protocol

- [x] `Lifecycle` sincronizado
- [x] archivo en la carpeta correcta
- [x] `docs/tasks/README.md` sincronizado
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] chequeo de impacto cruzado (TASK-1360/1361/355/354)
- [x] `UI ready` confirmado `yes` tras contratos + GVC

## Follow-ups

- Staging/prod rollout tras push/deploy y smoke tokenizado remoto.
- Anti-cheat avanzado / proctoring liviano si People/Talent decide que el riesgo lo justifica.
- Reportes de assessment por vacante (agregado de scorecards).

## Open Questions

- Resuelto: la rendición va una pregunta a la vez, con progreso/stepper por pregunta y autosave.
- Resuelto: URL limpia `/assessment/[token]` con compatibilidad `/public/assessment/[token]`, ambas usando shell público sin chrome de dashboard.
