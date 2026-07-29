# TASK-1531 — Globe Creative Prompt Studio

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1531`
- Product Design asset: `docs/ui/visual-directions/TASK-1531-globe-creative-prompt-studio-direction.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: Globe Producer operators on desktop and mobile
- Copy source: `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- Primitive decision: `extend` — Producer prompt bar + enhancement proposal into Creative Prompt Workbench
- UI ready target: `yes`

## Brief

- Primary user: operador creativo que quiere elevar una idea sin aprender sintaxis por modelo.
- User moment: antes de estimar/generar, con modalidad y ruta seleccionadas.
- Job to be done: comprender qué entendió el agente, revisar una propuesta compatible con el target y decidir.
- Primary decision signal: intención fiel, restricciones preservadas, cambios claros y warnings honestos.
- Non-goals: chat, elección de enhancer LLM, generación automática o edición manual del system prompt.

## Desktop Target — 1440×1000

El CTA `Mejorar` se transforma en `Analizando…` sin moverse. Bajo el textarea aparece un workbench inline con
header de estado/target, una “lectura creativa” de una línea y dos regiones: original compacto y propuesta editable
en preview. Una rail de decisiones enumera composición/atmósfera/cámara/ritmo u otras categorías aplicables,
separando aportado, derivado e inferido. Las acciones `Usar propuesta`, `Ajustar original` y `Descartar` cierran la
superficie. Warnings permanecen junto a la decisión afectada.

## Mobile Target — 390×844

El workbench usa una sola columna. El original se resume con disclosure; intención y propuesta permanecen visibles.
La rail se convierte en lista compacta y las acciones se apilan con targets de 44 px. El foco y scroll llevan a la
propuesta sin saltos de layout; no hay comparación side-by-side.

## Action Hierarchy

- Primary: `Mejorar`; luego `Usar propuesta`.
- Secondary: `Ajustar original` devuelve foco al textarea sin perder la propuesta.
- Tertiary: `Ver qué cambió` y `Descartar`.
- Destructive: none.
- Selection vs action: cambiar target invalida la propuesta, nunca la acepta.
- Pending/disabled: single-flight por fingerprint; cancelar visual no afirma cancelar server.

## Visual Fidelity Mapping

| Direction cue | Globe mapping | Intent preserved | Rejected literal |
|---|---|---|---|
| Editorial workbench | Producer Console prompt surface extendida | Fuente→interpretación→propuesta | Card wall |
| Creative read | Inline semantic summary | Confianza sin chain-of-thought | “AI reasoning” transcript |
| Target lens | Capability chip existente | Compatibilidad client-safe | Provider wire slug |
| Preservation rail | Status/list primitives | Aportado vs inferido vs warning | Score mágico |
| One-surface comparison | Dividers + density tokens | Revisión sin modal | Split estrecho mobile |

## Layout Skeleton

| Region | Purpose | Component candidate | Data source |
|---|---|---|---|
| Prompt source | Mantener original editable | `#producer-prompt` | browser state |
| Analyze control | Start/pending/retry | capability button | command state |
| Workbench header | Status + target lens | enhancement container | proposal evidence |
| Creative read | Intención resumida | semantic summary | `intentSummary` |
| Proposal | Output revisable | proposal preview | `proposal` |
| Decision rail | Preserved/inferred/warnings | compact evidence list | structured outcome |
| Actions | Accept/edit/reject | capability buttons | governed commands |
| Live region | Announce causal state | existing live region | controller state |

## Copy Ledger

