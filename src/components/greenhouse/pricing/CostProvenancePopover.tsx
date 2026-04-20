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
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import CostConfidenceChip, { type CostConfidenceLabel } from './CostConfidenceChip'
import CostFreshnessBadge from './CostFreshnessBadge'
import CostSourceChip, { type CostSourceKind } from './CostSourceChip'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'

export interface CostProvenancePopoverProps {
  sourceKind: CostSourceKind | string | null | undefined
  confidenceLabel: CostConfidenceLabel | string | null | undefined
  confidenceScore: number | null | undefined
  snapshotDate: string | Date | null | undefined
  sourceRef?: string | null
  resolutionNotes?: string[] | null
  trigger?: ReactNode
}

const NO_DATA_KEY_SET = new Set(['member_actual', 'role_blended', 'role_modeled', 'tool_snapshot', 'tool_catalog_fallback', 'manual'])

const isFallbackSource = (sourceKind: unknown): boolean => sourceKind === 'tool_catalog_fallback'
const isManualSource = (sourceKind: unknown): boolean => sourceKind === 'manual'

/**
 * CostProvenancePopover — Floating UI popover self-contained que agrupa los
 * 3 chips de trazabilidad (source + confidence + freshness) junto con
 * referencia al snapshot, notas del motor y disclaimers contextuales
 * (fallback / manual).
 *
 * Pattern canonical post-TASK-509: `@floating-ui/react` con autoUpdate +
 * flip + shift + offset + FloatingPortal + FloatingFocusManager. Evita el
 * stale-anchor bug que tenía MUI Popper en contextos con re-renders.
 *
 * El trigger puede ser custom (override via prop) o un IconButton default
 * con copy desde `GH_PRICING.costProvenance.popoverOpenAria`.
 *
 * Consumers: QuoteLineCostStack (footer), QuoteDetailView (read-only).
 * Todavía NO lo integra CostOverrideDialog — ese tiene su propia surface.
 */
const CostProvenancePopover = ({
  sourceKind,
  confidenceLabel,
  confidenceScore,
  snapshotDate,
  sourceRef,
  resolutionNotes,
  trigger
}: CostProvenancePopoverProps) => {
  const [open, setOpen] = useState(false)

  const { refs, floatingStyles, context, isPositioned } = useFloating<HTMLButtonElement>({
    open,
    onOpenChange: setOpen,
    placement: 'top-start',
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ fallbackAxisSideDirection: 'end' }), shift({ padding: 16 })]
  })

  const click = useClick(context)
  const dismiss = useDismiss(context, { outsidePress: true, escapeKey: true })
  const role = useRole(context, { role: 'dialog' })

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role])

  const hasAnyProvenance =
    typeof sourceKind === 'string' && NO_DATA_KEY_SET.has(sourceKind)
  const notes = Array.isArray(resolutionNotes) ? resolutionNotes.filter(Boolean) : []

  return (
    <>
      {trigger ? (
        <Box
          component='span'
          ref={refs.setReference as unknown as (el: HTMLElement | null) => void}
          {...getReferenceProps()}
          sx={{ display: 'inline-flex' }}
          aria-label={GH_PRICING.costProvenance.popoverOpenAria}
        >
          {trigger}
        </Box>
      ) : (
        <Box
          component='button'
          type='button'
          ref={refs.setReference}
          {...getReferenceProps()}
          aria-label={GH_PRICING.costProvenance.popoverOpenAria}
          sx={theme => ({
            appearance: 'none',
            background: 'none',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: `${theme.shape.customBorderRadius.sm}px`,
            color: open ? theme.palette.primary.main : theme.palette.text.secondary,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            padding: '4px 8px',
            fontSize: theme.typography.caption.fontSize,
            fontFamily: theme.typography.fontFamily,
            transition: theme.transitions.create(['color', 'border-color'], {
              duration: 150,
              easing: 'cubic-bezier(0.2, 0, 0, 1)'
            }),
            '&:hover': { color: theme.palette.primary.main, borderColor: theme.palette.primary.main },
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2
            },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
          })}
        >
          <i className='tabler-info-circle' aria-hidden='true' style={{ fontSize: 14 }} />
          <span>{GH_PRICING.costProvenance.popoverTitle}</span>
        </Box>
      )}

      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} returnFocus>
            <Paper
              ref={refs.setFloating}
              elevation={6}
              style={floatingStyles}
              {...getFloatingProps()}
              sx={theme => ({
                width: 360,
                maxWidth: 'calc(100vw - 32px)',
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px solid ${theme.palette.divider}`,
                p: 2,
                zIndex: theme.zIndex.modal + 1,
                opacity: isPositioned ? 1 : 0,
                transition: 'opacity 150ms cubic-bezier(0.2, 0, 0, 1)',
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
              })}
            >
              <Stack spacing={1.5}>
                <Typography variant='subtitle2' sx={{ fontWeight: 700 }}>
                  {GH_PRICING.costProvenance.popoverTitle}
                </Typography>

                {!hasAnyProvenance ? (
                  <Typography variant='caption' color='text.secondary'>
                    {GH_PRICING.costProvenance.noProvenanceState}
                  </Typography>
                ) : (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    <CostSourceChip sourceKind={sourceKind} />
                    <CostConfidenceChip
                      confidenceLabel={confidenceLabel}
                      confidenceScore={confidenceScore ?? null}
                    />
                    <CostFreshnessBadge snapshotDate={snapshotDate ?? null} />
                  </Box>
                )}

                {sourceRef ? (
                  <Box>
                    <Typography
                      variant='caption'
                      sx={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'text.secondary',
                        display: 'block',
                        mb: 0.5
                      }}
                    >
                      {GH_PRICING.costProvenance.sourceRefLabel}
                    </Typography>
                    <Typography
                      variant='body2'
                      sx={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}
                    >
                      {sourceRef}
                    </Typography>
                  </Box>
                ) : null}

                {notes.length > 0 ? (
                  <Box>
                    <Typography
                      variant='caption'
                      sx={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: 'text.secondary',
                        display: 'block',
                        mb: 0.5
                      }}
                    >
                      {GH_PRICING.costProvenance.resolutionNotesLabel}
                    </Typography>
                    <Stack spacing={0.5}>
                      {notes.map((note, idx) => (
                        <Typography key={`note-${idx}`} variant='caption' color='text.secondary'>
                          • {note}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                ) : null}

                {isFallbackSource(sourceKind) ? (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <Alert severity='warning' sx={{ '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                      <Typography variant='caption' sx={{ fontWeight: 600, display: 'block' }}>
                        {GH_PRICING.costProvenance.fallbackDisclaimerTitle}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {GH_PRICING.costProvenance.fallbackDisclaimerBody}
                      </Typography>
                    </Alert>
                  </>
                ) : null}

                {isManualSource(sourceKind) ? (
                  <>
                    <Divider sx={{ my: 0.5 }} />
                    <Alert severity='info' sx={{ '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
                      <Typography variant='caption' sx={{ fontWeight: 600, display: 'block' }}>
                        {GH_PRICING.costProvenance.manualDisclaimerTitle}
                      </Typography>
                      <Typography variant='caption' color='text.secondary'>
                        {GH_PRICING.costProvenance.manualDisclaimerBody}
                      </Typography>
                    </Alert>
                  </>
                ) : null}
              </Stack>
            </Paper>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  )
}

export default CostProvenancePopover
