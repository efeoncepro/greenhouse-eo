# TASK-1110 — Nexa Composition runtime wiring (in-place en /knowledge) + Nexa Answers Experience

> **Lifecycle:** to-do
> **Creada:** 2026-06-13
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

**Decisión de producto resuelta (operador):** la composición es el transform **in-place** de la lente Humano (Opción 1 refinada), NO una pestaña nueva, NO navegar. Reconciliar con el `search→results` actual de la lente Humano: el ask compone in-place; definir si el search clásico convive o se subsume (validar con el operador al implementar; el norte es "una sola superficie que se ajusta").

### Slice 2 — GVC en staging (verlo funcionando)

- GVC del `/knowledge` real con la composición: dormant (docs) → ask → thinking/reasoning → composed (respuesta lidera + docs persisten + cita anclada resaltada). **Frame mirado** (regla del repo: no declarar UI lista sin GVC).
- Local da problemas (server lento / PG `pool after end` ISSUE-094); el playbook recomienda **staging para datos reales**. Scenario base ya existe para el Lab; crear/extender uno para el `/knowledge` runtime.

### Slice 3 — Canonizar "Nexa Answers Experience" como page del Design System (al FINAL de todo)

Idea del operador: canonizar `/knowledge/mockup/nexa-answers` como **page del Design System** ("Nexa Answers Experience", la primera de su tipo — agrega todos los componentes + patrones del flujo conversacional), **ya no como mockup**. Plan: mover a ruta DS real (p.ej. `/design-system/nexa-answers-experience`, gate `plataforma.design_system`) → registrar en catalog + reachability + PRIMITIVES + scenario → deja de ser `/mockup`. **Hacer al final de Slice 1+2.**

### Slice 4 — Joint con Codex (Moment Fabric)

`eligibility` (cuándo aparece el Moment) + `next-step gobernado` (action boundary: inform/recommend/draft/execute-with-approval) + señales `nexa.moment.*` = **Moment Fabric (TASK-1095/1096, Codex)**. El consumer hoy omite el next-step honesto (no inventa acción). Coser por `surfaceContext` + `renderPlan`. Coordinar con Codex.

## Hard rules (invariantes — no regresión)

- **NUNCA** la composición navega a otra interfaz: ajusta la UI **in-place** ("Sin host ↔ con Nexa"). El puente a la lente takeover es secundario/opcional.
- **NUNCA** la composición es "de Knowledge": la capacidad es la primitive transversal `NexaMomentComposition`. Knowledge es un **consumer** (template replicable). El consumer recibe el `host` por slot (contenido propio de cada superficie).
- **NUNCA** desconectar de Nexa Answer: el Moment reusa `NexaAnswersCanvas` + el adapter de retrieval real + la coreografía. No hay answer-path paralelo.
- **NUNCA** flag OFF: se despliega habilitado (decisión del operador).
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
