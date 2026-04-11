'use client'

import LinearProgress from '@mui/material/LinearProgress'
import { alpha, useTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'

type TeamProgressBarProps = {
  value: number
  tone: 'success' | 'warning' | 'error' | 'default' | 'info'
}

const getBarColor = (tone: TeamProgressBarProps['tone'], theme: Theme) => {
  switch (tone) {
    case 'success':
      return GH_COLORS.semaphore.green.source
    case 'warning':
      return GH_COLORS.semaphore.yellow.source
    case 'error':
      return GH_COLORS.semaphore.red.source
    case 'info':
      return theme.palette.info.main
    default:
      return theme.palette.text.secondary
  }
}

const TeamProgressBar = ({ value, tone }: TeamProgressBarProps) => {
  const theme = useTheme()
  const color = getBarColor(tone, theme)

  return (
    <LinearProgress
      variant='determinate'
      value={value}
      sx={{
        height: 10,
        borderRadius: 999,
        bgcolor: alpha(color, 0.14),
        '& .MuiLinearProgress-bar': {
          borderRadius: 999,
          bgcolor: color
        }
      }}
    />
  )
}

export default TeamProgressBar
