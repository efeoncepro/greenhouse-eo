# TASK-1361 — Assessment AI Assist

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-1360`
- Branch: `task/TASK-1361-assessment-ai-assist`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Capa IA gobernada sobre el motor de assessment (TASK-1360): generación asistida de preguntas por competencia+nivel y corrección **propuesta** de respuestas `open_text`/`situational`. La IA propone, un humano confirma — nunca puntúa como verdad final ni auto-rechaza. Acelera armar el banco de preguntas y correr correcciones sin comprometer defensibilidad.

## Why This Task Exists

TASK-1360 deja el banco de preguntas y las respuestas abiertas como trabajo humano. Armar preguntas por skill (SEO, copywriting, liderazgo, vendor management…) y corregir respuestas abiertas a mano no escala. La IA puede acelerar ambos, pero sin gobernanza se vuelve un juez opaco que decide contrataciones. Este task introduce el asistente IA respetando el runtime de acción gobernada (`propose → confirm → execute`) y la regla de eval-driven AI: nada de scoring IA sin baseline.

## Goal

- Generar borradores de preguntas por competencia+nivel que un humano revisa/aprueba antes de entrar al banco.
- Proponer un score + justificación para respuestas `open_text`/`situational`, que un humano confirma o corrige.
- Dejar eval baseline + flag OFF para cutover controlado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (§`Delta 2026-07-08 — Assessment`)
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` (runtime de acción gobernada `propose → confirm → execute`)
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (§providers LLM — cliente canónico `src/lib/ai/`)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `src/lib/growth/ai-visibility/**` — **precedente canónico** de "capa de dominio con LLM estructurado gobernado, fuera de Nexa" (ver §Detailed Spec → Frontera Nexa vs dominio); espejar su forma (`commands.ts`/`contracts.ts`/`accuracy/`).

Reglas obligatorias:

- La IA **propone**, un humano **confirma**: el LLM NUNCA escribe el score final ni aprueba una pregunta directo. La mutación ocurre solo en el endpoint de confirmación humana.
- NUNCA instanciar un SDK LLM paralelo dentro del dominio: usar los helpers estructurados canónicos de `src/lib/ai/*` (`generateStructured{Anthropic,OpenAI,Gemini}`).
- Modelo por sub-tarea (decisión 2026-07-08, ver §Detailed Spec): **grading = Claude Sonnet 5** (defensibilidad AI-Act), **generación de preguntas = Gemini Flash/Haiku 4.5** (barato, el SME gatea). Provider como seam de config, jamás hardcodeado; el eval baseline confirma el default.
- Eval baseline obligatorio antes de cutover; sin baseline, el scoring IA no shippea.
- Flag default OFF; el score IA propuesto es visible como sugerencia, nunca como resultado canónico hasta confirmación.
- El boundary de TASK-1360 se mantiene: score ortogonal a payroll/ICO, nunca auto-reject.

## Normative Docs

- `docs/tasks/to-do/TASK-1360-assessment-engine-foundation.md`
- `docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md` (§`Delta 2026-07-08`)

## Dependencies & Impact

### Depends on

- `TASK-1360` (banco de preguntas `hiring_question`, respuestas `hiring_assessment_response`, scoring humano)
- `src/lib/ai/*` (helpers LLM estructurados canónicos) `[verificar]`
- `src/lib/ai/eval/**` o patrón de eval baseline existente `[verificar]`

### Blocks / Impacts

- `TASK-1363` (la UI de review muestra la sugerencia IA + botón confirmar)

### Files owned

- `src/lib/hiring/assessment/ai/**`
- `src/app/api/hiring/assessments/ai/**`
- `migrations/<ts>_task-1361-assessment-ai-proposals.sql` (tabla de propuestas IA + confirmación)
- `src/config/entitlements-catalog.ts` (capability `hiring.assessment.ai_assist`)
- `src/lib/entitlements/runtime.ts` (grant)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (registrar el flag)
- `src/types/db.d.ts`

