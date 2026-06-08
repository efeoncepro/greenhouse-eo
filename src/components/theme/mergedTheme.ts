/*
 * We recommend using the merged theme if you want to override our core theme.
 * This means you can use our core theme and override it with your own customizations.
 * Write your overrides in the userTheme object in this file.
 * The userTheme object is merged with the coreTheme object within this file.
 * Export this file and import it in the `@components/theme/index.tsx` file to use the merged theme.
 */

import type { CSSProperties } from 'react'

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
// AXIS secondary brand role (TASK-1034) — azure→AXIS deep-green behind a
// build-time rollout flag (NEXT_PUBLIC_AXIS_SECONDARY_LIME_ENABLED, default OFF).
import { resolveSecondaryPalette } from '@core/theme/axis-secondary'

// Greenhouse typography tokens — line-height namespace (v1.3+) + scale SoT (TASK-1036)
import { controlText, lineHeights, typographyScale } from './typography-tokens'
// Greenhouse elevation tokens — semantic shadow/elevation SoT (TASK-1049).
// Mode-aware factory over the canonical shadow channel; consumed via
// `theme.greenhouseElevation.<level>`. Drift-guarded by elevation-drift.test.ts.
import { elevationTokens } from './elevation-tokens'
// Greenhouse semantic feedback tokens — tonal-by-default SoT (TASK-1053 Fase B).
// Mode-aware factory; consumed via `theme.greenhouseSemantic.<role>`. Drift-guarded
// by greenhouse-semantic-drift.test.ts.
import { greenhouseSemanticTokens } from './greenhouse-semantic-tokens'

const { mobileFontSize: surfaceHeroTitleMobileFontSize, ...surfaceHeroTitleToken } = typographyScale.surfaceHeroTitle