| Copy id | Text | Dynamic values |
|---|---|---|
| `producer.creativePrompt.action` | `Mejorar` | none |
| `producer.creativePrompt.pending` | `Analizando intención y modelo…` | none |
| `producer.creativePrompt.slow` | `Está tomando más tiempo de lo habitual.` | none |
| `producer.creativePrompt.reading` | `Entendimos que buscas:` | none |
| `producer.creativePrompt.target` | `Preparado para {target}` | `target` |
| `producer.creativePrompt.proposal` | `Propuesta creativa` | none |
| `producer.creativePrompt.changes` | `Qué optimizó el agente` | none |
| `producer.creativePrompt.preserved` | `Restricción preservada` | none |
| `producer.creativePrompt.inferred` | `Decisión sugerida` | none |
| `producer.creativePrompt.accept` | `Usar propuesta` | none |
| `producer.creativePrompt.editSource` | `Ajustar original` | none |
| `producer.creativePrompt.reject` | `Descartar` | none |
| `producer.creativePrompt.retry` | `Reintentar` | none |

## State Copy

| State | Title | Body | Recovery |
|---|---|---|---|
| ready | `Mejorar` | `El agente adaptará tu idea al modelo elegido.` | action |
| loading | `Analizando intención y modelo…` | `Puedes seguir revisando la configuración.` | none |
| empty | `Escribe una idea primero` | none | focus textarea |
| partial | `Propuesta con decisiones por revisar` | warnings visibles | accept/edit/reject |
| error | `No pudimos preparar la propuesta` | mensaje canónico + correlation id | retry |
| denied | `Creative Prompt Engineer no habilitado` | razón de capability/policy | none |

## Accessibility Contract

- Heading order contextual dentro del composer.
- Chart/table alternatives: not applicable.
- Labels completos para disclosure, provenance y acciones.
- No se roba foco al completar; live region anuncia y ofrece navegación a proposal heading.
- Aceptar/descartar devuelve foco al textarea; error devuelve foco al retry.
- Estado y provenance usan texto/icono, nunca color únicamente.

## Implementation Mapping

- Route/surface: `/producer`; `../efeonce-globe/apps/studio-web`.
- Primitives: prompt field, capability button, inline enhancement container, chips, disclosure y live region.
- Decision: extend; registrar `Creative Prompt Workbench` como Producer pattern, no platform primitive global.
- Components: `producer-ui.ts`, `producer-controller.ts`, `producer-client.ts`.
- Copy: `producer-copy.ts`.
- Commands/readers: `globe.lab.prompt.enhance`, `.enhancement.accept`, `.enhancement.reject`, `.prompt.history`.
- API parity: consume outcomes TASK-1530; cero perfiles o interpretación en browser.
- Access: capability/grant actuales, fail-closed.
- GVC markers: `creative-prompt-source`, `creative-prompt-pending`, `creative-prompt-workbench`,
  `creative-prompt-decisions`, `creative-prompt-warning`, `creative-prompt-actions`.

## GVC Scenario Plan

- Scenario: `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs`
- Route: `/producer?gvc=task-1531-creative-prompt-studio`
- Viewports: desktop `1440×1000`; mobile `390×844`.
- Quality profile: `premium`
- Steps: minimal prompt→pending→ready→inspect changes→edit source→rerun→accept; partial, denied, timeout/error,
  target change and stale response.
- Captures: ready, pending, slow, proposal, warnings expanded, accepted, error; desktop/mobile.
- Markers: todos los de Implementation Mapping.
- Assertions: original intacto, provenance visible, dedupe, stale ignored, no provider internals.
- Scroll-width: `scrollWidth === clientWidth`.
- Accessibility/focus: keyboard, live region, focus restore, 200% zoom and reduced effects.
- Review dossier: `required`
- Baseline surface ID: `globe.creative-producer-surface`; promote TASK-1531 delta after first-fold approval.

## Design Decision Log

- Decision: Editorial Workbench inline.
- Alternatives considered: invisible polish and conversational copilot.
- Why: makes expertise and uncertainty legible while preserving prompt-first continuity.
- Reuse/extend/new: extend existing Producer pattern; no modal/chat/new global primitive.
- Open risks: information overload, long outputs, latency and provenance terminology.

## Acceptance Checklist

- [x] Direction compares three alternatives and selects one.
- [x] Desktop/mobile composition is explicit.
- [x] Copy, states, accessibility and provenance are specified.
- [x] Implementation mapping and GVC premium plan are complete.
- [x] Original remains authoritative until explicit accept.
