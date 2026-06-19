'use client'

import Box from '@mui/material/Box'
import type { SxProps, Theme } from '@mui/material/styles'

import {
  GREENHOUSE_BRAND_LOGO_ASSET_COLORS,
  GREENHOUSE_BRAND_LOGO_SIZE_CONFIG,
  resolveGreenhouseBrandLogoKind,
  resolveGreenhouseBrandLogoVariant,
  type GreenhouseBrandLogoKind,
  type GreenhouseBrandLogoSize,
  type GreenhouseBrandLogoVariant
} from './greenhouse-brand-logo-controller'

const GEMINI_GRADIENT_ID = 'gh-brand-logo-gemini-gradient'

export interface GreenhouseBrandLogoMarkProps {
  kind?: GreenhouseBrandLogoKind
  variant?: GreenhouseBrandLogoVariant
  size?: GreenhouseBrandLogoSize
  decorative?: boolean
  ariaLabel?: string
  dataCapture?: string
  sx?: SxProps<Theme>
}

const GeminiSparkle = ({
  gradientId,
  tone
}: {
  gradientId: string
  tone: 'geminiBlue' | 'geminiFullColor' | 'geminiOnBlue' | 'geminiOnNeutral'
}) => {
  const fill =
    tone === 'geminiFullColor'
      ? `url(#${gradientId})`
      : tone === 'geminiOnBlue'
        ? 'rgb(255 255 255)'
        : GREENHOUSE_BRAND_LOGO_ASSET_COLORS.geminiBlue

  return (
    <svg viewBox='0 0 64 64' aria-hidden='true' focusable='false'>
      <defs>
        <linearGradient id={gradientId} x1='10' x2='54' y1='10' y2='54' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor={GREENHOUSE_BRAND_LOGO_ASSET_COLORS.geminiRed} />
          <stop offset='0.32' stopColor={GREENHOUSE_BRAND_LOGO_ASSET_COLORS.geminiYellow} />
          <stop offset='0.58' stopColor={GREENHOUSE_BRAND_LOGO_ASSET_COLORS.geminiGreen} />
          <stop offset='1' stopColor={GREENHOUSE_BRAND_LOGO_ASSET_COLORS.geminiBlue} />
        </linearGradient>
      </defs>
      <path
        fill={fill}
        d='M32 2c3.4 14.2 15.8 26.6 30 30-14.2 3.4-26.6 15.8-30 30C28.6 47.8 16.2 35.4 2 32 16.2 28.6 28.6 16.2 32 2Z'
      />
      <path
        fill='rgb(255 255 255)'
        opacity={tone === 'geminiOnBlue' ? 0.92 : 0}
        d='M31.8 16c1.85 7.95 8.25 14.35 16.2 16.2-7.95 1.85-14.35 8.25-16.2 16.2-1.85-7.95-8.25-14.35-16.2-16.2 7.95-1.85 14.35-8.25 16.2-16.2Z'
      />
    </svg>
  )
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
  const hasAsset = Boolean(config.assetSrc)
  const assetInlineSize = isLockup && hasAsset ? markSize * (config.assetAspectRatio ?? 1) : markSize

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
          gap: isLockup && !hasAsset ? `${sizeConfig.lockupGap}px` : 0,
          inlineSize: isLockup ? (hasAsset ? assetInlineSize : 'auto') : markSize,
          blockSize: isLockup ? (hasAsset ? markSize : 'auto') : markSize,
          color: theme.palette.text.primary,
          whiteSpace: 'nowrap',
          verticalAlign: 'middle'
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Box
        component='span'
        sx={theme => ({
          display: 'inline-grid',
          placeItems: 'center',
          inlineSize: assetInlineSize,
          blockSize: markSize,
          borderRadius: hasAsset ? 0 : isContained ? '50%' : 0,
          backgroundColor:
            hasAsset
              ? 'transparent'
              : config.tone === 'geminiOnBlue'
              ? GREENHOUSE_BRAND_LOGO_ASSET_COLORS.geminiBlue
              : config.tone === 'geminiOnNeutral'
                ? theme.palette.background.default
                : 'transparent',
          boxShadow: !hasAsset && isContained ? `0 0 0 1px ${theme.palette.divider} inset` : 'none',
          overflow: 'hidden',
          '& svg': {
            display: 'block',
            inlineSize: isContained ? '52%' : '100%',
            blockSize: isContained ? '52%' : '100%'
          },
          '& img': {
            display: 'block',
            inlineSize: '100%',
            blockSize: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none'
          }
        })}
      >
        {config.assetSrc ? (
          <Box component='img' src={config.assetSrc} alt='' aria-hidden='true' draggable={false} />
        ) : (
          <GeminiSparkle
            gradientId={GEMINI_GRADIENT_ID}
            tone={config.tone as 'geminiBlue' | 'geminiFullColor' | 'geminiOnBlue' | 'geminiOnNeutral'}
          />
        )}
      </Box>

      {isLockup && config.label ? (
        <Box
          component='span'
          sx={theme => ({
            ...theme.typography.h3,
            color: theme.palette.text.primary,
            fontSize: sizeConfig.lockupLabelFontSize,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: 0
          })}
        >
          {config.label}
        </Box>
      ) : null}
    </Box>
  )
}

export default GreenhouseBrandLogoMark
