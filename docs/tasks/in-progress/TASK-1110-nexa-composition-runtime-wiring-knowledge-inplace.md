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

## Delta 2026-06-13 — Slice 1 + Slice 2 SHIPPED (local-first, gated, GVC-verificado)

**Decisiones cerradas con el operador esta sesión:**

- **Kill-switch = rollout-flag DB (TASK-780), ON por defecto.** flag_key `knowledge_composition_lens`, seed global `enabled=TRUE`. Revertible sin code-deploy (flip de la fila DB → lente Humano legacy). "ON el interruptor" confirmado por el operador.
- **Ask = el composer del consumer es el único ask** (Opción A). La command-surface de búsqueda queda solo para MCP (o humano-legacy con el kill-switch OFF). `browse/navegar = host`, `preguntar = compose`. No se duplica el ask bar.

**Slice 1 (`098908cff`) — wiring + kill-switch + a11y:**

- Migración `20260613210340667` — extiende CHECK `home_rollout_flags_key_check` + seed global ON + DO guard. Aplicada y verificada contra PG real.
- `HomeRolloutFlagKey` extendido (`rollout-flags.ts` + `rollout-flags-store.ts` + `VALID_FLAG_KEYS`) + env fallback `KNOWLEDGE_COMPOSITION_LENS_ENABLED` (resiliencia PG-down).
- `page.tsx` resuelve `compositionLensEnabled` (degradación honesta: PG caído → disabled → legacy).
- `KnowledgeCenterView` — IIFE en la rama `activeMode==='human'`: el workbench 3-col REAL es el `host` de `KnowledgeNexaCompositionLens`; `data-nexa-anchor={documentId}` en `ResultRow`; `showCommandSurface` (solo MCP/legacy); `handleContinueInNexa` (bridge overview→takeover).
- Focus routing a11y horneado en `NexaMomentComposition`: tras el morph `dormant→composed` el foco va a la región del Momento (solo en la transición de entrada).

**Slice 2 (`02e31275d`) — GVC runtime:**

- `knowledge-composition.scenario.ts` (dormant→ask→thinking/reasoning→composed, desktop+mobile).
- Fix non-regresión `knowledge-lenses.scenario.ts` (assertion humano-default → `knowledge-nexa-composition-lens`).
- **Capturado local con corpus REAL** (`.captures/2026-06-13T21-15-34_knowledge-composition`): composed muestra la respuesta Nexa liderando con citas reales (Motor ICO, Glosario ICO, Pulse/Greenhouse/Nexa) + "Fuentes ancladas" + bridge "Seguir con Nexa", y el workbench host persiste condensado abajo. Responsive OK. **Frame mirado.** Todas las assertions `passed`; warnings = `layout_text_clipped` pre-existentes (noWrap ellipsis en learning paths, no introducido por esta task, warning-first).

**Gate local:** tsc 0 · eslint 0 (mis archivos; el único fallo de `pnpm lint` es el orphan `scripts/check-codex-task-harness.mjs`, ajeno) · tests focales 33/33 (`src/lib/home` + `nexa-moment-composition`) · `pnpm build` exit 0.

**Pendiente:**

- **Slice 3** (DS showcase page "Nexa Answers Experience" — mover `/knowledge/mockup/nexa-answers` → `/design-system/nexa-answers-experience` + registry + reachability + PRIMITIVES + scenario): no iniciado (es "al final", showcase-curación + su propio loop GVC — conviene dirección del operador sobre alcance).
- **Slice 4** (Moment Fabric eligibility + next-step gobernado + señales `nexa.moment.*`): joint con Codex (TASK-1095/1096), no es scope solo.
- **Doc closure bloqueado por orphan WIP:** `Handoff.md`, `changelog.md`, `CLAUDE.md`, `AGENTS.md`, `project_context.md` están modificados (uncommitted) por el workstream Codex-harness en el checkout compartido → NO se pueden editar sin entangle. Pendiente de coordinación / que el orphan aterrice.
- **GVC staging** (opcional): el local ya mostró composición con datos reales; un frame en staging confirmaría en el deployment activo tras push.

## Corrección 2026-06-13 — qué entregué MAL + qué falta para el objetivo

