---
name: greenhouse-nexa-conversational
description: Build or extend any Nexa conversational surface in Greenhouse (answer-first chat, knowledge/insight answers, the Nexa lens). Use whenever the work touches NexaAnswersCanvas, the conversational choreography (idle→thinking→reasoning→streaming→answered→proof→followup), grounding/evidence, the response toolbar, streaming text, or adding a new domain consumer of the Nexa conversational experience.
---

# Greenhouse Nexa Conversational

Invocar esta skill ANTES de tocar o extender cualquier **surface conversacional de Nexa** (la lente Nexa: respuesta-primero con grounding + evidencia + chrome de confianza). Traduce la arquitectura canónica en restricciones de implementación + el loop de verificación.

Es un **overlay de dominio**: compone con `greenhouse-product-ui-architect` (P+V+K + Figma contract), `modern-ui`/`state-design`/`motion-design`/`a11y-architect` (craft), `greenhouse-gvc-playwright` (verificación GVC) y `arch-architect` (contratos). No los reemplaza.

## Required reads (en orden)

1. `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md` — **el contrato canónico** (shell + coreografía + contratos SSOT + transversalidad + receta + hard rules). Es la fuente de verdad de esta skill.
2. `docs/architecture/ui-platform/PRIMITIVES.md` — fila "Nexa chat atoms / answer surfaces" (inventario de componentes).
3. `docs/documentation/plataforma/nexa-conversational-experience.md` — la versión humana (qué es / cómo se siente).
4. `DESIGN.md` + tokens AXIS — el contrato visual (cero hardcode).

Si el contrato del runtime difiere del doc, **gana el runtime** (`src/components/greenhouse/primitives/nexa-answers-canvas/**` + `src/lib/nexa/**`) y se actualiza el doc + esta skill.

## Modelo mental (lo que NO se viola)

- **`NexaAnswersCanvas` es la surface canónica** de la lente Nexa (domain-neutral). NO existe una answer-surface por dominio.
- El **dominio entra por datos** (`surfaceContext`), nunca por chrome especial. Conocimiento es el primer consumer, no el dueño.
- Los **contratos versionados** son SSOT: `surfaceContext` (`@/lib/nexa/nexa-answers-surface-context`), `renderPlan` (`nexa-answer-render-plan.v1`), evidencia (`nexa-evidence.v1`), retrieval (`knowledge-search.v1`).
- Los **mecanismos transversales** ya son primitives neutrales: `NexaProvenanceTrace` (grounding), `NexaResponseToolbar` (chrome de confianza), `NexaStreamingText` (revelado), `NexaEvidencePanel` (evidencia). NO se reimplementan por surface.

## La coreografía (11 estados)

`idle → submitted → thinking → reasoning → streaming → answered → proofOpen → followup` (+ `compacted`/`degraded`/`error`). Arranca en `onSubmit` desde `idle`. Cada estado tiene su primitive (tabla en el doc agente §4). El **live region del status lo lleva la identidad Nexa**, no cada burbuja (a11y: un solo anuncio). `prefers-reduced-motion` horneado en cada feature-primitive.

## Receta: agregar un dominio/surface conversacional nuevo

NO crear un componente nuevo. Componer el canvas con el contrato del dominio:

1. Declarar `surfaceContext` con `domain: '<nuevo>'` + `placement` + `dataReality` + `sensitivity` + `allowedRenderers` (whitelist) + `allowedActions`. Import del SSOT `@/lib/nexa/nexa-answers-surface-context`.
2. `kind→variant`: si hay kind de dominio, agregarlo a `NEXA_ANSWERS_CANVAS_KIND_CONFIG` resolviendo a un **variant existente** (`embedded`/`sidecar`/`inline`) — NUNCA un variant nuevo por dominio. Si no, `custom`.
3. Producir el `renderPlan` (`nexa-answer-render-plan.v1`): blocks (`answerBubble`/`compactAnswer`/`conversationBubble`) + `proof` con `ConversationalEvidencePacket` si hay evidencia (mapeada desde el packet de dominio, p.ej. `knowledge-search.v1` → `nexa-evidence.v1`).
4. Conducir la coreografía desde el host (los 11 estados) con degradación honesta (`degraded`/`error`, nunca `Auditar` falso).
5. **Agregar un specimen de portabilidad** al scenario GVC `nexa-answers-surface` (mismo canvas, dominio nuevo) → el guard de transversalidad lo cubre.

## Crear/extender un feature-primitive (P+V+K completo)

Si emerge un mecanismo transversal nuevo (o se extiende uno):

