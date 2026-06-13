# TASK-1101 — Nexa Answers Runtime Promotion (citas inline · response toolbar · stop · portabilidad)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|nexa|ai|content|knowledge`
- Blocked by: `none` (el contrato `surfaceContext` ya existe — ver Delta abajo) · coordinar con `TASK-1095` (refinamiento A2 de la máquina de estados, paralelo), `TASK-1092` (production readiness Knowledge retrieval, Codex) y `TASK-1090` (lentes `/knowledge` → converge a `NexaAnswersCanvas`)
- Branch: `task/TASK-1101-nexa-answers-runtime-promotion`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Promover a **runtime real** los enriquecimientos de Nexa Answers que hoy viven probados en el mockup `/knowledge/mockup/nexa-answers` (TASK-1096): **citas inline span-level + evidence-peek**, **response toolbar de la fase settle** (¿útil? + copiar/compartir/regenerar), **control "Detener"** durante streaming, y la **portabilidad** del `NexaAnswersCanvas` a dominios no-Knowledge (finance/chart + Insight promovido). El primitive ya está construido y GVC-verificado; esta task cablea sus contratos `opt-in` (`onResponseControl`, `onStopGeneration`, segmento `citation`) a **datos y handlers reales** del retrieval de Knowledge (`knowledge-search.v1`, TASK-1085) detrás de un flag, con cutover gradual.

## Delta 2026-06-13 — desbloqueada: el contrato ya existe y es el canónico

Corrección post-decisión del operador (ver TASK-1095/1096 Delta 2026-06-13). El framing original de esta task ("Blocked by TASK-1095" + Slice 0 "consumir el surfaceContext SSOT de 1095") era inexacto:

- **El `surfaceContext` YA existe**: es `NexaAnswersSurfaceContext` (`nexa-answers-canvas-types.ts`), y por **decisión del operador es el contrato canónico** (`NexaAnswersCanvas` es la surface canónica de la lente Nexa; el answer-trace de TASK-1089/1090 ni siquiera lo modela). No hay un SSOT nuevo que esperar.
- ⇒ Esta task **NO está bloqueada**: consume el contrato existente directo. El Slice 0 se reinterpreta como "**bendecir** `NexaAnswersSurfaceContext` como SSOT (blessing in-place u opcional promoción a `src/lib/nexa/`)", no "migrar a un contrato de 1095".
- El refinamiento A2 de TASK-1095 (descomponer la máquina de 10 estados en lifecycle×disclosure×turn) es **paralelo** y no bloquea el cableado a datos reales.

## Delta 2026-06-13 (2) — el lens vivo migra al canvas; Knowledge es consumer #1, NO el destino

Corrección de framing del operador. El trabajo NO es "mejorar el answer-trace": es **traer la riqueza ARRIBA a la superficie viva**, manteniendo la primitive transversal.

- **Migración de superficie explícita**: el lens conversacional vivo de `/knowledge` (`KnowledgeCenterView`) pasa de `NexaKnowledgeAnswerSurface` (answer-trace pobre: `conversationTrace`/`overviewPanel`/`toolResult`, sin coreografía ni los 11 estados) → `<NexaAnswersCanvas variant='embedded' mode='runtime'>` (rico). El answer-trace queda como **fallback flag-gated**, no como destino. Coordinar con TASK-1090 qué ruta/lente lo monta.
- **HARD RULE — "consumer, no destino"**: `NexaAnswersCanvas` es el **producto transversal**; Knowledge es el **consumer #1**, no el final. Todo lo domain-specific —el mapper `chunk→NexaCitationSource`, los handlers `helpful/unhelpful/regenerate/share`, el copy es-CL, el slot `Evals` del proof— vive en el **consumer Knowledge** (o `src/lib/knowledge/`), **NUNCA dentro de la primitive**. La frontera es la misma de TASK-1108: built-ins transversales (`sources/trace/packet`, driven por `nexa-evidence.v1`) vs slots de dominio (`content`). Cualquier consumer futuro (finance/agency) hereda el canvas wired a SU dominio sin tocar la primitive.
- **Anti-regresión**: NUNCA bakear lógica de Knowledge en `NexaAnswersCanvas`/`nexa-answers-canvas-types.ts` ni en las feature-primitives (`NexaProvenanceTrace`/`NexaResponseToolbar`/`NexaStreamingText`). Si algo huele a Knowledge dentro de la primitive, va en el consumer.
- Reconcilia el cuerpo: donde dice "Depende de TASK-1095 (contrato `surfaceContext` en `src/lib/nexa/`)" léase **el contrato ya existe** (`NexaAnswersSurfaceContext`, canónico por decisión del operador); 1095 es paralelo, no bloqueante.

