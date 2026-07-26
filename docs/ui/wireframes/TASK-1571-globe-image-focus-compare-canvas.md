# TASK-1571 — Globe Image Focus + Compare Canvas

## Visual Direction Contract

- Direction: `docs/ui/visual-directions/TASK-1571-globe-image-focus-compare-direction.md`.
- Thesis: **Focused Artboard** — extend the current Producer viewer into a premium image review moment.
- Reuse: current CompositionShell, feed, native dialog, `MediaStage`, inspector and governed media lifecycle.
- New pattern only if required: `ImageFocusCanvas`; it must remain a surface pattern, not a parallel gallery system.

## Evidence from the live surface

- Authenticated `/producer`, desktop capture at approximately 1189×810: composer ~440px wide, feed ~695px wide, 23 live pieces after refresh.
- Image cards use a roughly 311×176 cover media region and already expose “Ver candidato”, download, favorite, reference and recreate actions.
- Current image viewer is a native dialog with a ~750px square stage and ~416px inspector. It has no zoom, pan, fit/1:1, navigation or relation-aware compare.
- At 390px, the current document has no horizontal overflow; the composer is intentionally tall and the feed begins below it. Do not add gallery chrome above that flow.

## Desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Current Producer shell / composer + feed                              │
│   image card ── open ──┐                                              │
├────────────────────────┼─────────────────────────────────────────────┤
│                        │ Native dialog: Image Focus Canvas           │
│                        │ ┌────────────────────────────┬────────────┐ │
│                        │ │ image stage                 │ Inspector  │ │
│                        │ │ fit / pan / zoom / 1:1      │ title      │ │
│                        │ │                              │ provenance │ │
│                        │ │ [−] 100% [+] [Ajustar]      │ actions    │ │
│                        │ └────────────────────────────┴────────────┘ │
│                        │ [Anterior] [Comparar variantes] [Siguiente]  │
└──────────────────────────────────────────────────────────────────────┘
```

## Mobile wireframe (390px)

```text
┌───────────────────────────────┐
│ native dialog / close          │
│                               │
│        image stage            │
│                               │
│ [−] 100% [+] [Ajustar]        │
├───────────────────────────────┤
│ title                         │
│ provenance / selection        │
│ [Comparar variantes]          │
│ [Cerrar el detalle]           │
└───────────────────────────────┘
```

## Component and token mapping

- Route/surface: `/producer` → `ProducerFeed`, `ProducerFeedRoute`, `ProducerViewer`.
- Media: extend `MediaStage`; use governed `image.card-thumb@1` for feed and `image.viewer-preview@1` for focus stage.
- Controls: existing button, icon button, toolbar, dialog, focus-ring and surface primitives; no ad hoc inline typography.
- Typography: Poppins for any page-level heading only; Geist for inspector, controls and metadata; 14/16px body rhythm; tabular numerals for zoom and position.
- Motion: existing Globe/Greenhouse motion tokens; view transition is optional enhancement with immediate fallback.

## Copy ledger — es-CL, neutral tuteo

| Key | Copy |
|---|---|
| `imageReview.fit` | Ajustar |
| `imageReview.actualSize` | Tamaño real |
| `imageReview.zoomIn` | Acercar |
| `imageReview.zoomOut` | Alejar |
| `imageReview.reset` | Restablecer vista |
| `imageReview.compare` | Comparar variantes |
| `imageReview.compareUnavailable` | La comparación estará disponible cuando existan variantes relacionadas. |
| `imageReview.variantPosition` | Imagen {current} de {total} |
| `imageReview.previewPending` | La vista de revisión todavía se está preparando. |
| `imageReview.noPreview` | No hay una vista de revisión disponible. |
| `imageReview.select` | Seleccionar esta imagen |
| `imageReview.selected` | Imagen seleccionada |

Copy must be promoted to `efeonce-globe/apps/studio-client/src/copy/`; do not hardcode it in JSX.

## State inventory

- Ready, loading, preview pending, no preview, retrieval error and permission denied.
- Single image, first/last navigation, related variants available, relation unavailable.
- Zoomed/panned, reset, keyboard focus, mobile compact and reduced motion.
- Long title/provenance and selected/unselected states.

## Acceptance signature

- The current feed and composer composition remain intact on desktop and 390px.
- The native viewer gains an accessible Focus Canvas with fit, actual size, zoom, pan, reset, close and focus restoration.
- Compare is disabled with the stated copy until a real relation from TASK-1498 is available; no client-side relation inference.
- Feed uses card-thumb and focus uses viewer-preview; original media is not loaded merely by opening the feed.
- Every interactive control has an accessible name and keyboard path; reduced motion keeps the same information and actions.
