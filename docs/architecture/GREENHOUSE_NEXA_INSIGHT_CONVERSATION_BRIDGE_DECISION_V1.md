# Greenhouse Nexa Insight ↔ Conversation Bridge Decision V1

## Status

Accepted (direction) — implementation gated per task. Slice 1 = TASK-1181.

## Date

2026-06-19

## Owner

Product / Nexa / Delivery (ICO) / Platform Architecture

## Scope

- La relación bidireccional entre **Nexa Insights** (la superficie advisory `/nexa/insights`, `/nexa/insights/[id]`) y **Nexa Chat/Answer** (`/api/home/nexa` → `NexaService`).
- Cómo la conversación pasa a ser **insight-addressable** (leer/listar/explicar un insight desde el chat).
- Cómo la superficie de insight pasa a ser **conversation-aware** (preguntarle a Nexa "sobre este insight").
- El canal nuevo de **conciencia de superficie** (`focusRef`) en `runtimeContext`.
- La cross-citación: respuestas de Nexa que deep-linkean de vuelta al detalle canónico del insight.
- NO entra: nuevas métricas ICO, cambios al materializer de signals, ni el motor de enrichment LLM (son upstream y permanecen intactos).

## Reversibility

Two-way para todas las slices de V1. Las slices son aditivas:

- Slice 1 (tools de lectura + módulo de prompt): revert = quitar 2 tools del registry + revertir el módulo de prompt (golden snapshot). Cero schema.
- Slice 2 (`focusRef` + CTA): revert = campo opcional ignorado + quitar CTA.
- Slice 3 (cross-citación): revert = quitar la acción `drillDown` del render plan.
- Slice 4 (acción gobernada sobre insight): one-way-but-slow; vive detrás de `NEXA_ACTION_RUNTIME_ENABLED` (default OFF) y un task/ADR propio.

## Confidence

Alta para la dirección. Alta para Slices 1–3 (reusan readers, contratos y runtime ya existentes). Media para Slice 4 (depende de modelar acciones sobre recommendations sin violar el boundary ICO→Payroll/Delivery).

## Validated As Of

2026-06-19 contra runtime + docs locales:

- `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts` (`readNexaInsightDrill`, union `current|superseded|expired|not_found|degraded`, `NexaInsightDetailSnapshot`)
- `src/lib/ico-engine/ai/nexa-insight-list-reader.ts` (`listNexaInsightsForPeriod`, subject anti-oracle)
- `src/lib/ico-engine/ai/nexa-insight-href.ts` (`buildNexaInsightDrillHref`, puro/client-safe)
- `src/lib/ico-engine/ai/read-signals.ts` (`readOrganizationAiSignals`, `readOrganizationAiLlmEnrichments`)
- `src/lib/nexa/nexa-service.ts`, `src/lib/nexa/nexa-tools.ts` (registry `NEXA_TOOLS`, tool `get_otd`), `src/lib/nexa/nexa-system-prompt.ts`
- `src/lib/nexa/nexa-contract.ts` (`NexaRuntimeContext`, `NexaResponse`)
- `src/lib/nexa/nexa-answers-surface-context.ts`, `src/lib/nexa/suggested-prompts-contract.ts` (`NexaSuggestedPrompt.entityRef`)
- `src/lib/nexa/actions/*` (propose→confirm→execute, TASK-1137)
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`, `GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`, `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

No introduce ningún claim de vendor, pricing de modelo, versión de framework ni regulatorio.

## Context

Hoy las dos superficies AI de delivery viven de espaldas, **pese a resolver del mismo origen canónico** (`greenhouse_serving.ico_ai_signal_enrichments`):

- **Nexa Insights** productiza el enrichment LLM de un AI signal ICO con readers anti-oracle (`readNexaInsightDrill`, `listNexaInsightsForPeriod`), capability `nexa.insights.read`, y deep-link puro `buildNexaInsightDrillHref`. Lleva `signalId, enrichmentId, spaceId, memberId, projectId, metricName, periodYear, periodMonth, severity, explanationSummary, rootCauseNarrative, recommendedAction`.
- **Nexa Chat/Answer** tiene 8 tools; **solo `get_otd`** toca ICO y de refilón (top-3 signals + enrichments del org). **No existe tool para leer un insight por id ni para listar insights.** El system prompt **nunca menciona "Insights"**. `runtimeContext` (identidad/tenant) **no tiene conciencia de superficie**: el chat no sabe qué página/insight está mirando el usuario.

Resultado: un colaborador que ve un insight ("OTD de Sky bajó por bloqueo en fase de revisión") no puede preguntarle a Nexa sobre él en contexto, y Nexa no sabe que ese insight existe ni puede citarlo de vuelta. Esto contradice el North Star (Nexa opera TODO el portal por construcción) y la decisión Nexa Core Agentic Platform (los Insights son "promotable into a conversational moment when useful").

