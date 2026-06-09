/*
 ! This file is for adding custom types to the MUI theme, components and props.
 ! Please do not remove anything from this file as it may break the application.
 ! You can add your own custom types to the MUI theme, components and props in this file
 ! but you must be aware about the MUI theme structure along with MUI CSS Variables.
 ! MUI Theme: https://mui.com/material-ui/customization/default-theme/
 ! MUI CSS Variables: https://mui.com/material-ui/experimental-api/css-theme-variables/overview/
 */

// MUI Imports
import type { ComponentsOverrides } from '@mui/material/styles'

// Type Imports
import type {
  CustomInputHorizontalProps,
  CustomInputVerticalProps,
  CustomInputImgProps
} from '@core/components/custom-inputs/types'
import type { AxisTokens } from '@core/theme/axis-tokens'
import type { GreenhouseElevationLevel, GreenhouseElevationToken } from './elevation-tokens'
import type { GreenhouseSemanticRole, GreenhouseSemanticToken } from './greenhouse-semantic-tokens'

declare module '@mui/material/styles' {
   
  // Theme
  interface Theme {
    shape: {
      borderRadius: number
      customBorderRadius: {
        xs: number
        sm: number
        md: number
        lg: number
        xl: number
        xxl: number
        display: number
      }
    }
    customShadows: {
      xs: string
      sm: string
      md: string
      lg: string
      xl: string
      primary: {
        sm: string
        md: string
        lg: string
      }
      secondary: {
        sm: string
        md: string
        lg: string
      }
      error: {
        sm: string
        md: string
        lg: string
      }
      warning: {
        sm: string
        md: string
        lg: string
      }
      info: {
        sm: string
        md: string
        lg: string
      }
      success: {
        sm: string
        md: string
        lg: string
      }
    }
    mainColorChannels: {
      light: string
      dark: string
      lightShadow: string
      darkShadow: string
    }
    /**
     * Line-height tokens canónicos (v1.3+). Source of truth:
     * `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` §3.6.
     * Implementación: `src/components/theme/typography-tokens.ts`.
     */
    lineHeights: {
      display: number
      heading: number
      surfaceHero: number
      pageTitle: number
      metadata: number
      body: number
      numericDense: number
    }
    /**
     * AXIS primitive design tokens (full ramps + opacity + neutrals).
     * Source of truth in code: `src/@core/theme/axis-tokens.ts` (mirrors AXIS Figma).
     * Consume the semantic layer (`theme.palette.*`) in components; reach into
     * `theme.axis.ramp.*` only for a specific ramp step.
     */
    axis: AxisTokens
    /**
     * Greenhouse semantic elevation roles (TASK-1049). Source of truth:
     * `src/components/theme/elevation-tokens.ts`. Read a ROLE
     * (`theme.greenhouseElevation.floating`) — never `Paper elevation={n}` nor
     * `theme.shadows[n]` for new Greenhouse primitives.
     */
    greenhouseElevation: Record<GreenhouseElevationLevel, GreenhouseElevationToken>
    /**
     * Greenhouse semantic feedback roles (TASK-1053 Fase B). Source of truth:
     * `src/components/theme/greenhouse-semantic-tokens.ts`. Read a ROLE
     * (`theme.greenhouseSemantic.warning.tonalText`) for the tonal-by-default
     * treatment — never `palette.<role>.main` as a tonal TEXT color (that is the
     * fill, not the ink; e.g. warning.main amber fails as text).
     */
    greenhouseSemantic: Record<GreenhouseSemanticRole, GreenhouseSemanticToken>
  }
  interface ThemeOptions {
    shape?: {
      borderRadius?: number
      customBorderRadius?: {
        xs?: number
        sm?: number
        md?: number
        lg?: number
        xl?: number
        xxl?: number
        display?: number
      }
    }
    customShadows?: {
      xs?: string
      sm?: string
      md?: string
      lg?: string
      xl?: string
      primary?: {
        sm?: string
        md?: string
        lg?: string
      }
      secondary?: {
        sm?: string
        md?: string
        lg?: string
      }
      error?: {
        sm?: string
        md?: string
        lg?: string
      }
      warning?: {
        sm?: string
        md?: string
        lg?: string
      }
      info?: {
        sm?: string
        md?: string
        lg?: string
      }
      success?: {
        sm?: string
        md?: string
        lg?: string
      }
    }
    mainColorChannels?: {
      light?: string
      dark?: string
      lightShadow?: string
      darkShadow?: string
    }
    lineHeights?: Partial<{
      display: number
      heading: number
      surfaceHero: number
      pageTitle: number
      metadata: number
      body: number
      numericDense: number
    }>
    axis?: AxisTokens
    greenhouseElevation?: Partial<Record<GreenhouseElevationLevel, GreenhouseElevationToken>>
    greenhouseSemantic?: Partial<Record<GreenhouseSemanticRole, GreenhouseSemanticToken>>
  }

