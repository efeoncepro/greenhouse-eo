# TASK-1037 — Greenhouse Loading Primitive System

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Slice 1 code complete; visual feedback / Slice 2 pilots pending`
- Rank: `TBD`
- Domain: `ui|platform|design-system|accessibility`
- Blocked by: `none`
- Branch: `develop` (operator-approved local work; no worktree)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Greenhouse needs a canonical loading-state primitive that is more modern than the current scattered `CircularProgress`/`Skeleton` usage. This task creates a platform-level Loading Lab as a child surface of the internal design system (`/admin/design-system/loaders`), then promotes the selected direction into a reusable `GreenhouseLoadingSurface` primitive with functional variants, reduced-motion behavior and accessibility semantics.

## Why This Task Exists

Current loading UI is fragmented: many routes and views use local spinners, skeletons or inline progress with inconsistent density, motion and accessibility. Reusing the current implementations as-is would preserve a low-quality interaction layer. Greenhouse needs to reuse the platform stack and guardrails while creating a visually stronger, enterprise-grade loading system.

## Goal

- Create a reusable loading primitive using the Primitive + Variants + Kinds method.
- Add an internal Loading Lab under `/admin/design-system/loaders` for visual direction, GVC evidence and operator review.
- Establish variants for page, panel, table, inline action, brand transition, AI thinking and staged progress loading.
- Preserve AXIS/MUI theme usage, reduced-motion support, accessibility semantics and copy governance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`

Reglas obligatorias:

- Reuse the Greenhouse platform, not weak local implementations.
- No product view should import new animation libraries for loading states without extending the primitive first.
- Motion must be useful, reduced-motion safe and never the only signal.
- Loading copy must be brief, operational and localizable when reusable.
- `/admin/design-system` and child lab routes remain internal-only via `administracion.design_system`; no client exposure.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

## Dependencies & Impact

### Depends on

- Existing AXIS tokens in `src/@core/theme/axis-tokens.ts`
- Existing design-system internal route `/admin/design-system`
- Child Loading Lab route `/admin/design-system/loaders`
- Existing motion wrappers `@/libs/FramerMotion` and `@/hooks/useReducedMotion`

### Blocks / Impacts

- Future migration of scattered `CircularProgress`, `Skeleton` and `LinearProgress` usages.
- Future loading states for AI/Nexa, auth transitions, dashboards, tables, drawers and sidecars.

### Files owned

- `src/components/greenhouse/primitives/GreenhouseLoadingSurface.tsx`
- `src/components/greenhouse/primitives/index.ts`
- `src/views/greenhouse/admin/design-system/*`
- `scripts/frontend/scenarios/design-system.scenario.ts`
- `scripts/frontend/scenarios/design-system-loaders.scenario.ts`
- `docs/tasks/in-progress/TASK-1037-greenhouse-loading-primitive-system.md`

## Current Repo State

### Already exists

- `src/app/(dashboard)/admin/design-system/page.tsx` with internal guard.
- Multiple route-level skeleton loaders, including `/admin`, `/dashboard`, `/agency/clients/new` and Nexa insights.
- MUI progress override and AXIS semantic palette.
- Framer Motion, Lottie, GSAP and reduced-motion helpers.

### Gap

- No canonical Greenhouse loading primitive.
- Loading implementations are visually uneven and often rely on generic centered spinners.
- No internal visual lab for comparing loading variants before runtime adoption.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Primitive + Loading Lab

- Add `GreenhouseLoadingSurface` with official variants:
  - `pageSkeleton`
  - `panelSkeleton`
  - `tableSkeleton`
  - `inlineAction`
  - `brandSplash`
  - `aiThinking`
  - `progressRail`
- Add Loading Lab route under `/admin/design-system/loaders`.
- Add focused primitive tests.
- Capture GVC evidence for `/admin/design-system/loaders`.

### Slice 2 — Pilot Consumers

- Migrate `/auth/landing/loading.tsx` to `brandSplash`.
- Migrate one route-level skeleton to `pageSkeleton`.
- Migrate one AI/Nexa loading state to `aiThinking`.

### Slice 3 — Governance + Migration Plan

- Update UI platform architecture with the canonical loading primitive.
- Document migration guidance for local `CircularProgress`/`Skeleton` usage.
- Decide which variants graduate from lab to required runtime usage.