La causa NO es falta de datos ni de infraestructura — ambos existen. La causa es que **el chat no es cliente del reader del insight** y **no hay canal de conciencia de superficie**.

## Decision

Greenhouse construye el **Nexa Insight ↔ Conversation Bridge**: una relación bidireccional gobernada entre Insights y Chat/Answer, anclada en el principio Full API Parity **un primitive (el insight = la enrichment row), muchos consumers**. "Conocerse" se implementa como: el chat se vuelve **cliente del mismo reader del insight**, más un **canal nuevo de conciencia de superficie**. No se crea ningún "InsightChat" ni superficie conversacional por dominio.

El bridge tiene cuatro planos, secuenciados por riesgo:

| Plano | Dirección | Mecanismo | Slice / flag |
| --- | --- | --- | --- |
| **1. Lectura insight-addressable** | Chat → Insights | Tools `get_insight(insightId)` + `list_insights(period, scope)` que envuelven `readNexaInsightDrill` / `listNexaInsightsForPeriod` (mismo subject anti-oracle). Módulo de system prompt que enseña a Nexa que Insights existe + ruteo. | **TASK-1181** (Slice 1). Sin schema, sin UI nueva. |
| **2. Conciencia de superficie** | Insights → Chat | CTA "Pregúntale a Nexa sobre este insight" en detail/list → abre el chat con `entityRef={insightId}` → transportado en `runtimeContext.focusRef`. Nexa ancla la respuesta al insight enfocado. | Slice 2. Campo opcional + CTA. |
| **3. Cross-citación** | Answer → Insights | Las respuestas de Nexa sobre ICO/delivery emiten una acción `drillDown` resuelta host-side vía `buildNexaInsightDrillHref`. La conversación siempre apunta de vuelta al detalle canónico. | Slice 3. |
| **4. Acción gobernada sobre insight** | Chat → write | acknowledge / snooze / assign-recommendation vía propose→confirm→execute (TASK-1137). El LLM nunca escribe. | Slice 4. Diferido; `NEXA_ACTION_RUNTIME_ENABLED` + ADR propio. |

## Core Principles

1. **El insight es un primitive, no una pantalla.** Insights y Chat son dos consumers del mismo reader canónico. Ningún consumer queryea `ico_ai_signal_enrichments` directo.
2. **Read parity primero, write gobernado después.** Slices 1–3 son lectura/navegación (bajo riesgo). El único write (Slice 4) pasa por propose→confirm→execute; el LLM nunca muta.
3. **El subject manda, no la superficie.** Toda lectura de insight desde el chat reusa el subject anti-oracle de los readers: cliente nunca ve; self-access por `memberId`; internos por route-group. La conversación no relaja la autorización.
4. **Degradación honesta heredada.** Los readers ya devuelven union honesto (`not_found|degraded|superseded|expired`). El chat reporta el estado real ("ese insight ya no está vigente / fue superado"), nunca inventa.
5. **Conciencia de superficie es contexto, no permiso.** `focusRef` le dice a Nexa qué mira el usuario; NO amplía lo que puede leer. El gate sigue siendo el subject + capability.
6. **El boundary ICO se respeta.** El bridge lee insights; no recalcula métricas ni escribe payroll/delivery. La acción gobernada de Slice 4 sobre un `recommendation` nunca toca `payroll_entries`/`compensation_versions`/`final_settlements`.

## Alternatives Considered

### Alternative A: Un `InsightChat` / superficie conversacional dedicada a insights
Rechazada. Viola la hard rule "no crear answer-surface/chat por dominio" (skill Nexa) y la decisión Nexa Core ("No domain-local Nexas"). Duplica runtime, evidencia, copy y autorización.

### Alternative B: Inyectar el corpus de insights al system prompt
Rechazada. No escala (N insights × período), rompe grounding (respuesta sin retrieval), y contradice el patrón SSOT-reader. El chat debe **recuperar** el insight vía tool, no memorizarlo.

### Alternative C: Que el chat queryee `ico_ai_signal_enrichments` directo
Rechazada. Viola SSOT-reader + el subject anti-oracle (re-implementar la autorización en otro callsite = bug class de over-exposure). El chat debe pasar por `readNexaInsightDrill`/`listNexaInsightsForPeriod`.

### Alternative D: Empezar por la acción gobernada (Slice 4) "para que se sienta potente"
Rechazada para V1. La relación se gana primero con lectura/navegación de bajo riesgo. El write sobre recommendations toca el boundary ICO y necesita su propio ADR + evidencia de runtime.

### Alternative E: Persistir la "relación" como una tabla puente nueva insight↔conversation
Rechazada. No hay necesidad de un nuevo primitive de persistencia: el thread ya guarda `tool_invocations` (qué insight se leyó) y `focusRef` viaja en runtime. La telemetría de turno (`nexa_turn_telemetry`) ya captura tools usados. Crear una tabla puente sería identidad paralela.

