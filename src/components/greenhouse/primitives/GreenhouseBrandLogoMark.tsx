'use client'

import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'

import {
  GREENHOUSE_BRAND_LOGO_SIZE_CONFIG,
  resolveGreenhouseBrandLogoKind,
  resolveGreenhouseBrandLogoVariant,
  type GreenhouseBrandLogoKind,
  type GreenhouseBrandLogoSize,
  type GreenhouseBrandLogoVariant
} from './greenhouse-brand-logo-controller'

export interface GreenhouseBrandLogoMarkProps {
  kind?: GreenhouseBrandLogoKind
  variant?: GreenhouseBrandLogoVariant
  size?: GreenhouseBrandLogoSize
  decorative?: boolean
  ariaLabel?: string
  dataCapture?: string
  sx?: SxProps<Theme>
}

const GreenhouseBrandLogoMark = ({
  kind = 'geminiIsotype',
  variant,
  size = 'medium',
  decorative = false,
  ariaLabel,
  dataCapture,
  sx
}: GreenhouseBrandLogoMarkProps) => {
  const config = resolveGreenhouseBrandLogoKind(kind)
  const resolvedVariant = resolveGreenhouseBrandLogoVariant({ kind, variant })
  const sizeConfig = GREENHOUSE_BRAND_LOGO_SIZE_CONFIG[size]
  const resolvedAriaLabel = ariaLabel ?? config.ariaLabel
  const isContained = resolvedVariant === 'contained'
  const isLockup = resolvedVariant === 'lockup'
  const markSize = isLockup ? sizeConfig.lockupMark : isContained ? sizeConfig.badge : sizeConfig.mark
  const assetInlineSize = isLockup ? markSize * (config.assetAspectRatio ?? 1) : markSize

  return (
    <Box
      component='span'
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : resolvedAriaLabel}
      aria-hidden={decorative ? 'true' : undefined}
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={resolvedVariant}
      sx={[
        theme => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          inlineSize: isLockup ? assetInlineSize : markSize,
          blockSize: isLockup ? markSize : markSize,
          color: theme.palette.text.primary,
          whiteSpace: 'nowrap',
          verticalAlign: 'middle'
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Box
        component='span'
        sx={{
          display: 'inline-grid',
          placeItems: 'center',
          inlineSize: assetInlineSize,
          blockSize: markSize,
          borderRadius: 0,
          backgroundColor: 'transparent',
          boxShadow: 'none',
          overflow: 'hidden',
          '& img': {
            display: 'block',
            inlineSize: '100%',
            blockSize: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none'
          }
        }}
      >
        <Box component='img' src={config.assetSrc} alt='' aria-hidden='true' draggable={false} />
      </Box>
    </Box>
  )
}

export default GreenhouseBrandLogoMark