## Outcome 2026-06-13 — implementación completa, GVC verde; rollout (flag) pendiente

**Shipped (en `develop`):**
- **Slice 1** — domain adapter `buildKnowledgeAnswerRenderPlan` (`src/lib/knowledge/nexa/knowledge-answer-render-plan.ts`), puro, 7 tests; reusa el citation mapper (TASK-1092) + evidence converter canónicos; gap honesto sin datos; dedup de puntos por documento ("N fuentes" == N puntos).
- **Slice 3** — `KnowledgeNexaCanvasLens` (`src/views/greenhouse/knowledge/`), el `NexaAnswersCanvas` runtime cableado al retrieval real, máquina de 11 estados desde el lifecycle, abort en stop, degradación honesta. Cutover flag-gated `NEXA_ANSWERS_CANVAS_LENS_ENABLED` (default OFF) resuelto por la page (server). **GVC verde con corpus real** (idle→thinking→reasoning→answered + citas inline + trust cue + response toolbar; 3 quality gates + enterpriseRubric pass). Scenario: `knowledge-nexa-canvas-lens`.
- **Slice 2** — feedback (`helpful`/`unhelpful`→`/api/platform/app/knowledge/feedback`) + `regenerate`→re-retrieval + `copy` self-contained: plegados en Slice 3.
- **Slice 5** — PLAYBOOK `CONVERSATIONAL_EXPERIENCE_DOMAIN_PLAYBOOK.md` + skill `greenhouse-nexa-conversational` actualizada (Claude + Codex mirror) + Delta en `CONVERSATIONAL_EXPERIENCE.md`.

**Slice 4 — N/A para Knowledge:** el adapter emite solo `answerBubble explanation` (texto+citas, sin Recharts) → el `runtime_hydration_warning` de los answer-blocks con chart NO aplica a este consumer (es follow-up de la primitive para dominios con chart).

**Rollout pendiente (operador):** flag ON staging → QA golden questions sobre corpus real → sign-off → prod gradual. El grounded-rico se verifica mejor en staging (corpus + pool estable, lección ISSUE-094). Rollback = flag OFF (answer-trace legacy intacto).

**Follow-ups abiertos (ninguno toca la primitive):** (a) `unhelpful`→selector de motivo (hoy mapeo mínimo `wrong_source`); (b) `share`→permalink real (necesita sync de URL state cross-lens); (c) multi-turno con compactación TASK-1102 en runtime (hoy single-turn-replace); (d) routing por el provider stream (TASK-1091) para token-streaming real del answer.

## Why This Task Exists

Los slices de TASK-1096 (commits `e8a8ef852`, `78d30ee40`, `4054a6014`, `d5532e777`, `7beba65eb`) entregaron contratos de primitive **listos para runtime pero alimentados con fixtures**:

- Las **citas** (`NexaCitationSource`) se declaran inline en el render plan del mockup; en runtime deben derivarse del `KnowledgeRetrievalPacket.chunks[]` que ya produce `searchKnowledge` (TASK-1083/1085) — `chunkId/title/headingPath/excerpt/score/freshness/href`.
- La **response toolbar** (`onResponseControl`) emite `copy|share|helpful|unhelpful|regenerate` pero el host del mockup solo re-dispara el play-through; en runtime `helpful/unhelpful` deben llegar al **contrato de feedback compartido** `POST /api/platform/app/knowledge/feedback` (TASK-1083/1085), `regenerate` re-ejecuta el retrieval, `share` produce un permalink y `copy` ya resuelve el portapapeles.
- El **control "Detener"** (`onStopGeneration`) corta un play-through simulado; en runtime debe **abortar el stream real** del provider (`NexaChatProvider`, TASK-1091).
- El **reasoning trace + streaming** son timers deterministas del mockup; en runtime son el progreso real del tool-loop de retrieval + el streaming de tokens del provider.
- Los **specimens de portabilidad** (finance/chart, Insight promovido) prueban que el canvas es agnóstico del dominio, pero su data es sintética; el rollout real de esos dominios es follow-up (NO scope de esta task — acá solo se preserva el contrato).
- Queda 1 **hydration warning best-effort** en los answer-blocks con chart/metricSummary (tolerado por el scenario) cuya **estrategia SSR holística** (dynamic `ssr:false` boundary / Suspense / streaming) es una decisión de runtime.

