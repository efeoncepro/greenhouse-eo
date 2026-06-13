---
name: greenhouse-nexa-conversational
description: Build or extend any Nexa conversational surface in Greenhouse (answer-first chat, knowledge/insight answers, the Nexa lens). Use whenever the work touches NexaAnswersCanvas, the conversational choreography (idle→thinking→reasoning→streaming→answered→proof→followup), grounding/evidence, the response toolbar, streaming text, or adding a new domain consumer of the Nexa conversational experience.
---

# Greenhouse Nexa Conversational

Invocar esta skill ANTES de tocar o extender cualquier **surface conversacional de Nexa** (la lente Nexa: respuesta-primero con grounding + evidencia + chrome de confianza). Traduce la arquitectura canónica en restricciones de implementación + el loop de verificación.

Es un **overlay de dominio**: compone con `greenhouse-product-ui-architect` (P+V+K + Figma contract), `modern-ui`/`state-design`/`motion-design`/`a11y-architect` (craft), `greenhouse-gvc-playwright` (verificación GVC) y `arch-architect` (contratos). No los reemplaza.

## Required reads (en orden)

1. `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md` — **el contrato canónico** (shell + coreografía + contratos SSOT + transversalidad + receta + hard rules). Es la fuente de verdad de esta skill.
2. `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE_DOMAIN_PLAYBOOK.md` — **el PLAYBOOK** para traer la experiencia rica a un dominio (los 5 pasos: adapter `packet→renderPlan` + `surfaceContext` + lens host + flag de presentación + GVC), con Knowledge (TASK-1101) como ejemplo trabajado. Léelo ANTES de agregar/cablear un dominio nuevo.
3. `docs/architecture/ui-platform/PRIMITIVES.md` — fila "Nexa chat atoms / answer surfaces" (inventario de componentes).
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

**Seguí el PLAYBOOK** (`CONVERSATIONAL_EXPERIENCE_DOMAIN_PLAYBOOK.md`) — los 5 pasos con el ejemplo trabajado de Knowledge (TASK-1101). NO crear un componente nuevo; el dominio entra por **datos**, no por chrome. Resumen:

1. **Domain adapter** `packet → NexaAnswersRenderPlan` (puro, `src/lib/<dominio>/nexa/`): reusa el citation mapper + evidence converter canónicos; gap honesto sin datos; emite solo tus `allowedRenderers`. Ref: `src/lib/knowledge/nexa/knowledge-answer-render-plan.ts`.
2. **`surfaceContext`** declarativo (`domain`/`placement`/`density`/`dataReality`/`sensitivity`/`allowedRenderers`/`allowedActions`). Si hay kind de dominio, resolvé a un variant existente — NUNCA un variant nuevo.
3. **Lens host self-contained** (`src/views/greenhouse/<dominio>/`): posee draft/estado/packet, conduce la coreografía de 11 estados desde el lifecycle real, abort en `onStopGeneration`, `degraded`/`error` honestos. Ref: `KnowledgeNexaCanvasLens.tsx`.
4. **Flag de PRESENTACIÓN** default OFF, ortogonal al de retrieval; la page (server) lo resuelve y hace el swap `flag ? <CanvasLens/> : <legacy/>`. Ref: `src/lib/knowledge/nexa/canvas-lens-flag.ts`.
5. **GVC** con el flag ON (corpus real → staging; local prueba wiring + estados + gap honesto). Scenario que ejercita la interacción. Ref: `scripts/frontend/scenarios/knowledge-nexa-canvas-lens.scenario.ts`. Para portabilidad pura (estado answered, datos sintéticos) seguí usando el specimen del scenario `nexa-answers-surface`.

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

## Convergencia (runtime construido — TASK-1101)

La lente Nexa rica del canvas YA está cableada a `/knowledge` con retrieval real (`buildKnowledgeAnswerRenderPlan` → `NexaAnswersCanvas` runtime), **flag-gated** (`NEXA_ANSWERS_CANVAS_LENS_ENABLED`, default OFF) y GVC-verificada (idle→thinking→reasoning→answered con corpus real + citas inline + toolbar). El `NexaKnowledgeAnswerSurface` (answer-trace, TASK-1089/1090/1092) queda como **fallback** mientras el flag está OFF; el rollout (flag ON staging→prod) es decisión del operador. Cualquier dominio nuevo sigue el PLAYBOOK (no se vuelve a diseñar el shell).

**Follow-ups abiertos:** (a) `unhelpful` → selector de motivo (stale/wrong_source/missing_doc) — hoy mapeo mínimo `wrong_source`; (b) `share` → permalink real (necesita sync de URL state cross-lens); (c) multi-turno con compactación (TASK-1102) en el runtime — hoy single-turn-replace; (d) routing por el provider stream (TASK-1091) para token-streaming real del answer en la lente (hoy retrieval-grounded con reveal). Ninguno toca la primitive.

## Mantenimiento de esta skill

Si cambia el contrato canónico (coreografía, contratos SSOT, feature-primitives, transversalidad, convergencia), actualizar **en el mismo cambio**: `CONVERSATIONAL_EXPERIENCE.md` (agente) + `nexa-conversational-experience.md` (humano) + `PRIMITIVES.md` + esta skill (Claude **y** el mirror `.codex/skills/greenhouse-nexa-conversational/SKILL.md`).

## Procedencia

TASK-1096 (canvas + coreografía + feature-primitives) · TASK-1095 (surfaceContext SSOT) · **TASK-1101 (runtime promotion — domain adapter + lens host + flag cutover + PLAYBOOK; primer consumer real: Knowledge)** · TASK-1103 (NexaProvenanceTrace) · TASK-1104 (NexaResponseToolbar) · TASK-1105 (NexaStreamingText) · TASK-1108 (frontera transversal/dominio del proof) · TASK-1089/1090/1092 (answer-trace + citation mapper, Codex) · TASK-1091 (NexaChatProvider).
