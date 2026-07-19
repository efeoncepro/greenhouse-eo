'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import useReducedMotion from '@/hooks/useReducedMotion'
import { motion } from '@/libs/FramerMotion'

import { useContainerDensity } from '../card-density'
import { cardDensityLayoutTransition } from '../card-density/card-density-motion'
import { resolveSignalStripVariant } from './surface-system-controller'
import type { SignalStripKind, SignalStripVariant, SurfaceSignal } from './surface-system-types'

export interface SignalStripProps {
  signals: readonly SurfaceSignal[]
  variant?: SignalStripVariant
  kind?: SignalStripKind
  density?: 'auto' | 'full' | 'condensed' | 'peek'
  dataCapture?: string
  ariaLabel: string
}

const toneColor = (tone: SurfaceSignal['tone']) =>
  tone === 'primary' ? 'primary.dark' : tone && tone !== 'default' ? `${tone}.main` : 'text.primary'

const SignalStrip = ({ signals, variant, kind = 'health', density = 'auto', dataCapture, ariaLabel }: SignalStripProps) => {
  const reduced = useReducedMotion()
  const { ref, density: resolvedDensity, containerType } = useContainerDensity(density)
  const resolvedVariant = resolveSignalStripVariant(kind, variant)
  const integrated = resolvedVariant === 'integrated'
  const open = resolvedVariant === 'narrative' || integrated

  return (
    <Box
      ref={ref}
      component={motion.section}
      layout={reduced ? false : 'position'}
      transition={cardDensityLayoutTransition(reduced)}
      aria-label={ariaLabel}
      data-card-density={resolvedDensity}
      suppressHydrationWarning
      data-capture={dataCapture}
      data-kind={kind}
      data-variant={resolvedVariant}
      data-ui-surface={open ? 'open' : 'contained'}
      sx={theme => ({
        containerType,
        border: open ? 'none' : '1px solid',
        borderColor: resolvedVariant === 'exception' ? 'warning.lightOpacity' : 'divider',
        borderRadius: open ? 0 : `${theme.shape.customBorderRadius.xl}px`,
        color: integrated ? 'inherit' : 'text.primary',
        background: open
          ? 'transparent'
          : resolvedVariant === 'exception'
            ? `linear-gradient(120deg, ${theme.palette.warning.lightOpacity}, ${theme.palette.background.paper})`
            : theme.palette.background.paper,
        boxShadow: resolvedVariant === 'operational' ? theme.greenhouseElevation.raised.boxShadow : 'none',
        px: open ? 0 : { xs: 4, md: 5 },
        py: open ? 0 : { xs: 4, md: 4.5 }
      })}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: integrated ? `repeat(${Math.min(signals.length, 3)}, minmax(0, 1fr))` : 'minmax(0, 1fr)',
            sm: `repeat(${Math.min(signals.length, 3)}, minmax(0, 1fr))`
          },
          gap: 0,
          '& > *': { minWidth: 0 }
        }}
      >
        {signals.slice(0, 3).map((signal, index) => (
          <Stack
            key={signal.id}
            component={motion.div}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : 0.22, delay: reduced ? 0 : index * 0.04 }}
            direction={integrated ? { xs: 'column', sm: 'row' } : 'row'}
            spacing={2}
            alignItems='flex-start'
            sx={theme => ({
              minWidth: 0,
              px: integrated ? { xs: 1, sm: 4 } : { xs: 0, sm: 4 },
              py: { xs: 2, sm: 0 },
              borderInlineStart: { xs: 'none', sm: index === 0 ? 'none' : `1px solid ${theme.palette.divider}` }
            })}
          >
            {signal.iconClassName ? (
              <Box
                sx={theme => ({
                  display: 'grid',
                  placeItems: 'center',
                  inlineSize: integrated ? { xs: 28, sm: 34 } : 34,
                  blockSize: integrated ? { xs: 28, sm: 34 } : 34,
                  flexShrink: 0,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  bgcolor: `${signal.tone ?? 'primary'}.lightOpacity`,
                  color: integrated ? 'inherit' : toneColor(signal.tone)
                })}
              >
                <i className={signal.iconClassName} aria-hidden='true' />
              </Box>
            ) : null}
            <Stack spacing={0.5} sx={{ minWidth: 0 }}>
              <Typography variant='caption' color={integrated ? 'inherit' : 'text.primary'} sx={{ opacity: integrated ? 0.72 : 1 }}>
                {signal.label}
              </Typography>
              <Typography
                variant='h5'
                sx={{ color: integrated ? 'inherit' : toneColor(signal.tone), fontVariantNumeric: 'tabular-nums' }}
              >
                {signal.value}
              </Typography>
              {resolvedDensity === 'full' && signal.detail && !integrated ? (
                <Typography variant='body2' color='text.primary'>
                  {signal.detail}
                </Typography>
              ) : null}
            </Stack>
          </Stack>
        ))}
      </Box>
    </Box>
  )
}

export default SignalStrip