Sin esta task, el primitive enriquecido queda "listo pero desconectado": la experiencia AI-Overview-grade existe en el lab pero el usuario real no la toca.

## Goal

- Cablear `NexaAnswersCanvas` (estado runtime de TASK-1096/1095) al packet `knowledge-search.v1` real, detrás de flag, en la surface de Knowledge.
- Derivar `NexaCitationSource[]` desde `KnowledgeRetrievalPacket.chunks[]` (mapper canónico server-side) y montar el evidence-peek con la fuente real (Abrir fuente → human URL del chunk).
- Conectar `onResponseControl`: `helpful/unhelpful` → endpoint de feedback compartido; `regenerate` → re-retrieval; `share` → permalink; `copy` → portapapeles (ya self-contained).
- Conectar `onStopGeneration` → abort real del stream del provider, asentando lo recibido (degradación honesta).
- Sustituir el reasoning trace + streaming simulados por el progreso real del tool-loop + streaming de tokens (consumiendo la abstracción de TASK-1091).
- Resolver el residual hydration warning de los answer-blocks con chart/metricSummary con una estrategia SSR canónica (no parche).
- Cutover gradual flag-gated, con `aria-live` honesto, reduced-motion y GVC sobre la surface runtime (no solo el mockup).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — DEPENDENCIES & IMPACT
     ═══════════════════════════════════════════════════════════ -->

## Dependencies & Impact

**Depende de:**
- `TASK-1095` — contrato `surfaceContext`/estado SSOT (`src/lib/nexa/`). El Arch Review Gate de TASK-1096 (A1/A2) exige consumir ese contrato, no el shape local del canvas. Esta task hereda esa reconciliación.
- `TASK-1085` (complete) — tool `search_knowledge` + packet `knowledge-search.v1` + contrato de feedback `POST /api/platform/app/knowledge/feedback`. Es la fuente de datos.
- `TASK-1083` (complete) — reader SSOT `searchKnowledge` + endpoints `app`.
- `TASK-1091` (complete) — `NexaChatProvider` (abstracción de provider + streaming). Fuente del streaming/abort reales.

**Coordinar (riesgo de colisión, NO duplicar):**
- `TASK-1092` (in-progress, Codex) — Nexa Knowledge Production Readiness: **inline citations + coverage QA**. Codex está endureciendo la cita inline de las RESPUESTAS de Nexa en `/knowledge`. Esta task aporta el **primitive** (`NexaCitationMarker` + segmento `citation` + mapper packet→source); coordinar para que TASK-1092 consuma el mapper canónico de acá en vez de forkear. Definir el boundary antes de codear.
- `TASK-1090` (in-progress, Codex) — reconcilia `/knowledge` + `/knowledge/mockup/answer-trace` en una ruta con lentes Humano/Nexa/MCP. La lente **Nexa** es el host runtime natural del `NexaAnswersCanvas`. Coordinar qué ruta monta el canvas runtime.

**Impacta a:**
- `TASK-1096` — esta task es su promoción a runtime; al cerrar, marcar el gap "mockup→runtime" como resuelto en TASK-1096.
- Cualquier futuro consumer no-Knowledge (finance/agency rollout real) hereda el contrato de citas/toolbar/stop ya cableado.

