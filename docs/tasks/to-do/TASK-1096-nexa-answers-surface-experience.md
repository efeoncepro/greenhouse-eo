# TASK-1096 — Nexa Answers Surface Experience

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio-Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|nexa|ai|content|knowledge`
- Blocked by: `TASK-1095`
- Branch: `task/TASK-1096-nexa-answers-surface-experience`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir **Nexa Answers** como la surface contextual que transforma una UI existente en una experiencia conversacional embebida: idle limpio, pregunta como burbuja, Nexa pensando con contexto, respuesta answer-first, trust cue compacto, composer descendido, proof bajo demanda y follow-ups compactos. TASK-1095 provee el soporte de plataforma; esta task garantiza la coreografia producto/UI que el usuario debe experimentar.

## Arch Review Gate (2026-06-12)

Review de arquitectura (`docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_V2_ARCH_REVIEW.md` + Delta del ADR) detectó que esta task se construyó UI-first y forkeó contratos de TASK-1095. Antes de sumar más kinds/estados, reconciliar contra el contrato canónico:

- **A1 — consumir el `surfaceContext` SSOT de TASK-1095** (`src/lib/nexa/`), no el `NexaAnswersSurfaceContext` local. El `allowedRenderers`/`allowedActions` del canvas (buena idea de seguridad) se **mergea** al contrato canónico, no se mantiene como shape paralelo.
- **A2 — descomponer la máquina de estados del canvas.** Los 10 estados planos (`idle|submitted|thinking|streaming|answered|proofOpen|followup|compacted|degraded|error`) mezclan 3 dimensiones ortogonales: lifecycle (los 6 de 1095 + `error`, + restaurar `composing`), disclosure (`proofOpen`), turn (`followup`/`compacted`). Modelar el producto cartesiano, no un enum de 10. `streaming` se difiere hasta el follow-up de streaming (o se especifica su a11y ahí).
- **A5 — colapsar la explosión de kinds.** `NexaAnswerBubble` ~15 kinds (`financeChartAnswer`, `financeMetricSummary`, `commercialMetricSummary`, …`surfaceActionPlan`) = 4 variants × ~5 dominios sin consumer real. Colapsar a **4 variants** (`explanation|chart|metricSummary|actionPlan`) + **dominio como dimensión del `surfaceContext`** + resolver `kind→variant`. Diferir los kinds per-dominio hasta que cada dominio sea consumer real.
- **A6 — implementar el contrato a11y del answer-turn** que TASK-1095 define (live region sin robar foco al composer, proof top-layer, reduced-motion). GVC `quality.keyboard` cubre el proof disclosure + foco post-submit.

Esta task sigue `Blocked by: TASK-1095` — A1/A2/A6 dependen de que 1095 aterrice el contrato mínimo (types-only) primero.

## Why This Task Exists

TASK-1095 define la plataforma conversacional multi-surface: `surfaceContext`, adapters, runtime, provenance substrate y boundaries. Eso no garantiza por si solo la experiencia deseada. La experiencia que queremos lograr es una surface viva dentro de Knowledge, charts, Nexa Insights, Agency, Personas o Commercial que responde **ahi mismo**, sin convertir toda la app en chat y sin abrir un modal.

El riesgo actual es confundir tres conceptos:

- **Nexa Chat**: shell conversacional persistente/global.
- **Nexa Answers**: surface contextual embebida que aparece dentro de otra surface y transforma esa zona en una respuesta conversacional grounded.
- **Nexa AnswerTurn**: unidad interna de respuesta dentro de Nexa Answers.

Esta task existe para crear Nexa Answers como experiencia propia y consistente, no solo como rename de `NexaKnowledgeAnswerSurface`.

## Goal

- Definir y construir `NexaAnswersSurface` como surface contextual embebida.
- Garantizar la coreografia visual: idle -> submit -> question bubble -> Nexa identity/thinking -> answer -> trust cue -> composer below -> proof on demand -> compact follow-up.
- Usar Knowledge como primer consumer real porque estamos cerrando esa experiencia y es de bajo riesgo, preservando `/knowledge/mockup/answer-trace` como baseline/lab.
- Crear fixtures/specimens para Nexa Insight promoted y finance/chart context sin hacer rollout real de esos dominios.
- Documentar y verificar la experiencia con Design System + GVC.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_V2.md`
- `docs/architecture/GREENHOUSE_CONVERSATIONAL_EXPERIENCE_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_KNOWLEDGE_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ADAPTIVE_SIDECAR_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_FLOATING_SURFACE_DECISION_V1.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/architecture/ui-platform/HISTORIAL.md`
- `DESIGN.md`

