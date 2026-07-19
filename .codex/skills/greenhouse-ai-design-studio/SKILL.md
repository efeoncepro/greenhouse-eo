---
name: greenhouse-ai-design-studio
description: Canonical end-to-end orchestrator for every new or materially redesigned Greenhouse product UI. Locks a versioned visual direction, maps it to recipes/primitives/tokens, implements a first fold, drives GVC evidence and visual critique, and blocks acceptance below the premium enterprise threshold.
---

# Greenhouse AI Design Studio

This is the **single canonical UI orchestrator** for Greenhouse. Use it for new
surfaces, substantial redesigns, external design inputs (Claude, Figma, images,
HTML, Lovable, Stitch, v0), reusable UI patterns, or requests for modern,
premium, world-class, enterprise, motion-rich UI.

Do not replace this orchestrator with a loose list of skills. It owns the order,
artifacts, checkpoints and acceptance gate. Specialist skills are lanes inside
this loop.

## Canonical sources

Read before decisions:

1. `DESIGN.md`.
2. `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`.
3. `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`.
4. `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`.
5. `docs/architecture/ui-platform/PRIMITIVES.md`.
6. The task wireframe/flow/motion and visual-direction source.

Runtime wins over stale prose. Greenhouse uses Geist for product UI, Poppins for
display headings through theme variants, AXIS/MUI tokens, Composition Shell,
The Seam and canonical motion wrappers.

## Specialist lanes — available skills only

Use the minimum lanes that apply:

- `ai-ui-generation-director`: generate and compare controlled UI directions.
- `greenhouse-product-ui-architect`: product pattern, shell, recipe, primitive,
  variant/kind, state/action/responsive decisions.
- `modern-ui-greenhouse-overlay`: token, typography, component and modern-craft
  constraints; it is standalone in Codex and does not require a missing global skill.
- `greenhouse-portal-ui-implementer`: repo implementation mapping and code.
- `greenhouse-vuexy-ui-expert`: Vuexy/MUI reference/reuse questions.
- `greenhouse-ux-content-accessibility`: copy, states, accessibility and recovery.
- `greenhouse-microinteractions-auditor`: motion/feedback/reduced-motion contract.
- `greenhouse-ui-review`: code/pattern compliance review.
- `greenhouse-ui-enterprise-review`: final screenshot/product-quality verdict.
- `greenhouse-browser-diagnostics`: runtime/browser failures and evidence.
- `greenhouse-mockup-builder`: mockup-only route when a runtime surface should
  not be touched before direction approval.

Never cite unavailable skills as required dependencies. If a desired specialty
is unavailable, the orchestrator owns the decision using the canonical docs and
records the fallback.

## Mandatory loop

### 0. Intake and rigor

Classify:

- `ui-lite`: local copy/polish with no new composition.
- `ui-standard`: visible screen/component/flow.
- `ui-platform`: primitive, recipe, shell, motion system or Design System work.

`ui-lite` may use a proportional path. Every `ui-standard`/`ui-platform` surface
uses the full loop.

### 1. Persist the visual source

Choose exactly one mode:

- `source-led`: copy/version the external image, HTML, Figma node export or
  approved mockup inside the repo and reference it from the wireframe.
- `repo-native-benchmark`: create a visual-direction document under
  `docs/ui/visual-directions/` with 2–3 alternatives, selected thesis,
  desktop/mobile targets, token mapping, signature details and anti-patterns.

An inaccessible Claude artifact, expired chat attachment or prose like “make it
modern” is not a source.

### 2. Direction before architecture

For a new surface, produce 2–3 materially different directions. Compare:

- first-fold reading order;
- hierarchy and action model;
- density and depth;
- typography and color role;
- responsive transformation;
- signature details;
- generic-template risk.

Select one and record rejected alternatives. The task cannot become
`UI ready: yes` until this decision exists.

### 3. Map to the Greenhouse system

In this order:

1. Pick a surface recipe.
2. Start from `CompositionShell` unless the documented trivial exception applies.
3. Search `src/components/greenhouse/primitives/index.ts` and
   `docs/architecture/ui-platform/PRIMITIVES.md`.
4. Search Vuexy `Custom*` wrappers/MUI bases.
5. Decide `reuse|extend|new-primitive|one-off`.
6. Map every visual cue to theme/AXIS/spacing/radius/motion tokens.

External design is intent, never literal HEX/px/font/ms.

### 4. Contract the first fold

The wireframe must contain substantive:

- product-design source and direction mode;
- desktop and mobile targets;
- action hierarchy;
- visual fidelity mapping;
- state/copy/accessibility inventory;
- implementation mapping;
- GVC premium scenario plan;
- decision log.

Flow and motion contracts are required when their triggers apply.

### 5. Readiness gate

Run:

`pnpm ui:readiness-check --task TASK-###`

Do not write new JSX while it fails. A heading containing placeholders does not
count as complete.

### 6. First-fold implementation checkpoint

Implement only enough to prove composition, hierarchy, density, identity and
responsive behavior. Use plausible fixtures and the real primitives. Do not wire
exhaustive backend/states before the first fold is visually accepted.

Capture desktop and mobile, inspect them, then either:

- `ACCEPT FIRST FOLD` and continue; or
- `REVISE` with exact dimensions/regions.

### 7. Full implementation

Add state model, interactions, keyboard/focus, access, data boundaries, motion
and recovery. Rich motion is default where it clarifies causality; reduced
motion must reach the same final meaning.

### 8. GVC evidence

Every `ui-standard`/`ui-platform` scenario uses `qualityProfile: 'premium'` and
captures desktop + 390px mobile. Run capture and then review:

- `pnpm fe:capture <scenario> --env=<env>`
- `pnpm fe:capture:review <capture-dir>`

Source-led work also declares/promotes a baseline after direction approval.
Measure `scrollWidth <= clientWidth`; full-page screenshots can hide overflow.

### 9. Visual scorecard and iteration

Create the versioned scorecard under `docs/ui/reviews/` using the capture
dossier. Score 1–5 with evidence/rationale:

1. hierarchy;
2. proportions/composition;
3. spacing/rhythm;
4. information density;
5. depth/surface model;
6. surface economy/card-wallpaper resistance;
7. visual impact/signature composition;
8. typography;
9. color/contrast;
10. iconography;
11. responsive transformation;
12. motion/microinteractions;
13. source fidelity;
14. generic-template resistance.

Acceptance requires average ≥4.5, no dimension <4, hierarchy ≥4.5, surface
economy ≥4.5, visual impact ≥4.5, source fidelity ≥4.5 and generic-template
resistance ≥4.5. Averages never hide a floor failure. A polished card grid or
card-on-card composition is a design failure even when token/code gates pass.

Run `pnpm ui:quality --task TASK-###`. Iterate until it passes or report an
honest block; never lower scores/thresholds to close.

### 10. Final enterprise gate

Use `greenhouse-ui-review` for implementation compliance and
`greenhouse-ui-enterprise-review` for the evidence-backed product verdict.
`BLOCK` stops closure. Then run relevant code, visual, quality, QA and docs gates.

## Stop conditions

Stop implementation/closure when:

- visual source/direction is missing;
- first fold was not reviewed;
- mobile is compressed desktop;
- primary action is ambiguous;
- partial data looks authoritative;
- motion lacks reduced-motion equivalence;
- GVC dossier/scorecard is missing;
- a score threshold fails;
- the final enterprise verdict is `BLOCK`.

## Output contract

Report:

- rigor and direction mode;
- selected direction and rejected alternatives;
- recipe + primitive decision;
- first-fold checkpoint result;
- GVC capture/dossier paths and viewports;
- scorecard results by dimension;
- code/visual/quality/enterprise verdicts;
- remaining risk or rollout status.

## Version

- v2.0 — 2026-07-18 — TASK-1453: single orchestrator, real skills only,
  versioned visual direction, first-fold checkpoint, GVC premium and score gate.
