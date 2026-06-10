// TASK-1075 — the modular surface for a performance section.
// A flat hairline-bordered panel (Greenhouse 'none' elevation role): siblings on the
// canvas compose the dashboard — NOT one mega-card, NOT raw-flat. No nesting (no card-on-card).
import type { ReactNode } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import type { SxProps, Theme } from '@mui/material/styles'

import PerfSectionLabel from './PerfSectionLabel'

type PerfPanelProps = {
  children: ReactNode
  /** optional overline shown at the top of the panel */
  label?: ReactNode
  /** slot rendered on the right of the label row (e.g. cadence) */
  labelAside?: ReactNode
  sx?: SxProps<Theme>
  contentSx?: SxProps<Theme>
}

const PerfPanel = ({ children, label, labelAside, sx, contentSx }: PerfPanelProps) => (
  <Card
    elevation={0}
    sx={{
      height: '100%',
      border: theme => `1px solid ${theme.palette.divider}`,
      borderRadius: theme => `${theme.shape.customBorderRadius.lg}px`,
      bgcolor: 'background.paper',
      ...sx
    }}
  >
    <CardContent sx={{ p: { xs: 3, md: 4 }, '&:last-child': { pb: { xs: 3, md: 4 } }, ...contentSx }}>
      {label && (
        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
          <PerfSectionLabel>{label}</PerfSectionLabel>
          {labelAside}
        </Box>
      )}
      {children}
    </CardContent>
  </Card>
)

export default PerfPanel