## Out of Scope

- Bulk migrating all existing loading states.
- Adding a new animation dependency before the lab proves the gap.
- Replacing domain-specific progress bars that represent real determinate business progress.

## Detailed Spec

`GreenhouseLoadingSurface` owns:

- loading semantics: `role='status'`, `aria-live='polite'`, `aria-busy='true'`
- reduced-motion handling
- density and layout constraints
- theme token usage
- data-capture hooks for GVC
- visual variants that differ by job, not skin

`kind` maps semantically to the consumer scenario, for example:

- `workspaceBoot`
- `nexaReasoning`
- `adminWorkbench`
- `financeTable`
- `sidecarPanel`
- `inlineSave`

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (lab + primitive) -> Slice 2 (pilot consumers) -> Slice 3 (governance/migration).
- Do not migrate broad runtime surfaces until the lab has GVC evidence and operator feedback.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Motion feels decorative or distracting | UI | medium | Loading Lab review + reduced-motion variants | GVC/operator review |
| Primitive becomes too generic and hard to adopt | UI platform | medium | Keep variants job-based and props small | tests + pilot friction |
| Design-system route exposes client-visible concepts | Access/UI | low | Existing viewCode + tenantType client redirect | route guard / GVC no login redirect |
| Bulk migration creates regressions | UI | medium | Slice 1 only creates lab; Slice 2 pilots only | focused tests + GVC |

### Feature flags / cutover

No feature flag for Slice 1. It is additive and internal-only. Runtime consumer migrations in Slice 2 can be reverted by restoring the local loader component.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Remove Loading Lab imports and primitive export | <15 min | yes |
| Slice 2 | Revert pilot consumer files to local loaders | <15 min | yes |
| Slice 3 | Revert docs guidance | <10 min | yes |

### Production verification sequence

- Local `pnpm exec tsc --noEmit --pretty false`
- Focused tests for primitive/design-system route
- `pnpm design:lint`
- `pnpm fe:capture design-system-loaders --env=local`

## Acceptance Criteria

- [x] `GreenhouseLoadingSurface` exists and exports its variants/types from the primitives barrel.
- [x] `/admin/design-system/loaders` includes a Loading Lab section with visually distinct variants.
- [x] Each variant has accessible status semantics and reduced-motion fallback.
- [x] No hardcoded brand HEX values are introduced in the primitive.
- [x] Focused tests cover rendering variants and reduced-motion behavior.
- [x] GVC evidence exists for the design-system Loading Lab on the dedicated child route.
- [ ] Slice 2 pilot consumers migrated and reviewed.

## Progress Log

### 2026-06-06 — Slice 1

- Added `src/components/greenhouse/primitives/GreenhouseLoadingSurface.tsx`.
- Added initial Loading Lab to `/admin/design-system` via `src/views/greenhouse/admin/design-system/LoadingLabSection.tsx`.
- Updated `scripts/frontend/scenarios/design-system.scenario.ts` for desktop + mobile and `allowLoading` because the lab intentionally rendered loading states in the initial combined capture.
- Evidence: `.captures/2026-06-06T17-49-25_design-system` (`qualityFindings=[]`).
- Verification: primitive tests 9/9, eslint focal, TypeScript, `pnpm design:lint`, `pnpm task:lint --task TASK-1037`.

### 2026-06-06 — Operator feedback separation

- Moved the Loading Lab out of the canonical AXIS color-token page and into `/admin/design-system/loaders`.
- Kept `/admin/design-system` as the internal color-token reference with a child-surface link to loaders.
- Split GVC scenarios: `design-system` for AXIS palette, `design-system-loaders` for loading-state variants.
- Evidence: `.captures/2026-06-06T18-12-28_design-system` and `.captures/2026-06-06T18-13-15_design-system-loaders` (`qualityFindings=[]`).
- Verification: eslint focal, route reachability, primitive tests, design lint, task lint, docs closure and diff check passed. Full TypeScript re-run timed out after 120s without printing errors in this post-separation pass.

## Closing Protocol

- [ ] Update `docs/tasks/README.md`.
- [ ] Update `docs/tasks/TASK_ID_REGISTRY.md`.
- [ ] Update `Handoff.md`.
- [ ] Run `pnpm task:lint --task TASK-1037`.
- [ ] Run `pnpm docs:closure-check` before marking complete.
