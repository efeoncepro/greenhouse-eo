# TASK-1085 — Nexa Knowledge Retrieval With Citations

## Delta 2026-06-12 — CIERRE (complete): capability entregada + verificada en staging; producción atada a TASK-1092

Lifecycle → **complete**. Ambas mitades shipped a `origin/develop` y corriendo en **staging con `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED=true`**:

- **Backend (Claude):** tool `search_knowledge` + Answer Rules + flag + 3 señales (`knowledge.nexa.no_source_answer_rate`, `stale_source_retrievals`, `knowledge.retrieval.low_citation_rate`) + fix ISSUE-092 (tool-calling roto). Commits `26fd0c5f4`/`f33822479`/`6c43bcb9e`/`63a93288c`.
- **UI (Codex):** evidence renderer sobre el contrato real `knowledge-search.v1` (`NexaToolRenderers` + Answer Surface). Commit `bc86da724`.
- **Verificado:** QA matrix en staging (12/12 HTTP 200), Nexa cita desde el corpus real, gap honesto en `confidence='none'`, no abusa de Knowledge para datos vivos. Las 3 señales observando el rollout.

**Producción NO se activa en este cierre — está atada a TASK-1092** (hardening de citas inline + coverage QA + decision packet). `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` sigue **OFF en producción**. El flip de producción es decisión del operador después de que 1092 pase su exit gate (`low_citation_rate → ~0`). Esto es Runtime Rollout Gate honesto: la **capability está completa y verificada en staging**; la **activación productiva es un paso gobernado separado** (1092), no código faltante de 1085.

**Pendiente menor de docs (no bloquea el cierre de la capability):** la sección invariant de CLAUDE.md (TASK-1085) ya está committeada; Handoff + changelog ya tienen el registro de 1085 de commits previos.

## Delta 2026-06-12 — IMPLEMENTACIÓN Codex: UI runtime + evidence renderer + signal answer-level

Codex aterrizó la mitad UI sobre el contrato real `knowledge-search.v1`, sin consultar tablas de Knowledge desde la vista:

- `src/lib/nexa/use-nexa-runtime.ts`: el adapter de `@assistant-ui/react` renderiza primero la respuesta de Nexa y luego los tool parts, para que `search_knowledge` aparezca como evidencia debajo de la respuesta y no como una card previa que rompa la conversación.
- `src/views/greenhouse/home/components/NexaToolRenderers.tsx`: renderer específico para `toolName='search_knowledge'`. Extrae `result.raw.packet`, valida `contractVersion='knowledge-search.v1'`, deriva trace steps desde el packet (`chunks.length`, `score`, `confidence`, `freshness`, `deniedOrFilteredCount`) y muestra fuentes con `citationLabel`, `humanUrl`, fragmento y puntaje. Fallback honesto a `ToolCard` si el packet no existe.
- Feedback real: los botones usan `POST /api/platform/app/knowledge/feedback` con `documentId`, `chunkId` y `feedbackKind`; no nace handler local del chat. El specimen del Design System desactiva feedback para evitar writes falsos.
- `src/views/greenhouse/admin/design-system/NexaChatLabView.tsx` + `scripts/frontend/scenarios/design-system-nexa-chat.scenario.ts`: specimen vivo `nexa-knowledge-tool-trace-specimen` y GVC desktop/mobile para el renderer real del tool packet.
- `src/lib/reliability/queries/nexa-knowledge-retrieval-signals.ts`: se agregó `knowledge.retrieval.low_citation_rate` en el mismo scan JSONB. Mide respuestas donde el packet no trae fragmentos/citationLabel renderizables; warning si rate >=20% y volumen >=10. El scan ahora protege filas legacy/no-array antes de `jsonb_array_elements`.

Verificación local:

- `pnpm eslint src/views/greenhouse/home/components/NexaToolRenderers.tsx src/views/greenhouse/home/components/NexaToolRenderers.test.ts src/lib/nexa/use-nexa-runtime.ts src/views/greenhouse/admin/design-system/NexaChatLabView.tsx src/lib/reliability/queries/nexa-knowledge-retrieval-signals.ts src/lib/reliability/queries/nexa-knowledge-retrieval-signals.test.ts scripts/frontend/scenarios/design-system-nexa-chat.scenario.ts`
- `pnpm vitest run src/views/greenhouse/home/components/NexaToolRenderers.test.ts src/lib/reliability/queries/nexa-knowledge-retrieval-signals.test.ts src/components/greenhouse/primitives/__tests__/NexaKnowledgeAnswerSurface.test.tsx src/components/greenhouse/primitives/__tests__/NexaComposer.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- GVC: `.captures/2026-06-12T10-24-31_design-system-nexa-chat` (desktop + mobile, 8 frames, runtime summary sin console/page/http errors). Frame clave: `04-nexa-knowledge-tool-trace-specimen`.
- `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED=true pnpm vitest run src/lib/nexa/search-knowledge-tool.test.ts src/lib/nexa/nexa-service.test.ts src/views/greenhouse/home/components/NexaToolRenderers.test.ts src/lib/reliability/queries/nexa-knowledge-retrieval-signals.test.ts`
- `pnpm local:check`

Estado: **code complete local, push de cierre en curso, rollout pendiente**. El flag `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` sigue default OFF; no se activa staging/prod sin decisión explícita del operador.

## Delta 2026-06-12 — IMPLEMENTACIÓN: mitad backend cerrada (Claude) · mitad UI tomada por Codex

División de trabajo del programa Knowledge: **backend/contrato/engine = Claude · UI/primitives/wiring = Codex**. Esta task es la **keystone** que conecta el contrato (1083) con la experiencia (1089/Answer Trace).

### Lo que cierra Claude (backend) — code-complete, behind flag OFF

Las 3 slices del Scope (abajo) quedan implementadas, probadas y smoke-verificadas. Commits **LOCALES** (ver "Push held" abajo):

- **Slice 1 — Retrieval trigger + tool contract** (commit `26fd0c5f4`):
  - Tool `search_knowledge` (function-calling) en `src/lib/nexa/nexa-tools.ts`. `isAvailable = isNexaKnowledgeRetrievalEnabled() && hasKnowledgeAgenticAccess(tenant)` (espeja el grant agéntico de 1083: interno ∪ {EFEONCE_ADMIN, FINANCE_ADMIN, HR_MANAGER, EFEONCE_OPERATIONS}; cliente NUNCA). `execute` llama `searchKnowledge({ query, subject, mode: 'agentic' })` (SSOT de 1083) y devuelve `NexaToolResult` con grounding summary (chunks capados a 600 chars) + `raw.packet` (el `KnowledgeRetrievalPacket` v1 completo viaja en `raw` → de ahí lo leen las señales y, a futuro, la UI).
  - Flag `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` (default false) en `src/lib/nexa/flags.ts`.
  - **Provider-agnóstico** (el operador migrará Gemini→Claude): el tool + las Answer Rules viven en `nexa-tools.ts`/`nexa-service.ts` y NO dependen del SDK; el swap a `src/lib/ai/anthropic.ts` no toca el tool ni las reglas.
  - 6 tests (`search-knowledge-tool.test.ts`): 3 de gate de disponibilidad (flag + tenant), 3 live de `execute` (skip sin PG).
- **Slice 2 — Answer rules + citations** (mismo commit `26fd0c5f4`):
  - Bloque de reglas de knowledge insertado en el system prompt **solo cuando el flag está ON** (`buildSystemPrompt` → `...knowledgeRules`): usar el tool antes de responder procesos/políticas/definiciones, citar el `citationLabel`, declarar `stale`/`deprecated`, gap honesto en `confidence='none'` ("no encontré una guía publicada", sin inventar), distinguir guía publicada vs dato operativo vivo, pedir validación humana en finance/payroll/legal/security.
  - El render de las citas como Answer Trace (chips/accordion) es la **mitad de Codex** (ver abajo).
- **Slice 3 — Feedback + observability metadata** (commit `6c43bcb9e`):
  - 2 reliability signals (`src/lib/reliability/queries/nexa-knowledge-retrieval-signals.ts`, moduleKey `knowledge`), leídas de `greenhouse_ai.nexa_messages.tool_invocations` (jsonb, **sin writes nuevos** — el packet ya viaja en `result.raw.packet`):
    - `knowledge.nexa.no_source_answer_rate` (data_quality): tasa de búsquedas con `confidence='none'` → huecos de cobertura (warning si rate ≥30% y volumen ≥10).
    - `knowledge.nexa.stale_source_retrievals` (drift): búsquedas apoyadas en fuentes `stale`/`deprecated` (steady=0).
  - Un solo scan jsonb → ambas señales. Wired en `get-reliability-overview.ts` (5 puntos). Smoke verde contra PG real (steady=ok, flag OFF). 5 tests focales.
  - **El feedback auditable** (registrar chunk IDs/feedback del usuario) se canaliza por el contrato compartido `POST /api/platform/app/knowledge/feedback` (1083, Full API Parity #5) desde la UI — NO un handler local. El botón es de Codex; el endpoint ya existe.

### ISSUE-092 (resuelta) — destapada por el smoke de esta task

El smoke end-to-end reveló que **TODO el tool-calling de Nexa estaba roto en producción** (HTTP 400 `Unknown name "id" at function_response`, latente, afectaba `check_payroll`/`get_otd`/etc.). Causa raíz: `createPartFromFunctionResponse` (@google/genai 1.45.0) inyecta un `id` huérfano que Gemini 2.5 rechaza. Fix **raíz** en el path compartido (`nexa-service.ts`): construir el `functionResponse` como `{ name, response }` sin id (match por nombre/orden, como ya hace el `functionCall`). Arregla todos los tools. Verificado live: Nexa llama `search_knowledge`, recupera 6 chunks reales y responde **con citas** ("Motor ICO: métricas operativas [2]"), sin inventar. Doc: `docs/issues/resolved/ISSUE-092-nexa-tool-calling-broken-function-response-id.md`.

### Lo que le corresponde a Codex (UI half) — actualizado

Cablear la experiencia sobre la primitive ya construida (`NexaComposer` variant `chat`, TASK-009/110/114 + `NexaKnowledgeAnswerSurface` de TASK-1089). Estado tras la ejecución Codex:

1. **Wiring del runtime conversacional**: la ruta Home/Nexa ya usa el runtime conversacional existente; Codex ajustó el adapter para que la respuesta textual preceda a la evidencia del tool. La respuesta sigue viniendo de la ruta Nexa que invoca `search_knowledge` cuando el flag/tenant aplican — NUNCA query directo a tablas desde UI.
2. **Render del packet→Answer Trace**: aterrizado como renderer específico `search_knowledge` debajo de la respuesta. Cada número del trace sale del packet (`chunks[].score`, `confidence`, `freshness`, `deniedOrFilteredCount`), NUNCA fabricado. `NexaKnowledgeAnswerSurface` sigue como composition primitive para surfaces tipo Answer Trace/overview; el renderer del tool cubre la experiencia real del thread.
3. **Answer-level UI que genera 1085** (no es del packet): la prosa de la respuesta, la "confianza de respuesta" y el badge "verificada" los compone Nexa al sintetizar; la UI los renderiza distinguiéndolos de los números de retrieval.
4. **Botón de feedback** → implementado contra `POST /api/platform/app/knowledge/feedback` (contrato compartido).
5. **Signal `knowledge.retrieval.low_citation_rate`** → implementado en el reader de reliability con el mismo scan JSONB.

### Push coordination (protocolo multi-agente)

El bloqueo original de push venía de WIP UI no commiteado. En el cierre Codex se aisló el WIP no relacionado de TASK-1086 con stash reversible, se verificó `pnpm local:check` y se prepara push de `develop`. La activación del flag en staging/prod sigue fuera de este cierre y requiere decisión explícita del operador.

## Delta 2026-06-12 — contrato de la experiencia Answer Trace (mapeo packet→UI, TASK-1089)

Codex construyó la cáscara UI en **TASK-1089** (`NexaKnowledgeAnswerSurface`, mock). 1085 la **casa** con el packet `knowledge-search.v1` (TASK-1083). Mapeo canónico packet→UI (cada número del trace sale del packet, NUNCA fabricado):

| UI (Answer Trace) | Campo del packet | Notas |
|---|---|---|
| "Retrieval: N chunks · Filtrados por policy: M" | `chunks.length` · `deniedOrFilteredCount` | M = denegados por política, sin contenido |
| "Confianza del retrieval" | `confidence` (categórica) + `max(chunks.score)` (número) | distinta de la confianza de respuesta |
| "Freshness: Actual/…" | `freshness` | |
| "Chunks recuperados · Score 0.96" | `chunks[].score` | el `ts_rank` redondeado (SSOT del número) |
| "Fuentes citadas · Confianza 0.94" | **derivada** de `chunks[].score` agrupando por `documentId` | NO un campo nuevo; se deriva |
| "Manual: … v4.3 · Actual" (cita) | `chunks[].citationLabel` + `freshness` + `humanUrl` | el clic va a la biblioteca (1084) |
| tab "Evals" | salud del **eval harness offline** (golden questions, CI) | NO un campo por-consulta |
| "Confianza de respuesta 0.91 · Respuesta verificada" | **lo genera 1085** (no es del packet) | answer-level, distinta del retrieval |

Regla dura: la respuesta en prosa + la "confianza de respuesta" + el badge "verificada" los **genera 1085** desde el packet; los números de retrieval (score/confianza/freshness/denied) son del packet. Si la UI muestra un número que no sale del packet ni de la generación gobernada de 1085, es teatro.

## Delta 2026-06-12 — UI pre-construida (NexaComposer) + runtime canónico + cruce con el contrato

Codex canonizó la primitive `NexaComposer` (variant `chat`, runtime-agnóstica; commit `78346c636`). El runtime conversacional **`@assistant-ui/react` es canónico** (NO es dependencia nueva — es el runtime de Nexa desde TASK-009/110/114, en `ui-platform/STACK.md`; **formalizado en `DECISIONS_INDEX` por el operador 2026-06-12**). Para 1085:

- **El cruce crítico es acá:** cuando el composer envíe la pregunta, la respuesta DEBE venir de `searchKnowledge({ mode: 'agentic' })` (citas + filtrado agéntico + `confidence='none'`→no-inventar), NUNCA un LLM call sin retrieval ni query directo a las tablas. El composer deja esto abierto correctamente (no cablea el retrieval adentro).
- **Wiring:** Nexa cablea `@assistant-ui/react` (`ComposerPrimitive.Root/.Input/.Send/.Cancel`) sobre `NexaComposer`/`NexaComposerInput`/`NexaComposerActionButton` vía `asChild` (la primitive es presentacional, el runtime lo trae el consumer). El thread/respuesta consume el packet `knowledge-search.v1`.

## Delta 2026-06-12 — desbloqueada por TASK-1083 (contrato listo)

La Search API ya existe. Nexa **consume el contrato**, no las tablas:

- Reader SSOT `searchKnowledge({ query, subject, mode: 'agentic' })` (`src/lib/knowledge/search/search-knowledge.ts`) — lane-agnóstico, ya filtra pre-LLM (NUNCA retorna `agent_excluded`/`quarantined`/`restricted`), devuelve `KnowledgeRetrievalPacket` v1 con citas (`citationLabel`/`humanUrl`), `confidence` (`'none'`→no-answer honesto), `freshness` y `deniedOrFilteredCount`. Nexa NO debe queryear `knowledge_chunks` directo (lint `greenhouse/no-direct-knowledge-chunk-query`).
- Feedback: usar el contrato compartido `POST /api/platform/app/knowledge/feedback` (Full API Parity #5), no uno propio.
- **El signal `knowledge.retrieval.low_citation_rate` es de ESTA task** (Delta D de 1083): mide cuántas respuestas de Nexa citan; en 1083 todavía no hay "respuesta".
- Answer Rules (arch §12.4): responder solo con lo respaldado por el packet, citar, declarar stale/deprecated, distinguir dato operativo vivo vs guía publicada, pedir validación humana en legal/payroll/finance/security, decir "no encontré una guía publicada" cuando `confidence='none'`.

## Delta 2026-06-11

Cerrado por **TASK-1080** (alineado, sin cambio estructural):

- Nexa retira solo docs `agent_allowed` (la columna `agentic_policy` es la compuerta; un doc `published` puede ser `agent_excluded` y queda fuera de Nexa). Corpus MVP **solo interno**.
- **Dominios sensibles** (finance, payroll, legal, security, access): Nexa no los usa sin la firma del approver de dominio (ver arquitectura Delta tabla D). Hasta esa firma nacen `agent_excluded`.
- Sigue flag-gated (`NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` default false); esta aceptación NO levanta el gate.

## Delta 2026-06-11 — Visual contract input from Answer Trace Studio

El mockup `/knowledge/mockup/answer-trace` deja un target de UX para Nexa cuando use Knowledge Retrieval: respuesta verificable, citas visibles, warning de freshness, gap honesto y feedback de mejora. No conecta Nexa ni levanta `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`; la integración sigue bloqueada por `TASK-1083`.

Implicaciones para esta task:

- Nexa debe renderizar/emitir fuentes como evidencia, no solo como texto decorativo.
- Si el packet indica baja confianza, stale/deprecated o datos operativos no consultados, la respuesta debe decirlo de forma directa.
- El copy de gap honesto validado en el prototipo es: `No consulté datos actuales ni fuentes fuera de Knowledge. Si necesitas estado productivo, valida en el módulo operativo.`
- El feedback de respuesta debe mapear al contrato compartido de Knowledge feedback, no a un handler local del chat.
- La métrica `knowledge.retrieval.low_citation_rate` se evalúa contra respuestas con citas reales; el mockup sirve como forma objetivo, no como medición.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Complete — capability shipped + verificada en staging (flag ON). Producción OFF, activación atada a TASK-1092 (hardening citas inline + decision packet).`
- Rank: `TBD`
- Domain: `nexa|platform|content|ai`
- Blocked by: `none`
- Branch: `develop` (excepción explícita del operador; sin worktree)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Conectar Nexa a Knowledge Platform mediante retrieval-on-demand: `knowledge_search`, citation packet, respuesta con fuentes, freshness warnings, no-invención y feedback auditable. La integración debe ser flag-gated y no cargar el corpus completo en prompt.

