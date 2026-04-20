'use client'

import { type ReactNode, useEffect, useRef } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import {
  MarginHealthChip,
  SaveStateIndicator,
  TotalsLadder,
  type MarginClassification,
  type MarginTierRange,
  type SaveStateKind
} from '@/components/greenhouse/primitives'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'
import type { PricingOutputCurrency } from '@/lib/finance/pricing/contracts'

export interface QuoteSummaryDockProps {
  subtotal: number | null
  factor?: number | null
  ivaAmount?: number | null
  total: number | null
  currency: PricingOutputCurrency
  loading?: boolean
  addonCount?: number
  addonContent?: ReactNode
  primaryCtaLabel: string
  primaryCtaIcon?: string
  primaryCtaLoading?: boolean
  primaryCtaDisabled?: boolean
  onPrimaryClick: () => void
  secondaryCtaLabel?: string
  secondaryCtaDisabled?: boolean
  onSecondaryClick?: () => void
  marginClassification?: MarginClassification | null
  marginPct?: number | null

  /** Target tier range, usado para tooltip del margen. */
  marginTierRange?: MarginTierRange | null

  /** Suma de los addons ya aplicados como línea overhead_addon. Se muestra en
   *  el segmento inline de la ladder como contexto cuantitativo cuando > 0. */
  appliedAddonsTotal?: number | null

  /** Save state indicator en la parte izquierda del dock. */
  saveState?: { kind: SaveStateKind; changeCount?: number; lastSavedAt?: Date | null } | null

  /** Si hay un error del engine v2, se muestra como Alert inline en la parte
   * superior del dock (justo encima del bloque de totales). */
  simulationError?: string | null

  /** Mensaje contextual cuando no hay datos suficientes para mostrar totales
   * (ej. sin ítems agregados). Si está presente, reemplaza el bloque de
   * totales por una leyenda informativa. */
  emptyStateMessage?: string | null
}

/**
 * QuoteSummaryDock v2 — sticky-bottom cockpit para el Quote Builder.
 *
 * Jerarquía 3-zonas (Grid 3/6/3 en md+):
 *   [Estado]        [Totals ladder + addons inline]       [Acción terminal]
 *   Save state      Total CLP                              Guardar y emitir
 *   Margen chip     $X — subtotal · addon · factor · IVA
 *
 * Principios:
 * - Total en text.primary. El azul de marca queda exclusivo para la CTA.
 * - Subtotal/Factor/IVA/addons colapsan en caption muted debajo del Total
 *   solo cuando aportan info. El segmento de addons es interactivo y abre
 *   un popover con el detalle — self-contained en el primitive (TASK-509,
 *   via Floating UI).
 * - CTA copy invariante; loading state = disabled + spinner.
 * - Live region a11y consolidada en el root aside.
 */
const QuoteSummaryDock = ({
  subtotal,
  factor,
  ivaAmount,
  total,
  currency,
  loading = false,
  addonCount = 0,
  addonContent,
  primaryCtaLabel,
  primaryCtaIcon,
  primaryCtaLoading = false,
  primaryCtaDisabled = false,
  onPrimaryClick,
  secondaryCtaLabel,
  secondaryCtaDisabled = false,
  onSecondaryClick,
  marginClassification,
  marginPct,
  marginTierRange,
  appliedAddonsTotal,
  saveState,
  simulationError,
  emptyStateMessage
}: QuoteSummaryDockProps) => {
  // Guarda la diferencia clave del "before/after" para re-animar counter sólo cuando el valor cambia material
  const lastTotalRef = useRef<number | null>(null)

  useEffect(() => {
    if (total !== null) lastTotalRef.current = total
  }, [total])

  return (
    <Box
      component='aside'
      role='status'
      aria-live='polite'
      aria-label={GH_PRICING.summaryDock.ariaLabel}
      sx={theme => ({
        position: 'sticky',
        bottom: 16,
        zIndex: theme.zIndex.appBar - 2,
        marginTop: 3,
        px: { xs: 2, md: 3 },
        py: 2,
        backgroundColor: alpha(theme.palette.background.paper, 0.96),
        backdropFilter: 'saturate(180%) blur(10px)',
        WebkitBackdropFilter: 'saturate(180%) blur(10px)',
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: `${theme.shape.customBorderRadius.lg}px`,
        boxShadow: `0 12px 32px -12px ${alpha(theme.palette.common.black, 0.22)}`
      })}
    >
      {simulationError ? (
        <Alert
          severity='error'
          role='alert'
          icon={<i className='tabler-alert-triangle' aria-hidden='true' />}
          sx={{ mb: 1.5, py: 0.5 }}
        >
          <Typography variant='body2'>{simulationError}</Typography>
        </Alert>
      ) : null}

      <Grid container columnSpacing={{ xs: 0, md: 3 }} rowSpacing={{ xs: 1.5, md: 0 }} alignItems='center'>
        {/* ───────────── ZONA 1: Estado (md=3) ───────────── */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack spacing={1} alignItems='flex-start'>
            {saveState ? (
              <SaveStateIndicator
                state={saveState.kind}
                changeCount={saveState.changeCount}
                lastSavedAt={saveState.lastSavedAt ?? null}
              />
            ) : null}
            {marginClassification && marginPct !== null && marginPct !== undefined && !loading ? (
              <MarginHealthChip
                classification={marginClassification}
                marginPct={marginPct}
                tierRange={marginTierRange ?? null}
              />
            ) : null}
          </Stack>
        </Grid>

        {/* ───────────── ZONA 2: Totals ladder (md=6) ───────────── */}
        <Grid size={{ xs: 12, md: 6 }}>
          {emptyStateMessage ? (
            <Stack direction='row' spacing={1.5} alignItems='center' useFlexGap>
              <Box
                component='i'
                className='tabler-info-circle'
                aria-hidden='true'
                sx={{ fontSize: 20, color: 'text.secondary' }}
              />
              <Typography variant='body2' color='text.secondary' sx={{ fontWeight: 500 }}>
                {emptyStateMessage}
              </Typography>
            </Stack>
          ) : (
            <TotalsLadder
              subtotal={subtotal}
              factor={factor ?? null}
              ivaAmount={ivaAmount ?? null}
              total={total}
              currency={currency}
              loading={loading}
              addonsSegment={
                addonContent && addonCount > 0
                  ? {
                      count: addonCount,
                      amount: appliedAddonsTotal ?? 0,
                      content: addonContent
                    }
                  : null
              }
            />
          )}
        </Grid>

        {/* ───────────── ZONA 3: Acciones (md=3) ───────────── */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Stack
            direction='row'
            spacing={1.5}
            alignItems='center'
            justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
            flexWrap='wrap'
            useFlexGap
          >
            {secondaryCtaLabel && onSecondaryClick ? (
              <Button
                variant='tonal'
                color='secondary'
                size='medium'
                onClick={onSecondaryClick}
                disabled={secondaryCtaDisabled}
                sx={{ minHeight: 44 }}
              >
                {secondaryCtaLabel}
              </Button>
            ) : null}

            <Button
              variant='contained'
              size='medium'
              onClick={onPrimaryClick}
              disabled={primaryCtaDisabled || primaryCtaLoading}
              startIcon={
                primaryCtaLoading ? (
                  <CircularProgress size={16} color='inherit' aria-label='Cargando' />
                ) : primaryCtaIcon ? (
                  <i className={primaryCtaIcon} aria-hidden='true' />
                ) : undefined
              }
              sx={{ minHeight: 44, fontWeight: 600 }}
            >
              {primaryCtaLabel}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}

export default QuoteSummaryDock