## Current Repo State

### Already exists

- Motor de assessment (TASK-1360): banco de preguntas + respuestas + scoring humano + rollup.
- Helpers LLM estructurados canónicos en `src/lib/ai/*` (`generateStructuredAnthropic`/`generateStructuredGemini`/`generateStructuredOpenAI` — **verificado**). Es la infra compartida; NO instanciar SDK propio.
- **AEO grader `src/lib/growth/ai-visibility/**` (verificado): el patrón "capa de dominio con LLM estructurado gobernado" ya resuelto y en producción, fuera de Nexa.** Es el molde de TASK-1361.
- Runtime de acción gobernada de Nexa `propose → confirm → execute` (`resolveNexaActionProposal` en `nexa-tools.ts`): opera capabilities de parity vía tool-calling conversacional. Es el consumer-por-construcción, NO donde se construye este AI assist.

### Gap

- No hay generación asistida de preguntas.
- No hay corrección IA propuesta de respuestas abiertas.
- No hay eval baseline para scoring de assessment.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (scoring IA que afecta decisiones de contratación; requiere eval + gobernanza)
- Impacto principal: `api`
- Source of truth afectado: banco de preguntas (TASK-1360) + nueva tabla `hiring_assessment_ai_proposal` (propuesta + estado de confirmación)
- Consumidores afectados: UI review (TASK-1363), operador humano
- Runtime target: `local` → `staging` → `production`

### Contract surface

- Contrato existente a respetar: commands/readers de TASK-1360; helpers `src/lib/ai/*`; runtime de acción gobernada
- Contrato nuevo: `proposeQuestionsForCompetency`, `proposeScoreForResponse` (generan propuesta), `confirmAiProposal` (mutación humana); rutas `/api/hiring/assessments/ai/**`
- Backward compatibility: `gated` (flag OFF default)
- Full API parity: la propuesta IA es un command gobernado; la confirmación es el único write. Nexa opera por construcción (no integración Nexa-específica)

### Data model and invariants

- Entidades/tablas afectadas: `greenhouse_hiring.hiring_assessment_ai_proposal` (`proposal_id`, `kind` `question_draft|response_score`, `target_ref`, `proposed_json`, `model`, `status` `proposed|confirmed|rejected`, `confirmed_by`, `confirmed_at`)
- Invariantes que no se pueden romper:
  - la propuesta IA NUNCA muta el banco/score directo; solo `confirmAiProposal` (humano) aplica
  - toda propuesta registra el `model` + inputs para trazabilidad
  - el score IA propuesto no cuenta en el rollup hasta confirmación
- Tenant/space boundary: heredado del assessment/application
- Idempotency/concurrency: propuestas append-only; confirmación idempotente por `proposal_id`
- Audit/outbox/history: evento `hiring.assessment.ai_proposed` + `hiring.assessment.ai_confirmed`; propuestas append-only

### Migration, backfill and rollout

- Migration posture: `additive` (tabla de propuestas)
- Default state: `flag OFF` (`HIRING_ASSESSMENT_AI_ENABLED`)
- Backfill plan: `none`
- Rollback path: `flag off` + revert PR + tabla drop (additive)
- External coordination: verificar secret del provider LLM ya configurado (`greenhouse-*-api-key`); sin coordinación nueva

### Security and access

- Auth/access gate: capability `hiring.assessment.ai_assist` (proponer) + `hiring.assessment.author`/`score` (confirmar, ya de TASK-1360). Grant a roles internos reales, NUNCA `client_*`
- Sensitive data posture: respuestas de candidatos (PII moderada) van al LLM — declarar en el flag/rollout; no enviar identity docs ni PII sensible al provider
- Error contract: `toHiringErrorResponse` + `captureWithDomain(err, 'hiring')`; degradar si el provider falla (la corrección humana sigue disponible)
- Abuse/rate-limit posture: quota de llamadas IA por operador/período; el gasto va gobernado

### Runtime evidence

