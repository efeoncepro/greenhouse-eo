---
name: greenhouse-nexa-conversational
description: Build or extend ANY part of the Nexa conversational experience in Greenhouse — the floating/Home chat (NexaThread), the answer-first canvas lens (NexaAnswersCanvas), AND the intelligence behind them (system prompt, behavior/routing, voice, knowledge retrieval/RAG, evidence/citations, LLM providers). Use whenever the work touches Nexa Chat, its surfaces, its backend (nexa-service/tools/providers/prompt), grounding/evidence, the choreography, or adding a new domain consumer.
---

# Greenhouse Nexa Conversational

Invocar esta skill ANTES de tocar o extender CUALQUIER parte de la **experiencia conversacional de Nexa**. La Conversational Experience NO es solo el canvas/lente: es el sistema completo — la **inteligencia** (cómo piensa/habla/decide/recupera) + las **superficies** (cómo se vive en pantalla) + la **evidencia** (cómo se respalda) + la **persistencia**.

Es un **overlay de dominio**: compone con `greenhouse-product-ui-architect` (P+V+K + Figma contract), `modern-ui`/`state-design`/`motion-design`/`a11y-architect` (craft), `greenhouse-gvc-playwright` (GVC), `greenhouse-backend`/`arch-architect` (contratos/runtime). No los reemplaza.

## El modelo mental correcto: 2 superficies + 1 backend

| | **NexaThread** (chat) | **NexaAnswersCanvas** (lente) |
|---|---|---|
| Dónde | Chat **flotante global** (`NexaFloatingButton`→`NexaFloatingPanel`, montado en TODO el dashboard) **+** chat **embebido del home legacy** (`HomeView`→`NexaThread`+`NexaThreadSidebar`). Es la superficie viva primaria. | Surface answer-first rica, **flag-gated** `NEXA_ANSWERS_CANVAS_LENS_ENABLED`, hoy en `/knowledge` |
| Render | **assistant-ui** (`ThreadPrimitive` + `MarkdownTextPrimitive` + `NexaToolRenderers`) | `NexaAnswersCanvas` + coreografía de 11 estados |
| Código | `src/views/greenhouse/home/components/NexaThread.tsx` + `NexaToolRenderers.tsx` (reusado por el flotante `NexaFloatingPanel`) | `src/components/greenhouse/primitives/nexa-answers-canvas/**` |
| Citas/fuentes | `cleanNexaAnswer` (strip al render) + `NexaProvenanceTrace` variant `panel` `sourcesOnly` | citas inline + `NexaProvenanceTrace`/`NexaEvidencePanel` |

**Topología del chat (importante):** `NexaThread` es **el mismo componente** que monta (a) el **home legacy** (embebido) y (b) el **flotante global**. El **home v2 (`HomeShellV2`) NO embebe chat** → en v2 se usa el flotante. **Las dos surfaces (y todos los montajes de NexaThread) pegan a UN solo endpoint** `/api/home/nexa` ("home" es histórico = backend compartido de TODO el chat) → `NexaService.generateResponse` (system prompt + router + providers + tools + evidencia). Difieren solo en el render. Un arreglo del endpoint/backend impacta a todos a la vez.

## La inteligencia (backend) — SSOT = Nexa Intelligence

Toda la inteligencia está documentada por capas en **`docs/architecture/nexa-intelligence/`** (carpetas que crecen por dominio). **Es la fuente de verdad agent-facing del backend** — leé la capa que vas a tocar ANTES de codear:

- `system-prompt/` — el prompt versionado (V1 rollback / V2 modular) + qué tiene hoy. Código: `src/lib/nexa/nexa-system-prompt.ts`.
- `behavior/` — comportamiento por turno + ruteo de tools + ruteo de provider (auto-router). Código: `nexa-service.ts`, `nexa-model-router.ts`, `nexa-provider.ts`, `providers/`.
- `voice/` — contrato de voz Efeonce. Fuente: `docs/context/05_voz-tono-estilo.md`.
- `knowledge/` — retrieval (RAG) + calidad de respuesta + evidencia/citas. Código: `nexa-tools.ts`, `src/lib/knowledge/search/**`, `conversational-evidence.ts`.
- `experience/` — Conversational Experience + Nexa Moments + Nexa Answers (las vistas de producto).
- `governance/` — do's & don'ts consolidados.
- `technical/` — modelos LLM (Gemini/Claude), pipeline RAG end-to-end, técnicas, contratos de datos.

