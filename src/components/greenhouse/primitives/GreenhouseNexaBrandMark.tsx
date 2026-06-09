'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'

import {
  GREENHOUSE_NEXA_BRAND_COLORS,
  GREENHOUSE_NEXA_BRAND_SIZE_CONFIG,
  resolveGreenhouseNexaBrandKind,
  type GreenhouseNexaBrandKind,
  type GreenhouseNexaBrandSize
} from './greenhouse-nexa-brand-controller'

export type GreenhouseNexaBrandMarkProps = {
  kind?: GreenhouseNexaBrandKind
  size?: GreenhouseNexaBrandSize
  label?: string
  ariaLabel?: string
  dataCapture?: string
  sx?: SxProps<Theme>
}

const GreenhouseNexaBrandMark = ({
  kind = 'askNexaBadge',
  size = 'medium',
  label,
  ariaLabel,
  dataCapture,
  sx
}: GreenhouseNexaBrandMarkProps) => {
  const config = resolveGreenhouseNexaBrandKind(kind)
  const sizeConfig = GREENHOUSE_NEXA_BRAND_SIZE_CONFIG[size]
  const resolvedLabel = label ?? config.label
  const resolvedAriaLabel = ariaLabel ?? resolvedLabel ?? config.ariaLabel
  const isPill = config.chrome === 'navyPill'
  const isIconBadge = config.chrome === 'iconBadge'

  return (
    <Box
      component='span'
      role='img'
      aria-label={resolvedAriaLabel}
      data-kind={kind}
      data-capture={dataCapture}
      sx={[
        theme => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: isPill ? `${sizeConfig.gap}px` : 0,
          minHeight: isPill ? sizeConfig.minHeight : sizeConfig.iconOnlySize,
          inlineSize: isPill ? 'auto' : sizeConfig.iconOnlySize,
          paddingInline: isPill ? `${sizeConfig.paddingInline}px` : 0,
          paddingBlock: isPill ? `${sizeConfig.paddingBlock}px` : 0,
          borderRadius: isPill ? sizeConfig.borderRadius : `${theme.shape.customBorderRadius.md}px`,
          border: isPill
            ? `1px solid ${alpha(theme.palette.common.white, 0.16)}`
            : isIconBadge
              ? `1px solid ${alpha(theme.palette.primary.main, 0.14)}`
              : 0,
          backgroundColor: isPill ? GREENHOUSE_NEXA_BRAND_COLORS.midnightNavy : 'transparent',
          color: theme.palette.common.white,
          boxShadow: isPill ? `0 1px 0 ${alpha(theme.palette.common.white, 0.12)} inset` : 'none',
          whiteSpace: 'nowrap',
          verticalAlign: 'middle'
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <Box
        component='img'
        src={config.asset}
        alt=''
        aria-hidden='true'
        sx={{
          display: 'block',
          inlineSize: isPill ? sizeConfig.iconSize : sizeConfig.iconOnlySize,
          blockSize: isPill ? sizeConfig.iconSize : sizeConfig.iconOnlySize,
          transform: isPill ? 'scale(1.22)' : 'none',
          transformOrigin: 'center',
          flexShrink: 0
        }}
      />

      {resolvedLabel ? (
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
      ) : null}
    </Box>
  )
}

export default GreenhouseNexaBrandMark