Reglas obligatorias:

- Nexa Answers no es Nexa Chat. No debe crear historial global, rail de threads ni floating shell.
- Nexa Answers no es solo AnswerTurn. Es una surface contextual completa con composer, choreography, answer, trust cue, proof disclosure y follow-up.
- Nexa Answers debe consumir el soporte de TASK-1095 (`surfaceContext`, trust/provenance layers, AI moments map) y no duplicarlo.
- No crear chats por dominio. Knowledge, chart, insight, Agency, Person y Commercial aportan contexto; no fork de runtime/UI.
- No mostrar proof/retrieval cards por defecto arriba de la respuesta. La respuesta es protagonista; proof es bajo demanda.
- Mantener `showModeSelector` default `true` y `showTraceRail` default `false` en la compatibilidad existente de `NexaKnowledgeAnswerSurface` hasta que la facade defina otro contrato.
- `/knowledge/mockup/answer-trace` es baseline/lab visual; no borrar, no reemplazar, no degradar.
- Copy visible reutilizable vive en `src/lib/copy/*`; no hardcodear labels/aria/empty states repetibles.
- Toda UI visible debe pasar por skills de product design aplicables y GVC loop antes de cierre.

## Normative Docs

- `docs/tasks/to-do/TASK-1095-conversational-experience-v2.md`
- `docs/tasks/in-progress/TASK-1090-answer-trace-promotion-spec.md`
- `docs/tasks/in-progress/TASK-1089-nexa-knowledge-answer-surface.md`
- `docs/tasks/complete/TASK-1093-greenhouse-conversational-experience-platform-v1.md`
- `docs/tasks/complete/TASK-1085-nexa-knowledge-retrieval-citations.md`
- `docs/tasks/complete/TASK-947-nexa-insights-detail-page-canonical.md`
- `docs/tasks/complete/TASK-950-nexa-insights-list-page-canonical.md`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Dependencies & Impact

### Depends on

- `TASK-1095`: architecture/support contract for multi-surface conversational platform.
- `TASK-1090`: current Knowledge lenses WIP and approved AnswerSurface direction.
- `TASK-1089`: existing `NexaKnowledgeAnswerSurface` foundation.
- `TASK-1085`: Knowledge retrieval packet and citations for grounded answer examples.

### Blocks / Impacts

- Blocks final product-quality closure of Knowledge Nexa lens if TASK-1090 remains only structurally correct but not experientially polished.
- Provides the target surface for future child pilots: finance/chart insight explanation and Nexa Insight promoted conversation.
- Impacts UI platform docs and Design System specimens for Nexa conversational surfaces.

### Files owned

- `src/components/greenhouse/primitives/NexaKnowledgeAnswerSurface.tsx`
- `src/components/greenhouse/primitives/nexa-knowledge-answer-surface-controller.ts`
- `src/components/greenhouse/primitives/nexa-answer-bubble/NexaAnswerBubble.tsx`
- `src/components/greenhouse/primitives/nexa-answer-bubble/nexa-answer-bubble-controller.ts`
- `src/components/greenhouse/primitives/nexa-answer-bubble/nexa-answer-bubble-types.ts`
- `src/components/greenhouse/primitives/NexaEvidencePanel.tsx`
- `src/components/greenhouse/primitives/NexaComposer.tsx`
- `src/lib/copy/nexa.ts`
- `src/lib/copy/knowledge.ts`
- `src/views/greenhouse/knowledge/KnowledgeCenterView.tsx`
- `src/views/greenhouse/admin/design-system/NexaChatLabView.tsx`
- `scripts/frontend/scenarios/knowledge-answer-trace.scenario.ts`
- `scripts/frontend/scenarios/knowledge-lenses.scenario.ts`
- `scripts/frontend/scenarios/nexa-answers-surface.scenario.ts`
- `scripts/frontend/scenarios/design-system-nexa-chat.scenario.ts`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/ui-platform/PATTERNS.md`
- `docs/architecture/ui-platform/HISTORIAL.md`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/manual-de-uso/plataforma/knowledge-platform.md`