**Doc gate `pnpm nexa:doc-gate`** (en `ci.yml`): si tocás código de un dominio Nexa y NO actualizás su doc de capa → falla; archivo Nexa nuevo sin registrar en `manifest.json` → falla. **Al tocar el backend del chat, actualizá la(s) capa(s) en el mismo cambio.**

## El endpoint + el modelo + la persistencia (hechos)

- **Endpoint:** `src/app/api/home/nexa/route.ts` — `getServerAuthSession` → `NexaService.generateResponse({ prompt, history.slice(-10), context, runtimeContext, requestedModel: resolveNexaModel({ requestedModel: model }) })` → `persistNexaConversation`.
- **Modelo:** el chat flotante **siempre resuelve Gemini** — `resolveNexaModel` siempre devuelve un modelo válido (del picker o `DEFAULT_NEXA_MODEL`) → `buildProviderPlan` paso 1 (modelo pedido soportado) gana → single, sin router. **El auto-router (Claude) NO se alcanza desde `/api/home/nexa`**; solo aplica en entrypoints que NO fuerzan `requestedModel`. NO asumas que el chat flotante usa Claude.
- **Persistencia:** `persistNexaConversation` (`src/lib/nexa/store.ts`) → `greenhouse_ai.nexa_messages` (`content`, `tool_invocations` [el packet vive acá], `suggestions`, `model_id`) + `nexa_threads` + `nexa_feedback`. **Telemetría de turno** (TASK-1129): `promptVersion`/`promptFamily` + provider plan/resuelto + failover + latencias + tools + `outcome` viven en el ledger aditivo `greenhouse_ai.nexa_turn_telemetry` (best-effort post-commit; contrato `nexa-turn-telemetry.v1`; NO se devuelve al cliente). Las señales de reliability leen de `nexa_messages.tool_invocations` + `nexa_turn_telemetry`.

## Contratos versionados (SSOT — no romper sin bumpear versión)

`surfaceContext` (`@/lib/nexa/nexa-answers-surface-context`) · `nexa-answer-render-plan.v1` · `nexa-evidence.v1` · `knowledge-search.v1` · `NEXA_PROMPT_GOVERNANCE` (versión del prompt). Detalle: `nexa-intelligence/technical/data-contracts.md`.

## Invariantes del runtime del chat (TASK-1112/1113/1124)

- **Anti-flicker de texto:** `MarkdownTextPrimitive` con componentes memoizados (`unstable_memoizeMarkdownComponents`) — sin esto el árbol Markdown re-renderiza por tick.
- **Anti remount-loop de tools:** registrar las tool UIs UNA vez dentro del thread (`NexaToolRenderer`) + renderers a nivel de módulo (`React.memo`) + `Fallback` puro `() => null`. NUNCA registrar `useAssistantToolUI` desde el `tools.Fallback` (loop mount/unmount).
- **Scroll:** sin CSS `scroll-behavior: smooth` en el viewport (sticky-bottom honesto de assistant-ui).
- **Citas en el chat:** la respuesta cita `[n]` inline; `cleanNexaAnswer` saca cualquier volcado "Fuentes:" + `[n]` colgante al render. Las fuentes viven SOLO en el panel (`NexaProvenanceTrace` `sourcesOnly`), nunca como texto.
- **Excerpt de fuente:** `toPlainExcerpt` limpia el Markdown crudo (`##`, `**`) del preview en los DOS constructores de excerpt (`conversational-evidence.ts` + `nexa-answers-citation-mapper.ts`).

## La coreografía del canvas (11 estados)

`idle → submitted → thinking → reasoning → streaming → answered → proofOpen → followup` (+ `compacted`/`degraded`/`error`). Arranca en `onSubmit`. El **live region del status lo lleva la identidad Nexa** (un solo anuncio a11y). `prefers-reduced-motion` horneado en cada feature-primitive. (Aplica a la lente; el chat NexaThread usa el revelado typewriter de assistant-ui.)

## Receta: agregar un dominio/surface conversacional (lente)

