'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import BrandWordmark from './BrandWordmark'
import GhIcon from './GhIcon'

export type VerificationBadgeLocale = 'es' | 'en'

type VerifiedByEfeonceBadgeProps = {
  locale?: VerificationBadgeLocale
  size?: 'small' | 'medium'
}

const SIZE_CONFIG = {
  small: {
    minHeight: 28,
    paddingInline: 10,
    gap: 6,
    textVariant: 'caption' as const,
    iconSize: 14,
    wordmarkHeight: 12,
    wordmarkMaxWidth: 72
  },
  medium: {
    minHeight: 34,
    paddingInline: 12,
    gap: 8,
    textVariant: 'body2' as const,
    iconSize: 16,
    wordmarkHeight: 14,
    wordmarkMaxWidth: 84
  }
}

const COPY: Record<VerificationBadgeLocale, { label: string; ariaLabel: string }> = {
  es: {
    label: 'Verificado por',
    ariaLabel: 'Verificado por Efeonce'
  },
  en: {
    label: 'Verified by',
    ariaLabel: 'Verified by Efeonce'
  }
}

const VerifiedByEfeonceBadge = ({ locale = 'es', size = 'small' }: VerifiedByEfeonceBadgeProps) => {
  const config = SIZE_CONFIG[size]
  const copy = COPY[locale]

  return (
    <Box
      component='span'
      role='img'
      aria-label={copy.ariaLabel}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: config.gap,
        minHeight: config.minHeight,
        paddingInline: `${config.paddingInline}px`,
        borderRadius: '8px',
        border: theme => `1px solid ${alpha(theme.palette.info.main, 0.28)}`,
        backgroundColor: theme => alpha(theme.palette.info.main, 0.1),
        color: 'info.main',
        whiteSpace: 'nowrap'
      }}
    >
      <GhIcon icon='verified' size={config.iconSize} />

      <Typography
        variant={config.textVariant}
        component='span'
        sx={{
          color: 'info.main',
          fontWeight: 600,
          lineHeight: 1.2
        }}
      >
        {copy.label}
      </Typography>

      <BrandWordmark
        brand='efeonce'
        height={config.wordmarkHeight}
        maxWidth={config.wordmarkMaxWidth}
        imgSx={{
          display: 'block'
        }}
      />
    </Box>
  )
}

export default VerifiedByEfeonceBadge