## Current Repo State

### Already exists

- `NexaKnowledgeAnswerSurface` already renders the approved Knowledge answer choreography foundation.
- `/knowledge/mockup/answer-trace` exists as visual baseline/lab.
- `/knowledge` WIP already has Humano/Nexa/MCP lenses and consumes the AnswerSurface in the Nexa lens.
- `NexaEvidencePanel` exists for proof/trace rendering.
- `NexaComposer` exists with inline follow-up variant foundation.
- TASK-1095 now defines the multi-surface platform direction, proposed ADR and architecture.

### Gap

- The product concept **Nexa Answers** is not named as the embedded contextual surface of record.
- Existing implementation still reads as Knowledge-specific.
- The choreography is not yet formalized as an executable UI contract with motion, layout, responsive, proof disclosure and follow-up compaction rules.
- Non-Knowledge examples are conceptual, not yet represented as Design System specimens/GVC fixtures.
- The relationship between Nexa Chat, Nexa Answers and Nexa Insights promotion is not visible enough in product UI specimens.

### Deep discovery — 2026-06-12

The desired experience is achievable from the current repo, but not by treating `NexaKnowledgeAnswerSurface` as a final product primitive:

- The current surface already proves the core movement: idle composer, user question bubble, Nexa identity, answer and composer descent. TASK-1096 should preserve that muscle memory.
- The current post-submit proof panel is too heavy for the final Nexa Answers default. TASK-1096 must introduce a compact trust cue first and keep expanded proof behind disclosure or an evidence lane.
- The name `NexaKnowledgeAnswerSurface` is a liability outside Knowledge. The recommended implementation is a `NexaAnswersSurface` facade that delegates to the existing component while the internals are generalized.
- Follow-up turns need a visible compacting rule. A second turn should not re-render a full proof payload or reset the surface into another first-answer card.
- Non-Knowledge specimens are mandatory before product rollout: `Nexa Insight promoted` and `finance/chart explanation` should exist as deterministic lab/GVC fixtures even if they do not call live domain readers.
- TASK-1096 must not create global history rail, thread navigation or floating chat chrome. Those belong to Nexa Chat.
- TASK-1096 must not invent `surfaceContext`. It consumes TASK-1095's contract and focuses on choreography, responsive behavior, copy, a11y, specimens and GVC.

### Slice progress — 2026-06-12

Foundation visual slice advanced:

