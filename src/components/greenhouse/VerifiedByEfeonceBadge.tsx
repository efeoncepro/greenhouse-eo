'use client'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import BrandWordmark from './BrandWordmark'

export type VerificationBadgeLocale = 'es' | 'en'

type VerifiedByEfeonceBadgeProps = {
  locale?: VerificationBadgeLocale
  size?: 'small' | 'medium'
}

const SIZE_CONFIG = {
  small: {
    minHeight: 30,
    paddingInline: 10,
    paddingBlock: 4,
    gap: 6,
    textVariant: 'caption' as const,
    iconSize: 15,
    wordmarkHeight: 13,
    wordmarkMaxWidth: 72,
    borderRadius: 6,
    dividerHeight: 14
  },
  medium: {
    minHeight: 38,
    paddingInline: 14,
    paddingBlock: 6,
    gap: 8,
    textVariant: 'body2' as const,
    iconSize: 18,
    wordmarkHeight: 16,
    wordmarkMaxWidth: 88,
    borderRadius: 6,
    dividerHeight: 16
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
        gap: `${config.gap}px`,
        minHeight: config.minHeight,
        paddingInline: `${config.paddingInline}px`,
        paddingBlock: `${config.paddingBlock}px`,
        borderRadius: `${config.borderRadius}px`,
        border: theme => `1.5px solid ${alpha(theme.palette.primary.main, 0.35)}`,
        backgroundColor: theme => alpha(theme.palette.primary.main, 0.06),
        whiteSpace: 'nowrap',
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: theme => `0 0 0 3px ${alpha(theme.palette.primary.main, 0.08)}`
        }
      }}
    >
      {/* Shield icon */}
      <Box
        component='span'
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: config.iconSize + 6,
          height: config.iconSize + 6,
          borderRadius: '50%',
          backgroundColor: theme => alpha(theme.palette.primary.main, 0.12),
          color: 'primary.main',
          flexShrink: 0
        }}
      >
        <i className='tabler-shield-check' style={{ fontSize: config.iconSize }} aria-hidden='true' />
      </Box>

      {/* Label text */}
      <Typography
        variant={config.textVariant}
        component='span'
        sx={{
          color: 'text.secondary',
          fontWeight: 500,
          lineHeight: 1.2,
          letterSpacing: '0.01em'
        }}
      >
        {copy.label}
      </Typography>

      {/* Separator */}
      <Divider
        orientation='vertical'
        flexItem
        sx={{
          height: config.dividerHeight,
          alignSelf: 'center',
          borderColor: theme => alpha(theme.palette.primary.main, 0.2),
          mx: 0.25
        }}
      />

      {/* Brand wordmark */}
      <BrandWordmark
        brand='efeonce'
        height={config.wordmarkHeight}
        maxWidth={config.wordmarkMaxWidth}
        imgSx={{ display: 'block', opacity: 0.85 }}
      />
    </Box>
  )
}

export default VerifiedByEfeonceBadge