**Archivos owned (primitive ya construido en TASK-1096 — esta task los CONSUME/cablea, no los reescribe):**
- `src/components/greenhouse/primitives/nexa-answers-canvas/NexaAnswersCanvas.tsx` (`NexaResponseToolbar`, `StreamingAnswerDraft` con `onStop`, `NexaReasoningTrace`)
- `src/components/greenhouse/primitives/nexa-answers-canvas/nexa-answers-canvas-types.ts` (`onResponseControl`, `onStopGeneration`, `NexaAnswersResponseControl`, copy labels)
- `src/components/greenhouse/primitives/nexa-expressive-text/{NexaCitationMarker.tsx,NexaExpressiveText.tsx,nexa-expressive-text-types.ts}` (segmento `citation`, `NexaCitationSource`)
- `src/components/greenhouse/primitives/nexa-answer-bubble/NexaAnswerBubble.tsx` (mounted guard del sparkline)

**Archivos nuevos esperados (runtime):**
- Mapper canónico `KnowledgeRetrievalPacket.chunk → NexaCitationSource` (server-side, `src/lib/nexa/` o `src/lib/knowledge/`).
- Host runtime de la surface (la lente Nexa de TASK-1090, o un consumer dedicado) que pasa `renderPlan` real + `onResponseControl`/`onStopGeneration` reales.
- Flag de cutover (reusar/extender `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`, NO crear binario nuevo — patrón TASK-780/872).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — DETAILED SPEC (por slices)
     ═══════════════════════════════════════════════════════════ -->

## Detailed Spec

> Regla transversal: cada slice cierra con `pnpm local:check` + GVC sobre la **surface runtime** (no el mockup) + `aria-live`/reduced-motion verificados. Flag default OFF → cero cambio de comportamiento al merge. Reusar readers/commands canónicos (Full API Parity) — la UI es cliente del contrato, no productora.

### Slice 0 — Reconciliación de contrato (Arch Gate A1/A2) + flag

- Consumir el `surfaceContext` SSOT de TASK-1095; mergear `allowedRenderers`/`allowedActions` del canvas al contrato canónico (no shape paralelo).
- Resolver el flag de cutover: reusar `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` (staging ya ON, prod OFF) o un sub-flag `NEXA_ANSWERS_RUNTIME_ENABLED` derivado. Default OFF.
- **Gate:** sin flag, la surface runtime sigue exactamente como hoy (la del lente que la hospede). El mockup queda intacto como lab.

### Slice 1 — Mapper packet→citas + evidence-peek real

- Helper canónico server-side `mapRetrievalChunkToCitationSource(chunk): NexaCitationSource` desde `KnowledgeRetrievalPacket.chunks[]`: `id=chunkId`, `label` = índice de cita estable (`[1]…[n]`), `title`, `headingPath`, `excerpt`, `score`, `freshness` (`current|recent|stale` ya mapeado en el packet), `href` = human URL del documento (anti-oracle: solo lo que el subject puede ver).
- El render plan runtime inserta los segmentos `citation` en el **span exacto** de la frase que usa cada chunk (el generador de la respuesta ya emite la atribución; TASK-1092 coordina el anchoring del span).
- `NexaCitationMarker` (ya construido) consume `NexaCitationSource`; "Abrir fuente" navega al documento real (lente Humano de Knowledge / TASK-1084/1090).
- **Verificación:** GVC cita inline + peek abierto con fuente real; el plain-text contract (TASK-1096 test) sigue verde con datos reales.
- **Coordinación TASK-1092:** el mapper vive acá y TASK-1092 lo consume (no forkea).

### Slice 2 — Response toolbar → contratos reales

- `onResponseControl('helpful'|'unhelpful')` → `POST /api/platform/app/knowledge/feedback` (contrato compartido TASK-1083/1085) con `sourceEventId`/`documentId`/`chunkId` del packet. Idempotente; degradación honesta si falla (la toolbar ya da el acuse optimista — reconciliar con el estado real).
- `onResponseControl('regenerate')` → re-ejecuta el retrieval del turno (mismo query, nuevo packet) y re-asienta la respuesta (settle). NO inventa: si el nuevo packet es `confidence='none'`, gap honesto.
- `onResponseControl('share')` → permalink del turno (anclar al `enrichmentId`/turno, estilo TASK-449/947 share). Capability + anti-oracle.
- `onResponseControl('copy')` → ya self-contained (clipboard del plain-text con `[n]`); emitir analítica opcional.
- **Verificación:** smoke del feedback real (Playwright + agent auth) → fila de feedback persistida; GVC voto→acuse sobre runtime.