- Local checks: unit tests del parse de la propuesta estructurada + test de que la propuesta NO muta banco/score sin confirmación
- DB/runtime checks: smoke contra PG dev (proponer → confirmar → verificar mutación solo post-confirm)
- Integration checks: smoke real contra el provider LLM (una generación + una corrección) con evidencia
- Reliability signals/logs: outbox `hiring.assessment.ai_*`; signal de fallo de provider
- Production verification sequence: eval baseline verde → flag ON staging → smoke → flag ON prod

### Acceptance criteria additions

- [ ] Source of truth + contract surface + consumers nombrados con paths reales.
- [ ] Invariante "IA propone, humano confirma" explícito y con test (no mutación sin confirmación).
- [ ] Flag OFF default + registrado en el ledger; rollback por flag.
- [ ] Eval baseline ejecutado con evidencia antes de cutover.
- [ ] Canonical errors + degradación si el provider falla + sin leak de PII sensible al LLM.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `src/lib/hiring/assessment/ai/**`, no en UI.
- [ ] Modelada como command (proponer) + command de confirmación (write), no click-handler.
- [ ] Read = readers de propuestas; write (confirm) = command con capability + idempotencia + outbox + errores canónicos.
- [ ] Capability `hiring.assessment.ai_assist` + grant a rol real + coverage test mismo PR.
- [x] Camino programático: `/api/hiring/assessments/ai/**` (propose questions/score + list + confirm), commands en `src/lib/hiring/assessment/ai/**`. Parity satisfecha **a nivel de capability/contrato gobernado** (commands + rutas + capability `hiring.assessment.ai_assist`).
- [ ] **DEFERIDO a follow-up:** registrar `confirmAiProposal` como **actionKey** de Nexa (`NEXA_ACTION_REGISTRY`) para operarlo desde el chat. Rationale: el registro requiere un `NexaActionDefinition` completo (Zod schema + preview builder + confirm-endpoint del framework de acciones de Nexa) — cada acción existente (`author_quote`) fue su propia task (TASK-1212); el feature está flag-OFF y sin UI aún (TASK-1363). La parity de fondo ya está (el contrato existe); el wiring del actionKey es un adaptador delgado follow-up, NO lógica hiring dentro de Nexa. Ver Follow-ups.
- [ ] Write apto para `propose → confirm → execute` (es literalmente el patrón).
- [ ] Un primitive, muchos consumers sin lógica duplicada.
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

### Slice 1 — Proposal store + governed write

- Migración `hiring_assessment_ai_proposal` (append-only + estado de confirmación).
- Command `confirmAiProposal` (único write que aplica al banco/score), capability-gated + outbox.

### Slice 2 — Question generation (propose)

- `proposeQuestionsForCompetency(competencyKey, level, count)` usando `generateStructuredGemini` (tier barato — Gemini Flash / Haiku 4.5, ver §Selección de provider/modelo) de `src/lib/ai/*`; guarda propuestas `question_draft`. El SME las gatea igual.
- Endpoint `/api/hiring/assessments/ai/questions/propose` (capability `hiring.assessment.ai_assist`).

### Slice 3 — Response scoring (propose)

- `proposeScoreForResponse(responseId)` para `open_text`/`situational`, con score + justificación estructurada, usando `generateStructuredAnthropic` (Claude Sonnet 5, tier calidad/defensibilidad — ver §Selección de provider/modelo).
- La propuesta se muestra como sugerencia; el score canónico solo se aplica vía la cola de corrección humana de TASK-1360 (confirmación).

### Slice 4 — Eval baseline + flag

- Eval baseline: dataset de respuestas con score humano de referencia; medir correlación IA↔humano antes de habilitar.
- Flag `HIRING_ASSESSMENT_AI_ENABLED` default OFF + registro en el ledger.

## Out of Scope

- El motor de assessment base (TASK-1360).
- UI de review con el botón confirmar (TASK-1363).
- Auto-scoring sin confirmación humana (prohibido por diseño).

