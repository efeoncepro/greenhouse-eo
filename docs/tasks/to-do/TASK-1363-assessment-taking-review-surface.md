# TASK-1363 — Assessment Taking + Review Surface

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

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1363-assessment-taking-review-surface.md`
- Flow: `docs/ui/flows/TASK-1363-assessment-taking-review-surface-flow.md`
- Motion: `docs/ui/motion/TASK-1363-assessment-taking-review-surface-motion.md`
- Backend impact: `api`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-354`
- Branch: `task/TASK-1363-assessment-taking-review-surface`
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
- `UI ready: no` hasta que el product-design loop entregue dirección visual + wireframe/flow completos + GVC desktop+mobile.

## Normative Docs

- `docs/tasks/to-do/TASK-1360-assessment-engine-foundation.md`
- `docs/tasks/to-do/TASK-354-public-careers-landing-apply-intake.md` (patrón tokenizado + shell público)
- `docs/tasks/complete/TASK-355-hiring-desk-internal-workspaces-publication-governance.md` (Application 360 host del scorecard)

## Dependencies & Impact

### Depends on

- `TASK-1360` (motor: instancias, respuestas, scoring, rollup + contrato de token)
- `TASK-354` (shell público + patrón tokenizado) `[verificar]`
- `TASK-355` (Application 360 donde se embebe el scorecard; complete en repo/dev)
- Product-design loop (dirección visual) — prerequisito de `UI ready: yes`

### Blocks / Impacts

- Cierra la usabilidad del motor de assessment para operación real (vacante Account Manager).

### Files owned

- `docs/ui/wireframes/TASK-1363-assessment-taking-review-surface.md`
- `docs/ui/flows/TASK-1363-assessment-taking-review-surface-flow.md`
- `src/app/public/assessment/[token]/**` (candidate-facing tokenizado; NO `[lang]` — reusa el shell público de TASK-354, DDL-2)
- `src/views/greenhouse/hiring/assessment/**`
- `src/components/greenhouse/hiring/assessment/**`
- `src/lib/copy/hiring.ts` (copy del assessment)

## Current Repo State

### Already exists (verificado 2026-07-08)

- Foundation Hiring/ATS (TASK-353, ✓ complete): `greenhouse_hiring` + store `src/lib/hiring/**` + API `/api/hiring/**` + capabilities `hiring.*`.
- **Motor de assessment (TASK-1360 + TASK-1361, ✓ COMPLETE):** contrato real en `src/lib/hiring/assessment/**` — `resolveAssessmentByToken` (single-use), `saveResponse`, `submitAssessment`, `buildPublicQuestion` (allowlist anti answer-key), `finalizeAssessment` (scoring/rollup), `assignCandidateTest`, `time_limit_minutes`, **`accommodations_json`**; capabilities `hiring.assessment.read/author/score/ai_assist` sembradas + granteadas.
- Primitives UI Platform (Composition Shell, inputs canónicos, drawer/sidecar).

### Pendiente (blocked-by vivos, NO existen todavía)

- Shell público tokenizado (TASK-354, `to-do`) — host de la rendición (DDL-2: mismo shell del apply).
- Application 360 (TASK-355, `complete`) — host del scorecard/review interno ya disponible en el desk.

### Gap

- No existe superficie de rendición del candidato (la envoltura `GET/POST /api/public/assessment/[token]` + UI que consume el motor listo).
- No existe cola de corrección ni render del scorecard en el desk.
- No existe dirección visual aprobada (product-design loop pendiente).

## UI/UX Contract

> Rigor: `ui-standard`. `UI ready: no` hasta completar implementation mapping + GVC scenario plan + design decision log. La dirección visual sale del product-design loop (3 conceptos → elegir → implementar); este contrato fija la IA/flujo/estados, no el skin final.

- **Experience brief:** el candidato rinde un test por competencias con tiempo, honesto y sin fricción; el reclutador corrige lo abierto y lee un scorecard claro. Tono es-CL, respetuoso, sin lenguaje de "examen" intimidante.
- **Surface/system decision:** dos surfaces — (a) candidate-facing tokenizada fuera del dashboard (shell público, mínima, sin nav interna); (b) interna embebida en Application 360 (Composition Shell + tabs del desk). Nodo del flujo cross-surface del programa (ver Flow).
- **State inventory (canónico):** `loading` · `token inválido/expirado` · `instrucciones + consentimiento` · `en progreso (con timer)` · `guardando respuesta` · `submit/enviando` · `enviado (confirmación)` · `expirado por tiempo` · (interno) `cola de corrección vacía` · `corrigiendo (rúbrica)` · `scorecard listo` · `error`.
- **Interaction contract:** una pregunta o bloque por competencia; timer visible; autosave por respuesta; submit irreversible con confirmación; el candidato NUNCA ve correctas. Interno: rúbrica lado a lado con la respuesta, confirmar/ajustar score (incluye confirmar sugerencia IA de TASK-1361 si está habilitada).
- **Motion/microinteractions:** transición de pregunta + estado del timer; `prefers-reduced-motion` respetado. Motion no trivial → si emerge, declarar `Motion` doc.
- **Visual verification:** GVC desktop + mobile de la rendición y del scorecard, en loop, antes de `UI ready: yes`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: motor de assessment (TASK-1360) — esta task consume readers/commands, no crea nuevo SoT
- Consumidores afectados: candidato (tokenizado), reclutador (desk)
- Runtime target: `local` → `staging` → `production`

