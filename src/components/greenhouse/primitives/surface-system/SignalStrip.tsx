'use client'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { MOTION_DURATION_S } from '@/components/greenhouse/motion/core/tokens'
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

// `tone` deliberadamente NO pinta el valor ni el ícono: un semáforo aplicado a la
// identidad de un KPI convierte success/warning/error en lenguaje de sección en vez de
// una ayuda puntual de estado. El tono sigue viviendo en el tipo para que un consumer lo
// exprese donde sí corresponde (un chip, una nota), no en el número.
const toneValueColor = () => 'text.primary'

const toneIconColor = () => 'text.secondary'

const SignalStrip = ({ signals, variant, kind = 'health', density = 'auto', dataCapture, ariaLabel }: SignalStripProps) => {
  const reduced = useReducedMotion()
  const { ref, density: resolvedDensity, containerType } = useContainerDensity(density)
  const resolvedVariant = resolveSignalStripVariant(kind, variant)
  const integrated = resolvedVariant === 'integrated'
  const open = integrated

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
            xs: 'minmax(0, 1fr)',
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
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : MOTION_DURATION_S.standard, delay: reduced ? 0 : index * MOTION_DURATION_S.instant }}
            direction='row'
            spacing={integrated ? 1.25 : 2}
            alignItems='center'
            sx={theme => ({
              minWidth: 0,
              px: integrated ? { xs: 0, sm: 2.5 } : { xs: 0, sm: 4 },
              py: integrated ? { xs: 1, sm: 0 } : { xs: 2, sm: 0 },
              borderBlockStart: !integrated && signal.tone && signal.tone !== 'default' ? `3px solid var(--mui-palette-${signal.tone}-main)` : 'none',
              borderBlockEnd: { xs: integrated && index < Math.min(signals.length, 3) - 1 ? `1px solid ${theme.palette.divider}` : 'none', sm: 'none' },
              borderInlineStart: { xs: 'none', sm: index === 0 ? 'none' : `1px solid ${theme.palette.divider}` }
            })}
          >
            {signal.iconClassName ? (
              <Box
                sx={theme => ({
                  display: 'grid',
                  placeItems: 'center',
                  inlineSize: integrated ? { xs: 30, sm: 34 } : 34,
                  blockSize: integrated ? { xs: 30, sm: 34 } : 34,
                  flexShrink: 0,
                  borderRadius: `${theme.shape.customBorderRadius.md}px`,
                  bgcolor: 'action.hover',
                  color: toneIconColor()
                })}
              >
                <i className={signal.iconClassName} aria-hidden='true' />
              </Box>
            ) : null}
            <Stack spacing={0.2} sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant='caption'
                color='text.primary'
                sx={{ opacity: 1, lineHeight: 1.25, fontWeight: integrated ? 600 : 400 }}
              >
                {signal.label}
              </Typography>
              <Typography
                variant={integrated ? 'subtitle1' : 'h5'}
                sx={{ color: toneValueColor(), fontVariantNumeric: 'tabular-nums' }}
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