- `NexaAnswersCanvas` is now a canonical primitive under `src/components/greenhouse/primitives/nexa-answers-canvas/`.
- Initial canvas modes: `renderPlan` and `runtime`. `renderPlan` consumes `nexa-answer-render-plan.v1`; `runtime` can host a headless/assistant-ui slot without forcing the canvas to own the model runtime.
- Initial canvas variants: `embedded`, `sidecar`, `inline`; initial kinds: `knowledgeEmbedded`, `financeChartEmbedded`, `agencyInsightEmbedded`, `peopleInsightEmbedded`, `commercialInsightEmbedded`, `custom`.
- Initial canvas states: `idle`, `submitted`, `thinking`, `streaming`, `answered`, `proofOpen`, `followup`, `compacted`, `degraded`, `error`.
- The canvas owns the UI choreography: idle composer glow, question bubble, Nexa identity/thinking, answer block, proof under demand, composer descent and compact previous turns.
- The first renderer registry supports `answerBubble` and `compactAnswer`, with allowlist validation from `surfaceContext.allowedRenderers`.
- `NexaAnswerBubble` is now a canonical primitive under `src/components/greenhouse/primitives/nexa-answer-bubble/`.
- Initial variants: `explanation`, `chart`, `metricSummary` and `actionPlan`.
- Initial kinds: `knowledgeExplanationAnswer`, `knowledgeChartAnswer`, `financeChartAnswer`, `financeMetricSummary`, `commercialMetricSummary`, `agencyMetricSummary`, `peopleMetricSummary`, `surfaceMetricSummary`, `financeActionPlan`, `commercialActionPlan`, `agencyActionPlan`, `peopleActionPlan`, `surfaceActionPlan`, `surfaceChartInsight`, `custom`.
- The chart variant uses a generic chart contract: `series[]`, `trend[]`, `composition[]`, `valueSuffix`.
- The chart variant renders three Recharts modes: `trend`, `comparison`, `composition`.
- The metric summary variant uses a compact KPI contract: 2-4 metrics, value, helper, semantic delta and mini trend. It is intended for Finance, Commercial, Agency and Personas when a big chart would overpower the conversational answer.
- Metric summary sparklines and chart variant series use the canonical chart palette (`GH_COLORS.chart.categorical`); semantic tones remain only for delta/status pills.
- The action plan variant uses a recommendation contract: suggested decision, steps, trade-offs, risks and product CTAs. It is intended for moments where Nexa proposes the next movement inside a surface instead of only explaining a signal.
- Action plan keeps evidence in the shared trust/proof row; source review is not duplicated as a primary CTA.
- Action plan visual contract is now canonicalized as a **decision brief**: thesis first, suggested decision, neutral grouped rows, horizontal dividers, restrained semantic dots/icons and no AI-ish side stripes or tinted alert-card stack.
- Action plan typography follows Greenhouse variants (`h6`, `body2`, `caption`), with operational copy in `body2`, moderate label weight and no inline font sizing.
- Action plan CTAs pass canonical `GreenhouseButton.kind` through `NexaAnswerAction.kind` (`primaryAction`, `secondaryAction`, `inlineAction`).
- `/knowledge/mockup/nexa-answers` now consumes `NexaAnswerBubble kind='knowledgeChartAnswer'` instead of owning a route-local bubble.
- `/knowledge/mockup/nexa-answers` now consumes `NexaAnswersCanvas` instead of locally assembling all answer states.
- `/design-system/nexa-chat` includes `data-capture='nexa-answer-bubble-chart-specimen'`, `data-capture='nexa-answer-bubble-metric-summary-specimen'`, `data-capture='nexa-answer-bubble-action-plan-specimen'` and `data-capture='nexa-answers-canvas-specimen'`.
- Latest accepted GVC for the action plan specimen: `.captures/2026-06-13T00-30-32_design-system-nexa-chat`.

This does **not** complete TASK-1096. Remaining scope still includes production Knowledge consumer integration, promoted Nexa Insight specimen, finance/chart fixture, assistant runtime/adapters from TASK-1095, final copy governance, follow-up compaction in real multi-turn runtime and GVC coverage for the complete surface.

Design implication:

1. Product name: `Nexa Answers`.
2. Internal unit: `Nexa AnswerTurn`.
3. Runtime/context substrate: TASK-1095.
4. First real consumer: Knowledge, deliberately chosen because it is low risk, read/explain oriented and already being completed.
5. First real non-Knowledge pilot: follow-up child task after specimens validate the pattern.

### UI-first visual prototype — 2026-06-12

Codex created a high-fidelity visual prototype before backend/runtime wiring:

- Route: `/knowledge/mockup/nexa-answers`
- View: `src/views/greenhouse/knowledge/mockup/nexa-answers/NexaAnswersExperienceMockupView.tsx`
- Scenario: `scripts/frontend/scenarios/nexa-answers-surface.scenario.ts`
- Latest GVC evidence: `.captures/2026-06-12T23-21-09_nexa-answers-surface`
- Design System evidence: `.captures/2026-06-12T23-19-53_design-system-nexa-chat`

The prototype is intentionally frontend-only and contract-aware. It uses typed fixtures that mirror the desired `surfaceContext`, answer-turn, trust cue and evidence packet shape without calling live Nexa runtime. It proves:

- idle composer without fake answer/proof,
- question bubble promotion,
- Nexa identity/thinking,
- answer-first response,
- compact trust cue,
- proof disclosure on demand,
- follow-up compaction with inherited evidence,
- Knowledge as the first real low-risk surface.

This visual does not replace `/knowledge/mockup/answer-trace`; that route remains the protected baseline/lab for the existing AnswerSurface.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Product UI contract for Nexa Answers