### Contract surface

- Contrato existente a respetar: readers/commands de TASK-1360 + contrato de token; shell público de TASK-354
- Contrato nuevo: endpoints candidate-facing tokenizados (`GET/POST /api/public/assessment/[token]`) que envuelven los commands de TASK-1360 con validación de token + rate-limit
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

- Local checks: tests del wrapper de token (inválido/expirado/usado) + test anti-leak de answer-key en el payload
- DB/runtime checks: smoke — asignar instancia → abrir token → responder → submit → corregir → scorecard
- Integration checks: `none`
- Reliability signals/logs: reuso de los de TASK-1360
- Production verification sequence: staging smoke tokenizado + GVC → prod

### Acceptance criteria additions

- [ ] Contract surface (endpoints tokenizados + readers internos) nombrado con paths reales.
- [ ] Invariantes (no answer-key leak, token single-use, advisory) explícitos y con test.
- [ ] Migration none / additive UI; rollback por revert.
- [ ] Evidencia runtime + GVC desktop+mobile.
- [ ] Canonical errors + sin leak.

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

- Slice 1 (product-design + contracts) MUST ship antes de Slice 2/3 (implementación) — sin dirección visual + wireframe/flow robustos, la UI no arranca (`UI ready: no`).
- Slice 4 (GVC) es el gate final antes de `UI ready: yes`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Answer-key filtrada al candidato en el payload | UI / API | medium | Allowlist server-side (TASK-1360) + test anti-leak en el wrapper | test rojo |
| Token reutilizable / test re-rendible | security | medium | Token single-use + expiración + submit irreversible | logs de acceso tokenizado |
| Scorecard leído como veredicto que decide solo | hiring / legal | medium | Copy advisory + sin veredicto binario + humano decide | review de copy/UX |
| UI construida freehand sin product-design | UI | medium | `UI ready: no` gate + wireframe/flow robustos + GVC | task lint / ui checks rojos |

### Feature flags / cutover

- El candidate-facing se habilita junto al apply público (TASK-354) tras GVC verde. La UI interna es additive (visible solo con capability). Sin flag propio salvo que el rollout del apply público lo requiera.

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

- N/A — repo-only (depende del rollout del apply público de TASK-354).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El candidato rinde el test desde un link tokenizado single-use con tiempo límite; no puede re-rendir tras submit.
- [ ] El payload candidate-facing NUNCA incluye answer-key/rubric (test anti-leak verde).
- [ ] El reclutador corrige respuestas abiertas con rúbrica y el resultado rueda al scorecard (vía commands de TASK-1360).
- [ ] El scorecard por competencia se ve en Application 360, advisory (sin veredicto binario de contratación); la sugerencia IA (1361) arranca colapsada (anti-anclaje).
- [ ] La rendición honra `accommodations_json` (tiempo extendido / accesibilidad) de la instancia.
- [ ] Ruta candidato `src/app/public/assessment/[token]/**` (NO `[lang]`), bilingüe, reusa el shell público de 354.
- [ ] `UI ready` permanece `no` hasta implementation mapping + GVC scenario plan + design decision log; `yes` solo con `pnpm task:lint --task TASK-1363` sin findings.
- [ ] GVC desktop + mobile de rendición + scorecard mirada; sin overflow horizontal ni errores de consola.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm ui:wireframe-check --task TASK-1363`
- `pnpm ui:flow-check --task TASK-1363`
- `pnpm ui:motion-check --task TASK-1363`
- `pnpm fe:capture` (GVC desktop + mobile) en loop
- Smoke tokenizado + anti-leak

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1360/1361/355/354)
- [ ] `UI ready` movido a `yes` solo tras contratos + GVC

## Follow-ups

- Accesibilidad avanzada del test (lectores de pantalla, tiempo extendido como accommodation).
- Reportes de assessment por vacante (agregado de scorecards).

## Open Questions

- ¿La rendición muestra una pregunta a la vez o por bloques de competencia? Decidir en el product-design loop según fricción/tiempo.
- ¿Ruta candidate-facing bajo `/assessment/[token]` pública o bajo el shell de careers de TASK-354? Confirmar en Discovery con el patrón de TASK-354.
