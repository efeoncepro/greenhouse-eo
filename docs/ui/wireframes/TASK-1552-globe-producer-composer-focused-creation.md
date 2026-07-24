# TASK-1552 — Globe Producer Composer Focused Creation

## Meta

- Status: `ready-for-implementation`
- Owner task: `TASK-1552`
- Product Design asset: `docs/ui/visual-directions/TASK-1552-globe-producer-composer-focused-creation.md`
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: Globe Producer operators on desktop and mobile
- Copy source: `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- Primitive decision: `extend` — existing Producer Console/composer patterns
- UI ready target: `no`

## Brief

Reducir la carga visual del composer sin eliminar capacidades existentes. La experiencia debe priorizar `prompt → output shape → generar`, relegando modelo, seed, provenance y controles avanzados a progressive disclosure. El costo no se oculta ni se duplica: TASK-1532 conserva el estimate dentro del CTA único.

## Desktop target — 1440×1000

```text
┌──────────────────────────────┬────────────────────────────────────┐
│ Crear imagen                 │ Mis generaciones                   │
│                              │                                    │
│ ¿Qué quieres crear?         │ Filtros · Buscar · Ordenar          │
│ [ prompt grande           ]  │                                    │
│   Mejorar · referencias     │ Feed / resultados                   │
│                              │                                    │
│ Explorar dirección           │                                    │
│ [Editorial] [Producto]      │                                    │
│                              │                                    │
│ Formato                      │                                    │
│ [1:1] [4:5] [16:9] [9:16]  │                                    │
│                              │                                    │
│ Ajustes avanzados            │                                    │
│ Modelo recomendado · Seed   │                                    │
│                              │                                    │
│ [ Generar · 10 créditos ]   │                                    │
└──────────────────────────────┴────────────────────────────────────┘
```

## Mobile target — 390×844

- Header y modalidad permanecen accesibles.
- Prompt ocupa el primer bloque.
- Dirección, formato y CTA siguen en una columna.
- Ajustes avanzados se abren inline o como sheet temporal sólo si el patrón existente lo exige.
- CTA tiene target mínimo 44 px y no genera overflow horizontal.

## State and copy inventory

- Default: `¿Qué quieres crear?` con prompt vacío y dirección disponible.
- Prompt entered: acciones `Mejorar` y referencias sólo si la ruta las admite.
- Ready estimate: reutiliza TASK-1532, `Generar · {credits} créditos`.
- Stale estimate: `Generar`; el mismo CTA resuelve el estimate.
- Estimating/preparing/running: reutiliza estados de TASK-1532.
- Invalid: causa concreta junto al campo afectado.
- Gated modality: capacidad visible con estado honesto, sin controles falsamente activos.
- No references: no renderizar un panel vacío dominante; mostrar ayuda contextual cerca de la selección de ruta.
- Advanced open: disclosure persistente durante la sesión, sin convertirlo en modo obligatorio.

## Implementation Mapping

- Route/surface: `/producer` en `../efeonce-globe/apps/studio-web`.
- Pattern: existing Producer Console/composer; no new Greenhouse primitive.
- Components: `producer-ui.ts`, `producer-controller.ts`, `producer-copy.ts`, `producer-client.ts` y estilos existentes del Producer.
- Readers/commands: contratos actuales de catálogo, estimate, prepare/generate y provenance; no endpoint nuevo.
- API parity: browser sólo presenta DTOs y consume comandos/readers gobernados.
- Access: capabilities y grants actuales; no cambio de autorización.
- Copy: `producer-copy.ts`; no copy reusable nueva en el componente.
- Data-capture: `producer-composer`, `producer-prompt`, `producer-direction`, `producer-output-shape`, `producer-advanced-settings`, `producer-generate-primary`.

## GVC Scenario Plan

- Scenario file: `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs` y scenario Producer existente.
- Route: `/producer?gvc=task-1552-focused-composer`.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`.
- Required steps: initial Image, Video and Audio modality; prompt entered; direction selection; advanced disclosure; route without references; stale estimate; one-click generate; keyboard; reduced motion.
- Required captures: first fold, advanced collapsed/open, each modality, invalid/gated, ready/stale CTA and mobile recomposition.
- Assertions: one primary action, no manual estimate action, no duplicated cost line, no empty references panel as dominant content, no provider slug/vendor cost/margin in DOM, no horizontal overflow.
- Scroll-width checks: `document.documentElement.scrollWidth === document.documentElement.clientWidth` at both viewports.
- Reduced-motion/focus evidence: focus remains deterministic through disclosure and CTA state transitions.
- Review dossier: `.captures/<run>/review/`.
- Baseline decision / surface ID: `globe.creative-producer-surface`, delta after first-fold acceptance.

## Design Decision Log

- Decision: Focus + Context sidecar with progressive disclosure.
- Alternatives: technical compact composer; centered modal composer.
- Why this pattern: preserves the approved prompt-first Producer loop while reducing visual competition and retaining advanced capability access.
- Reuse/extend/new primitive: extend existing Globe Producer patterns; no parallel design system or Greenhouse primitive.
- Cost decision: TASK-1532 remains authoritative; cost is visible only through the existing CTA/status contract, never hidden or duplicated as a separate section.
- Open risks: the approved source-led baseline may contain controls that need honest gated states; mobile sheet behavior must reuse the existing Globe pattern if advanced settings exceed the fold.

## Visual Verification

- Before/after evidence: current Producer composer versus focused composer at desktop/mobile.
- Required captures: first fold and state matrix above.
- Accessibility: labels, focus ring, keyboard disclosure, live state announcements and 44 px targets.
- Visual scorecard: `docs/ui/reviews/TASK-1552-globe-producer-composer-focused-creation.scorecard.json`.
- Threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/generic-template resistance >= 4.5`.
