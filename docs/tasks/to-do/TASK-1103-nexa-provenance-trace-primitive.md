# TASK-1103 — `NexaProvenanceTrace` primitive (SoT del grounding de Nexa)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|platform|nexa|content|knowledge`
- Blocked by: `TASK-1095` (contrato provenance/trust SSOT) · coordinar con `TASK-1089` (Answer Trace) y `TASK-947` (Nexa Insights drill)
- Branch: `task/TASK-1103-nexa-provenance-trace-primitive`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Unificar en **una sola primitive de procedencia** (`NexaProvenanceTrace`) las piezas hoy dispersas que comunican *por qué confiar en una respuesta de Nexa*: **trust cue compacto**, **reasoning trace** (pasos done/active/pending), **proof panel** (evidencia bajo demanda) y **citas** (`NexaCitationSource`). Hoy viven repartidas entre `NexaAnswerBubble` (trustCue), `NexaAnswersCanvas` (`NexaReasoningTrace`, `CanvasProof`), `NexaEvidencePanel` y `NexaCitationMarker`. Diseñar la primitive canónica (protocolo Primitive+Variants+Kinds) con variants `inline`/`expandable`/`panel` + kinds `knowledgeGrounded`/`signalPromoted`/`computed`, para que Answer Trace (TASK-1089), Nexa Insights (TASK-947) y el canvas la consuman sin forkear.

## Why This Task Exists

El *grounding* de Nexa es el activo de confianza de la plataforma, pero su UI está fragmentada: cada surface compone su propia mezcla de trust cue + razonamiento + proof + citas. Eso produce drift visual y de a11y (cada una con su `aria-live`, su disclosure, su tono) y duplica el contrato del `ConversationalEvidencePacket` (TASK-1093). A medida que el grounding aparece en más surfaces (Knowledge, Finance, Agency Insights, Answer Trace), la ausencia de una primitive SoT garantiza divergencia. Esta task crea la primitive canónica de procedencia — el "cómo se muestra que esto está fundamentado" — una sola vez.

## Goal

- Diseñar `NexaProvenanceTrace` como primitive canónica en `src/components/greenhouse/primitives/` (barrel + Lab + GVC + ADR si es platform-level).
- **3 variants** (comportamiento, no skins): `inline` (trust cue compacto, una línea), `expandable` (reasoning trace desplegable + descartados), `panel` (proof completo con evidencia + citas).
- **Kinds → variant** semánticos: `knowledgeGrounded` (citas + fuentes), `signalPromoted` (señal ICO/finance promovida → trazabilidad del signal), `computed` (derivado de readers, sin fuente externa).
- Consumir el `ConversationalEvidencePacket` (TASK-1093) como input canónico; cero recomputación en consumers.
- a11y horneada: un solo contrato `aria-live`/disclosure/reduced-motion por variant; el reasoning trace no roba foco.
- Migrar el canvas + Answer Trace + Insights a consumir la primitive (deprecar las piezas dispersas gradualmente).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — DEPENDENCIES & IMPACT
     ═══════════════════════════════════════════════════════════ -->

## Dependencies & Impact

**Depende de:**
- `TASK-1095` — contrato provenance/trust cue SSOT (substrate). La primitive es la *vista* de ese contrato.
- `TASK-1093` (complete) — `ConversationalEvidencePacket` + `NexaEvidencePanel` compartido + rehidratación. Input canónico.
- `TASK-1085`/`TASK-1083` (complete) — `knowledge-search.v1` (chunks/score/freshness/denied) como fuente del grounding de Knowledge.

**Coordinar (no duplicar):**
- `TASK-1089` (in-progress, Codex) — Answer Trace surface: su "trace/proof lateral" es exactamente la variant `expandable`/`panel` de esta primitive. Definir boundary: Answer Trace **consume** `NexaProvenanceTrace`, no construye su propio trace.
- `TASK-947` (complete) — Nexa Insights drill (`/nexa/insights/[id]`): la trazabilidad del signal (`EO-AIS`) es el kind `signalPromoted`.

