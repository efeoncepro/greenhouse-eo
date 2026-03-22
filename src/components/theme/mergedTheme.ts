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

const mergedTheme = (settings: Settings, mode: SystemMode, direction: Theme['direction']) => {
  const userTheme: ThemeOptions = {
    colorSchemes: {
      light: {
        palette: {
          primary: {
            main: '#0375DB',
            light: '#3691E3',
            dark: '#024C8F'
          },
          secondary: {
            main: '#023C70',
            light: '#035A9E',
            dark: '#022A4E'
          },
          info: {
            main: '#0375DB',
            light: '#3691E3',
            dark: '#024C8F'
          },
          success: {
            main: '#6EC207'
          },
          warning: {
            main: '#FF6500'
          },
          error: {
            main: '#BB1954'
          },
          background: {
            default: '#F8F9FA',
            paper: '#FFFFFF'
          },
          text: {
            primary: '#1A1A2E',
            secondary: '#667085',
            disabled: '#848484'
          },
          customColors: {
            bodyBg: '#F8F9FA',
            chatBg: '#F3F5F7',
            greyLightBg: '#FAFBFC',
            inputBorder: 'rgb(var(--mui-mainColorChannels-light) / 0.22)',
            tableHeaderBg: '#FFFFFF',
            tooltipText: '#FFFFFF',
            trackBg: '#ECF1F5',
            midnight: '#022A4E',
            deepAzure: '#023C70',
            royalBlue: '#024C8F',
            coreBlue: '#0375DB',
            neonLime: '#6EC207',
            sunsetOrange: '#FF6500',
            crimson: '#BB1954',
            lightAlloy: '#DBDBDB',
            bodyText: '#1A1A2E',
            secondaryText: '#667085',
            claimGray: '#848484'
          }
        }
      },
      dark: {
        palette: {
          primary: {
            main: '#0375DB',
            light: '#3691E3',
            dark: '#024C8F'
          },
          secondary: {
            main: '#023C70',
            light: '#035A9E',
            dark: '#022A4E'
          },
          info: {
            main: '#3691E3',
            light: '#5AA5E8',
            dark: '#0375DB'
          },
          success: {
            main: '#6EC207'
          },
          warning: {
            main: '#FF6500'
          },
          error: {
            main: '#BB1954'
          },
          background: {
            default: '#101827',
            paper: '#162033'
          },
          text: {
            primary: '#F5F7FA',
            secondary: '#B0B9C8',
            disabled: '#7A8394'
          },
          customColors: {
            bodyBg: '#101827',
            chatBg: '#152033',
            greyLightBg: '#202C42',
            inputBorder: 'rgb(var(--mui-mainColorChannels-dark) / 0.22)',
            tableHeaderBg: '#162033',
            tooltipText: '#0F172A',
            trackBg: '#25314A',
            midnight: '#022A4E',
            deepAzure: '#023C70',
            royalBlue: '#024C8F',
            coreBlue: '#0375DB',
            neonLime: '#6EC207',
            sunsetOrange: '#FF6500',
            crimson: '#BB1954',
            lightAlloy: '#DBDBDB',
            bodyText: '#F5F7FA',
            secondaryText: '#B0B9C8',
            claimGray: '#7A8394'
          }
        }
      }
    },
    typography: {
      fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, -apple-system, sans-serif",
      h1: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
        fontWeight: 800,
        fontSize: '2rem',
        lineHeight: 1.2
      },
      h2: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
        fontWeight: 700,
        fontSize: '1.5rem',
        lineHeight: 1.25
      },
      h3: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.3
      },
      h4: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: 1.4
      },
      h5: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
        fontWeight: 600
      },
      h6: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
        fontWeight: 600
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5
      },
      caption: {
        fontSize: '0.8125rem',
        lineHeight: 1.4,
        color: '#667085'
      },
      button: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
        fontWeight: 600,
        textTransform: 'none'
      },
      overline: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
        fontWeight: 600,
        letterSpacing: '1px',
        fontSize: '0.75rem'
      },
      monoId: {
        fontFamily: 'monospace',
        fontWeight: 600,
        fontSize: '0.875rem',
        lineHeight: 1.54
      },
      monoAmount: {
        fontFamily: 'monospace',
        fontWeight: 700,
        fontSize: '0.8125rem',
        lineHeight: 1.54
      },
      kpiValue: {
        fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
        fontWeight: 800,
        fontSize: '1.75rem',
        lineHeight: 1.05
      }
    }
  }

  return deepmerge(coreTheme(settings, mode, direction), userTheme as Theme)
}

export default mergedTheme
