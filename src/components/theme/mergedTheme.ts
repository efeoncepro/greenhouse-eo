/*
 * We recommend using the merged theme if you want to override our core theme.
 * This means you can use our core theme and override it with your own customizations.
 * Write your overrides in the userTheme object in this file.
 * The userTheme object is merged with the coreTheme object within this file.
 * Export this file and import it in the `@components/theme/index.tsx` file to use the merged theme.
 */

// MUI Imports
import { deepmerge } from '@mui/utils'
import type { Theme, ThemeOptions } from '@mui/material/styles'

// Type Imports
import type { Settings } from '@core/contexts/settingsContext'
import type { SystemMode } from '@core/types'

// Core Theme Imports
import coreTheme from '@core/theme'

// AXIS design tokens (TASK-1034) — full palette SoT + semantic feedback mapping
import { axisTokens } from '@core/theme/axis-tokens'
import { axisSemanticPalette } from '@core/theme/axis-semantic'
// AXIS neutrals (TASK-1034 Slice 3) — surface/text/customColors behind a
// build-time rollout flag (NEXT_PUBLIC_AXIS_NEUTRALS_ENABLED, default OFF).
import { resolveNeutralFragments } from '@core/theme/axis-neutrals'

// Greenhouse typography tokens (v1.3+) — line-height namespace canónico
import { lineHeights } from './typography-tokens'

