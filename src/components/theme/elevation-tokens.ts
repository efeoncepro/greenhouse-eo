/**
 * Elevation / shadow tokens — semantic Source of Truth (TASK-1049).
 *
 * Mirror of the AXIS color pattern (`axis-tokens.ts`) and the typography SoT
 * (`typography-tokens.ts`): primitives → composed semantic roles → consumed by
 * `mergedTheme.ts` (runtime) + DESIGN.md / V1 (contract) → pinned by
 * `elevation-drift.test.ts` (fails CI on any divergence).
 *
 * Why this exists (ADR GREENHOUSE_ELEVATION_SHADOW_TOKEN_DECISION_V1):
 * before TASK-1049, Greenhouse primitives reached for MUI numeric shadow indices
 * (`Paper elevation={6}` → the heavy multi-layer `theme.shadows[6]`) or picked a
 * Vuexy `customShadows.md/lg` by taste. There was no semantic elevation contract.
 * This module makes agents read a ROLE (`floating`, `overlay`, `modal`) instead of
 * a number, and keeps the raw shadow values in one governed place.
 *
 * Runtime access: `theme.greenhouseElevation.<level>` (see `types.ts` augmentation).
 * Consumers (primitives, views) MUST read the role from the theme — they must NOT
 * import this module directly to read a raw value, and must NOT use `Paper
 * elevation={n}` / `theme.shadows[n]` for new Greenhouse primitives.
 *
 * Mode-aware: this is a factory (`elevationTokens(mode)`) exactly like
 * `src/@core/theme/shadows.ts` / `customShadows.ts`. The shadow color derives from
 * the canonical channel `var(--mui-mainColorChannels-${mode}Shadow)` (AXIS ink) —
 * NOT a new color primitive, NOT OKLCH, NOT a reuse of `customShadows.md/lg`
 * (those stay as Vuexy compatibility infrastructure). Dark mode uses higher alpha
 * because shadows read weaker on a dark surface; the BORDER does the structural
 * separation work (mandatory on floating/overlay/modal) so the surface survives
 * `forced-colors` mode, where the browser strips `box-shadow` entirely.
 *
 * Anti-dated ceiling: no role exceeds `0 8px 24px rgba(0,0,0,0.1)` — the convergent
 * 2026 recipe is two soft layers + a 1px hairline border, never a heavy single
 * drop shadow (GitHub Primer / shadcn/ui / Linear / Vercel Geist).
 */

// Type Imports
import type { SystemMode } from '@core/types'

export type GreenhouseElevationLevel = 'none' | 'raised' | 'floating' | 'overlay' | 'modal' | 'overflow'

