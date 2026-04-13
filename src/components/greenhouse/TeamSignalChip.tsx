'use client'

import Chip from '@mui/material/Chip'
import { alpha, useTheme } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'

type TeamSignalChipProps = {
  label: string
  tone: 'success' | 'warning' | 'error' | 'default' | 'info' | 'primary' | 'secondary'
  icon?: string
  size?: 'small' | 'medium'
}

const getToneStyles = (tone: TeamSignalChipProps['tone'], theme: Theme) => {
  switch (tone) {
    case 'success':
      return GH_COLORS.semaphore.green
    case 'warning':
      return GH_COLORS.semaphore.yellow
    case 'error':
      return GH_COLORS.semaphore.red
    case 'info':
    case 'primary':
      return {
        source: theme.palette.info.main,
        bg: theme.palette.info.lighterOpacity,
        text: theme.palette.info.main
      }
    case 'secondary':
      return {
        source: theme.palette.customColors.midnight ?? '',
        bg: alpha(theme.palette.customColors.midnight ?? '', 0.08),
        text: theme.palette.customColors.midnight ?? ''
      }
    default:
      return {
        source: theme.palette.text.secondary,
        bg: alpha(theme.palette.text.secondary, 0.12),
        text: theme.palette.text.secondary
      }
  }
}

const TeamSignalChip = ({ label, tone, icon, size = 'small' }: TeamSignalChipProps) => {
  const theme = useTheme()
  const palette = getToneStyles(tone, theme)

  return (
    <Chip
      size={size}
      label={label}
      icon={icon ? <i className={`${icon} text-[14px]`} /> : undefined}
      sx={{
        bgcolor: palette.bg,
        color: palette.text,
        border: `1px solid ${alpha(palette.source, 0.24)}`,
        '& .MuiChip-icon': {
          color: palette.text
        }
      }}
    />
  )
}

export default TeamSignalChip
