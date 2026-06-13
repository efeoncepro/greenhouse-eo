'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import GreenhouseButton from '../GreenhouseButton'
import GreenhouseChip from '../GreenhouseChip'
import GreenhouseFloatingSurface from '../GreenhouseFloatingSurface'
import type { NexaCitationSource } from './nexa-expressive-text-types'

const FRESHNESS_META: Record<NonNullable<NexaCitationSource['freshness']>, { label: string; tone: 'success' | 'warning' }> = {
  current: { label: 'Actual', tone: 'success' },
  recent: { label: 'Reciente', tone: 'success' },
  stale: { label: 'Desactualizada', tone: 'warning' }
}

/**
 * Cita inline span-level (estilo Google AI Mode): un marcador `[n]` operable por teclado
 * que abre un evidence-peek (vía GreenhouseFloatingSurface, focus-managed) con título,
 * fragmento citado, score y frescura. Hace el grounding nativo del texto, no un panel aparte.
 */
const NexaCitationMarker = ({ source }: { source: NexaCitationSource }) => {
  const [open, setOpen] = useState(false)
  const freshness = source.freshness ? FRESHNESS_META[source.freshness] : null
  const headingTrail = source.headingPath?.join(' › ')

  return (
    <GreenhouseFloatingSurface
      variant='evidencePeek'
      open={open}
      onOpenChange={setOpen}
      width={360}
      ariaLabel={`Fuente ${source.label}: ${source.title}`}
      dataCapture='nexa-answers-citation-peek'
      surfaceSx={theme => ({ borderRadius: `${theme.shape.customBorderRadius.lg}px`, p: 3 })}
      anchor={({ ref, ...anchorProps }) => (
        <Box
          component='button'
          type='button'
          ref={ref}
          {...anchorProps}
          aria-label={`Ver fuente ${source.label}: ${source.title}`}
          data-capture='nexa-answers-citation-marker'
          // WCAG 2.2 SC 2.5.8 — excepción "inline": un target en texto corrido, cuyo tamaño está
          // constreñido por el line-height, está exento del mínimo 24×24 (las citas son superscript
          // por diseño, como en Google AI Mode). El marcador lo declara para eximirse del layout gate.
          data-gvc-ignore-layout='true'
          sx={theme => ({
            appearance: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            verticalAlign: 'baseline',
            position: 'relative',
            insetBlockStart: '-0.32em',
            minInlineSize: 20,
            blockSize: 18,
            marginInlineStart: '2px',
            paddingInline: '5px',
            cursor: 'pointer',
            borderRadius: `${theme.shape.customBorderRadius.xs}px`,
            border: `1px solid ${open ? alpha(theme.palette.primary.main, 0.5) : alpha(theme.palette.primary.main, 0.22)}`,
            backgroundColor: open ? alpha(theme.palette.primary.main, 0.12) : alpha(theme.palette.primary.main, 0.06),
            color: theme.palette.primary.main,
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1,
            fontFeatureSettings: '"tnum" 1',
            transition: theme.transitions.create(['border-color', 'background-color'], { duration: 150, easing: 'cubic-bezier(0.2, 0, 0, 1)' }),
            '&:hover': { borderColor: alpha(theme.palette.primary.main, 0.5), backgroundColor: alpha(theme.palette.primary.main, 0.12) },
            '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
          })}
        >
          {source.label}
        </Box>
      )}
      content={() => (
        <Stack spacing={2}>
          <Stack spacing={0.5} sx={{ minInlineSize: 0 }}>
            {headingTrail ? (
              <Typography variant='overline' color='text.secondary' sx={{ overflowWrap: 'anywhere' }}>
                {headingTrail}
              </Typography>
            ) : null}
            <Typography variant='h6'>{source.title}</Typography>
          </Stack>

          <Box
            sx={theme => ({
              p: 2,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              borderInlineStart: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.025)
            })}
          >
            <Typography variant='body2' color='text.secondary'>
              {source.excerpt}
            </Typography>
          </Box>

          <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap alignItems='center' justifyContent='space-between'>
            <Stack direction='row' spacing={1} flexWrap='wrap' useFlexGap>
              {typeof source.score === 'number' ? (
                <GreenhouseChip size='small' variant='label' tone='primary' iconClassName='tabler-target-arrow' label={`Score ${source.score.toFixed(2)}`} kind='attribute' />
              ) : null}
              {freshness ? (
                <GreenhouseChip size='small' variant='label' tone={freshness.tone} iconClassName='tabler-clock-check' label={freshness.label} kind='attribute' />
              ) : null}
            </Stack>
            {source.href ? (
              <GreenhouseButton variant='text' tone='secondary' size='small' trailingIconClassName='tabler-arrow-up-right' href={source.href}>
                Abrir fuente
              </GreenhouseButton>
            ) : null}
          </Stack>
        </Stack>
      )}
    />
  )
}

export default NexaCitationMarker