## Consequences

### Positive
- La conversación opera los insights por construcción (Full API Parity): cliente nuevo entra solo.
- Cierra el gap del North Star sin construir nada "Nexa-específico" — solo expone el reader existente como tool.
- Coherencia de autorización: una sola fuente de verdad del subject anti-oracle, reusada por ambas superficies.
- Habilita el "Nexa Moment" sobre delivery que la decisión Nexa Core anticipa (insight promotable a momento conversacional).

### Negative / Costs
- El system prompt crece (módulo de ruteo Insights vs OTD vs Knowledge); requiere bump de versión + golden snapshot + doc-gate.
- Slice 2 introduce el primer campo de conciencia de superficie en `runtimeContext` — hay que versionarlo con cuidado para no romper el contrato `NexaRuntimeContext`.
- La latencia del turno sube marginalmente cuando Nexa decide llamar `get_insight`/`list_insights` (una query PG extra, acotada por el subject).

### Neutral / Contextual
- `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` sigue siendo el contrato de la capa de insights; este bridge lo consume, no lo reemplaza.
- `get_otd` mantiene su comportamiento (top-3 signals del org); los tools nuevos son addressable/list, ortogonales.

## 4-Pillar + ICO Auditability scoring

| Pilar | Veredicto | Evidencia |
| --- | --- | --- |
| **Safety** | Fuerte | Reusa subject anti-oracle (cliente nunca ve; self-access por memberId); LLM solo lee en Slices 1–3; write solo en Slice 4 gobernado (propose→confirm→execute). `focusRef` es contexto, no permiso. |
| **Robustness** | Fuerte | Readers ya manejan union honesto (`not_found|degraded|superseded|expired`); tools degradan a gap honesto; insightId malformado → gap, no throw. |
| **Resilience** | Fuerte | Sin nuevo path async; degradación honesta heredada; si el reader cae, el chat lo dice. Cero mutación en V1 Slices 1–3. |
| **Scalability** | Fuerte | Un reader, N consumers; cliente/espacio nuevo entra data-driven (heredado de TASK-1171). Sin tabla nueva. |
| **Auditability (ICO)** | Fuerte | `nexa_messages.tool_invocations` registra qué insight se leyó; `nexa_turn_telemetry` registra tools usados; `focusRef` queda en el detalle del turno. Cada respuesta sobre un insight es reproducible desde el snapshot del enrichment. |

## Hard rules (anti-regresión)

- **NUNCA** crear un chat/answer-surface dedicado a insights — el chat es cliente del reader canónico.
- **NUNCA** queryear `ico_ai_signal_enrichments` (ni `ico_ai_signals`) directo desde un tool de Nexa — pasar por `readNexaInsightDrill` / `listNexaInsightsForPeriod` (subject anti-oracle).
- **NUNCA** dejar que `focusRef` amplíe lo que el subject puede leer — es contexto, el gate sigue siendo subject + capability.
- **NUNCA** que el LLM ejecute un write sobre un insight/recommendation — Slice 4 es propose→confirm→execute, mutación solo en el endpoint de confirmación humana.
- **NUNCA** una acción gobernada sobre un `recommendation` toca `payroll_entries`/`compensation_versions`/`final_settlements` ni recalcula métricas ICO (boundary ICO).
- **NUNCA** editar el system prompt inline en `nexa-service.ts` para enseñarle Insights — el módulo vive en `nexa-system-prompt.ts` versionado + golden snapshot + doc-gate.
- **SIEMPRE** emitir el deep-link de vuelta vía `buildNexaInsightDrillHref` (no componer `/nexa/insights/...` a mano).

## Related ADRs / Docs

- Architecture spec (este bridge): `GREENHOUSE_NEXA_INSIGHT_CONVERSATION_BRIDGE_V1.md`
- Consumes: `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- Parent direction: `GREENHOUSE_NEXA_CORE_AGENTIC_PLATFORM_DECISION_V1.md`
- Base principle: `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- Runtime: `GREENHOUSE_NEXA_ARCHITECTURE_V1.md`, `docs/architecture/nexa-intelligence/README.md`
- Action runtime: TASK-1137 (propose→confirm→execute)

## Revisit When

- Se aprueba Slice 4 (acción gobernada sobre insight) → requiere ADR propio por tier de autonomía.
- El contrato `NexaRuntimeContext` cambia de versión por `focusRef`.
- Un segundo dominio quiere ser "addressable" desde el chat de la misma forma (Finance AI signals, por ejemplo) → generalizar el patrón "domain-addressable reader tool".
- La telemetría muestra que Nexa rutea mal (llama `get_insight` cuando debía `get_otd`/`search_knowledge`, o viceversa).
