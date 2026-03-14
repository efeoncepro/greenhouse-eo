'use client'

import Chip from '@mui/material/Chip'
import { alpha } from '@mui/material/styles'

import { GH_COLORS } from '@/config/greenhouse-nomenclature'

type TeamSignalChipProps = {
  label: string
  tone: 'success' | 'warning' | 'error' | 'default' | 'info' | 'primary' | 'secondary'
  icon?: string
  size?: 'small' | 'medium'
}

const getToneStyles = (tone: TeamSignalChipProps['tone']) => {
  switch (tone) {
    case 'success':
      return GH_COLORS.semaphore.green
    case 'warning':
      return GH_COLORS.semaphore.yellow
    case 'error':
      return GH_COLORS.semaphore.red
    case 'info':
    case 'primary':
      return GH_COLORS.semantic.info
    case 'secondary':
      return {
        source: GH_COLORS.neutral.textPrimary,
        bg: alpha(GH_COLORS.neutral.textPrimary, 0.08),
        text: GH_COLORS.neutral.textPrimary
      }
    default:
      return {
        source: GH_COLORS.neutral.textSecondary,
        bg: alpha(GH_COLORS.neutral.textSecondary, 0.12),
        text: GH_COLORS.neutral.textSecondary
      }
  }
}

const TeamSignalChip = ({ label, tone, icon, size = 'small' }: TeamSignalChipProps) => {
  const palette = getToneStyles(tone)

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
