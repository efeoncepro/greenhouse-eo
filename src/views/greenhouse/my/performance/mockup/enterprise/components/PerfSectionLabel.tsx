// TASK-1075 — hairline overline label shared across the brief modules.
import type { ReactNode } from 'react'

import Typography from '@mui/material/Typography'

const PerfSectionLabel = ({ children }: { children: ReactNode }) => (
  <Typography variant='overline' sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}>
    {children}
  </Typography>
)

export default PerfSectionLabel
