'use client'

// TASK-1075 — page-chrome header (lives on the canvas, not in a panel):
// eyebrow + subject on the left, period toggle on the right.
import { useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'

import PerfSectionLabel from './PerfSectionLabel'
import type { editorialBrief } from '../data'

type PerformanceHeaderProps = Pick<typeof editorialBrief, 'eyebrow' | 'member' | 'space' | 'periods'>

const PerformanceHeader = ({ eyebrow, member, space, periods }: PerformanceHeaderProps) => {
  const [period, setPeriod] = useState(periods[0]?.key ?? 'closed')

  return (
    <Stack direction='row' alignItems='flex-start' justifyContent='space-between' flexWrap='wrap' useFlexGap spacing={2}>
      <Box>
        <PerfSectionLabel>{eyebrow}</PerfSectionLabel>
        <Typography variant='subtitle1' sx={{ fontWeight: 600, color: 'text.secondary' }}>
          {member} · {space}
        </Typography>
      </Box>
      <ToggleButtonGroup
        exclusive
        size='small'
        value={period}
        onChange={(_, v) => v && setPeriod(v)}
        sx={{ '& .MuiToggleButton-root': { textTransform: 'none', px: 2 } }}
      >
        {periods.map(p => (
          <ToggleButton key={p.key} value={p.key}>
            <Stack alignItems='flex-start'>
              <Typography variant='body2' sx={{ fontWeight: 600 }}>
                {p.label}
              </Typography>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                {p.status}
              </Typography>
            </Stack>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Stack>
  )
}

export default PerformanceHeader