- Define `Nexa Answers` in UI platform docs as:
  - embedded contextual conversational surface,
  - not global chat,
  - not only answer-turn,
  - powered by `surfaceContext`.
- Update architecture/task docs if needed to align naming:
  - `Nexa Chat` = persistent/global shell.
  - `Nexa Answers` = contextual embedded surface.
  - `Nexa AnswerTurn` = internal unit of response.
- Produce a short Product UI ADR section or pattern entry in `ui-platform/PATTERNS.md`.

### Slice 1 — Component/facade strategy

- Introduce a canonical facade such as `NexaAnswersSurface` that delegates to `NexaKnowledgeAnswerSurface` initially, or rename only if mechanically safe.
- Preserve existing mockup and `/knowledge` props.
- Keep current compatibility defaults unless explicitly changed by the facade:
  - `showModeSelector` default `true`,
  - `showTraceRail` default `false`.
- Add types/props for core choreography states without leaking Knowledge-only naming.

### Slice 2 — Idle and submit choreography

- Implement the idle state:
  - clean contained surface,
  - minimal invitation,
  - composer as first focus,
  - no fake response,
  - no proof panel,
  - no trace rail.
- Implement submit transition:
  - user question becomes a bubble,
  - input does not feel lost,
  - Nexa identity appears after the question,
  - contextual subline reflects the host (`Knowledge`, selected chart, insight, etc.) when available.
- Ensure reduced-motion fallback.

### Slice 3 — Answer, trust cue and composer descent

- Render answer-first response below Nexa identity.
- Show compact trust cue after the answer, not before it.
- Move/fix composer below the answer as follow-up composer.
- Keep composer reachable and visually tied to continuation, not a new empty query.
- Define compact responsive behavior so long answers do not collapse the composer or overlap surrounding UI.

### Slice 4 — Proof disclosure and follow-up compaction

- Keep proof collapsed by default behind a clear affordance such as "Ver base de respuesta" or canonical copy.
- Expanded proof uses `NexaEvidencePanel` or approved proof renderer.
- Follow-up turns append in the same surface.
- Previous answer may compact into a summary/header when a second turn appears, preserving continuity without turning the surface into a heavy infinite transcript.
- Ensure keyboard/a11y for disclosure, composer, question bubbles and proof.

### Slice 5 — Reference consumers and specimens

- Knowledge: make `/knowledge` Nexa lens consume `NexaAnswersSurface` or its facade while preserving the common lens selector.
- Mockup: keep `/knowledge/mockup/answer-trace` as baseline/lab.
- Design System/lab: add specimens for:
  - idle,
  - submitted/thinking,
  - answered with trust cue,
  - proof expanded,
  - follow-up compacted,
  - Nexa Insight promoted,
  - finance/chart fixture.
- Do not ship real finance/agency/person/commercial rollout in this task.

### Slice 6 — GVC and documentation closure

- Add/update GVC scenarios:
  - `knowledge-answer-trace`,
  - `knowledge-lenses`,
  - `nexa-answers-surface` or equivalent repeatable specimen scenario.
- Capture desktop and mobile.
- Inspect frames manually for text fit, overlap, choreography clarity and proof collapsed/expanded states.
- Update docs and handoff with final product contract.

## Out of Scope

- No real finance/chart product rollout beyond fixtures/specimens.
- No real Agency/Person/Commercial product rollout.
- No new model provider, retrieval backend or production flag flip.
- No global Nexa Chat redesign.
- No sidecar lane C implementation.
- No autonomous `draft`/`execute` actions; V1 is read/explain/suggest.
- No deletion/replacement of `/knowledge/mockup/answer-trace`.

## Detailed Spec

### Target experience narrative

Nexa Answers is a live surface inside the page. It does not pull the user into a modal. It does not replace the whole product with chat. It turns a local product moment into a grounded conversational answer.

#### State 0 — Quiet

The surface is calm. It has a minimal invitation and a composer.

```text
Nexa Answers

Preguntale a Nexa sobre esto

[ Que quieres entender?                         Up ]
```

Rules:

- no response examples,
- no proof,
- no trace,
- no loading,
- no cards above the composer.

#### State 1 — Question takes place

After submit, the user question appears as a bubble. The interface acknowledges the intent before Nexa answers.