> Escrito tras la revisión del operador: el Slice 1 que entregué (commit `098908cff`) **NO se ve ni se comporta como la composición diseñada/aprobada** (mockup `NexaMomentCompositionSection`). Esta sección es la spec correctiva. El código de S1 quedó pusheado pero **el kill-switch puede apagarse sin deploy** mientras se rehace (la fila DB `knowledge_composition_lens` → `enabled=FALSE` revierte la lente Humano a su estado actual).

### El objetivo (intención + experiencia) — relectura de los docs canónicos

Fuentes: `GREENHOUSE_NEXA_MOMENT_FABRIC_ARCHITECTURE_V1.md` + `GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md` + `ui-platform/CONVERSATIONAL_EXPERIENCE.md` §13 (Gap A).

- **Nexa Moment = `contexto + evidencia + permiso + intención + next-step`.** Si falta una pieza, **degradar honesto** (no fingir).
- **Gap A = composición in-place** con **Google AI Mode / AI Overviews como NORTE (no copia):** un composer "con Nexa adentro" que, al preguntar, **transforma la superficie en modo conversacional SIN hacer desaparecer lo demás** — el host se **adapta/reflowea/persiste vivo** y la respuesta entra como **bloque protagonista**. NO es el takeover (lente Nexa actual). Es el placement `composed`.
- **3 diferenciadores propios de Greenhouse:** (1) la evidencia **ancla al contenido operativo del host** (el doc real, no la web), (2) **next-step gobernado** (action boundary; solo "actionable" si existe command/capability real), (3) **el host queda vivo**.
- **La experiencia aprobada (mockup `NexaMomentCompositionSection`):** dormant = composer spectrum + grid limpio "Documentos del corpus"; preguntar → morph (View Transitions) → composed = Momento Nexa **lidera** (respuesta enriquecida: titular + puntos numerados + pills de cita) + **"Fuentes ancladas"** (hover resalta el doc real) + **next-step gobernado** ("Acción sugerida · Requiere aprobación · Preparar borrador") + bridge "Seguir con Nexa" + el **grid de docs persiste condensado** con el doc citado anclado.

### Qué hice MAL

1. **Host equivocado.** Pasé el **workbench de 3 columnas** (rutas + resultados + inspector) como host. El diseño usa el **grid limpio "Documentos del corpus"** como contenido operativo anclable. El consumer YA traía ese grid como `defaultHost` y lo **pisé**.
2. **Sin next-step gobernado.** Lo omití. Es **pieza central** del Moment (la "intención + next-step") y está en el mockup.
3. **Respuesta más densa.** Usé el `renderPlan` del retrieval crudo en vez del layout **enriquecido** del mockup (titular + puntos numerados + pills de cita).
4. **No verifiqué paridad mockup↔runtime** (`fe:capture:diff`) — me comparé contra mis propias expectativas. Por eso declaré "listo" algo que no lo estaba.
5. **(proceso)** Cuando el **texto literal de la spec** ("usá el workbench real como host") **se contradijo con el artefacto visual aprobado** (grid limpio + next-step), seguí las palabras en vez de frenar a señalar la contradicción. Manda la imagen aprobada.

### Qué quedó BIEN (no rehacer)

- Kill-switch **rollout-flag DB ON** revertible sin deploy (migración `20260613210340667` + tipos `HomeRolloutFlagKey` + env fallback + wiring `page.tsx`).
- **Focus routing a11y** horneado en `NexaMomentComposition` (foco al Momento en el morph).
- **GVC scenario runtime** (`knowledge-composition.scenario.ts`) + fix non-regresión `knowledge-lenses.scenario.ts`.
- La **mecánica** funciona: morph dormant↔composed, composer spectrum, anclaje cita↔host, bridge.

### Qué FALTA para alcanzar el objetivo

**A. Confirmaciones de alineación (operador) — pendientes:**

1. **Host runtime = grid limpio "Documentos del corpus"** (no el workbench). Definir qué pasa con rutas de aprendizaje / inspector / búsqueda de texto del workbench actual cuando la composición está activa.
2. **Next-step gobernado:** mostrarlo como **sugerencia honesta sin ejecutar** (advisory, sin botón que finja una acción inexistente) HOY, vs **dejarlo fuera** hasta la costura de Codex.

**B. Rehacer Slice 1 (corregido), con paridad al mockup:**