## Why This Task Exists

Nexa necesita un depósito de conocimiento gobernado para responder consultas de uso, procedimientos y definiciones. Sin retrieval con citas y reglas de gap honesto, Nexa puede sonar segura mientras inventa o usa fuentes stale.

## Goal

- Agregar tool/context path de knowledge en Nexa.
- Hacer que Nexa cite fuentes y declare stale/deprecated.
- Capturar metadata de respuesta y feedback sin almacenar conversaciones completas por defecto.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Nexa no carga corpus completo en prompt.
- Si usa chunks, cita fuentes.
- Si no hay evidencia suficiente, responde gap honesto.
- Si la fuente está stale/deprecated, lo dice.
- Legal, payroll, finance, security o contractual commitments requieren fuente aprobada o validación humana.

## Normative Docs

- `docs/tasks/to-do/TASK-1083-knowledge-search-api-golden-questions.md`
- `docs/tasks/to-do/TASK-1084-human-knowledge-center-mvp.md`

## Dependencies & Impact

### Depends on

- `TASK-1083` para `knowledge_search` y evals.
- Corpus piloto con golden questions.

### Blocks / Impacts

- Afecta chats de Nexa y futuras surfaces que usen Nexa como ayuda contextual.

### Files owned

- `src/lib/nexa/**`
- `src/app/api/home/nexa/**`
- `src/views/greenhouse/home/components/NexaThread.tsx`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Current Repo State