```text
                         Por que cayo esto?

Nexa esta revisando el contexto...
```

Rules:

- input value becomes visible as durable question,
- keyboard focus remains recoverable,
- no layout jump that hides the question.

#### State 2 — Nexa appears

Nexa identity enters with a subtle thinking beat and contextual subline.

```text
Nexa
Revisando margen - mayo 2026
...
```

Rules:

- one thinking signal,
- no duplicate skeletons/spinners,
- contextual subline uses safe `surfaceContext` labels only.

#### State 3 — Answer expands the surface

The answer appears below Nexa. The surface grows naturally.

```text
La caida viene principalmente de tres factores...

Lo revisaria en este orden:
1. Validar revenue del periodo
2. Comparar costos directos
3. Confirmar imputacion por servicio

Basado en 3 senales - datos de mayo
```

Rules:

- answer first,
- trust cue after answer,
- next step/action when useful,
- proof remains collapsed.

#### State 4 — Composer descends

The composer appears below the answer as continuation.

```text
[ Quieres comparar contra abril?                Up ]
```

Rules:

- follow-up composer is visually connected to the answer,
- placeholder suggests continuation when context exists,
- composer does not overlap proof or actions.

#### State 5 — Proof on demand

Proof opens only when requested.

```text
Ver base de respuesta

Fuentes
- Margen neto - mayo 2026
- Costos directos por servicio
- finance_ai_enrichment

Limitaciones
- No hay drilldown disponible para abril
```

Rules:

- proof explains sources, freshness, limitations and feedback target,
- proof is accessible and collapsible,
- no raw private records.

#### State 6 — Follow-up

Follow-up appends without resetting the surface. Previous content can compact.

```text
Por que cayo esto?
Nexa - respuesta anterior compactada

                         Comparalo con abril

Nexa
Contra abril, la diferencia principal...

Basado en 4 senales - abril vs mayo

[ Pregunta algo mas...                          Up ]
```

Rules:

- continuity preserved,
- previous turn does not become noisy,
- proof continuity stays available but not reprinted,
- surface remains readable on mobile.

### Choreography contract

```text
Idle
  -> User submits
  -> Question bubble appears
  -> Nexa identity enters
  -> Thinking beat
  -> Answer appears
  -> Trust cue settles
  -> Composer moves below
  -> Proof remains collapsed
  -> Follow-up appends compactly
```

### Visual principles

- The surface should feel embedded in the host page, not like a detached app card.
- The answer is the protagonist.
- Evidence is a trust support, not the main body.
- The composer is the continuation mechanism.
- Motion is subtle and optional; reduced motion must preserve meaning.
- Mobile is not a compressed desktop: proof, composer and follow-up must remain reachable.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (product UI contract) -> Slice 1 (facade/component strategy) -> Slice 2 (idle/submit) -> Slice 3 (answer/composer) -> Slice 4 (proof/follow-up) -> Slice 5 (consumers/specimens) -> Slice 6 (GVC/docs).
- Slice 5 must not start before Slice 1 is stable, otherwise Knowledge will bind directly to a transitional component name again.
- Do not run broad visual changes concurrently with TASK-1090 in the same files without coordinating WIP/staging paths.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Nexa Answers se reduce a un answer-turn y pierde surface/composer | UI platform | medium | Explicit facade + specimens for idle/composer/proof/follow-up | DS/GVC shows only a message card |
| Knowledge baseline se rompe | Knowledge UI | medium | Preserve mockup route + GVC `knowledge-answer-trace` | Visual diff or missing route |
| Proof vuelve a dominar la conversacion | Product UX | medium | Collapsed-by-default proof + answer-first acceptance criteria | GVC shows proof above or competing with answer |
| Layout shifts/overlaps on mobile | UI responsive | medium | Stable dimensions, mobile GVC, text-fit review | clipped composer/proof/buttons |
| Follow-up becomes infinite noisy transcript | Product UX | medium | Previous-turn compaction rules | second turn makes surface unreadable |
| Domain fixture leaks raw context | Security/privacy | low-medium | Use safe refs only; fixtures synthetic/sanitized | fixture contains raw payroll/finance/HubSpot payload |

### Feature flags / cutover

