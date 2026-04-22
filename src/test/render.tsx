import type { ReactElement, ReactNode } from 'react'

import { render } from '@testing-library/react'

import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'

import type { RenderOptions } from '@testing-library/react'

// Mirrors the Greenhouse shape tokens (GREENHOUSE_DESIGN_TOKENS_V1.md §5.1) so
// primitives that consume `theme.shape.customBorderRadius.*` can be unit-tested
// without pulling the full Vuexy theme graph.
const theme = createTheme({
  shape: {
    customBorderRadius: {
      xs: 2,
      sm: 4,
      md: 6,
      lg: 8,
      xl: 10
    }
  }
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
