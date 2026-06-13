# TASK-1089 — Nexa Knowledge Answer Surface

## Delta 2026-06-12 — la mock data debe matchear la forma real del packet (TASK-1083)

Para que el wiring de 1085 sea fricción-cero (sin reshape), la mock data tipada de esta surface debe usar la **forma real** de `KnowledgeRetrievalPacket` (`knowledge-search.v1`):

- Cada chunk/cita lleva **`score: number`** (el `ts_rank`; campo agregado al packet 2026-06-12). Es el SSOT del número del trace ("Score 0.96").
- La **"Confianza" por fuente** se **deriva** del `score` (agrupando por `documentId`), NO es un campo nuevo del mock.
- El trace tiene **dos confianzas distintas**: la de **retrieval** (del packet: `confidence` + `max(score)`) y la de **respuesta** (la genera Nexa en 1085) — no usar el mismo número para ambas.
- La tab **"Evals"** es la salud del eval harness offline (golden questions), no un número por-respuesta.

Mapeo completo packet→UI en TASK-1085 (Delta "contrato de la experiencia Answer Trace"). Mientras sea mock, los números son ilustrativos; al cablear 1085 salen del packet real.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Code complete local / esperando feedback`
- Rank: `TBD`
- Domain: `ui|platform|content|nexa|knowledge`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la primera kind transversal de una superficie de respuesta Nexa para Knowledge: pregunta como burbuja, respuesta verificable con citas, composer glow descendido para follow-up y panel de trazabilidad lateral. La primera implementacion vive en `/knowledge/mockup/answer-trace` y usa data mock tipada hasta que `TASK-1085` conecte retrieval real.

Delta UX 2026-06-12: la experiencia conversacional es **condicional**. Mientras el usuario no envía una pregunta válida, `/knowledge/mockup/answer-trace` conserva la experiencia anterior: caja glow superior + trace rail visible + respuesta/proof panel. Solo después de submit válido la pregunta se promueve a burbuja, el composer glow baja como follow-up y el trace rail se reubica dentro del proof panel. En ese estado conversacional, la respuesta no muestra labels heredados de panel (`Respuesta verificable`, `Modo Humano`); debe leerse como hilo: pregunta del usuario -> Nexa (avatar/nombre) -> respuesta.

## Why This Task Exists

La caja glow `knowledgeAsk` ya existe como primitive visual, pero en Knowledge todavia se comporta como caja decorativa/command center. El operador eligio la opcion visual 3 del product-design loop ("Split Trace + Conversation") para subir el nivel de experiencia sin sentir un salto abrupto a otro producto: el usuario pregunta a Nexa, ve su pregunta preservada como burbuja, obtiene una respuesta trazable y mantiene continuidad para seguir preguntando.

## Goal

- Crear una composition primitive transversal `NexaKnowledgeAnswerSurface` con Primitive + Variants + Kinds.
- Implementar la primera kind `knowledgeAnswerTrace` en el mockup de Knowledge.
- Documentar el contrato UI y dejar GVC listo para evaluar desktop/mobile y microtransiciones.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-1083-knowledge-search-api-golden-questions.md`
- `docs/tasks/to-do/TASK-1085-nexa-knowledge-retrieval-citations.md`

Reglas obligatorias:

- No consultar tablas de Knowledge desde UI. La superficie consume props/mock data; el wiring real sera via API/retrieval canonico.
- Reusar `NexaComposer kind='knowledgeAsk'`, `NexaSenderMark`, `GreenhouseThinkingBeat` y atoms Nexa existentes antes de crear piezas paralelas.
- Motion breve, reduced-motion seguro y orientado a continuidad: pregunta -> respuesta -> composer inferior.
- La trazabilidad debe permanecer visible para humanos y agentes: fuentes, trace, packet y evals.

## Normative Docs

- `DESIGN.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1083` para el contrato de search/read-detail ya materializado.
- `TASK-1085` para conectar la superficie a retrieval-on-demand real en Nexa.