**Archivos owned (nuevos):**
- `src/components/greenhouse/primitives/nexa-provenance-trace/` (componente + types + controller `kind→variant` + barrel export).
- Lab interno `/admin/design-system/nexa-provenance` (gate `administracion.design_system` + route-reachability + scenario GVC).

**Archivos que migran a consumir la primitive (deprecación gradual):**
- `src/components/greenhouse/primitives/nexa-answers-canvas/NexaAnswersCanvas.tsx` (`NexaReasoningTrace`, `CanvasProof`).
- `src/components/greenhouse/primitives/nexa-answer-bubble/NexaAnswerBubble.tsx` (trustCue rendering).
- `NexaEvidencePanel` (componer dentro de la variant `panel`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — DETAILED SPEC
     ═══════════════════════════════════════════════════════════ -->

## Detailed Spec

> Protocolo Primitive+Variants+Kinds COMPLETO (CLAUDE.md): a11y/responsive/reduced-motion horneados, cero hardcode (solo tokens), Lab interno alcanzable por nav + route-reachability, evidencia GVC desktop+mobile, referencia al nodo AXIS, contrato en `ui-platform/PRIMITIVES.md` + ADR (es platform-level: toca el grounding de Nexa cross-surface).

### Slice 0 — Contrato + types

- `NexaProvenanceTraceProps` con `variant`, `kind`, `evidence: ConversationalEvidencePacket`, `reasoningSteps?`, `citations?`, slots de acción.
- Resolver `kind→variant` idempotente (`resolveNexaProvenanceVariant`).
- Reusar `NexaCitationSource` (TASK-1096) + `NexaAnswersReasoningStep`.

### Slice 1 — Variant `inline` (trust cue compacto)

- Una línea: tono (success/warning/info) + label + detail. Reemplaza el `trustCue` rendering de `NexaAnswerBubble`.
- Honest degradation: `confidence='none'` → "sin fuente publicada" (no inventar confianza).

### Slice 2 — Variant `expandable` (reasoning trace)

- Pasos progresivos (done/active/pending) + los descartados (`deniedOrFilteredCount`: "evalué 7, cité 3, descarté 2 por política").
- Disclosure (`details`/controlled) sin robar foco; `aria-expanded`/`aria-controls`.

### Slice 3 — Variant `panel` (proof completo)

- Compone `NexaEvidencePanel` (TASK-1093) + las citas con evidence-peek (`NexaCitationMarker`).
- Es el "proof bajo demanda" canónico del canvas (`CanvasProof` migra a esto).

### Slice 4 — Kinds + migración de consumers

- `knowledgeGrounded` / `signalPromoted` / `computed` mapeados a variants + tono.
- Migrar `NexaAnswersCanvas` + `NexaAnswerBubble` a consumir la primitive (deprecar `NexaReasoningTrace`/`CanvasProof` co-located). Coordinar con TASK-1089 para Answer Trace.

### Slice 5 — Lab + GVC + docs

- Lab `/admin/design-system/nexa-provenance` con los 3 variants × 3 kinds.
- GVC desktop+mobile + ADR + `ui-platform/PRIMITIVES.md` + catálogo `/admin/design-system`.

## Verification

- `pnpm local:check` + `pnpm test` verde.
- GVC del Lab (variants × kinds) desktop+mobile, 0 findings, a11y (disclosure + reduced-motion + foco).
- Consumers migrados sin regresión visual (GVC diff del canvas antes/después).
- Drift-guard: el packet es la única fuente; cero recomputación en consumers.

## Out of Scope

- Cambios al backend del grounding (`searchKnowledge`, packet): ya existen.
- Rollout de signalPromoted en finance/agency real: solo el contrato del kind.

## Notas de origen

Propuesta P1 de la sesión TASK-1096 (2026-06-13). Piezas dispersas hoy: `NexaReasoningTrace`/`CanvasProof` (canvas), trustCue (`NexaAnswerBubble`), `NexaEvidencePanel`, `NexaCitationMarker`.
