'use client'

import LinearProgress from '@mui/material/LinearProgress'
import { alpha } from '@mui/material/styles'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'

type TeamProgressBarProps = {
  value: number
  tone: 'success' | 'warning' | 'error' | 'default' | 'info'
}

const getBarColor = (tone: TeamProgressBarProps['tone']) => {
  switch (tone) {
    case 'success':
      return GH_COLORS.semaphore.green.source
    case 'warning':
      return GH_COLORS.semaphore.yellow.source
    case 'error':
      return GH_COLORS.semaphore.red.source
    case 'info':
      return GH_COLORS.semantic.info.source
    default:
      return GH_COLORS.neutral.textSecondary
  }
}

const TeamProgressBar = ({ value, tone }: TeamProgressBarProps) => {
  const color = getBarColor(tone)

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