- Prefer additive facade and specimen work without a production flag.
- If replacing `/knowledge` runtime behavior in a way that can regress TASK-1090, gate the consumer switch behind an existing local WIP guard or add a small reversible constant.
- No production retrieval flag changes in this task.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Revert docs/pattern additions | <10 min | si |
| Slice 1 | Remove facade or point consumers back to existing `NexaKnowledgeAnswerSurface` | <15 min | si |
| Slice 2 | Revert idle/submit choreography changes | <15 min | si |
| Slice 3 | Revert answer/composer layout changes | <15 min | si |
| Slice 4 | Revert proof/follow-up enhancements to previous proof panel behavior | <15 min | si |
| Slice 5 | Revert consumer/specimen wiring; mockup route remains | <15 min | si |
| Slice 6 | Revert scenario/doc changes | <10 min | si |

### Production verification sequence

1. Run focal ESLint for touched Nexa Answers/Knowledge/Design System files.
2. Run focal Vitest for `NexaKnowledgeAnswerSurface`/facade, controller, proof panel and copy helpers.
3. Run `pnpm exec tsc --noEmit --pretty false`.
4. Run `pnpm design:lint`.
5. Run GVC desktop/mobile for Knowledge baseline, Knowledge lenses and Nexa Answers specimen.
6. Manually inspect GVC frames for idle, submitted, thinking, answered, proof expanded, follow-up compacted.
7. Run `pnpm task:lint --task TASK-1096`, `pnpm ops:lint --changed`, `pnpm docs:closure-check` and `git diff --check`.

### Out-of-band coordination required

- Product review required before declaring the choreography final.
- No external platform coordination.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Nexa Answers` is documented as the embedded contextual conversational surface, distinct from Nexa Chat and AnswerTurn.
- [ ] A canonical component/facade exists or the existing component is explicitly documented as the temporary implementation of Nexa Answers.
- [ ] Idle state is clean: composer/invitation only, no fake answer, no proof, no trace.
- [ ] Submit choreography renders question bubble before Nexa identity/thinking.
- [ ] Answer state renders answer-first, then compact trust cue, then follow-up composer below.
- [ ] Proof is collapsed by default and available on demand through an accessible disclosure.
- [ ] Follow-up turns append without resetting the surface and previous content can compact.
- [ ] Knowledge Nexa lens consumes the surface without showing the internal mode selector when the common lens selector owns mode.
- [ ] `/knowledge/mockup/answer-trace` remains available and visually protected.
- [ ] Design System/specimens show idle, thinking, answered, proof expanded, follow-up compacted, Nexa Insight promoted and finance/chart fixture states.
- [ ] GVC evidence covers desktop/mobile and no text overlaps/clips in the target states.

## Verification

- `pnpm exec eslint src/components/greenhouse/primitives/NexaKnowledgeAnswerSurface.tsx src/components/greenhouse/primitives/NexaEvidencePanel.tsx src/components/greenhouse/primitives/NexaComposer.tsx src/views/greenhouse/knowledge/KnowledgeCenterView.tsx src/views/greenhouse/admin/design-system/NexaChatLabView.tsx`
- `pnpm vitest run src/components/greenhouse/primitives/__tests__/NexaKnowledgeAnswerSurface.test.tsx src/components/greenhouse/primitives/__tests__/NexaComposer.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm fe:capture knowledge-answer-trace --env=local`
- `pnpm fe:capture knowledge-lenses --env=local`
- `pnpm fe:capture nexa-answers-surface --env=local`
- `pnpm task:lint --task TASK-1096`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- `git diff --check`

## Closing Protocol

- Move this file to `docs/tasks/complete/` and change `Lifecycle` to `complete`.
- Update `docs/tasks/README.md` and `docs/tasks/TASK_ID_REGISTRY.md`.
- Update `docs/architecture/ui-platform/PATTERNS.md`, `PRIMITIVES.md` and `HISTORIAL.md` with the final Nexa Answers contract.
- Update `Handoff.md`, `project_context.md` and `changelog.md`.
- Invoke `greenhouse-documentation-governor` and run `pnpm docs:closure-check`.
- Leave or create the child follow-up for the first real non-Knowledge pilot, defaulting to finance/chart insight explanation.
