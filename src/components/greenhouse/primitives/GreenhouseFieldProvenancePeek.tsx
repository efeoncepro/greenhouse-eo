'use client'

import { useState, type ReactNode } from 'react'

import {
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole
} from '@floating-ui/react'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'
import type { Theme } from '@mui/material/styles'

import { getMicrocopy } from '@/lib/copy'

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

const EvidencePill = ({ icon, label, tone }: { icon: string; label: ReactNode; tone: 'primary' | 'success' | 'warning' | 'error' | 'info' }) => (
  <Box
    component='span'
    sx={theme => {
      const main = getToneColor(theme, tone)

      return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        minWidth: 0,
        px: 1.5,
        py: 0.75,
        borderRadius: `${theme.shape.customBorderRadius.sm}px`,
        border: `1px solid ${alpha(main, 0.18)}`,
        color: theme.palette.text.primary,
        backgroundColor: alpha(main, 0.045)
      }
    }}
  >
    <Box component='i' className={icon} aria-hidden='true' sx={{ color: `${tone}.main`, fontSize: 16, flexShrink: 0 }} />
    <Typography variant='caption' sx={{ fontWeight: 700, minWidth: 0 }}>
      {label}
    </Typography>
  </Box>
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

  const { refs, floatingStyles, context, isPositioned } = useFloating<HTMLButtonElement>({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ fallbackAxisSideDirection: 'end' }), shift({ padding: 16 })]
  })

  const click = useClick(context)
  const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true })
  const role = useRole(context, { role: 'dialog' })
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

  const trigger = (
    <Box
      component='button'
      type='button'
      ref={refs.setReference}
      {...getReferenceProps()}
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
          fontFamily: theme.typography.fontFamily,
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
      <Box component='i' className={sourceMeta.icon} aria-hidden='true' sx={{ fontSize: variant === 'icon' ? 18 : 16 }} />
      {variant !== 'icon' ? (
        <Typography variant='caption' sx={{ fontWeight: 800 }}>
          {triggerLabel ?? sourceMeta.label}
        </Typography>
      ) : null}
    </Box>
  )

  return (
    <>
      {trigger}
      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} returnFocus>
            <Paper
              ref={refs.setFloating}
              elevation={8}
              style={floatingStyles}
              {...getFloatingProps()}
              sx={theme => ({
                width: 390,
                maxWidth: 'calc(100vw - 32px)',
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: `${theme.shape.customBorderRadius.lg}px`,
                p: 3,
                zIndex: theme.zIndex.modal + 1,
                opacity: isPositioned ? 1 : 0,
                transition: 'opacity 150ms cubic-bezier(0.2, 0, 0, 1)',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
              })}
            >
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
                    <Box component='i' className={sourceMeta.icon} sx={{ fontSize: 20 }} />
                  </Box>
                  <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Typography variant='h6' sx={{ fontWeight: 800 }}>
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
                    <Typography variant='body2' sx={{ fontWeight: 800 }}>
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
                      <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700 }}>
                        {updatedAt}
                      </Typography>
                    ) : null}
                    {referenceId ? (
                      <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
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
            </Paper>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  )
}

export default GreenhouseFieldProvenancePeek
