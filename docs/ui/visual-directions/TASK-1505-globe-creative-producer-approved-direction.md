# TASK-1505 — Globe Creative Producer Approved Direction

## Status

- Decision: `approved product direction`
- Direction mode: `source-led`
- Approved source: `docs/ui/visual-sources/TASK-1505/approved-prototype.dc.html`
- Source SHA-256: `7d0d689b7daeb6e409ae01c1bf478d700ea09059e0f20f7da3c85a53bb10e93f`
- Original source: `/Users/jreye/Documents/Globe/Producer/Suite de IA Generativa Creativa/Globe Creative Producer.dc.html`
- Approval interpretation: the complete interaction and feature inventory is the target for Producer. It is not an exploratory option and cannot be reduced to the older task scope.

## Selected thesis

The Producer is a dark, prompt-first creative operating surface with one continuous loop: compose, estimate, generate, inspect, refine, organize, review and share. The composer is the first-fold anchor; the unified cross-modal library and candidate viewer carry continuity after generation. Image, video and audio remain modes of one product rather than separate tools.

The approved direction includes:

- image, video and audio composer modes;
- prompt enhancement, recent prompt history and negative prompt;
- uploads and existing-asset references with rights, weights and anchors;
- governed model/route selection, constraints, seed lock, styles/presets and auto-route;
- pre-spend estimate, credits, reservations, monthly/project budget and queue priority;
- unified cross-modal feed with hero candidate, search, filters, sort, density, series and collections;
- candidate and bulk actions: preview, download, favorite, use as reference, move, export and guarded delete;
- candidate viewer with zoom, before/after, recipe, route/model/shape/seed/cost, provenance, lineage, audit and evidence-backed C2PA state;
- approval, request changes, comments, variation, upscale and regional inpaint;
- read-only share board, command palette, onboarding, keyboard shortcuts and tenant/workspace switch.

## Rejected interpretations

1. **Older narrow Producer task.** Composer + generate + feed + download only is rejected because it contradicts the approved source.
2. **Three independent modality pages.** Rejected because the approved library, budgets, collections, lineage and review workflow are cross-modal.
3. **Workbench-only collaboration.** Rejected: approval, comments and sharing are explicitly part of the approved Producer. Producer remains prompt-first; that distinction does not remove review or organization.

## System mapping

- Runtime design system: Globe's own AXIS-derived tokens and pattern registry. Greenhouse owns governance/evidence, not Globe's runtime components.
- Composition: extend the Globe Producer Console pattern; do not recreate the HTML's literal inline styles.
- Reuse/extend decision: reuse existing shell, button/input/dialog foundations and media primitives; extend/register `ProducerComposer`, `GenerationFeed`, `CandidateViewer`, `AssetActionBar`, `ReferenceTray`, `BudgetRail`, `CollectionRail`, `BulkActionBar` and `ReviewThread` as Globe patterns when absent.
- Token policy: every color, type, radius, spacing, elevation and motion cue from the HTML maps to a named Globe/AXIS token. Literal values in the approved prototype are evidence of visual intent, not implementation tokens.
- API parity: every estimate, mutation, review, asset, share or budget action is a governed server-side reader/command. No prototype-local state transition becomes business logic in the browser.

## Desktop and mobile targets

- Desktop reference: `1440×940` source inspection; GVC target `1440×1000`.
- Mobile reference and target: `390×844`.
- Mobile is a deliberate recomposition: composer and primary CTA stay immediately usable; rails become drawers/sheets; candidate viewer becomes a focus-managed full-height surface; bulk actions remain reachable without horizontal page scrolling.
- The inspected HTML currently measures `scrollWidth=630` against `clientWidth=390`. Runtime acceptance requires `scrollWidth <= clientWidth`; this is a known source defect to resolve while preserving capability.

## Trust, accessibility and honesty corrections

The approved capabilities remain unchanged, but prototype shortcuts are not approved runtime behavior:

- generation progress is attempt/state based; no time-derived or invented percentage;
- C2PA is rendered only from verified provenance evidence, otherwise `unverified`, `unavailable` or `degraded`;
- tabs use accessible names, selected semantics and roving focus;
- dialogs/viewers trap focus, set the correct dialog semantics, make the background inert and restore focus;
- card and bulk selection expose selected state and keyboard parity;
- destructive bulk delete requires confirmation plus recoverable undo where the backend permits;
- document language/title, focus visibility, live regions and reduced-motion equivalents are mandatory.

## Source fidelity gate

Source fidelity is measured by capability, hierarchy and interaction flow, not pixel-copying the HTML. A runtime implementation fails fidelity if it omits an approved capability, demotes the composer/library/viewer hierarchy, hides gated capabilities as if nonexistent, or replaces real backend state with optimistic local fiction.

Promotion requires source-led GVC baseline `globe.creative-producer-surface`, desktop + 390 px capture, premium review dossier and scorecard with average `>=4.5`, every dimension `>=4`, and source fidelity / hierarchy / surface economy / visual impact / generic-template resistance `>=4.5`.