### Slice 3 — Stop + streaming + reasoning trace reales

- `onStopGeneration` → **abort del stream** del `NexaChatProvider` (TASK-1091): cancela el tool-loop/stream en curso, asienta lo recibido (degradación honesta, never-hidden), emite el estado real. NO deja la respuesta a medias ni miente "completa".
- `StreamingAnswerDraft` consume el **stream real de tokens** (no el 60% estático): revelado progresivo del cuerpo con caret, never-hidden + reduced-motion horneados (el contrato del primitive ya lo soporta). Coordinar con TASK-1092 (Codex ya trabaja el streaming de Nexa).
- `NexaReasoningTrace` refleja el **progreso real del tool-loop** (intención → retrieval → síntesis), no timers fijos. `aria-live` honesto sin robar foco al composer (Arch Gate A6).
- **Verificación:** GVC del despliegue real (reasoning→streaming→settle) + `reducedMotion:'capture'` sobre runtime; abort verificado (stream cortado, contenido asentado).

### Slice 4 — SSR hydration hardening (answer-blocks con chart/metricSummary)

- Resolver el residual `runtime_hydration_warning` de los answer-blocks con Recharts (chart + metricSummary) con estrategia canónica: evaluar `dynamic(() => …, { ssr:false })` boundary unificado para el árbol Recharts vs Suspense + streaming, sin masquear el contenido answer-first durante SSR.
- Mantener el `mounted` guard del sparkline (TASK-1096, ya canónico) + extender el patrón donde aplique.
- **Verificación:** GVC findings = 0 (sin el warning tolerado) sobre runtime; sin CLS; FCP no regresiona.

### Slice 5 — Cutover gradual + observabilidad

- Flag ON staging → QA de cobertura (golden questions TASK-1083 sobre la surface real) → sign-off → prod gradual (patrón TASK-1092).
- Reliability: reusar las señales de TASK-1085 (`no_source`/`stale`/`low_citation`); NO duplicar.
- Documentar la decisión + rollback (flag OFF).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Verification

- `pnpm local:check` (lint + tsc) verde en cada slice.
- `pnpm test` (full) + el contract test de plain-text (TASK-1096) verde con datos reales.
- GVC sobre la **surface runtime** (no el mockup): citas inline + peek real, toolbar voto→feedback persistido, stop→abort, despliegue real reasoning→streaming→settle, 0 findings (Slice 4 elimina el hydration warning).
- Smoke Playwright + agent auth: feedback real persistido, regenerate re-retrieval, share permalink anti-oracle.
- Flag OFF = comportamiento idéntico al actual (parity).
- Triple doc: arquitectura (Delta del contrato conversacional V2), funcional (`docs/documentation/`), manual si aplica.

## Out of Scope

- Rollout real de los dominios no-Knowledge (finance/agency): acá solo se preserva el contrato de portabilidad; el rollout es follow-up por dominio (consumer real + data shape + redacción).
- Cambios al backend de retrieval (`searchKnowledge`, `knowledge-search.v1`): ya existen (TASK-1083/1085). Esta task es cliente del contrato.
- La explosión de kinds per-dominio (Arch Gate A5): se colapsa en TASK-1095/1096, no acá.
- Nuevas primitives del roadmap next-level (ver propuesta TASK-1101 follow-ups): se crean como tasks separadas si se aprueban.

## Notas de origen

Primitive construido y GVC-verificado en TASK-1096 (sesión 2026-06-13), commits en `develop`:
`e8a8ef852` (citas inline + evidence-peek), `78d30ee40` (response toolbar settle), `4054a6014` (control Detener), `d5532e777` (test de contrato plain-text), `7beba65eb` (specimens de portabilidad + mounted guard del sparkline). Mockup vivo: `/knowledge/mockup/nexa-answers`. Scenario GVC: `scripts/frontend/scenarios/nexa-answers-surface.scenario.ts`.