## Detailed Spec

Reutilizar el patrón de scoring IA gobernado del AI Visibility grader (`src/lib/growth/ai-visibility/**`) como referencia de "IA propone, contrato gobierna" `[verificar]`. La propuesta estructurada usa `generateStructured*`; el schema de salida fuerza `{score, rationale, perCriterion?}`. La confirmación humana es el único path que toca el rollup canónico de TASK-1360.

### Selección de provider/modelo (decisión 2026-07-08)

No se elige **un solo modelo para todo**: las dos sub-tareas tienen exigencias distintas. El `model` viaja en cada `hiring_assessment_ai_proposal` (trazabilidad), y el provider es un **seam de config** (domain `config.ts` que resuelve el modelo desde env var con default, espejo de `src/lib/workforce/contracting/ai/config.ts`) — jamás hardcodeado; swappear el modelo no cambia el `propose → confirm`.

| Sub-tarea | Modelo por defecto | Helper | Rationale |
|---|---|---|---|
| **Corrección propuesta** de `open_text`/`situational` (grading contra rúbrica) | **Claude Sonnet 5** `claude-sonnet-5` (env `HIRING_ASSESSMENT_AI_SCORING_MODEL`) | `generateStructuredAnthropic` | Es lo legalmente sensible (hiring-AI = alto riesgo EU AI Act; el output alimenta una decisión sobre una persona). El más reciente y capaz para juicio defendible siguiendo rúbrica. |
| **Generación** de preguntas por competencia+nivel | **Gemini flash-lite** `gemini-2.5-flash-lite` (default del helper, `model: undefined`) | `generateStructuredGemini` | Un SME humano las gatea igual (`draft→sme_review→active` de TASK-1360), así que costo/latencia > perfección; el error se atrapa en el gate SME. |

> **Nota de model-id:** `claude-sonnet-5` (familia Claude 5) es el default de grading — el más reciente y capaz; se usa por la directiva "default a los modelos Claude más recientes". El allowlist `src/config/nexa-models.ts` (que solo tiene `claude-sonnet-4-6`) es el **router de Nexa**, NO el universo de modelos Anthropic válidos: `generateStructuredAnthropic` recibe el model string crudo y lo pasa al SDK, así que `claude-sonnet-5` funciona sin tocar ese allowlist. Tier barato de generación: `gemini-2.5-flash-lite` (`GEMINI_STRUCTURED_DEFAULT_MODEL`).

Reglas de esta decisión:

- **Un solo grader en producción** (no ensemble) para que el eval baseline y la documentación técnica del EU AI Act tengan un baseline claro que monitorear por drift.
- **`claude-sonnet-5` es el default de arranque para grading, no un veredicto cerrado**: el eval baseline (Slice 4) decide empíricamente cuál grader correlaciona mejor con la corrección del SME. Si otro provider gana el eval, se swappea por el env var sin tocar el contrato.
- Anthropic resuelve el secreto server-side (`greenhouse-anthropic-api-key` vía `resolveSecret`, gate con `isAnthropicConfigured()`); Gemini usa Vertex ADC (sin API key, gate con `isGeminiConfigured()`). Nunca hardcodear credenciales. Gemini Omni/Vertex multimodal no aplica (acá es texto→estructura).
- **JSON Schema, no zod** (ambos helpers): Anthropic vía `inputSchema`+`toolName`, Gemini vía `jsonSchema`+`responseJsonSchema`. `temperature` baja (0–0.2).

### Frontera Nexa vs dominio (decisión 2026-07-08, análisis `arch-architect` + `greenhouse-nexa-conversational`)

Se evaluó si este AI assist debía ser **una capability que Nexa opera con su motor** en vez de una capa de dominio propia (para no reinventar). **Veredicto: capa de dominio hiring propia que consume la infra LLM compartida — NO un tool del motor conversacional de Nexa.** El instinto de "no reinventar el motor" es correcto, pero el motor a reusar es el **provider layer + el patrón gobernado**, no el engine de chat de Nexa.

