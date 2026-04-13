'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'
import type { TeamCapacityProjectBreakdown } from '@/types/team'

const palette = [
  GH_COLORS.role.account.source,
  GH_COLORS.role.operations.source,
  GH_COLORS.role.strategy.source,
  GH_COLORS.role.design.source,
  GH_COLORS.role.development.source,
  GH_COLORS.role.media.source,
  GH_COLORS.chart.success,
  GH_COLORS.chart.warning
]

type TeamLoadBarProps = {
  items: TeamCapacityProjectBreakdown[]
  emptyLabel: string
}

const TeamLoadBar = ({ items, emptyLabel }: TeamLoadBarProps) => {
  const total = items.reduce((sum, item) => sum + Math.max(item.activeCount, 0), 0)

  if (items.length === 0 || total <= 0) {
    return (
      <Typography variant='caption' color='text.secondary'>
        {emptyLabel}
      </Typography>
    )
  }

  return (
    <Stack spacing={1.25}>
      <Box
        sx={{
          display: 'flex',
          height: 12,
          overflow: 'hidden',
          borderRadius: 999,
          bgcolor: theme => theme.palette.customColors.lightAlloy
        }}
      >
        {items.map((item, index) => (
          <Box
            key={`${item.projectId || item.projectName}-${index}`}
            sx={{
              width: `${Math.max(item.activeCount, 0) / total * 100}%`,
              bgcolor: palette[index % palette.length],
              transition: 'width 200ms ease'
            }}
            title={`${item.projectName}: ${item.activeCount}`}
          />
        ))}
      </Box>

      <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
        {items.map((item, index) => (
          <Stack key={`${item.projectId || item.projectName}-label-${index}`} direction='row' spacing={0.75} alignItems='center'>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: 999,
                bgcolor: palette[index % palette.length]
              }}
            />
            <Typography variant='caption' color='text.secondary'>
              {item.projectName} · {item.activeCount}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  )
}

export default TeamLoadBar