- Host = **grid limpio de docs reales anclables** (reusar el patrón del `defaultHost` del consumer / mockup, alimentado por `documents` reales, con `data-nexa-anchor`).
- Momento con **layout enriquecido** (titular + puntos numerados + pills) — alinear el `renderPlan` del adapter `buildKnowledgeAnswerRenderPlan` al shape del mockup (`COMPOSITION_RENDER_PLAN`).
- Next-step gobernado según **decisión A.2** (honesto; nunca vender actionable sin command/capability — hard rule Moment Fabric §6.3/§14).
- **Verificar con `fe:capture:diff` mockup↔runtime** hasta paridad (la verificación canónica que me salté).

**C. Slice 3** — DS showcase page "Nexa Answers Experience" (al final).

**D. Slice 4 — Moment Fabric (joint Codex, TASK-1095/1096):** eligibility + context adapter + **action boundary real** (commands/capabilities) + señales `nexa.moment.*`. La costura es `surfaceContext` + `renderPlan`. El next-step 100% accionable depende de esto.

**E. Doc closure** (tras el redo): `CONVERSATIONAL_EXPERIENCE.md` §13, el playbook de dominio, la skill `greenhouse-nexa-conversational`, `PRIMITIVES.md`, `HISTORIAL.md`.

### La tensión real (la única que bloquea fidelidad 100% hoy)

El next-step del mockup ("Preparar borrador") es un **fixture**. Hard rule Moment Fabric: *"NUNCA vender un moment como actionable si no existe capability/command/API path."* El **action boundary real** es de Codex (TASK-1095/1096). Hoy el runtime puede mostrar el next-step **advisory honesto** (sin ejecutar) o **omitirlo** — pero NO un botón que finja una acción que no existe.

## Verificación de cierre

- `pnpm local:check` (lint + tsc) + `pnpm build` (Turbopack — el consumer es 'use client' importando primitives; el page es server).
- GVC staging mirado (dormant → composed + anclaje).
- Doc closure: actualizar CONVERSATIONAL_EXPERIENCE.md §13 (GAP A: de "primitive+demo" → "runtime in-place en Knowledge") + el playbook (agregar el placement `composed` + el patrón de consumer in-place) + la skill `greenhouse-nexa-conversational` + PRIMITIVES.md + HISTORIAL.

## Delta 2026-06-14 — Garantizar la visión del operador: el Momento "se arma frente al usuario" + canonización del ensamble

> Escrito tras la sesión del operador (Lab Adaptive Card density → Composition Shell → "el escenario real"). Lentes aplicadas: `motion-design`, `state-design`, `greenhouse-product-ui-architect`, `modern-ui`. **Este Delta extiende el scope de la task para que `/implement-task TASK-1110` garantice la visión completa** — no solo el morph, sino que **la RESPUESTA del Momento se arma frente al usuario** (cada metric card de la respuesta dibuja su chart + cuenta su número al materializarse) — y reordena los slices para empezar en superficie controlada (Design System), no en `/knowledge` vivo.

### Por qué este Delta (los 2 gaps que la spec previa NO garantizaba)

El escenario in-place (UI existente → pregunta → transforma in-place, host vivo) ya era el norte. Pero el operador pidió explícitamente, y la spec previa NO aseguraba:

1. **El "armándose" de las cards de la RESPUESTA.** Cuando el Momento compone su respuesta enriquecida y esa respuesta contiene cards de métrica (chart + KPI), esas cards deben **construirse frente al usuario**: el chart se dibuja solo (Recharts area draw-in) y el número sube contando 0 → valor. Es la capacidad validada en el Lab `/design-system/card-density` (sección "Secuencia macro", commits `4911a8e6a` · `4a2a5104b` · `2f31e7fa0`). Hace que la respuesta **materialice**, no que **aparezca** — el corazón de un Nexa moment.
2. **Canonizar esa capacidad** en `MetricSummaryCard`/`MetricTrendCard`. Hoy el conteo del `AnimatedCounter` está gateado por un `IntersectionObserver` asíncrono que, en flujos de entrada/re-monte, **salta al valor final** en vez de contar (race del IO frío — diagnosticada y peleada en el Lab; el Lab la sorteó manejando el conteo desde afuera). Sin la canonización, una card en la respuesta del Momento **podría saltar** en vez de armarse. El fix canónico (conteo confiable "al entrar") hace que **toda** card se arme bien, no solo el Lab.

### La coreografía canónica (motion-design + modern-ui + state-design)