export interface GreenhouseElevationToken {
  /** Canonical role name — what agents read instead of a numeric index. */
  level: GreenhouseElevationLevel
  /** Resolved CSS `box-shadow` (mode-aware). `'none'` for flat / reserved roles. */
  boxShadow: string
  /**
   * Structural separation border. MANDATORY on floating/overlay/modal: it carries
   * the separation under `forced-colors` (shadow removed) and compensates the weaker
   * shadow on dark surfaces. `undefined` when the consumer owns its own border
   * (e.g. outlined cards on `none`).
   */
  borderColor?: string
  /** Surface background guidance (the role sits on paper, not the page bg). */
  surfaceColor?: string
  /** Agent-facing intent — what the role is for. */
  intendedUse: string
  /** `true` for roles declared in the union but NOT emitting a runtime value yet. */
  reserved?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Primitives — the mode-aware shadow channel + the per-mode alpha ramp.
// Channel = AXIS ink (`var(--mui-mainColorChannels-${mode}Shadow)`), same source
// `shadows.ts` / `customShadows.ts` use. Dark alphas are higher than light because
// shadows read weaker on a dark surface.
// ─────────────────────────────────────────────────────────────────────────────

const shadowChannel = (mode: SystemMode) => `var(--mui-mainColorChannels-${mode}Shadow)`

/** One shadow layer: `0px <y>px <blur>px rgb(<channel> / <alpha>)`. */
const layer = (mode: SystemMode, y: number, blur: number, alpha: number) =>
  `0px ${y}px ${blur}px rgb(${shadowChannel(mode)} / ${alpha})`

/** Canonical structural border + surface (mode-resolved theme tokens). */
const DIVIDER = 'var(--mui-palette-divider)'
const PAPER = 'var(--mui-palette-background-paper)'

// ─────────────────────────────────────────────────────────────────────────────
// Composed semantic roles (Source of Truth) — keyed by the canonical role name.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mode-aware elevation token factory. Mirror of `customShadows(mode)`.
 * Returns the full role map resolved for the given color mode.
 */
export const elevationTokens = (mode: SystemMode): Record<GreenhouseElevationLevel, GreenhouseElevationToken> => {
  const darkish = mode === 'dark'

  return {
    none: {
      level: 'none',
      boxShadow: 'none',
      intendedUse: 'Flat / outlined surface — internal cards, table shells, panels, dense dashboards. No visual depth.'
    },
    raised: {
      level: 'raised',
      // Soft local lift — two very subtle layers, max blur 4px.
      boxShadow: darkish
        ? `${layer(mode, 1, 2, 0.2)}, ${layer(mode, 2, 4, 0.14)}`
        : `${layer(mode, 1, 2, 0.06)}, ${layer(mode, 2, 4, 0.04)}`,
      surfaceColor: PAPER,
      intendedUse:
        'Soft local lift for hover/selection or a rare resting surface that needs separation. NOT a blanket card resting state in dashboards (cards stay flat/outlined).'
    },
    floating: {
      level: 'floating',
      // Convergent 2026 recipe: two soft layers + 1px hairline border. Max blur 12px.
      boxShadow: darkish
        ? `${layer(mode, 1, 2, 0.24)}, ${layer(mode, 4, 12, 0.36)}`
        : `${layer(mode, 1, 2, 0.06)}, ${layer(mode, 4, 12, 0.08)}`,
      borderColor: DIVIDER,
      surfaceColor: PAPER,
      intendedUse:
        'Anchored, transient contextual surface — GreenhouseFloatingSurface default, popovers, action menus, rich tooltips, evidence peeks, inline editors, validation bubbles. NOT dialogs / destructive-legal-financial decisions.'
    },
    overlay: {
      level: 'overlay',
      // Higher transient layer, still restrained. Max blur 20px (< 24 ceiling).
      boxShadow: darkish
        ? `${layer(mode, 2, 6, 0.28)}, ${layer(mode, 8, 20, 0.4)}`
        : `${layer(mode, 2, 6, 0.08)}, ${layer(mode, 8, 20, 0.1)}`,
      borderColor: DIVIDER,
      surfaceColor: PAPER,
      intendedUse:
        'Higher transient layer above the working context but not modal — command previews, floating docks, top-of-stack contextual affordances. NOT full-height drawers.'
    },
    modal: {
      level: 'modal',
      // Clearest stack separation — approaches the ceiling (8px 24px) but stays soft.
      boxShadow: darkish
        ? `${layer(mode, 4, 8, 0.32)}, ${layer(mode, 8, 24, 0.48)}`
        : `${layer(mode, 4, 8, 0.08)}, ${layer(mode, 8, 24, 0.1)}`,
      borderColor: DIVIDER,
      surfaceColor: PAPER,
      intendedUse:
        'Blocking temporary surface needing clear stack separation — MUI Dialog, temporary Drawer, destructive/legal/financial confirmations. NOT anchored popovers.'
    },
    overflow: {
      level: 'overflow',
      // Reserved in V1 — declared in the union + docs, NO runtime value emitted
      // until a sticky/table-edge consumer exists ("no token without a consumer").
      boxShadow: 'none',
      reserved: true,
      intendedUse:
        'RESERVED (V1, no runtime value yet) — scroll/sticky-edge affordance (sticky table edges, scroll shadows, overflow masks), NOT container depth. Emit a value when a real consumer lands.'
    }
  }
}

/** Stable ordered list of canonical roles (docs + tests iterate this). */
export const GREENHOUSE_ELEVATION_LEVELS: readonly GreenhouseElevationLevel[] = [
  'none',
  'raised',
  'floating',
  'overlay',
  'modal',
  'overflow'
] as const

/**
 * Anti-dated ceiling (TASK-1049): no role's largest layer may exceed this blur.
 * Per-role max-blur budget keeps `floating` clearly below `modal` and forbids the
 * heavy `theme.shadows[6/8]` drop the operator flagged.
 */
export const ELEVATION_MAX_BLUR_PX: Record<GreenhouseElevationLevel, number> = {
  none: 0,
  raised: 4,
  floating: 16,
  overlay: 20,
  modal: 24,
  overflow: 0
}
