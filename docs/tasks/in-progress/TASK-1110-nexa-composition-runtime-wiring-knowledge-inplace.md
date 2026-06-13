# TASK-1110 — Nexa Composition runtime wiring (in-place en /knowledge) + Nexa Answers Experience

> **Lifecycle:** in-progress
> **Creada:** 2026-06-13 · **In-progress:** 2026-06-13
> **Type:** implementation · **P1** · **Effort:** Medio-Alto
> **Domain:** ui | platform | nexa | content | knowledge
> **Padre conceptual:** GAP A del Nexa Moment Fabric (CONVERSATIONAL_EXPERIENCE.md §13). Continúa TASK-1101 (runtime promotion) + TASK-1102 (multi-turno/composición primitive).

## Por qué existe

La **Composition (Nexa Moment, GAP A) es una capacidad TRANSVERSAL de Nexa Answers** (NO de Knowledge) — el conjunto complementario de la conversational experience. Su propósito (decisión del operador 2026-06-13): **ajustar la UI in-place desde donde esté** (la misma superficie se transforma: "Sin host ↔ con Nexa"), **NO navegar a otra interfaz**. La respuesta lidera, el host persiste como contexto vivo, las citas anclan al ítem real, hay next-step gobernado y un puente secundario a la lente takeover.

Esta task cierra lo que falta para **verlo funcionando con datos reales** y para canonizar la experiencia completa.

## Ya shippeado (substrate — NO rehacer)

Dos commits locales en `develop` (TASK-1102 GAP A):

- **`e4c47321b`** — promoción al registry de la primitive transversal:
  - `placement: 'composed'` aditivo en el contrato `surfaceContext` (`nexa-answers-canvas-types.ts`, SSOT re-export en `@/lib/nexa/nexa-answers-surface-context`).
  - `NexaMomentComposition` (ya existía como primitive P+V+K) promovida: Lab `/design-system/nexa-moment-composition` (`page.tsx` + `NexaMomentCompositionLabView.tsx`, gate `plataforma.design_system`), route-reachability-manifest, DesignSystemCatalog, scenario GVC `design-system-nexa-moment-composition`, PRIMITIVES.md, barrel (ya estaba).
- **`c748f6e13`** — consumer real de Knowledge:
  - `src/views/greenhouse/knowledge/KnowledgeNexaCompositionLens.tsx` — **reusa Nexa Answer en sinergia**: mismo `NexaAnswersCanvas` + mismo adapter de retrieval real (`buildKnowledgeAnswerRenderPlan` + `/api/platform/app/knowledge/search?mode=agentic`) + misma coreografía (thinking→reasoning→answered). Single-turn overview (patrón AI-Overviews); puente "Seguir con Nexa" → lente takeover (secundario).
  - **Adaptable cross-consumer:** recibe `host?: ReactNode` por slot (el contenido propio de la superficie a envolver in-place) + `documents` (índice de anclaje) + `onContinueInNexaLens`. Fallback: grid de docs de demo. Otro dominio (finance/agency) replica el patrón swapeando sus seams (API retrieval, adapter, host, surfaceContext).
  - tsc 0 · lint 0.

**Revertido (era error):** la extracción de un "motor neutral" `useNexaConversation` — el patrón canónico del playbook es que **el lens host posee su conversación**; no hay motor a extraer. Nexa Answer quedó intacto (TASK-1101/1102).

## Lo que falta (scope de esta task)

### Slice 1 — Wiring in-place en la lente Humano de `/knowledge` (lo principal)

Cablear `KnowledgeNexaCompositionLens` **dentro de la lente Humano** de `KnowledgeCenterView` (`src/views/greenhouse/knowledge/KnowledgeCenterView.tsx`, ~1368 líneas, `activeMode === 'human'`), in-place:

- Envolver el **workbench de docs EXISTENTE** de la lente Humano como el `host` slot de la composición (NO usar el grid de demo del consumer — pasar el contenido real). `dormant` = el workbench como está hoy; `composed` = la respuesta de Nexa lidera + el workbench persiste condensado abajo.
- Marcar las cards de doc del workbench con **`data-nexa-anchor="<documentId>"`** para que las citas resalten el doc real (la primitive ya hace el highlight + scrollIntoView).
- Disparar la composición desde el ask de la lente Humano (reusar/mapear el search bar actual → el composer de la composición, o convivencia — ver decisión de producto abajo).
- **Se despliega HABILITADO** (no flag OFF — decisión explícita del operador 2026-06-13).
- Mapear los `documents` reales (`KnowledgeDocumentSummary` del view) → `KnowledgeCompositionHostDoc` (documentId/title/kind…) para el índice de anclaje.
- `onContinueInNexaLens(query)` → `setActiveMode('nexa')` + sembrar la query en la lente takeover (sinergia overview→deep).

**Decisión de producto resuelta (operador):** la composición es el transform **in-place** de la lente Humano (Opción 1 refinada), NO una pestaña nueva, NO navegar.

**Modelo del ask (product-ui — refinado en review):** `dormant` = el workbench browse/search **intacto y usable**; **preguntar** (una pregunta, no un filtro) → compone in-place. El browse/filter NO se destruye: filtrar/navegar docs = host; preguntar = compose. El norte es "una sola superficie que se ajusta", no "reemplazar el buscador".

**Safety in-place (state-design + arch):**

- Si el compose **falla** (degraded/error), el **workbench NUNCA se rompe** — el host sigue íntegro y usable; el Moment degrada honesto (ya horneado en el consumer).
- **Focus routing** tras el morph `dormant→composed`: el foco va a la respuesta (la primitive/playbook lo exige; verificar a11y por teclado).
- **Kill-switch (DECISIÓN CERRADA del operador 2026-06-13 — desplegar ON por defecto):** ship **default ON** vía el **rollout-flag platform** (TASK-780, fila DB default ON, scope precedence) — NO env binario. La feature está **habilitada de entrada** en todos los entornos; el flag existe solo como **reversa sin code-deploy** si la superficie viva se rompe en prod (flip a OFF → la lente Humano vuelve a su estado actual). NO nace OFF; NO es rollout gradual. "ON por defecto" confirmado.
- **Non-regresión:** S1 NO debe romper las lentes existentes (`human`/`nexa`/`mcp`) ni el fallback answer-trace (`NexaKnowledgeAnswerSurface`). La lente `nexa` takeover (multi-turno) y la composición coexisten como dos placements.

### Slice 2 — GVC en staging (verlo funcionando)

- GVC del `/knowledge` real con la composición: dormant (docs) → ask → thinking/reasoning → composed (respuesta lidera + docs persisten + cita anclada resaltada). **Frame mirado** (regla del repo: no declarar UI lista sin GVC).
- Local da problemas (server lento / PG `pool after end` ISSUE-094); el playbook recomienda **staging para datos reales**. Scenario base ya existe para el Lab; crear/extender uno para el `/knowledge` runtime.

### Slice 3 — Canonizar "Nexa Answers Experience" como page del Design System (al FINAL de todo)

Idea del operador: canonizar `/knowledge/mockup/nexa-answers` como **page del Design System** ("Nexa Answers Experience", la primera de su tipo — agrega todos los componentes + patrones del flujo conversacional), **ya no como mockup**. Plan: mover a ruta DS real (p.ej. `/design-system/nexa-answers-experience`, gate `plataforma.design_system`) → registrar en catalog + reachability + PRIMITIVES + scenario → deja de ser `/mockup`. **Hacer al final de Slice 1+2.**

### Slice 4 — Joint con Codex (Moment Fabric)

`eligibility` (cuándo aparece el Moment) + `next-step gobernado` (action boundary: inform/recommend/draft/execute-with-approval) + señales `nexa.moment.*` = **Moment Fabric (TASK-1095/1096, Codex)**. El consumer hoy omite el next-step honesto (no inventa acción). Coser por `surfaceContext` + `renderPlan`. Coordinar con Codex.

## Discovery (FASE 1-3, 2026-06-13) — scoping de S1 listo