- Vive en `src/components/greenhouse/primitives/nexa-<x>/` + export en el barrel + resolver `kind→variant` + tests del controller.
- Nombre + props **neutrales** (no `knowledge*`). a11y/reduced-motion **horneados**. Cero hardcode (solo tokens AXIS + escala SoT).
- **Lab interno** `/design-system/nexa-<x>` (guard `plataforma.design_system`) + page + entrada en `route-reachability-manifest.ts` (gate strict) + entrada en `DesignSystemCatalogView` + scenario GVC.
- Entrada en `ui-platform/PRIMITIVES.md` (fila Nexa).
- **Migración byte-idéntica**: al extraer un mecanismo del canvas, escribir un **helper puro** que reproduzca la fórmula original (testeable sin DOM) y verificar el frame del canvas idéntico en GVC. El sha puede diferir solo por fase de animación viva (caret/beam) cuando el scenario no congela animaciones → la prueba es visual + el test del helper.

## Loop de verificación (obligatorio para UI)

1. Diseñar con las skills de product design (P+V+K + state-design + modern-ui + a11y).
2. `pnpm fe:capture <scenario> --env=local` → leer el frame PNG → ajustar → re-capturar hasta enterprise.
3. Scenario madre `nexa-answers-surface` (recorre los 11 estados + portabilidad + toolbar + grounding + streaming) = regression visual de la coreografía.
4. Labs por primitive (`/design-system/nexa-{provenance,response-toolbar,streaming-text,chat}`) con a11y por teclado.
5. `local:check` (lint + tsc) + tests focales del controller verde antes de cerrar.

## Hard rules (anti-regresión)

- **NUNCA** crear una answer-surface / chat por dominio (`FinanceAnswerSurface`, `AgencyChat`…). Componer el canvas con su `surfaceContext`.
- **NUNCA** crear un `surfaceContext` paralelo. Import único: `@/lib/nexa/nexa-answers-surface-context`.
- **NUNCA** meter chrome "solo para X dominio" en el shell ni en un feature-primitive. El dominio entra por datos.
- **NUNCA** inventar un variant nuevo por dominio — un kind de dominio resuelve a un variant existente vía el controller.
- **NUNCA** romper un contrato versionado (`nexa-answer-render-plan.v1`, `nexa-evidence.v1`, `knowledge-search.v1`) sin bumpear la versión.
- **NUNCA** duplicar grounding / response toolbar / revelado / evidencia: consumir `NexaProvenanceTrace` / `NexaResponseToolbar` / `NexaStreamingText` / `NexaEvidencePanel`.
- **NUNCA** pintar `Auditar`/estado falso cuando la verdad es "no sé" — usar `degraded`/`error` honestos.
- **NUNCA** duplicar el live region (lo lleva la identidad Nexa).
- **NUNCA** extraer un mecanismo del canvas sin verificar la migración byte-idéntica en GVC.
- **NUNCA** hardcodear HEX/px/fontFamily/ms — tokens AXIS + escala SoT + motion tokens.
- **SIEMPRE** agregar un specimen de portabilidad al scenario GVC al introducir una surface conversacional nueva.

## Convergencia pendiente (coordinado con Codex)

`NexaKnowledgeAnswerSurface` (answer-trace productivo, TASK-1089/1090/1092) está wired a `/knowledge` con retrieval real pero es Knowledge-scoped y no modela `surfaceContext`. Conserva su data-path runtime y **converge** hacia el canvas + los feature-primitives neutrales (migrar proof→`panel`, trust cue→`inline`, consumir el `surfaceContext` SSOT). + ADR de plataforma + hard-rule en CLAUDE.md (NUNCA answer-surface por dominio) + slices A1/A2 de TASK-1095 (promoción física del contrato + split dominio/UI), gateado por `fe:capture:diff`. Coordinar antes de tocar el answer-trace.

## Mantenimiento de esta skill

Si cambia el contrato canónico (coreografía, contratos SSOT, feature-primitives, transversalidad, convergencia), actualizar **en el mismo cambio**: `CONVERSATIONAL_EXPERIENCE.md` (agente) + `nexa-conversational-experience.md` (humano) + `PRIMITIVES.md` + esta skill (Claude **y** el mirror `.codex/skills/greenhouse-nexa-conversational/SKILL.md`).

## Procedencia

TASK-1096 (canvas + coreografía + feature-primitives) · TASK-1095 (surfaceContext SSOT) · TASK-1101 (citation mapper + runtime) · TASK-1103 (NexaProvenanceTrace) · TASK-1104 (NexaResponseToolbar) · TASK-1105 (NexaStreamingText) · TASK-1089/1090/1092 (answer-trace, Codex) · TASK-1091 (NexaChatProvider).
