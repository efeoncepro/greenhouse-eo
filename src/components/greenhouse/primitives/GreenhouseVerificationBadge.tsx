'use client'

import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Typography from '@mui/material/Typography'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

import BrandWordmark from '@/components/greenhouse/BrandWordmark'

export type GreenhouseVerificationBadgeKind = 'efeonce' | 'talentVerified'
export type GreenhouseVerificationBadgeLocale = 'es' | 'en'
export type GreenhouseVerificationBadgeSize = 'small' | 'medium'

export type GreenhouseVerificationBadgeProps = {
  kind?: GreenhouseVerificationBadgeKind
  locale?: GreenhouseVerificationBadgeLocale
  size?: GreenhouseVerificationBadgeSize
  sx?: SxProps<Theme>
}

const SIZE_CONFIG = {
  small: {
    minHeight: 28,
    paddingInline: 8,
    paddingBlock: 4,
    gap: 5,
    textVariant: 'caption' as const,
    iconSize: 14,
    markSize: 20,
    wordmarkHeight: 12,
    wordmarkMaxWidth: 66,
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
    markSize: 26,
    wordmarkHeight: 16,
    wordmarkMaxWidth: 88,
    borderRadius: 6,
    dividerHeight: 16
  }
}

const COPY: Record<GreenhouseVerificationBadgeKind, Record<GreenhouseVerificationBadgeLocale, { label: string; ariaLabel: string }>> = {
  efeonce: {
    es: {
      label: 'Verificado por',
      ariaLabel: 'Verificado por Efeonce'
    },
    en: {
      label: 'Verified by',
      ariaLabel: 'Verified by Efeonce'
    }
  },
  talentVerified: {
    es: {
      label: 'Talento verificado',
      ariaLabel: 'Talento verificado por Efeonce'
    },
    en: {
      label: 'Verified talent',
      ariaLabel: 'Talent verified by Efeonce'
    }
  }
}

const inkColor = (theme: Theme) => (theme.palette.mode === 'dark' ? theme.palette.common.white : theme.palette.grey[900])

/**
 * GreenhouseVerificationBadge
 *
 * Canonical verification lockup for Efeonce-backed verification. Add new kinds
 * only when a policy defines what was verified; never compose wordmark + chip
 * ad-hoc in product routes.
 */
const GreenhouseVerificationBadge = ({
  kind = 'efeonce',
  locale = 'es',
  size = 'small',
  sx
}: GreenhouseVerificationBadgeProps) => {
  const config = SIZE_CONFIG[size]
  const copy = COPY[kind][locale]

  return (
    <Box
      component='span'
      role='img'
      aria-label={copy.ariaLabel}
      sx={[
        theme => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: `${config.gap}px`,
          minHeight: config.minHeight,
          paddingInline: `${config.paddingInline}px`,
          paddingBlock: `${config.paddingBlock}px`,
          borderRadius: `${config.borderRadius}px`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.28)}`,
          backgroundColor: alpha(theme.palette.primary.main, 0.045),
          color: inkColor(theme),
          whiteSpace: 'nowrap',
          transition: theme.transitions.create(['box-shadow', 'border-color', 'background-color'], {
            duration: theme.transitions.duration.shorter
          }),
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.42),
            backgroundColor: alpha(theme.palette.primary.main, 0.07),
            boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.08)}`
          }
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Box
        component='span'
        sx={theme => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          inlineSize: config.markSize,
          blockSize: config.markSize,
          borderRadius: '50%',
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          color: 'primary.main',
          flexShrink: 0
        })}
      >
        <i className='tabler-shield-check' style={{ fontSize: config.iconSize }} aria-hidden='true' />
      </Box>

      <Typography
        variant={config.textVariant}
        component='span'
        sx={theme => ({ color: inkColor(theme) })}
      >
        {copy.label}
      </Typography>

      <Divider
        orientation='vertical'
        flexItem
        sx={theme => ({
          height: config.dividerHeight,
          alignSelf: 'center',
          borderColor: alpha(theme.palette.primary.main, 0.2),
          mx: 0.25
        })}
      />

      <BrandWordmark
        brand='efeonce'
        height={config.wordmarkHeight}
        maxWidth={config.wordmarkMaxWidth}
        imgSx={{ display: 'block', opacity: 0.86 }}
      />
    </Box>
  )
}

export default GreenhouseVerificationBadge