**Frontera dura de motion (CLAUDE.md):** View Transitions = morph ESTRUCTURAL de regiones; framer-motion `layout` = INTERRUMPIBLE; el reveal con stagger = ENTRADA del contenido. **NUNCA** dos capas sobre la misma propiedad del mismo nodo a la vez. El morph del Momento (`NexaMomentComposition`, dormant↔composed) y el ensamble de las cards de la respuesta son **DOS BEATS SECUENCIADOS, NO paralelos** — así no compiten (la duda explícita del operador):

```
1. Pregunta (composer)                                    — acción del usuario
2. Thinking / reasoning                                   — loading HONESTO (state-design; nunca finge)
3. MORPH estructural dormant→composed                     — BEAT 1 (View Transitions, NexaMomentComposition)
   · el host condensa + persiste vivo, la región de la respuesta aparece y LIDERA
   · ~300–400 ms (token medium/long), ease emphasized [0.2,0,0,1]
   ── el morph ASIENTA ──
4. La respuesta REVELA su contenido, escalonado            — BEAT 2 (entrada del contenido)
   · titular → puntos numerados → pills de cita → cards    — stagger ~60–80 ms entre piezas
   · cada metric card de la respuesta SE ARMA:             — la capacidad: chart draw-in (~700 ms) + count 0→valor (~700 ms easeInOut)
5. "Fuentes ancladas" + next-step gobernado                — cierran el Momento
```

**Reglas de la coreografía (no negociables):**

- **Secuencia, no paralelo.** El BEAT 2 (contenido) arranca cuando el BEAT 1 (morph) asentó. El morph mueve la ESTRUCTURA; las cards arman el CONTENIDO. Nunca a la vez sobre el mismo nodo (frontera de motion).
- **Restraint (modern-ui — "motion as accent, never the hook").** El count + el chart draw son el **acento** de "la respuesta se está materializando" — UN acento, decelerado, sin circo. El número que sube + el área que se dibuja **bastan**; cero flourish extra (sin glow, sin bounce gratuito, sin parallax).
- **Jerarquía: la respuesta LIDERA.** La región de la respuesta es la protagonista; el host condensa pero **queda vivo** (state-design honest — el host NUNCA se rompe; si el compose falla, el host sigue íntegro y usable).
- **El número sube parejo (easeInOut), NO front-loaded** — cierra junto/después del barrido del chart, nunca antes (lección del Lab: front-loaded → "el chart entra después de que el número ya estaba listo").
- **Tokens canónicos** (`motion/core/tokens.ts`): `instant 75 · short 150 · standard 200 · medium 300 · long 400 · extended 600`; ease emphasized `[0.2,0,0,1]`. **Cero ms/curvas crudas.**
- **Reduced-motion horneado (motion-design + state-design contract):** morph → cross-fade/instantáneo; card count → valor final visible de una; chart → estático; **el contenido NUNCA se oculta** (never-hidden). La respuesta sigue legible sin animación. No-bypassable.
- **Solo propiedades de compositor** (transform/opacity) — nunca width/height/top/left/margin/padding.

### Canonizar el ensamble en las metric cards (arch — P+V+K)

**Primitive + Variants + Kinds.** La capacidad vive en las primitives existentes (NO fork, NO componente paralelo):

- **Primitive** (`MetricSummaryCard` / `MetricTrendCard`) gana una **capacidad de entrada opt-in** — `entrance?: 'none' | 'assemble'` (default `'none'` = **byte-idéntico a hoy**; adopción aditiva, mismo patrón que `density?`). Cuando es `'assemble'` y se le da la señal de entrada, la card **dibuja su chart + cuenta su número 0 → valor**.
- **Conteo confiable "al entrar" (el fix canónico).** Resolver la fragilidad del `AnimatedCounter` (`isInView` IO + first-mount jump) para que cuente 0→valor de forma confiable cuando la card ENTRA — sin el hack de re-monte/drive-externo del Lab. Es el fix que hace que **toda** card (en cualquier consumer) se arme bien. Evaluar al implementar: (a) un modo "count-on-entrance" del `AnimatedCounter` disparado por señal explícita (no por el IO), o (b) que la card exponga el trigger. **Decisión arch al inicio del slice de canonización** (el Lab probó que el drive-externo funciona; la canonización lo hace interno y confiable).
- **Kind** = el contexto del consumer (la card de la respuesta de un Nexa moment) → resuelve a la variant `assemble`. La respuesta NO usa una card distinta: usa **la misma** `MetricSummaryCard`/`MetricTrendCard` con `entrance='assemble'`.
- **Horneado:** SSR-safe (la entrada corre post-mount, client-only; el primer paint es el estado final — sin hydration mismatch, patrón `CompositionShell`/`hasMounted`); reduced-motion (valor final visible, chart estático, never-hidden); compositor-only.

