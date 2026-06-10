'use client'

// TASK-1075 — supporting metrics module: the other 5 ICO metrics as a flat scannable
// ribbon (value + delta + sparkline), hairline-separated. Secondary to the hero story.
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'

import PerfPanel from './PerfPanel'
import PerfSparkline from './PerfSparkline'
import { toneColor, deltaColor } from './tone'
import type { RibbonMetric } from '../data'

const RibbonItem = ({ m }: { m: RibbonMetric }) => {
  const theme = useTheme()

  return (
    <Stack spacing={0.75} sx={{ flex: 1, minWidth: 0, px: { xs: 0, md: 2.5 } }}>
      <Stack direction='row' alignItems='baseline' spacing={1}>
        <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
          {m.code}
        </Typography>
        <Typography variant='caption' sx={{ color: 'text.disabled' }}>
          {m.name}
        </Typography>
      </Stack>
      <Stack direction='row' alignItems='flex-end' justifyContent='space-between'>
        <Stack spacing={0}>
          <Typography variant='h5' sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {m.value}
          </Typography>
          {m.delta && (
            <Typography variant='caption' sx={{ color: deltaColor(theme, m.deltaGood), fontVariantNumeric: 'tabular-nums' }}>
              {m.delta}
            </Typography>
          )}
        </Stack>
        <PerfSparkline data={m.series} color={toneColor(theme, m.tone)} />
      </Stack>
    </Stack>
  )
}

const MetricsRibbonPanel = ({ metrics }: { metrics: RibbonMetric[] }) => (
  <PerfPanel label='Tus otras métricas del mes'>
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      divider={<Divider orientation='vertical' flexItem sx={{ display: { xs: 'none', md: 'block' } }} />}
      spacing={{ xs: 3, md: 0 }}
    >
      {metrics.map(m => (
        <RibbonItem key={m.id} m={m} />
      ))}
    </Stack>
  </PerfPanel>
)

export default MetricsRibbonPanel
