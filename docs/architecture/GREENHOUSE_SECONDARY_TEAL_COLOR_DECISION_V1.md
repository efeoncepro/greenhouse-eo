# GREENHOUSE_SECONDARY_TEAL_COLOR_DECISION_V1

> **Status:** Accepted
> **Date:** 2026-07-18
> **Owner:** UI Platform / Design System
> **Scope:** Greenhouse brand-secondary ramp, semantic role mapping, light/dark contrast and token governance
> **Accepted by:** operator direction — replace the current green secondary with a teal ramp compatible with Midnight Navy
> **Supersedes:** secondary-green clause of `GREENHOUSE_SEMANTIC_COLOR_SYSTEM_DECISION_V1.md`
> **Reversibility:** two-way
> **Confidence:** high
> **Validated as of:** 2026-07-18

## Context

The former lime/green secondary (`500 #6EC207`, functional `700 #4B8405`) created three systemic problems:

1. it occupied the same visual territory as success emerald `#157F47`, so supporting actions could read as positive status;
2. its bright 500 anchor made opacity surfaces and accents feel fluorescent rather than premium;
3. one semantic mapping was reused in light and dark mode, leaving dark-mode outlined/text treatments too quiet.

This is a platform decision, not a surface-specific reskin. Every consumer of `theme.palette.secondary`, the AXIS ramp and its opacity scale must resolve from one source.

## Decision

Adopt **Tidal Teal** as Greenhouse secondary:

| Step | Hex | Intended use |
|---:|---|---|
| 100 | `#DDF9F5` | quiet wash |
| 200 | `#B5F0E8` | soft surface |
| 300 | `#79E0D4` | dark-mode light/accent |
| 400 | `#3BCBBD` | dark-mode functional main |
| 500 | `#12AFA2` | primitive anchor / accent / opacity base |
| 600 | `#0C9188` | strong accent |
| 700 | `#0B726C` | light-mode functional main |
| 800 | `#0A5955` | light-mode hover/active |
| 900 | `#083F3D` | deepest teal |

Semantic mapping is mode-aware:

| Mode | `main` | `light` | `dark` | `contrastText` | Critical contrast |
|---|---|---|---|---|---|
| light | 700 `#0B726C` | 500 `#12AFA2` | 800 `#0A5955` | white | 5.77:1 |
| dark | 400 `#3BCBBD` | 300 `#79E0D4` | 500 `#12AFA2` | Midnight `#022A4E` | 7.25:1 |

The full ramp lives in `axisRamp.secondary`; the 500 alias lives in `axisMain.secondary`; alpha tokens derive from 500 in `axisOpacity.secondary`; components consume `theme.palette.secondary.*`. `NEXT_PUBLIC_GREENHOUSE_SECONDARY_TEAL_ENABLED=false` is emergency fallback only and returns legacy azure.

The change is code-first by explicit operator direction. AXIS Figma remains pending reconciliation; regeneration tooling must preserve this override until the upstream master is updated.

## Alternatives considered

- **Atlantic teal:** more green and more vivid. Rejected because it remained too close to success at operational sizes.
- **Harbor cyan:** more blue. Rejected because it crowded info and Core Blue.
- **Muted petrol:** sophisticated but too gray. Rejected because secondary actions lost visual energy on bright surfaces.

Tidal Teal holds the middle: clearly teal, vivid at 400–500, grounded at 700–900 and compatible with Midnight Navy.

## Consequences

- Secondary no longer communicates success by accident.
- Light and dark modes get distinct functional mappings with AA contrast.
- Existing `color='secondary'` consumers update without local edits.
- Historical mockups may retain lime as historical evidence; the canonical `/design-system/colors`, Buttons and Chips labs must show Tidal Teal.
- Figma/code parity remains intentionally open until upstream reconciliation is performed.

## Mechanical guards

- `axis-semantic-drift.test.ts` pins the 9-step ramp, opacity scale and per-mode aliases.
- `axis-semantic-contrast.test.ts` requires AA for solid text and outlined/text use in both modes.
- `design:lint`, `ui:code-lint` and GVC evidence remain required for release.

## Runtime contract

- Runtime source of truth: `src/@core/theme/axis-tokens.ts` and `src/@core/theme/axis-secondary.ts`.
- Theme bridge: `src/components/theme/mergedTheme.ts` resolves the light/dark semantic mapping.
- Consumer contract: use `theme.palette.secondary.*`; use `theme.axis.ramp.secondary` only for deliberate ramp work such as labs or chart series.
- Build-time rollback: `NEXT_PUBLIC_GREENHOUSE_SECONDARY_TEAL_ENABLED=false` returns the legacy Azure secondary. Unset/default remains Tidal Teal.
- Design evidence: `/admin/design-system/colors`, Buttons and Chips labs, plus the durable `design-system.colors` GVC baseline.

## Revisit when

- AXIS Figma reconciles the code-first override and proposes materially different values.
- Success, info or primary palettes change enough to reduce perceptual separation.
- Accessibility evidence shows a supported state or mode below WCAG AA.
- Product hierarchy requires a different supporting-action role rather than a color-only adjustment.
