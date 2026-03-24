import type { ReactElement, ReactNode } from 'react'

import { render } from '@testing-library/react'

import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider, createTheme } from '@mui/material/styles'

import type { RenderOptions } from '@testing-library/react'

const theme = createTheme()

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