**Seguí el PLAYBOOK** (`docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE_DOMAIN_PLAYBOOK.md`) — Knowledge (TASK-1101) es el ejemplo trabajado. El dominio entra por **datos**, no por chrome:

1. **Domain adapter** `packet → NexaAnswersRenderPlan` (puro, `src/lib/<dominio>/nexa/`): reusa el citation mapper + evidence converter canónicos; gap honesto sin datos; emite solo tus `allowedRenderers`.
2. **`surfaceContext`** declarativo. Si hay kind de dominio, resolvé a un variant EXISTENTE — NUNCA uno nuevo.
3. **Lens host self-contained** (`src/views/greenhouse/<dominio>/`): posee draft/estado/packet, conduce la coreografía, abort en `onStopGeneration`, `degraded`/`error` honestos.
4. **Flag de PRESENTACIÓN** default OFF, ortogonal al de retrieval; la page (server) hace el swap.
5. **GVC** con el flag ON (corpus real → staging).

## Crear/extender un feature-primitive (P+V+K completo)

Vive en `src/components/greenhouse/primitives/nexa-<x>/` + barrel + resolver `kind→variant` + tests. Props **neutrales** (no `knowledge*`). a11y/reduced-motion horneados. Cero hardcode (tokens AXIS + SoT). **Lab interno** `/design-system/nexa-<x>` + route-reachability strict + `DesignSystemCatalogView` + scenario GVC + fila en `ui-platform/PRIMITIVES.md`. **Migración byte-idéntica:** helper puro que reproduce la fórmula + verificación GVC.

## Loop de verificación (obligatorio para UI)

1. Diseñar con las skills de product design (P+V+K + state-design + modern-ui + a11y).
2. `pnpm fe:capture <scenario> --env=local` → leer el frame PNG → ajustar → re-capturar hasta enterprise.
3. Scenario madre `nexa-answers-surface` (11 estados + portabilidad + toolbar + grounding + streaming).
4. Para el chat flotante: ejercitar tool-use real (panel `/knowledge` o Home) — medir remounts del card de tool (anti-loop) + scroll-up durante el revelado.
5. Backend: `pnpm vitest run src/lib/nexa src/lib/knowledge` + (voz/política) `pnpm qa:nexa-knowledge`.
6. `local:check` (lint + tsc) + `pnpm nexa:doc-gate --changed` verde antes de cerrar.

## Hard rules (anti-regresión)

**Superficies**
- **NUNCA** crear una answer-surface / chat por dominio (`FinanceAnswerSurface`, `AgencyChat`…). Componer el canvas con su `surfaceContext`, o el chat con el backend compartido.
- **NUNCA** crear un `surfaceContext` paralelo, ni un variant nuevo por dominio.
- **NUNCA** duplicar grounding/toolbar/revelado/evidencia: consumir `NexaProvenanceTrace`/`NexaResponseToolbar`/`NexaStreamingText`/`NexaEvidencePanel`.
- **NUNCA** romper los invariantes del runtime del chat (markdown memo, tool-once, no smooth-scroll, `cleanNexaAnswer`, `toPlainExcerpt`).
- **NUNCA** anexar "Fuentes:" como texto ni mostrar `##` crudo (en respuesta o excerpt). Las fuentes viven en el panel.
- **NUNCA** pintar `Auditar`/estado falso cuando la verdad es "no sé" — `degraded`/`error`/gap honestos.
- **NUNCA** duplicar el live region (lo lleva la identidad Nexa).
- **NUNCA** hardcodear HEX/px/fontFamily/ms — tokens AXIS + SoT + motion tokens.