**El seam (cómo compone sin acoplarse):** el Momento (la región de la respuesta) **da la señal "ahora entrás"** a su contenido; las cards arman su entrada al recibirla. La card **NO hereda del shell** ni importa de `NexaMomentComposition` — expone su trigger de entrada y el Momento lo cuela. Espeja "La Costura" (el shell mueve el contenedor, la card adapta el contenido) pero para la ENTRADA. El **stagger del grupo** de cards de la respuesta lo orquesta el **Motion Primitive canónico** (`<Motion variant='stagger'>` / `useGreenhouseGSAP`, TASK-1045) — NO un stagger bespoke inline (reuse > create; una sola fuente de "hacer cosas en ola").

### Invariantes de boundary (arch — no regresión)

- **NUNCA** el ensamble de la respuesta corre **a la vez** que el morph estructural sobre el mismo nodo (frontera de motion). Secuencia: morph asienta → contenido arma.
- **NUNCA** fork de las metric cards para la respuesta del Momento: es **la misma primitive** con `entrance='assemble'`. Default `'none'` = legacy byte-idéntico.
- **NUNCA** la card hereda del shell ni de `NexaMomentComposition`. El seam es la **señal de entrada** (cue), no la herencia.
- **NUNCA** un stagger nuevo: el de grupo es el Motion Primitive (`stagger`); el morph de regiones es de `NexaMomentComposition` (su namespace VT sancionado, **NO** `gh-region-*`). `NexaMomentComposition` y `CompositionShell` son **siblings** (coexisten; ninguno se construye sobre el otro — veredicto TASK-1114).
- **NUNCA** el conteo salta en la respuesta: el fix canónico (count-on-entrance confiable) es prerequisito de que la respuesta se vea "armándose".
- **NUNCA** declarar la experiencia lista sin **paridad mockup↔runtime** verificada con `fe:capture:diff` (la verificación que se saltó en el Slice 1 fallido).

### Slices reordenados (empezar en superficie CONTROLADA, no en /knowledge vivo)

Decisión del operador: "todavía no quiero cablear Nexa real" → la experiencia se clava primero en el Design System, con todo el craft, y recién después se re-cablea `/knowledge` vivo.

- **Slice A — Canonizar el ensamble en las metric cards** (prerequisito de que la respuesta se arme bien).
  `entrance?: 'none' | 'assemble'` en `MetricSummaryCard`/`MetricTrendCard` + conteo confiable "al entrar" (fix del `AnimatedCounter`) + reduced-motion + SSR-safe. Default `'none'` byte-idéntico. Lab `/design-system/card-density` consume `entrance='assemble'` (deja de manejar el conteo desde afuera — la card lo hace ella). GVC desktop+mobile + reduced-motion mirados. Doc: PRIMITIVES.md.
- **Slice B — Realizar la experiencia aprobada como page del Design System "Nexa Answers Experience"** (era el viejo Slice 3, **adelantado**).
  Mover `/knowledge/mockup/nexa-answers` → ruta DS real (p.ej. `/design-system/nexa-answers-experience`, gate `plataforma.design_system`) → registry + route-reachability + DesignSystemCatalog + PRIMITIVES + scenario GVC; deja de ser `/mockup`. La respuesta del Momento usa las cards con `entrance='assemble'` (Slice A). Coreografía de 2 beats (morph → contenido) horneada. Next-step gobernado **advisory honesto** (sin botón que finja una acción inexistente — tensión Moment Fabric §6.3). **Gate: paridad mockup↔runtime con `fe:capture:diff` hasta `match`.** NO toca `/knowledge` vivo.