  // Custom Typography Variants
  interface TypographyVariants {
    surfaceHeroTitle: React.CSSProperties
    disclosureText: React.CSSProperties
    monoId: React.CSSProperties
    monoAmount: React.CSSProperties
    kpiValue: React.CSSProperties
  }
  interface TypographyVariantsOptions {
    surfaceHeroTitle?: React.CSSProperties
    disclosureText?: React.CSSProperties
    monoId?: React.CSSProperties
    monoAmount?: React.CSSProperties
    kpiValue?: React.CSSProperties
  }

  // Palette Color
  interface PaletteColor {
    lighterOpacity?: string
    lightOpacity?: string
    mainOpacity?: string
    darkOpacity?: string
    darkerOpacity?: string
  }
  interface SimplePaletteColorOptions {
    lighterOpacity?: string
    lightOpacity?: string
    mainOpacity?: string
    darkOpacity?: string
    darkerOpacity?: string
  }

  // Palette
  interface Palette {
    customColors: {
      bodyBg: string
      chatBg: string
      greyLightBg: string
      inputBorder: string
      tableHeaderBg: string
      tooltipText: string
      trackBg: string
      midnight?: string
      deepAzure?: string
      royalBlue?: string
      coreBlue?: string
      lightAlloy?: string
      bodyText?: string
      secondaryText?: string
      claimGray?: string
    }
  }
  interface PaletteOptions {
    customColors?: {
      bodyBg?: string
      chatBg?: string
      greyLightBg?: string
      inputBorder?: string
      tableHeaderBg?: string
      tooltipText?: string
      trackBg?: string
      midnight?: string
      deepAzure?: string
      royalBlue?: string
      coreBlue?: string
      lightAlloy?: string
      bodyText?: string
      secondaryText?: string
      claimGray?: string
    }
  }

  // Components
  interface ComponentNameToClassKey {
    MuiCustomInputHorizontal: 'root' | 'title' | 'meta' | 'content' | 'input'
    MuiCustomInputVertical: 'root' | 'title' | 'content' | 'input'
    MuiCustomImage: 'root' | 'image' | 'input'
  }

  interface ComponentsPropsList {
    MuiCustomInputHorizontal: CustomInputHorizontalProps
    MuiCustomInputVertical: CustomInputVerticalProps
    MuiCustomImage: CustomInputImgProps
  }

  interface Components {
    MuiCustomInputHorizontal?: {
      defaultProps?: ComponentsPropsList['MuiCustomInputHorizontal']
      styleOverrides?: ComponentsOverrides<Theme>['MuiCustomInputHorizontal']
    }
    MuiCustomInputVertical?: {
      defaultProps?: ComponentsPropsList['MuiCustomInputVertical']
      styleOverrides?: ComponentsOverrides<Theme>['MuiCustomInputVertical']
    }
    MuiCustomImage?: {
      defaultProps?: ComponentsPropsList['MuiCustomImage']
      styleOverrides?: ComponentsOverrides<Theme>['MuiCustomImage']
    }
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    surfaceHeroTitle: true
    disclosureText: true
    monoId: true
    monoAmount: true
    kpiValue: true
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    tonal: true
  }
}

declare module '@mui/material/ButtonGroup' {
  interface ButtonGroupPropsVariantOverrides {
    tonal: true
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    tonal: true
  }
}

declare module '@mui/material/Pagination' {
  interface PaginationPropsVariantOverrides {
    tonal: true
  }
}

declare module '@mui/material/PaginationItem' {
  interface PaginationItemPropsVariantOverrides {
    tonal: true
  }
}

declare module '@mui/lab/TimelineDot' {
  interface TimelineDotPropsVariantOverrides {
    tonal: true
  }
}