const mergedTheme = (settings: Settings, mode: SystemMode, direction: Theme['direction']) => {
  // AXIS neutral fragments (Slice 3) — flag-gated; OFF = legacy navy bit-for-bit.
  const neutrals = resolveNeutralFragments()
  // AXIS secondary role — flag-gated; OFF = legacy azure, ON = AXIS deep-green.
  const secondary = resolveSecondaryPalette()

  const userTheme: ThemeOptions = {
    // Expose line-height tokens al theme — accesible vía `theme.lineHeights.<token>`
    // desde useTheme() / styled() / sx={}. Source of truth: typography-tokens.ts.
    lineHeights,
    // AXIS primitive tokens (full ramps + opacity + neutrals) accesibles vía `theme.axis`.
    // Source of truth en código: src/@core/theme/axis-tokens.ts (espejo de AXIS Figma).
    axis: axisTokens,
    // Greenhouse semantic elevation roles (TASK-1049) accesibles vía
    // `theme.greenhouseElevation.<level>`. Factory mode-aware (canal shadow AXIS).
    // Source of truth: src/components/theme/elevation-tokens.ts. Primer consumidor:
    // GreenhouseFloatingSurface (rol `floating`). NO usar `Paper elevation={n}` ni
    // `theme.shadows[n]` en primitives Greenhouse nuevas.
    greenhouseElevation: elevationTokens(mode),
    // Greenhouse semantic feedback roles (TASK-1053 Fase B) accesibles vía
    // `theme.greenhouseSemantic.<role>`. Factory mode-aware (espejo de elevation).
    // SoT: greenhouse-semantic-tokens.ts + sub-valores curados en axis-semantic.ts.
    // Consumidor: GreenhouseChip `label` variant (tonal AA). NO usar
    // `palette.<role>.main` como color de TEXTO tonal (es el fill, no el ink).
    greenhouseSemantic: greenhouseSemanticTokens(mode),
    colorSchemes: {
      light: {
        palette: {
          // primary is set by the provider via settings.primaryColor (source: primaryColorConfig.ts)
          // — no need to duplicate it here. See GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md §4.1
          // secondary brand role — flag-gated (legacy azure OFF / AXIS deep-green ON)
          secondary,
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
          // secondary brand role — flag-gated (legacy azure OFF / AXIS deep-green ON)
          secondary,
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
      // Typography foundation — TASK-566 / EPIC-004 (pivot a Geist + namespace v1.3),
      // reconciliada a un Source of Truth único en TASK-1036.
      // Geist Sans = product UI base (body, forms, tables, controls, KPIs, IDs, amounts).
      // Poppins = display only, restricted to h1-h4 + surfaceHeroTitle.
      // monoId / monoAmount stay as semantic variants but use Geist + tabular-nums
      // (NO monospace family, NO Geist Mono).
      // Cada variant spreadea su token de `typographyScale` (SoT) — cero magic numbers
      // de fontSize/fontWeight/familia/line-height inline. El bridge contrato↔variante
      // (`TYPOGRAPHY_VARIANT_BRIDGE`) y los valores los pinea `typography-drift.test.ts`.
      // Source of truth: src/components/theme/typography-tokens.ts + DESIGN.md §Typography.
      fontFamily:
        "var(--font-geist), 'Geist', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
      h1: { ...typographyScale.headlineDisplay },
      h2: { ...typographyScale.headlineLg },
      h3: { ...typographyScale.headlineMd },
      h4: { ...typographyScale.pageTitle },
      surfaceHeroTitle: {
        ...surfaceHeroTitleToken,
        '@media (max-width:599.95px)': {
          fontSize: surfaceHeroTitleMobileFontSize
        }
      } as unknown as CSSProperties,
      // h5 / h6 / subtitle1 / button — ownership explícito desde el SoT (TASK-1036 S1).
      // Antes heredaban su fontSize del coretheme Vuevy read-only (= mismo valor);
      // ahora el SoT es la fuente. Único delta sub-pixel: button.lineHeight 1.467→1.5
      // (línea única, sin efecto visible). h6 reusa el valor de label-md (label inline-bold).
      h5: { ...typographyScale.sectionTitle },
      h6: { ...typographyScale.labelMd },
      subtitle1: { ...typographyScale.subheader },
      // subtitle2 — TASK-1038: variante MUI heavily-used (~267) traída al SoT vía body-sm.
      subtitle2: { ...typographyScale.bodySm },
      body1: { ...typographyScale.bodyLg },
      body2: { ...typographyScale.bodyMd },
      caption: { ...typographyScale.bodySm },
      button: {
        ...typographyScale.labelMd,
        textTransform: 'none'
      },
      overline: {
        ...typographyScale.overline,
        // textTransform lo aporta el coretheme (uppercase); el SoT cubre family/size/weight/lh/tracking.
        textTransform: 'uppercase'
      },
      monoId: { ...typographyScale.numericId },
      monoAmount: { ...typographyScale.numericAmount },
      kpiValue: { ...typographyScale.kpiValue }
    },
    components: {
      // Control-text ownership desde el SoT (TASK-1036 S2 + TASK-1038). deepmerge
      // preserva lineHeight/borderRadius del coretheme; solo ownemos el fontSize.
      MuiButton: {
        styleOverrides: {
          // Button size=large: 17→16 (TASK-1038, saca el 17 bespoke).
          sizeLarge: {
            fontSize: controlText.lg
          }
        }
      },
      // Tab label — TASK-1038: 18px hardcoded (coretheme) → control-text 14, gobernado.
      MuiTab: {
        styleOverrides: {
          root: {
            fontSize: controlText.md
          }
        }
      },
      // Dialog title — TASK-1038: usa h6 (=label-md 14, chico) → section-title 16/600.
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontSize: typographyScale.sectionTitle.fontSize,
            fontWeight: typographyScale.sectionTitle.fontWeight
          }
        }
      }
    }
  }

  return deepmerge(coreTheme(settings, mode, direction), userTheme as Theme)
}

export default mergedTheme