**Precedente canónico:** `src/lib/growth/ai-visibility/**` (el AEO grader) YA es exactamente este patrón resuelto — scoring con LLM estructurado que consume `src/lib/ai/*` **directo** (`generateStructured*`), con sus propios `commands.ts`/`contracts.ts`/`accuracy/` (eval), **fuera de Nexa**. TASK-1361 lo espeja; NO inventa una forma nueva.

Frontera en 3 capas:

| Capa | Qué | Dónde | Reinventar |
|---|---|---|---|
| **Infra compartida** | `generateStructured{Anthropic,Gemini}` + patrón "IA propone / contrato gobierna" | `src/lib/ai/*` + patrón AEO grader | NO — reusar tal cual |
| **Dominio hiring** | rúbricas de competencias, qué es una buena pregunta, ledger `hiring_assessment_ai_proposal` (propose→confirm de *contenido*) | `src/lib/hiring/assessment/ai/**` | SÍ — Nexa no sabe de rúbricas |
| **Nexa por construcción** | operar la capability desde el chat ("proponé un puntaje para la respuesta X") | Nexa registra el actionKey vía Full API Parity | NO — sale gratis cuando la capability existe |

**Por qué NO rutear por `NexaService.generateResponse`:** es *wrong shape*. Envolvería una tarea batch (una llamada estructurada, sin retrieval, sin conversación, sin citas) en la maquinaria de un turno de chat — system prompt versionado, `history.slice(-10)`, persistencia a `nexa_messages`, telemetría de turno, coreografía de 11 estados. El consumer primario tampoco es un chat: es el botón "sugerir puntaje" del desk (TASK-1363) llamando a `/api/hiring/assessments/ai/score/propose`. Además `hiring_assessment_ai_proposal` NO duplica el action-registry de Nexa: Nexa propone *qué capability invocar con qué args*; hiring propone *contenido generado* (borrador de pregunta / score) — ejes distintos.

**El pago de parity (North Star Nexa):** en cuanto los commands `proposeScoreForResponse`/`proposeQuestionsForCompetency`/`confirmAiProposal` existen como capabilities gobernadas con contrato, Nexa las registra como **actionKeys** (`resolveNexaActionProposal`, `nexa-tools.ts`) y un reclutador las opera desde el chat con el MISMO loop propose→confirm de Nexa — **cero código hiring dentro de Nexa**. Declarar esa registración en la Definition of Done (no construir integración Nexa-específica; es consecuencia de la parity).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (proposal store + governed write) → Slice 2/3 (propose paths, pueden ir en paralelo) → Slice 4 (eval + flag, gate final antes de cutover).
- Slice 4 (eval baseline) MUST ship antes de habilitar el flag en cualquier ambiente productivo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| IA puntúa como verdad final (sin humano) | identity / hiring | medium | Invariante propose→confirm + test de no-mutación; único write = confirm | test rojo; auditoría de proposals no confirmadas |
| PII sensible enviada al provider LLM | identity / PII | medium | Allowlist de campos al prompt; nunca identity docs; redacción | revisión de payloads; captureWithDomain |
| Scoring IA sesgado / no defensible | hiring / legal | medium | Eval baseline + humano confirma + assessment sigue siendo advisory | correlación IA↔humano baja en eval |
| Gasto LLM descontrolado | cost | low | Quota por operador + flag OFF default | dashboard de gasto AI |

### Feature flags / cutover

- Env var `HIRING_ASSESSMENT_AI_ENABLED` (default `false`). Flip a `true` solo post eval baseline verde. Revert: flag a `false` + redeploy (<5 min). Registrar en `FEATURE_FLAG_STATE_LEDGER.md`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | drop tabla proposals + revert PR | <10 min | si |
| Slice 2-3 | flag off (propose deja de ofrecerse) | <5 min | si |
| Slice 4 | flag off | <5 min | si |

### Production verification sequence