**Intake:** movida a `in-progress`, `Lifecycle: in-progress`. Libre (sin PR/branch). WIP ajeno presente en `.claude/skills/greenhouse-documentation-governor` + `.claude/commands/` → NO tocar (worktree compartido).

**Mount point exacto (verificado en `src/views/greenhouse/knowledge/KnowledgeCenterView.tsx`):**

- **El ask = la command surface de la lente Humano**, `KnowledgeCenterView.tsx:556-589` (`activeMode !== 'nexa'`): un `NexaComposer kind='knowledgeAsk'` con `query` / `setQuery` / `handleSearch` (form submit). Es el entry donde **preguntar → compone in-place**.
- **El host = el workbench de docs** (results grid + detail, debajo de la línea 591). Estado ya en el view: `documents` (289), `results` (327, `buildResults`), `packet` (290), `selectedResult` (330). Hay que **agregar `data-nexa-anchor={documentId}`** a las cards de doc del grid.
- **La lente takeover** (`activeMode === 'nexa'`, 598+) = `KnowledgeNexaCanvasLens` (si `canvasLensEnabled`) o `NexaKnowledgeAnswerSurface` fallback. **Coexiste**; el bridge `onContinueInNexaLens(query)` → `setActiveMode('nexa')` + sembrar la query.

**AUDIT:**

- SUPUESTOS CORRECTOS: el consumer `KnowledgeNexaCompositionLens` reusa el adapter real + canvas (verificado, tsc/lint 0). `documents` mapea a `KnowledgeCompositionHostDoc`. La command surface ya usa `NexaComposer`/`NexaComposerInput` (mismos átomos que el composer del consumer).
- SUPUESTO A RESOLVER EN S1: la lente Humano YA tiene su propio `search→results` (`handleSearch` → `packet` → `results`). El consumer tiene su **propio** `runQuery` (agentic). **Decisión del modelo (ya fijada):** preguntar = compose; browse/filter/results = host. Reconciliar: el ask de la command surface dispara el compose del consumer (no duplicar dos asks). Opción limpia: el consumer **recibe el composer** o el view conecta su `query`/`handleSearch` al `onSubmit` del consumer. Evaluar al implementar (no duplicar el ask bar).
- RIESGO BLAST: superficie viva 1368 líneas, ON por defecto. El host (results grid) NO debe romperse si el compose falla.

**Mapa de conexiones (S1 = UI wiring, sin nuevo backend):**

- Sin migración / capability / outbox / signal nuevos para S1 (es composición UI sobre readers existentes).
- **Único infra nuevo = el rollout-flag default ON.** OJO Discovery: el flag de presentación actual de Knowledge es **ENV** (`src/lib/knowledge/nexa/canvas-lens-flag.ts`, `NEXA_ANSWERS_CANVAS_LENS_ENABLED`). El operador quiere **revertible sin code-deploy** → eso pide el **rollout-flag DB platform** (TASK-780), pero ése es `home_rollout_flags` (home-scoped). **Decisión S1:** ¿generalizar el rollout-flag platform a knowledge (revertible sin deploy, lo que pidió el operador) o ENV default-true (simple, flip = redeploy)? → resolver al inicio de S1. Recomendación arch: rollout-flag DB para cumplir "revertible sin deploy".
- Non-regresión: `activeMode` switch (human/nexa/mcp) + answer-trace fallback intactos. Tests: smoke `/knowledge` + GVC.

**Estado:** scoping completo. El refactor de código de S1 (envolver el workbench como host + `data-nexa-anchor` + conectar el ask al compose + rollout-flag) + GVC staging = **siguiente ventana** (no se inició código en superficie viva sin budget de verificación).

## Riesgo & 4 pilares (arch — review pre-inicio)

S1 es un cambio a una **superficie viva** (`KnowledgeCenterView`, 1368 líneas) desplegado habilitado → blast-radius real. Triage:

- **Safety:** kill-switch revertible sin deploy (rollout-flag default ON, ver S1) + el host nunca se rompe si el compose falla. Lente `nexa`/answer-trace intactas.
- **Robustness:** degraded/error honestos ya horneados en el consumer; abort en `onStopGeneration`; gap honesto si `confidence='none'`.
- **Resilience:** rollback = flag OFF (la lente Humano vuelve a su estado actual); el answer-trace fallback sigue de red.
- **Scalability:** el consumer es la **plantilla replicable** (host por slot + adapter + surfaceContext) → finance/agency nacen como child tasks sin tocar la primitive.

**Duplicación conocida y aceptada (arch SSOT):** hay **2 hosts de Knowledge** — `KnowledgeNexaCanvasLens` (takeover, multi-turno) y `KnowledgeNexaCompositionLens` (composición, single-turn). Comparten el adapter de retrieval (`buildKnowledgeAnswerRenderPlan`) + el canvas + la coreografía, pero cada uno posee su estado de conversación (patrón self-contained del playbook). Es aceptable hoy. **Umbral de extracción:** si emerge un **3er consumer** que necesite la misma máquina de conversación, extraer un hook neutral compartido (el `useNexaConversation` que se revirtió en esta sesión) — NO antes (YAGNI; el operador lo rechazó como abstracción prematura).

## Hard rules (invariantes — no regresión)

- **NUNCA** la composición navega a otra interfaz: ajusta la UI **in-place** ("Sin host ↔ con Nexa"). El puente a la lente takeover es secundario/opcional.
- **NUNCA** la composición es "de Knowledge": la capacidad es la primitive transversal `NexaMomentComposition`. Knowledge es un **consumer** (template replicable). El consumer recibe el `host` por slot (contenido propio de cada superficie).
- **NUNCA** desconectar de Nexa Answer: el Moment reusa `NexaAnswersCanvas` + el adapter de retrieval real + la coreografía. No hay answer-path paralelo.
- **NUNCA** flag OFF por defecto: se despliega **habilitado** (decisión del operador) — pero **CON kill-switch revertible sin deploy** (default ON). "Habilitado" ≠ "sin red de seguridad".
- **NUNCA** el compose roto rompe el workbench: si falla, el host (browse/search de docs) sigue íntegro y usable; degradar honesto.
- **NUNCA** destruir el browse/search de la lente Humano: filtrar/navegar = host; **preguntar** = compose. Coexisten en la misma superficie.
- **NUNCA** inventar el next-step gobernado / eligibility / señales — son del Moment Fabric (Codex); omitir honesto hasta la costura.
- **SIEMPRE** las cards anclables del host llevan `data-nexa-anchor="<id>"`; las citas resaltan el ítem real (la evidencia ES el contenido operativo, no la web).
- **SIEMPRE** GVC frame mirado (staging) antes de declarar UI lista.

## Dependencies & Impact

- **Depende de:** substrate shipped (commits arriba) + `NexaMomentComposition` primitive + el adapter `buildKnowledgeAnswerRenderPlan` (TASK-1101) + la API `/api/platform/app/knowledge/search`.
- **Impacta a:** `KnowledgeCenterView` (superficie viva — refactor cuidadoso); el patrón de consumer es la plantilla para finance/agency/etc. (futuros child tasks de dominio).
- **Archivos owned:** `KnowledgeNexaCompositionLens.tsx`, el bloque de la lente Humano en `KnowledgeCenterView.tsx`, el scenario GVC runtime, y (Slice 3) la nueva page DS.
- **Joint con Codex:** Moment Fabric (TASK-1095/1096).

## Verificación de cierre

- `pnpm local:check` (lint + tsc) + `pnpm build` (Turbopack — el consumer es 'use client' importando primitives; el page es server).
- GVC staging mirado (dormant → composed + anclaje).
- Doc closure: actualizar CONVERSATIONAL_EXPERIENCE.md §13 (GAP A: de "primitive+demo" → "runtime in-place en Knowledge") + el playbook (agregar el placement `composed` + el patrón de consumer in-place) + la skill `greenhouse-nexa-conversational` + PRIMITIVES.md + HISTORIAL.
