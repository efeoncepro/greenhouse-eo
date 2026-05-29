import type { ReactElement, ReactNode } from 'react'

import { render } from '@testing-library/react'

import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'

import type { RenderOptions } from '@testing-library/react'

// Mirrors the Greenhouse shape tokens (GREENHOUSE_DESIGN_TOKENS_V1.md §5.1) so
// primitives that consume `theme.shape.customBorderRadius.*` can be unit-tested
// without pulling the full Vuexy theme graph. TASK-946 — extends with
// `palette.customColors` mirror (canonical V1 palette light) so primitives
// reading `theme.palette.customColors.lightAlloy` / `midnight` etc. testean
// sin pull del Vuexy theme completo.
const theme = createTheme({
  shape: {
    customBorderRadius: {
      xs: 2,
      sm: 4,
      md: 6,
      lg: 8,
      xl: 10
    }
  },
  palette: {
    customColors: {
      bodyBg: '#F8F9FA',
      chatBg: '#F3F5F7',
      greyLightBg: '#FAFBFC',
      inputBorder: 'rgba(38, 43, 67, 0.22)',
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
  } as Record<string, unknown>
})

const TestThemeProvider = ({ children }: { children: ReactNode }) => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  )
}

export const renderWithTheme = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => {
  return render(ui, { wrapper: TestThemeProvider, ...options })
}
