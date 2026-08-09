// MUI Imports
import type { Theme } from '@mui/material/styles'

const breadcrumbs: Theme['components'] = {
  MuiBreadcrumbs: {
    styleOverrides: {
      root: {
        '& svg, & i': {
          fontSize: '1.25rem'
        },
        '& a': {
          textDecoration: 'none',
          // Link-sized breadcrumb text needs the dark semantic ramp for WCAG AA in light mode.
          color: 'var(--mui-palette-primary-dark)'
        }
      },
      li: ({ theme }) => ({
        lineHeight: theme.typography.body1.lineHeight,
        '& > *:not(a)': {
          color: 'var(--mui-palette-text-primary)'
        }
      })
    }
  }
}

export default breadcrumbs
