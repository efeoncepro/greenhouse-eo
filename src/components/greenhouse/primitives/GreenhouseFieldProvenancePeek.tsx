'use client'

import { useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

import { getMicrocopy } from '@/lib/copy'

import GreenhouseChip, { type GreenhouseChipTone } from './GreenhouseChip'
import GreenhouseFloatingSurface from './GreenhouseFloatingSurface'

export type GreenhouseFieldProvenanceSource = 'integration' | 'manual' | 'calculated' | 'override' | 'seeded' | 'fallback' | 'system'
export type GreenhouseFieldProvenanceConfidence = 'verified' | 'high' | 'medium' | 'low' | 'unknown'
export type GreenhouseFieldProvenanceFreshness = 'live' | 'recent' | 'stale' | 'partial' | 'unknown'
export type GreenhouseFieldProvenanceVariant = 'icon' | 'chip' | 'inline'

export type GreenhouseFieldProvenancePeekProps = {
  source: GreenhouseFieldProvenanceSource
  confidence: GreenhouseFieldProvenanceConfidence
  freshness: GreenhouseFieldProvenanceFreshness
  fieldLabel: ReactNode
  sourceLabel: ReactNode
  title?: ReactNode
  valueLabel?: ReactNode
  updatedAt?: ReactNode
  referenceId?: ReactNode
  notes?: ReactNode[]
  variant?: GreenhouseFieldProvenanceVariant
  triggerLabel?: ReactNode
  ariaLabel?: string
  dataCapture?: string
}

const SOURCE_META: Record<GreenhouseFieldProvenanceSource, { icon: string; label: string; color: 'primary' | 'success' | 'warning' | 'error' | 'info' }> = {
  integration: { icon: 'tabler-plug-connected', label: 'Integracion', color: 'info' },
  manual: { icon: 'tabler-pencil', label: 'Manual', color: 'warning' },
  calculated: { icon: 'tabler-calculator', label: 'Calculado', color: 'primary' },
  override: { icon: 'tabler-adjustments', label: 'Override', color: 'warning' },
  seeded: { icon: 'tabler-database', label: 'Seeded', color: 'info' },
  fallback: { icon: 'tabler-alert-triangle', label: 'Fallback', color: 'error' },
  system: { icon: 'tabler-shield-check', label: 'Sistema', color: 'success' }
}

const CONFIDENCE_COPY: Record<GreenhouseFieldProvenanceConfidence, { label: string; tone: 'success' | 'warning' | 'error' | 'info' }> = {
  verified: { label: 'Verificado', tone: 'success' },
  high: { label: 'Alta confianza', tone: 'success' },
  medium: { label: 'Confianza media', tone: 'warning' },
  low: { label: 'Baja confianza', tone: 'error' },
  unknown: { label: 'Confianza desconocida', tone: 'info' }
}

const t = getMicrocopy()

const FRESHNESS_COPY: Record<GreenhouseFieldProvenanceFreshness, { label: string; tone: 'success' | 'warning' | 'error' | 'info' }> = {
  live: { label: 'En vivo', tone: 'success' },
  recent: { label: 'Reciente', tone: 'success' },
  stale: { label: 'Stale', tone: 'warning' },
  partial: { label: t.states.partial, tone: 'warning' },
  unknown: { label: 'Sin frescura', tone: 'info' }
}

const getToneColor = (theme: Theme, tone: 'primary' | 'success' | 'warning' | 'error' | 'info') => theme.palette[tone].main

const ICON_SIZE = {
  trigger: 16,
  triggerIconOnly: 18,
  surface: 20
} as const

const EvidencePill = ({ icon, label, tone }: { icon: string; label: ReactNode; tone: GreenhouseChipTone }) => (
  <GreenhouseChip iconClassName={icon} label={label} size='small' variant='label' tone={tone} kind='attribute' />
)

const GreenhouseFieldProvenancePeek = ({
  source,
  confidence,
  freshness,
  fieldLabel,
  sourceLabel,
  title = 'Procedencia del dato',
  valueLabel,
  updatedAt,
  referenceId,
  notes = [],
  variant = 'chip',
  triggerLabel,
  ariaLabel,
  dataCapture
}: GreenhouseFieldProvenancePeekProps) => {
  const [open, setOpen] = useState(false)
  const sourceMeta = SOURCE_META[source]
  const confidenceMeta = CONFIDENCE_COPY[confidence]
  const freshnessMeta = FRESHNESS_COPY[freshness]

  return (
    <GreenhouseFloatingSurface
      variant='evidencePeek'
      kind='fieldProvenance'
      open={open}
      onOpenChange={setOpen}
      width={390}
      ariaLabel={ariaLabel ?? `Procedencia de ${String(fieldLabel)}`}
      dataCapture={dataCapture}
      surfaceSx={theme => ({
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        p: 3
      })}
      anchor={({ ref, ...anchorProps }) => (
        <Box
          component='button'
          type='button'
          ref={ref}
          {...anchorProps}
          aria-label={ariaLabel ?? `Ver procedencia de ${String(fieldLabel)}`}
          data-capture={dataCapture}
          data-variant={variant}
          data-source={source}
          sx={theme => {
            const main = getToneColor(theme, sourceMeta.color)
            const isIcon = variant === 'icon'

            return {
              appearance: 'none',
              border: `1px solid ${open ? alpha(main, 0.42) : alpha(theme.palette.text.primary, 0.1)}`,
              borderRadius: `${isIcon ? theme.shape.customBorderRadius.sm : theme.shape.customBorderRadius.md}px`,
              backgroundColor: open ? alpha(main, 0.06) : alpha(theme.palette.background.paper, 0.92),
              color: open ? main : theme.palette.text.secondary,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              minWidth: isIcon ? 28 : undefined,
              minHeight: isIcon ? 28 : 30,
              px: isIcon ? 0 : 1.5,
              py: isIcon ? 0 : 0.75,
              transition: theme.transitions.create(['border-color', 'background-color', 'color'], {
                duration: 150,
                easing: 'cubic-bezier(0.2, 0, 0, 1)'
              }),
              '&:hover': {
                borderColor: alpha(main, 0.48),
                backgroundColor: alpha(main, 0.055),
                color: main
              },
              '&:focus-visible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2
              },
              '@media (prefers-reduced-motion: reduce)': {
                transition: 'none'
              }
            }
          }}
        >
          <Box component='i' className={sourceMeta.icon} aria-hidden='true' sx={{ fontSize: variant === 'icon' ? ICON_SIZE.triggerIconOnly : ICON_SIZE.trigger }} />
          {variant !== 'icon' ? (
            <Typography variant='button'>
              {triggerLabel ?? sourceMeta.label}
            </Typography>
          ) : null}
        </Box>
      )}
      content={() => (
        <Stack spacing={2.5}>
          <Stack direction='row' spacing={1.5} alignItems='flex-start'>
            <Box
              aria-hidden='true'
              sx={theme => ({
                display: 'grid',
                placeItems: 'center',
                width: 34,
                height: 34,
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                color: `${sourceMeta.color}.main`,
                backgroundColor: alpha(getToneColor(theme, sourceMeta.color), 0.08)
              })}
            >
              <Box component='i' className={sourceMeta.icon} sx={{ fontSize: ICON_SIZE.surface }} />
            </Box>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography variant='h6'>
                {title}
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                {fieldLabel}
              </Typography>
            </Stack>
          </Stack>

          <Box
            sx={theme => ({
              p: 2,
              borderRadius: `${theme.shape.customBorderRadius.md}px`,
              border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
              backgroundColor: alpha(theme.palette.text.primary, 0.018)
            })}
          >
            <Stack spacing={0.75}>
              <Typography variant='overline' color='text.secondary'>
                Fuente
              </Typography>
              <Typography variant='h6'>
                {sourceLabel}
              </Typography>
              {valueLabel ? (
                <Typography variant='caption' color='text.secondary'>
                  Valor observado: {valueLabel}
                </Typography>
              ) : null}
            </Stack>
          </Box>

          <Stack direction='row' flexWrap='wrap' gap={1}>
            <EvidencePill icon={sourceMeta.icon} label={sourceMeta.label} tone={sourceMeta.color} />
            <EvidencePill icon='tabler-shield-check' label={confidenceMeta.label} tone={confidenceMeta.tone} />
            <EvidencePill icon='tabler-clock-check' label={freshnessMeta.label} tone={freshnessMeta.tone} />
          </Stack>

          {updatedAt || referenceId ? (
            <Stack direction='row' flexWrap='wrap' gap={1.5}>
              {updatedAt ? (
                <Typography variant='caption' color='text.secondary'>
                  {updatedAt}
                </Typography>
              ) : null}
              {referenceId ? (
                <Typography variant='monoId' color='text.secondary'>
                  {referenceId}
                </Typography>
              ) : null}
            </Stack>
          ) : null}

          {notes.length > 0 ? (
            <Stack spacing={0.75}>
              <Typography variant='overline' color='text.secondary'>
                Notas de resolucion
              </Typography>
              {notes.map((note, index) => (
                <Typography key={`provenance-note-${index}`} variant='caption' color='text.secondary'>
                  {note}
                </Typography>
              ))}
            </Stack>
          ) : null}
        </Stack>
      )}
    />
  )
}

export default GreenhouseFieldProvenancePeek
