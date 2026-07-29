# TASK-1571 — Globe Image Focus + Compare Canvas

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Visual direction: `docs/ui/visual-directions/TASK-1571-globe-image-focus-compare-direction.md`
- Wireframe: `docs/ui/wireframes/TASK-1571-globe-image-focus-compare-canvas.md`
- Flow: `docs/ui/flows/TASK-1571-globe-image-focus-compare-canvas-flow.md`
- Motion: `docs/ui/motion/TASK-1571-globe-image-focus-compare-canvas-motion.md`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|creative|product`
- Blocked by: `TASK-1559`
- Branch: `task/TASK-1571-globe-image-focus-compare-canvas`

## Summary

Evoluciona el feed/viewer real de Globe hacia una experiencia premium de revisión de imágenes. El trabajo extiende el dialog y `MediaStage` existentes con un `Image Focus Canvas` —zoom, pan, ajustar, tamaño real, navegación, selección y focus restoration— y agrega compare únicamente cuando TASK-1498 entrega una relación de lineage real. No crea otro feed ni una galería paralela.

## Why This Task Exists

La auditoría Playwright de `/producer` encontró un feed funcional con 23 piezas, cards de imagen con media cover de aproximadamente 311×176 y un viewer nativo con stage aproximado de 750×750 más inspector de 416px. El viewer ya tiene una base sólida, pero no ofrece zoom, pan, ajuste, tamaño real, navegación ni compare. En 390px el layout no tiene overflow y el composer ocupa deliberadamente el primer tramo largo; la mejora debe conservar esa composición.

## Goal

- Darle a cada imagen un momento de revisión de nivel editorial sin perder el contexto del Producer.
- Permitir inspección visual precisa y acciones existentes con teclado, focus restoration y reduced motion.
- Hacer compare útil y honesto: sólo para variantes relacionadas por el reader de lineage, nunca por proximidad o inferencia de cliente.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

Reglas obligatorias:

- Globe es un producto comercial y la calidad objetivo es productiva aunque el rollout sea internal-only.
- Extender el shell, viewer y `MediaStage` actuales; no crear una superficie de galería paralela.
- Consumir `image.card-thumb@1`, `image.viewer-preview@1`, `governed-media` y el reader de TASK-1498.
- No agregar endpoints, retrieval, autorización, lineage ni inferencia de relación en React.
- Usar `<dialog>` nativo, nombres accesibles, focus restoration, `prefers-reduced-motion` y primitives existentes.

## Dependencies & Impact

### Depends on

- `TASK-1559` — ownership y continuidad del feed/viewer React.
- `TASK-1498` — relación de lineage/variantes para habilitar compare.
- `TASK-1528` — derivatives y delivery gobernado ya existente.

### Blocks / Impacts

- Impacta la experiencia de revisión en `/producer`, `ProducerViewer`, `MediaStage` y las cards de imagen sólo en lo necesario para el handoff.
- No absorbe composer, asset library (`TASK-1520`), generación, inpaint/edit (`TASK-1497`) ni el modelo de lineage.

## Current Repo State

### Already exists

- Feed React con hero/card, filtros, acciones de candidato, referencia, favorito, descarga y recreate.
- Viewer nativo con inspector, provenance y lifecycle de object URLs.
- Derivatives versionados `image.card-thumb@1` y `image.viewer-preview@1`.
- Contratos de lineage en TASK-1498.

### Gap

- El viewer muestra una imagen estática: no hay zoom, pan, fit, 1:1, reset, navegación ni compare.
- La representación de revisión debe quedar explícitamente separada de la thumbnail y no puede depender de cargar el original por accidente.
- Los estados preview pending/no preview/relación no disponible necesitan copy y comportamiento accesibles.

## Modular Placement Contract

- Topology impact: `ui-package`.
- Current home: `efeonce-globe/apps/studio-client/src/surfaces/producer/` y `apps/studio-client/src/primitives/`.
- Future candidate home: `ui-package` para la primitive de focus canvas cuando la frontera lo permita.
- Boundary: feed y viewer componen; governed media y lineage readers entregan datos/autoridad; browser mantiene zoom, pan, focus y estado efímero.
- Build impact: bundle de `studio-client`; no incorporar un reproductor o galería externa sin ADR.
- Extraction blocker: sesión, routing y media resolver siguen acoplados al runtime actual de Globe.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`.
- Usuario: productor/editor.
- Momento: revisar, seleccionar y comparar outputs de imagen.
- Resultado: entiende la imagen, la inspecciona con precisión y decide una acción sin perder el feed.
- No-goals: editor de imagen, crop, retoque, nueva galería, comparación arbitraria.
- Handoff: expone un punto de entrada estable para `TASK-1572` sin convertir el Focus Canvas en dueño del flujo de
  edición regional.

### Surface & system decision

- Surface: Producer feed + viewer `/producer`.
- Composition Shell: `aplica`; conserva el shell vigente.
- Primitive decision: `extend`; extender `ProducerViewer`, `MediaStage` y controles existentes.
- Adaptive density: stage dominante en desktop; toolbar compacta y inspector secuencial en 390px.
- Dialog decision: conservar el dialog nativo actual; no modal dentro de modal.
- Copy source: `efeonce-globe/apps/studio-client/src/copy/`.

### State inventory

Ready, loading, preview pending, no preview, retrieval error, permission denied, zoomed/panned, first/last navigation, related variants, relation unavailable, selected/unselected, mobile, keyboard and reduced motion.

