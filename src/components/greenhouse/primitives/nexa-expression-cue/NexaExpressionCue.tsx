'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { alpha, type Theme } from '@mui/material/styles'

import GreenhouseNexaBrandMark from '../GreenhouseNexaBrandMark'
import NexaSenderMark from '../NexaSenderMark'
import { GREENHOUSE_NEXA_BRAND_COLORS } from '../greenhouse-nexa-brand-controller'
import { resolveNexaExpressionCue } from './nexa-expression-cue-controller'
import type {
  NexaExpressionCueProps,
  NexaExpressionCueTone,
  NexaExpressionCueVariant,
  ResolvedNexaExpressionCue
} from './nexa-expression-cue-types'

const SIZE = {
  small: {
    rootSize: 22,
    markSize: 18,
    iconSize: 15,
    gap: 0.75,
    labelVariant: 'caption' as const
  },
  medium: {
    rootSize: 28,
    markSize: 22,
    iconSize: 17,
    gap: 1,
    labelVariant: 'body2' as const
  }
} as const

const toneInk = (theme: Theme, tone: NexaExpressionCueTone) => {
  if (tone === 'success') return theme.greenhouseSemantic.success.tonalText
  if (tone === 'warning') return theme.greenhouseSemantic.warning.tonalText
  if (tone === 'error') return theme.greenhouseSemantic.error.tonalText
  if (tone === 'nexa') return theme.palette.primary.main
  if (tone === 'neutral') return theme.palette.text.secondary

  return theme.greenhouseSemantic.info.tonalText
}

const toneSurface = (theme: Theme, tone: NexaExpressionCueTone) => {
  if (tone === 'success') return alpha(theme.palette.success.main, 0.12)
  if (tone === 'warning') return alpha(theme.palette.warning.main, 0.16)
  if (tone === 'error') return alpha(theme.palette.error.main, 0.12)
  if (tone === 'nexa') return alpha(GREENHOUSE_NEXA_BRAND_COLORS.electricTeal, 0.14)
  if (tone === 'neutral') return alpha(theme.palette.text.secondary, 0.08)

  return alpha(theme.palette.info.main, 0.12)
}

const variantSx = (theme: Theme, variant: NexaExpressionCueVariant, resolved: ResolvedNexaExpressionCue) => {
  if (variant === 'inline') {
    return {
      verticalAlign: 'text-bottom'
    }
  }

  if (variant === 'standalone') {
    return {
      inlineSize: 40,
      blockSize: 40,
      borderRadius: `${theme.shape.customBorderRadius.lg}px`,
      backgroundColor: toneSurface(theme, resolved.tone),
      border: `1px solid ${alpha(toneInk(theme, resolved.tone), theme.palette.mode === 'dark' ? 0.26 : 0.14)}`
    }
  }

  return {
    borderRadius: '9999px',
    backgroundColor: toneSurface(theme, resolved.tone),
    border: `1px solid ${alpha(toneInk(theme, resolved.tone), theme.palette.mode === 'dark' ? 0.26 : 0.14)}`
  }
}

const shouldShowLabel = (
  resolved: ResolvedNexaExpressionCue,
  variant: NexaExpressionCueVariant,
  showLabel: NexaExpressionCueProps['showLabel']
) => {
  if (showLabel === true) return true
  if (showLabel === false) return false

  return resolved.treatment === 'textOnly' || resolved.context === 'stateChip' || variant !== 'inline'
}