### Blocks / Impacts

- Sirve como base UI para `TASK-1084` Human Knowledge Center y `TASK-1085` Nexa Knowledge Retrieval.
- Puede reutilizarse en otras superficies Greenhouse donde Nexa responde con evidencia.

### Files owned

- `src/components/greenhouse/primitives/NexaKnowledgeAnswerSurface.tsx`
- `src/components/greenhouse/primitives/nexa-knowledge-answer-surface-controller.ts`
- `src/views/greenhouse/knowledge/mockup/answer-trace/**`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/PATTERNS.md`

## Current Repo State

### Already exists

- `NexaComposer` variants `chat|command` y kind `knowledgeAsk`.
- Nexa Chat atoms: `NexaGlowBorder`, `NexaSenderMark`, `NexaPresenceMark`, `GreenhouseThinkingBeat`.
- `/knowledge/mockup/answer-trace` con answer card + proof tabs + command center mock.
- `TASK-1083` Search API + packet `knowledge-search.v1`.

### Gap

- La pregunta no se preserva como burbuja conversacional.
- La respuesta se siente como panel separado, no como continuidad de una pregunta a Nexa.
- El composer no baja debajo de la respuesta para follow-up.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Composition primitive

- Crear `NexaKnowledgeAnswerSurface` con variants `conversationTrace|overviewPanel`.
- Crear kind inicial `knowledgeAnswerTrace -> conversationTrace`.
- Props tipadas para pregunta, respuesta, pasos, citas, proof tabs y composer.

### Slice 2 — Knowledge mockup adoption

- Reemplazar command center + answer/proof layout local por la composition primitive.
- Mantener tabs Fuentes/Trace/Packet/Evals y trace steps.
- Agregar estados de microinteraccion: submitting/thinking mock, pregunta nueva, aria-live.

### Slice 3 — Design System + docs + GVC

- Documentar primitive/patron y agregar specimen al lab Nexa Chat si aplica.
- Crear/actualizar scenario GVC para `/knowledge/mockup/answer-trace` desktop/mobile.
- Validar con lint/tsc/tests focales/GVC.

## Out of Scope

- Wiring real con `TASK-1085`.
- Streaming real, persistencia de threads y Assistant SDK en Knowledge runtime.
- Cambios de schema, search API o ingestion.

## Detailed Spec

La superficie debe tener coreografia continua:

1. El usuario escribe en la caja glow.
2. Al enviar, la pregunta aparece arriba como burbuja de usuario.
3. Nexa responde debajo con marca, estado, answer body y fuentes compactas.
4. El composer glow aparece debajo de la respuesta para follow-up.
5. El panel de prueba queda al lado en desktop y debajo en mobile, sin perder trazabilidad.

Regla de activación: si no hay submit válido, no se inicia conversación. No debe aparecer burbuja ni composer inferior en idle; el trace rail superior se mantiene para preservar el estado actual de Knowledge.

Regla de identidad: cuando `conversationStarted=true`, la respuesta se atribuye a Nexa con avatar/nombre inline **después** de la burbuja del usuario. No mostrar identidad/avatar Nexa antes de la burbuja; en un chat real el asistente aparece cuando responde. No mostrar título de card ni chip de modo dentro de la respuesta conversacional.

El design target elegido es la imagen generada opcion 3 del product-design loop:

- `/Users/jreye/.codex/generated_images/019eb8d6-d806-7630-b501-83c1a9642d45/ig_0bd21da8798a2ca3016a2bc5e8201c8191bf02e78e06fbae12.png`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (primitive) -> Slice 2 (mockup consumer) -> Slice 3 (docs/GVC).
- No wiring real antes de `TASK-1085`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Crear un chat paralelo a Nexa Chat | UI platform | medium | Reusar atoms y documentar como composition primitive | Drift visual en GVC/lab Nexa Chat |
| UI aparenta consultar datos reales | Knowledge/Nexa | medium | Copy y data mock clara; no endpoints/table reads | Usuario ve freshness/confidence sin contrato real |
| Motion molesta o rompe accesibilidad | UI/a11y | low | CSS transitions cortas + reduced-motion | GVC mobile/keyboard o review visual |

### Feature flags / cutover

Sin flag en Slice 1-3: mockup interno additive en ruta mockup. Runtime real y rollout de usuario final quedan para `TASK-1084`/`TASK-1085`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir archivos de primitive/controller/barrel | <10 min | si |
| Slice 2 | Revertir consumer `/knowledge/mockup/answer-trace` | <10 min | si |
| Slice 3 | Revertir docs/scenario | <10 min | si |

### Production verification sequence

1. Validar typecheck/lint/tests focales.
2. Capturar GVC local desktop/mobile del mockup.
3. Revisar frame PNG y ajustar hasta verse enterprise.
4. Documentar cierre y evidencia.

### Out-of-band coordination required

N/A para esta task: repo-only mockup/primitive. Wiring real depende de `TASK-1085`.

<!-- ZONE 4 — ACCEPTANCE & CLOSURE -->

## Acceptance Criteria

- [x] Existe `NexaKnowledgeAnswerSurface` exportada desde primitives con variant/kind resolver.
- [x] `/knowledge/mockup/answer-trace` conserva el estado idle anterior hasta submit válido.
- [x] Después de submit válido, muestra pregunta como burbuja, respuesta atribuida a Nexa y composer debajo sin perder proof trace.
- [x] En modo conversación no aparecen labels heredados `Respuesta verificable` ni `Modo Humano`.
- [x] En modo conversación, la burbuja del usuario precede a la identidad/avatar de Nexa; cubierto por test focal.
- [x] La experiencia tiene motion/reduced-motion y aria-live para el estado conversacional.
- [x] La UI no lee tablas ni llama endpoints reales de Knowledge/Nexa.
- [x] Docs UI platform + task + changelog/handoff quedan sincronizados.
- [x] GVC desktop/mobile revisado.

## Verification

- `pnpm eslint src/components/greenhouse/primitives/NexaKnowledgeAnswerSurface.tsx src/views/greenhouse/knowledge/mockup/answer-trace/KnowledgeAnswerTraceMockupView.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm fe:capture knowledge-answer-trace --env=local`
- `pnpm docs:closure-check`
- `pnpm task:lint --task TASK-1089`

### Evidence 2026-06-12

- `pnpm eslint src/components/greenhouse/primitives/NexaKnowledgeAnswerSurface.tsx src/views/greenhouse/knowledge/mockup/answer-trace/KnowledgeAnswerTraceMockupView.tsx src/components/greenhouse/primitives/ShellFloatingActionDock.tsx`
- `pnpm vitest run src/components/greenhouse/primitives/__tests__/NexaKnowledgeAnswerSurface.test.tsx src/components/greenhouse/primitives/__tests__/NexaComposer.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm fe:capture knowledge-answer-trace --env=local` → `.captures/2026-06-12T09-08-26_knowledge-answer-trace`
- `pnpm fe:capture knowledge-answer-trace --env=local` → `.captures/2026-06-12T09-37-16_knowledge-answer-trace` (idle preservado + conversación condicional + tab Trace + respuesta atribuida a Nexa sin labels de card)
- `pnpm fe:capture design-system-nexa-chat --env=local` → `.captures/2026-06-12T09-10-21_design-system-nexa-chat`
- `pnpm design:lint`
- `pnpm task:lint --task TASK-1089`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con carpeta.
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` actualizados.
- [ ] `Handoff.md` + `changelog.md` actualizados.
- [ ] `docs/architecture/ui-platform/*` actualizado.

## Follow-ups

- Conectar la primitive a retrieval real en `TASK-1085`.
- Evaluar variant `overviewPanel` como surfaced AI Overview para Knowledge Center (`TASK-1084`).