### Already exists

- Nexa tiene runtime/chat/persistencia en evolución.
- Knowledge architecture define Context Contract, Retrieval Trigger, Answer Rules y Feedback Loop.

### Gap

- Nexa ya tiene tool `search_knowledge` y renderer UI de evidencia sobre `knowledge-search.v1`, detrás de `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` default OFF. Smoke local con flag ON verde; falta rollout/flag ON verificado en staging/prod.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Retrieval trigger + tool contract

- Clasificar preguntas que requieren knowledge.
- Invocar `knowledge_search` con user context.
- Inyectar solo retrieval packet acotado al turno.

### Slice 2 — Answer rules + citations UI

- Responder con fuentes, freshness y gaps honestos.
- Renderizar fuentes como chips/accordion en chat compacto.
- Distinguir dato operativo actual vs regla publicada cuando ambos aplican.

### Slice 3 — Feedback + observability metadata

- Registrar chunk IDs usados, confidence, freshness y feedback.
- Signals mínimos: no-source, stale-source, low-citation.

## Out of Scope

- MCP resources, embeddings, Notion live reads, writes programáticos, cambios de modelo no relacionados.

## Detailed Spec

El system prompt de Nexa solo debe incluir reglas estables de uso de knowledge. El contenido recuperado vive en tool result del turno. La UI debe mostrar fuentes sin saturar la conversación.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (retrieval) -> Slice 2 (answer/citations) -> Slice 3 (feedback/signals). No activar default-on sin eval smoke verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Nexa inventa al no recuperar docs | ai/content | medium | `confidence='none'` obliga gap honesto | `knowledge.nexa.no_source_answer_rate` |
| Fuente sensible llega al modelo | security | medium | filtering en `knowledge_search` + tests | denied chunk en prompt |
| UX se llena de citas ruidosas | ui | low | chips/accordion | feedback negativo |