const TreatmentVisual = ({
  resolved,
  decorative,
  size
}: {
  resolved: ResolvedNexaExpressionCue
  decorative: boolean
  size: keyof typeof SIZE
}) => {
  const config = SIZE[size]

  if (resolved.treatment === 'none' || resolved.treatment === 'textOnly') return null

  if (resolved.treatment === 'nexaMark') {
    return decorative ? (
      <NexaSenderMark size={config.markSize} />
    ) : (
      <GreenhouseNexaBrandMark
        kind='inlineMark'
        ariaLabel={resolved.ariaLabel}
        sx={{
          inlineSize: config.markSize,
          blockSize: config.markSize
        }}
      />
    )
  }

  if (resolved.treatment === 'statusDot') {
    return (
      <Box
        component='span'
        aria-hidden='true'
        sx={theme => ({
          inlineSize: Math.max(7, Math.round(config.iconSize * 0.52)),
          blockSize: Math.max(7, Math.round(config.iconSize * 0.52)),
          borderRadius: '50%',
          backgroundColor: toneInk(theme, resolved.tone),
          boxShadow: `0 0 0 3px ${toneSurface(theme, resolved.tone)}`,
          flex: '0 0 auto'
        })}
      />
    )
  }

  if (resolved.treatment === 'fluentAsset' && resolved.assetSrc) {
    return (
      <Box
        component='img'
        src={resolved.assetSrc}
        alt=''
        aria-hidden='true'
        sx={{
          display: 'block',
          inlineSize: config.iconSize,
          blockSize: config.iconSize,
          objectFit: 'contain',
          flex: '0 0 auto'
        }}
      />
    )
  }

  return (
    <Box
      component='i'
      className={resolved.iconClassName}
      aria-hidden='true'
      sx={theme => ({
        color: toneInk(theme, resolved.tone),
        fontSize: config.iconSize,
        lineHeight: 1,
        flex: '0 0 auto'
      })}
    />
  )
}

const NexaExpressionCue = ({
  cue,
  context,
  treatment,
  domain,
  sensitivity,
  decorative = false,
  label,
  ariaLabel,
  variant = 'inline',
  size = 'small',
  showLabel = 'auto',
  dataCapture,
  sx
}: NexaExpressionCueProps) => {
  const resolved = resolveNexaExpressionCue({ cue, context, treatment, domain, sensitivity, decorative, label, ariaLabel })
  const sizeConfig = SIZE[size]
  const hasVisual = resolved.treatment !== 'none' && resolved.treatment !== 'textOnly'
  const hasVisibleLabel = shouldShowLabel(resolved, variant, showLabel)

  if (resolved.treatment === 'none' && !hasVisibleLabel) return null

  return (
    <Box
      component='span'
      role={!resolved.decorative && hasVisual && !hasVisibleLabel ? 'img' : undefined}
      aria-label={!resolved.decorative && hasVisual && !hasVisibleLabel ? resolved.ariaLabel : undefined}
      aria-hidden={resolved.decorative ? true : undefined}
      data-cue={resolved.key}
      data-context={resolved.context}
      data-treatment={resolved.treatment}
      data-sensitive={resolved.isSensitive ? 'true' : 'false'}
      data-degraded={resolved.degraded ? 'true' : undefined}
      data-degradation={resolved.degradationReason}
      data-capture={dataCapture}
      sx={[
        theme => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: hasVisibleLabel ? sizeConfig.gap : 0,
          minInlineSize: hasVisibleLabel ? 'auto' : sizeConfig.rootSize,
          minBlockSize: sizeConfig.rootSize,
          color: toneInk(theme, resolved.tone),
          paddingInline: hasVisibleLabel ? 1 : 0,
          paddingBlock: hasVisibleLabel ? 0.25 : 0,
          lineHeight: 1,
          whiteSpace: 'nowrap',
          letterSpacing: 0,
          ...variantSx(theme, variant, resolved)
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      <TreatmentVisual resolved={resolved} decorative={resolved.decorative || hasVisibleLabel} size={size} />

      {hasVisibleLabel ? (
        <Typography
          component='span'
          variant={sizeConfig.labelVariant}
          sx={{
            color: 'inherit',
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: 0
          }}
        >
          {resolved.label}
        </Typography>
      ) : null}
    </Box>
  )
}

export default NexaExpressionCue
