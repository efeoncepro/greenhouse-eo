'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

import GreenhouseNexaAnimatedMark, { type GreenhouseNexaAnimatedMarkProps } from './GreenhouseNexaAnimatedMark'
import {
  GREENHOUSE_NEXA_BRAND_COLORS,
  GREENHOUSE_NEXA_BRAND_SIZE_CONFIG,
  GREENHOUSE_NEXA_BRAND_KIND_CONFIG,
  type GreenhouseNexaBrandSize
} from './greenhouse-nexa-brand-controller'

export type GreenhouseNexaAnimatedAskBadgeProps = {
  size?: GreenhouseNexaBrandSize
  label?: string
  ariaLabel?: string
  autoBlink?: boolean
  blinkCadence?: GreenhouseNexaAnimatedMarkProps['blinkCadence']
  dataCapture?: string
  sx?: SxProps<Theme>
}

const GreenhouseNexaAnimatedAskBadge = ({
  size = 'medium',
  label = GREENHOUSE_NEXA_BRAND_KIND_CONFIG.askNexaBadge.label,
  ariaLabel,
  autoBlink = true,
  blinkCadence = 'attentive',
  dataCapture,
  sx
}: GreenhouseNexaAnimatedAskBadgeProps) => {
  const sizeConfig = GREENHOUSE_NEXA_BRAND_SIZE_CONFIG[size]
  const resolvedLabel = label ?? GREENHOUSE_NEXA_BRAND_KIND_CONFIG.askNexaBadge.ariaLabel

  return (
    <Box
      component='span'
      role='img'
      aria-label={ariaLabel ?? resolvedLabel}
      data-kind='askNexaAnimatedBadge'
      data-capture={dataCapture}
      sx={[
        theme => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${sizeConfig.gap}px`,
          minHeight: sizeConfig.minHeight,
          inlineSize: 'auto',
          paddingInline: `${sizeConfig.paddingInline}px`,
          paddingBlock: `${sizeConfig.paddingBlock}px`,
          borderRadius: sizeConfig.borderRadius,
          border: `1px solid ${alpha(theme.palette.common.white, 0.16)}`,
          backgroundColor: GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy,
          color: theme.palette.common.white,
          boxShadow: `0 1px 0 ${alpha(theme.palette.common.white, 0.12)} inset`,
          whiteSpace: 'nowrap',
          verticalAlign: 'middle'
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <GreenhouseNexaAnimatedMark
        decorative
        autoBlink={autoBlink}
        blinkCadence={blinkCadence}
        chrome='none'
        tone='onNavy'
        size={size}
        sx={{
          inlineSize: sizeConfig.iconSize,
          blockSize: sizeConfig.iconSize,
          transform: 'scale(1.22)',
          transformOrigin: 'center',
          flexShrink: 0
        }}
      />

      <Typography
        component='span'
        variant={sizeConfig.textVariant}
        sx={{
          color: 'common.white',
          lineHeight: 1,
          letterSpacing: 0
        }}
      >
        {resolvedLabel}
      </Typography>
    </Box>
  )
}

export default GreenhouseNexaAnimatedAskBadge