**Inteligencia (backend)**
- **NUNCA** editar el prompt inline en `nexa-service.ts` — vive en `nexa-system-prompt.ts` (versionado). Al cambiarlo: bumpeá `version` + entrada de `changelog` + actualizá el **golden snapshot** (`nexa-system-prompt.test.ts -u`); el doc-gate (`pnpm nexa:doc-gate --changed`) lo exige. Cómo: `nexa-intelligence/system-prompt/versioning.md`.
- **NUNCA** exponer la selección de modelo al usuario; el modelo Anthropic es router-internal.
- **NUNCA** instanciar un SDK LLM dentro de un dominio — Gemini/Claude vía `src/lib/ai/*` (los providers ya lo hacen).
- **NUNCA** responder un dato operativo en vivo desde Knowledge (rutear al tool operativo).
- **NUNCA** queryear las tablas del corpus directo (lint `no-direct-knowledge-chunk-query`); pasar por `searchKnowledge`.
- **NUNCA** un LLM call sin retrieval para una respuesta de conocimiento.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain`. **NUNCA** devolver `error.message` crudo al cliente — contrato canónico es-CL (ver TASK-1131).
- **NUNCA** romper un contrato versionado sin bumpear la versión.
- **NUNCA** tocar una capa Nexa sin actualizar su doc en `nexa-intelligence/` (el gate falla).
- **SIEMPRE** corpus incorrecto pero citado → corregir el doc fuente + re-ingestar, NO parchear el prompt.

## Estado del runtime + gaps de robustez conocidos

- **Lente:** `NexaAnswersCanvas` cableado a `/knowledge` con retrieval real, flag-gated (`NEXA_ANSWERS_CANVAS_LENS_ENABLED`, default OFF), GVC-verificado. `NexaKnowledgeAnswerSurface` (answer-trace) = fallback mientras el flag está OFF. Rollout = decisión del operador.
- **Chat flotante:** vivo (NexaThread + assistant-ui). Auto-router NO se alcanza acá (siempre Gemini).
- **Hardening abierto (tasks):** TASK-1125 (corpus prod) · TASK-1127 (QA nightly + eval wrong-source/cross-doc) · TASK-1128 (signal de drift de términos del corpus) · TASK-1134 (auto-router + model selection truth — desbloqueada por TASK-1129).
- **Hardening cerrado (reciente):** TASK-1126 (golden snapshot del prompt + gate de version/changelog) · TASK-1138 (módulo `answerFormatting` del prompt V2 → v2.1.0) · TASK-1131 (contrato de error canónico es-CL + `captureWithDomain('home')` en los 5 handlers del chat) · TASK-1129 (telemetría de turno: ledger `nexa_turn_telemetry` + signal `nexa.turn.degraded_outcomes`).
- **Follow-ups de la lente:** `unhelpful` → selector de motivo; `share` → permalink real; multi-turno con compactación (TASK-1102); token-streaming real por el provider (TASK-1091). Ninguno toca la primitive.

## Required reads (en orden)

1. **`docs/architecture/nexa-intelligence/README.md`** — el índice de capas del backend (SSOT de la inteligencia). Leé la capa que vas a tocar.
2. `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md` — el contrato de la experiencia (shell + coreografía + contratos SSOT). + `..._DOMAIN_PLAYBOOK.md` para agregar un dominio.
3. `docs/architecture/ui-platform/PRIMITIVES.md` — fila "Nexa chat atoms / answer surfaces".
4. `docs/documentation/plataforma/nexa-conversational-experience.md` + `nexa-intelligence-capas.md` — la versión humana.
5. `DESIGN.md` + tokens AXIS — contrato visual (cero hardcode).

Si el runtime difiere del doc, **gana el runtime** (`src/lib/nexa/**` + `src/components/greenhouse/primitives/nexa-answers-canvas/**` + `src/views/greenhouse/home/components/Nexa*`) y se actualiza el doc + esta skill.

## Mantenimiento de esta skill

Si cambia el contrato (coreografía, contratos SSOT, feature-primitives, **capas de Nexa Intelligence**, el runtime del chat, la convergencia), actualizar **en el mismo cambio**: la capa correspondiente en `nexa-intelligence/` (el gate lo exige) + `CONVERSATIONAL_EXPERIENCE.md` + `nexa-conversational-experience.md` + `PRIMITIVES.md` + esta skill (Claude **y** el mirror `.codex/skills/greenhouse-nexa-conversational/SKILL.md`).

## Procedencia

TASK-1095/1096/1101 (canvas + coreografía + surfaceContext + runtime promotion) · TASK-1103/1104/1105/1108 (feature-primitives) · TASK-1089/1090/1092 (answer-trace + citation mapper) · TASK-1091 (NexaChatProvider + router) · TASK-1085/1083 (retrieval + search SSOT) · TASK-1112/1113 (chat render hardening) · **TASK-1124 (system prompt V2 versionado + calidad de respuesta + Nexa Intelligence docs + doc gate)**.