1. Migrate staging + verify tabla proposals.
2. Deploy con flag OFF + verify que no se ofrece IA.
3. Correr eval baseline staging + verify correlación aceptable con evidencia.
4. Flag ON staging + smoke propose→confirm + verify mutación solo post-confirm.
5. Repetir en prod con cooldown.

### Out-of-band coordination required

- Verificar secret del provider LLM configurado (`greenhouse-*-api-key`); si falta, coordinar rotación/publicación antes del flag ON.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `hiring_assessment_ai_proposal` append-only con estado de confirmación.
- [ ] La generación de preguntas produce borradores que NO entran al banco sin confirmación humana.
- [ ] La corrección IA de respuestas produce una sugerencia que NO cuenta en el rollup hasta confirmación.
- [ ] `confirmAiProposal` es el único write que aplica; capability-gated + outbox + test de no-mutación previa.
- [ ] Eval baseline ejecutado con evidencia de correlación IA↔humano antes de habilitar el flag.
- [ ] Flag `HIRING_ASSESSMENT_AI_ENABLED` default OFF + registrado en el ledger.
- [ ] Sin PII sensible (identity docs) enviada al provider; errores canónicos + degradación si el provider falla.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm flags:audit --strict --no-vercel` (flag registrado)
- Smoke provider LLM real (una generación + una corrección) con evidencia
- Smoke DB: propose → confirm → verificar mutación solo post-confirm

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1363)
- [ ] flag registrado en `FEATURE_FLAG_STATE_LEDGER.md`
- [ ] `GREENHOUSE_EVENT_CATALOG_V1.md` delta con `hiring.assessment.ai_*`

## Follow-ups

- **Nexa actionKey `confirm_assessment_ai_proposal`** (own task, espeja TASK-1212 `author_quote`): registrar `confirmAiProposal` en `NEXA_ACTION_REGISTRY` (`NexaActionDefinition` + Zod input + preview builder + confirm-endpoint) para que un reclutador opere el confirm desde el chat de Nexa. Gateado por `NEXA_ACTION_RUNTIME_ENABLED` + `HIRING_ASSESSMENT_AI_ENABLED`. La parity de fondo ya existe (capability + contrato); esto es el wiring del consumer conversacional.
- Fine-tune/prompt-iteration del scoring IA según drift del eval.
- Extensión a generación de plantillas completas por cargo (no solo preguntas sueltas).

## Open Questions

- ~~¿Qué provider LLM por defecto para scoring de assessment?~~ **RESUELTO 2026-07-08** (ver §Detailed Spec → Selección de provider/modelo): split por sub-tarea — **grading = Claude Sonnet 5** (`generateStructuredAnthropic`, calidad/defensibilidad AI-Act) + **generación de preguntas = Gemini Flash/Haiku 4.5** (`generateStructuredGemini`, barato, el SME gatea). Provider como seam de config; Sonnet 5 es default de arranque, el eval baseline (Slice 4) lo confirma o swappea.
- ~~¿El eval baseline se versiona como dataset en el repo o vive en un artefacto externo?~~ **RESUELTO 2026-07-08** (intake): **dataset versionado pequeño en el repo** (`src/lib/hiring/assessment/ai/__fixtures__/eval-baseline-scoring.json` — tuplas `{competencyKey, level, prompt, rubric, candidateAnswer, humanReferenceScore, note}` curadas). Rationale: (a) TASK-1360 shippeó el engine SIN data productiva graded todavía (ningún candidato rindió) → el baseline NO puede usar producción; debe ser un set curado tipo-SME; (b) versionado = reproducible en local/CI e inspeccionable (git es el historial); (c) chico = revisable por un humano. El eval corre como script `pnpm tsx` que mide correlación IA↔referencia + emite evidencia (NO test de CI que llame al provider — costo/no-determinismo; el gate de CI valida el parseo estructurado con provider mockeado). Cuando exista data real graded (post TASK-1363 en uso), el dataset se amplía con casos reales anonimizados.