### Feature flags / cutover

- Flag `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` default false hasta smoke/evals.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | flag false | <5 min | sí |
| 2 | ocultar citation UI y revert prompt/tool wiring | <10 min | sí |
| 3 | deshabilitar feedback metadata writes | <10 min | sí |

### Production verification sequence

1. Eval golden questions antes/después.
2. Smoke en staging con flag true.
3. Confirmar citas/freshness/no-answer.
4. Activación gradual interna.

### Out-of-band coordination required

- Aprobación humana para corpus sensible antes de habilitar en Nexa.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [x] Nexa llama `searchKnowledge({ mode: 'agentic' })` solo cuando flag/tenant aplican.
- [x] Respuestas grounded pueden renderizar fuentes y freshness desde `raw.packet`.
- [x] No-answer/gap honesto funciona cuando `confidence='none'` en reglas/tool path.
- [x] No hay lectura Notion live ni corpus completo en prompt.
- [x] Metadata/feedback de uso queda auditada por contratos compartidos sin handler local del chat.
- [x] Flag default false y rollback documentado.
- [ ] Rollout/staging smoke con flag ON y activación gradual.

## Verification

- tests/evals golden questions
- smoke chat con preguntas de manual, stale y no-answer
- `pnpm task:lint --task TASK-1085`
- `pnpm docs:closure-check --staged`
- `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED=true pnpm vitest run src/lib/nexa/search-knowledge-tool.test.ts src/lib/nexa/nexa-service.test.ts src/views/greenhouse/home/components/NexaToolRenderers.test.ts src/lib/reliability/queries/nexa-knowledge-retrieval-signals.test.ts`
- `pnpm local:check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` actualizado.
- [x] `Handoff.md` actualizado con flag, smoke y rollout state.
- [x] `changelog.md` actualizado.
- [x] Manual de uso de Nexa actualizado.

## Follow-ups

- `TASK-1086` MCP resources.