### Interaction contract

- Primary: abrir el candidato y revisar la imagen.
- Controls: zoom, pan, ajustar, tamaño real, reset, close, navigation and compare when authorized by data.
- Compare disabled state must use: “La comparación estará disponible cuando existan variantes relacionadas.”
- Escape closes and restores focus to the originating card.
- No action may be hover-only.

### Typography and microcopy

- Poppins only for page-level display headings; Geist for controls, metadata, inspector and captions.
- Sentence case, neutral Spanish for Chile, tuteo, no hype or invented certainty.
- Move the copy ledger in the wireframe to `apps/studio-client/src/copy/`; do not write user-facing strings inline.
- Use tabular numerals for zoom percentage, image position and dimensions.

## Implementation Mapping

- Route: `/producer`.
- Feed: `apps/studio-client/src/surfaces/producer/feed/ProducerFeed.tsx` and `ProducerFeedRoute.tsx`.
- Viewer: `apps/studio-client/src/surfaces/producer/viewer/ProducerViewer.tsx`.
- Media primitive: `apps/studio-client/src/primitives/index.tsx` (`MediaStage`).
- Retrieval: `apps/studio-client/src/data/governed-media.ts`.
- Data reader: existing governed derivative projection and TASK-1498 relation reader; no new UI endpoint.
- Candidate pattern: `ImageFocusCanvas` only if extending `MediaStage` cannot express the contract.
- Edit handoff: la acción `Editar imagen`/`Editar zona` puede vivir en el inspector, pero el Edit Rail, máscara,
  estimate y ejecución pertenecen a `TASK-1572`; no duplicar el viewer ni abrir un modal dentro del dialog.

## Library Discovery — 2026-07-26

- **Adopt:** `react-konva` for zoom/pan/selection/compare layers and `perfect-freehand` for a smooth mask brush ([React Konva](https://konvajs.org/docs/react/index.html), [perfect-freehand](https://www.npmjs.com/package/perfect-freehand)).
- **Alternative:** Fabric.js is viable if the surface becomes a general object/composition editor, but it must not be combined with Konva ([Fabric core concepts](https://fabricjs.com/docs/core-concepts/)).
- **Boundary:** canvas state exports normalized mask geometry/reference metadata to the governed command; it never uploads directly to a provider.

## Scope

### Slice 1 — Feed-to-focus handoff

- Preserve current feed/card dimensions and actions.
- Ensure card thumbnail and focus preview use their governed representations and honest pending/unavailable states.

### Slice 2 — Image Focus Canvas

- Extend the native viewer with fit, actual size, zoom, pan, reset, navigation, accessible toolbar and focus restoration.
- Keep inspector/provenance/actions intact and stable while the stage transforms.

### Slice 3 — Lineage-aware compare and evidence

- Enable compare only when TASK-1498 returns related variants.
- Implement side-by-side/split review, keyboard/reduced-motion/mobile behavior and GVC evidence.

## Out of Scope

- New image derivative or lineage backend.
- New gallery/masonry shell, image editor, crop, retouch or inpaint.
- Generic feed rewrite, asset library, generation pipeline or arbitrary cross-card comparison.

## GVC Scenario Plan

- Scenario: create under `efeonce-globe/scripts/frontend/scenarios/` before `UI ready: yes`.
- Route: `/producer`; viewports: desktop and 390px; quality profile: `premium`.
- Steps: load feed → open real image → fit/1:1/zoom/pan/reset → close/focus restore → compare fixture with real relation → mobile → keyboard → reduced motion.
- Markers: `producer-image-card`, `producer-image-focus-canvas`, `producer-image-zoom-toolbar`, `producer-image-inspector`, `producer-image-compare`, `producer-image-state`.
- Assertions: no overflow, accessible names, native dialog, focus restore, no original asset load for card, relation-gated compare and stable mobile composer/feed composition.
- Review dossier: `docs/ui/reviews/TASK-1571-globe-image-focus-compare-canvas.scorecard.json`.
- Quality threshold: average ≥ 4.5; no dimension < 4; hierarchy, surface economy, visual impact, fidelity and template resistance ≥ 4.5.

## Acceptance Criteria

- [ ] Existing Producer shell, feed and 390px composition remain recognizable and overflow-free.
- [ ] Native viewer provides fit, actual size, zoom, pan, reset, close, navigation and focus restoration.
- [ ] Feed consumes card-thumb and focus consumes viewer-preview; original media is not loaded merely by opening the feed.
- [ ] Compare is enabled only from a real TASK-1498 relation; otherwise the exact disabled copy is shown.
- [ ] Loading, unavailable, denied, long-title, keyboard and reduced-motion states are implemented and accessible.
- [ ] Copy is in the Globe copy layer; typography uses governed Poppins/Geist tokens with no inline family/size.
- [ ] GVC captures and scorecard pass on desktop and 390px before `UI ready: yes`.
- [ ] No new endpoint, lineage inference, retrieval bypass or parallel media stage is introduced.

## Rollout / Rollback

- Rollout: existing Producer client flag/allowlist; enable controls additively after GVC evidence.
- Rollback: hide Focus Canvas/compare controls and retain current viewer behavior; no data migration.

## Verification

- `pnpm ops:lint --changed`
- `pnpm ui:readiness-check`
- GVC premium scenario and visual scorecard.
- `pnpm qa:gates --changed` and `pnpm docs:closure-check` at closure.