const mergedTheme = (settings: Settings, mode: SystemMode, direction: Theme['direction']) => {
  // AXIS neutral fragments (Slice 3) — flag-gated; OFF = legacy navy bit-for-bit.
  const neutrals = resolveNeutralFragments()

  const userTheme: ThemeOptions = {
    // Expose line-height tokens al theme — accesible vía `theme.lineHeights.<token>`
    // desde useTheme() / styled() / sx={}. Source of truth: typography-tokens.ts.
    lineHeights,
    // AXIS primitive tokens (full ramps + opacity + neutrals) accesibles vía `theme.axis`.
    // Source of truth en código: src/@core/theme/axis-tokens.ts (espejo de AXIS Figma).
    axis: axisTokens,
    colorSchemes: {
      light: {
        palette: {
          // primary is set by the provider via settings.primaryColor (source: primaryColorConfig.ts)
          // — no need to duplicate it here. See GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md §4.1
          // secondary = structural Efeonce azure. DECISION (TASK-1034): NOT flipped to
          // AXIS lime — GVC showed pervasive lime secondary competes with the blue
          // primary (rainbow risk) in an enterprise tone. AXIS lime stays a RESERVED
          // accent via theme.axis.ramp.secondary for specific moments.
          secondary: {
            main: '#023C70',
            light: '#035A9E',
            dark: '#022A4E'
          },
          // Feedback semantics from AXIS (TASK-1034 Slice 2). contrastText AA-validated.
          info: axisSemanticPalette.info,
          success: axisSemanticPalette.success,
          warning: axisSemanticPalette.warning,
          error: axisSemanticPalette.error,
          // Neutrals (bg/paper/text) — AXIS Slice 3, flag-gated (legacy navy when OFF)
          background: neutrals.light.background,
          text: neutrals.light.text,
          customColors: {
            // surface + text mirrors from the resolved neutral fragment
            ...neutrals.light.customColors,
            // channel-based (AXIS ink), mode-specific — same in both fragments
            inputBorder: 'rgb(var(--mui-mainColorChannels-light) / 0.22)',
            // Greenhouse brand customColors (navy family + alloy).
            // neonLime/sunsetOrange/crimson removed in Slice 4 (TASK-1034): dead
            // pseudo-semantic tokens that drifted from the AXIS semantics; zero
            // runtime consumers (audited). Semantic hexes now flow from the AXIS
            // SoT (axisSemanticHex). efeonce-crimson primary option is unaffected.
            midnight: '#022A4E',
            deepAzure: '#023C70',
            royalBlue: '#024C8F',
            coreBlue: '#0375DB',
            lightAlloy: '#DBDBDB'
          }
        }
      },
      dark: {
        palette: {
          // primary is set by the provider via settings.primaryColor (same source as light)
          // secondary = structural azure (see light scheme — AXIS lime not adopted, reserved accent)
          secondary: {
            main: '#023C70',
            light: '#035A9E',
            dark: '#022A4E'
          },
          // Feedback semantics from AXIS (mains are mode-agnostic; same mapping as light).
          info: axisSemanticPalette.info,
          success: axisSemanticPalette.success,
          warning: axisSemanticPalette.warning,
          error: axisSemanticPalette.error,
          // Neutrals (bg/paper/text) — AXIS Slice 3, flag-gated (legacy navy when OFF)
          background: neutrals.dark.background,
          text: neutrals.dark.text,
          customColors: {
            // surface + text mirrors from the resolved neutral fragment
            ...neutrals.dark.customColors,
            // channel-based (AXIS ink), mode-specific — same in both fragments
            inputBorder: 'rgb(var(--mui-mainColorChannels-dark) / 0.22)',
            // Greenhouse brand customColors (navy family + alloy).
            // neonLime/sunsetOrange/crimson removed in Slice 4 (TASK-1034): dead
            // pseudo-semantic tokens that drifted from the AXIS semantics; zero
            // runtime consumers (audited). Semantic hexes now flow from the AXIS
            // SoT (axisSemanticHex). efeonce-crimson primary option is unaffected.
            midnight: '#022A4E',
            deepAzure: '#023C70',
            royalBlue: '#024C8F',
            coreBlue: '#0375DB',
            lightAlloy: '#DBDBDB'
          }
        }
      }
    },
    typography: {
      // Typography foundation — TASK-566 / EPIC-004 (Delta 2026-05-01 tarde: pivot a Geist + namespace v1.3)
      // Geist Sans = product UI base (body, forms, tables, controls, KPIs, IDs, amounts).
      // Poppins = display only, restricted to h1-h4.
      // monoId / monoAmount stay as semantic variants but use Geist + tabular-nums
      // (NO monospace family, NO Geist Mono).
      // line-heights consumen `lineHeights` tokens — cero magic numbers.
      // Source of truth: docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md §3 (v1.3).
      fontFamily:
        "var(--font-geist), 'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      h1: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, -apple-system, sans-serif",
        fontWeight: 800,
        fontSize: '2rem',
        lineHeight: lineHeights.heading
      },
      h2: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, -apple-system, sans-serif",
        fontWeight: 700,
        fontSize: '1.5rem',
        lineHeight: lineHeights.heading
      },
      h3: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, -apple-system, sans-serif",
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: lineHeights.heading
      },
      h4: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, -apple-system, sans-serif",
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: lineHeights.pageTitle
      },
      h5: {
        fontWeight: 600,
        lineHeight: lineHeights.body
      },
      h6: {
        fontWeight: 600,
        lineHeight: lineHeights.body
      },
      subtitle1: {
        lineHeight: lineHeights.body
      },
      body1: {
        fontSize: '1rem',
        lineHeight: lineHeights.body
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: lineHeights.body
      },
      caption: {
        fontSize: '0.8125rem',
        lineHeight: lineHeights.metadata
      },
      button: {
        fontWeight: 600,
        textTransform: 'none'
      },
      overline: {
        fontWeight: 600,
        letterSpacing: '1px',
        fontSize: '0.75rem'
      },
      monoId: {
        fontWeight: 600,
        fontSize: '0.875rem',
        lineHeight: lineHeights.numericDense,
        letterSpacing: '0.01em',
        fontVariantNumeric: 'tabular-nums'
      },
      monoAmount: {
        fontWeight: 700,
        fontSize: '0.8125rem',
        lineHeight: lineHeights.numericDense,
        fontVariantNumeric: 'tabular-nums'
      },
      kpiValue: {
        fontWeight: 800,
        fontSize: '1.75rem',
        lineHeight: lineHeights.display,
        fontVariantNumeric: 'tabular-nums'
      }
    }
  }

  return deepmerge(coreTheme(settings, mode, direction), userTheme as Theme)
}

export default mergedTheme