- **Slice 1 (redo, live) — Re-cablear la lente Humano de `/knowledge`** fiel a la experiencia ya clavada en Slice B (host = grid limpio de docs anclables, respuesta enriquecida con cards que se arman, next-step, `data-nexa-anchor`, kill-switch rollout-flag ON). Paridad mockup↔runtime verificada. **Después** de A+B.
- **Slice C — GVC staging** del `/knowledge` real (lo que era Slice 2, sobre el redo correcto).
- **Slice D — Joint Codex (Moment Fabric):** eligibility + next-step accionable real + señales `nexa.moment.*` (TASK-1095/1096).

### Gate de fidelidad (el que se saltó antes)

- **`fe:capture:diff` mockup↔runtime** hasta `match` (baseline `surfaceId` del mockup aprobado promovido) — **antes** de declarar cualquier slice de UI listo. La imagen aprobada manda sobre las palabras (lección del Slice 1 fallido).
- GVC desktop + mobile + **reduced-motion** mirados por cada slice de UI.
- `quality.layout` + `quality.runtime` + `quality.keyboard` (foco routea a la respuesta tras el morph) opt-in en los scenarios.

### Hard rules nuevas (sumadas a las de arriba)

- **SIEMPRE** la respuesta del Momento que contenga métricas usa `MetricSummaryCard`/`MetricTrendCard` con `entrance='assemble'` — la respuesta **se arma frente al usuario**, no aparece de golpe.
- **SIEMPRE** morph (estructura) y ensamble (contenido) son **dos beats secuenciados**, nunca paralelos sobre el mismo nodo.
- **SIEMPRE** el ensamble es restraint (un acento decelerado), reduced-motion never-hidden, compositor-only, tokens canónicos.
- **NUNCA** se cablea `/knowledge` vivo antes de clavar la experiencia + paridad en el Design System (Slice A+B).

## Delta 2026-06-14 (b) — Slice A SHIPPED (canonización del ensamble en la card) + hallazgo para end-to-end

**Slice A (`447ea61f7`) — la capacidad "al armarse" canonizada en la primitive:**

- `AnimatedCounter animateFrom?` — conteo de entrada confiable (cuenta al MONTAR sin gate de `isInView` → sin la race del IO frío que hacía saltar el número). never-hidden + reduced-motion horneados (SSR/no-JS/reduced muestran el valor final; `suppressHydrationWarning` para el mismatch intencional; reduced leído síncrono con `matchMedia`).
- `MetricTrendCard entrance?: 'none'|'assemble'` (default `'none'` byte-idéntico) — `'assemble'` = número cuenta 0→valor + chart se dibuja al montar.
- `card-density-motion.ts` — tipo `CardEntrance` + tokens `cardAssembleRisePx`/`cardAssembleTransition`.
- Lab `/design-system/card-density` consume `entrance='assemble'` y BORRA el drive externo (rAF/seqValues) — la card se arma sola.
- `MetricSummaryCard` NO recibe el prop (su `value` es `ReactNode` estático; su armado es el fly-in del wrapper — sin no-op).
- Verificado (Playwright): MOTION cuenta 0→87.4 confiable (play frío + replay, sin flash, no al revés); REDUCED-MOTION muestra el valor final de una. Lint 0, tsc 0, 313 tests primitives + 20 AnimatedCounter/consumers verdes.
- Canonización doc: `PRIMITIVES.md` fila "Card entrance al armarse".

**Hallazgo clave para el end-to-end (la conexión con el Moment):** `NexaAnswerBubble` (1332 líneas) **renderiza su chart/métrica con Recharts inline propio — NO reusa `MetricTrendCard`**. Por lo tanto, para que la **RESPUESTA del Moment se arme** (cuando contiene una metric card — moments de finance/agency/ICO; el de Knowledge es prosa+citas), hay que: (a) wirear el mismo ensamble (count + chart draw) dentro de `NexaAnswerBubble`, o (b) converger su rendering de chart/métrica a la primitive `MetricTrendCard` con `entrance='assemble'`. Es trabajo en el **stack de Nexa** (NexaAnswerBubble), no solo en la card. Decisión de approach (a vs b) + alcance = inicio del próximo bloque del Slice B.

**Slice B (siguiente) — la experiencia como page DS "Nexa Answers Experience":** realizar el mockup aprobado `NexaMomentCompositionSection` (host↔composed morph + `NexaMomentComposition` + `NexaAnswersCanvas`) como page del Design System, incluyendo un moment cuya respuesta contenga una metric card que se arme (para mostrar la capacidad en el contexto del Moment) + paridad `fe:capture:diff`. NO toca `/knowledge` vivo.
