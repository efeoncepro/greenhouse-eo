'use client'

import { type MouseEvent as ReactMouseEvent, type ReactNode, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
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
 * Jerarquía 3-zonas (Grid 3/5/4 en md+):
 *   [Estado]        [Totals ladder]                 [Acciones]
 *   Save state      Total CLP                       Addons · Cancelar · Guardar
 *   Margen chip     $X — subtotal · factor · IVA
 *
 * Principios:
 * - Total en text.primary (no primary.main). El azul de marca se reserva para
 *   la CTA primaria — así el ojo distingue "valor destacado" de "acción".
 * - Subtotal/Factor/IVA colapsan en caption muted debajo del Total solo cuando
 *   aportan info (factor≠1 o IVA>0 o delta real con subtotal). Si no, oculto.
 * - Margen chip con label completo "Margen · N,N% · Óptimo" (no color-only).
 * - CTA copy invariante; el estado de loading se comunica con disabled+spinner.
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
  // Anchor capturado desde el evento click, no via ref. El Popper queda atado
  // al elemento DOM real y sobrevive re-renders. Si usáramos ref.current, en
  // el primer click ref puede ser null (orden de ejecución) y el Popper caería
  // al top-left del viewport.
  const [addonAnchor, setAddonAnchor] = useState<HTMLElement | null>(null)
  const addonsOpen = addonAnchor !== null

  const handleAddonsToggle = (event: ReactMouseEvent<HTMLElement>) =>
    setAddonAnchor(prev => (prev ? null : event.currentTarget))

  const handleAddonsClose = () => setAddonAnchor(null)

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
                      onClick: handleAddonsToggle,
                      ariaExpanded: addonsOpen
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

      {/*
        Popper del panel de addons — vive como sibling del Grid para poder
        anclarse al segmento inline de la ladder (zone 2). El anchor se
        captura desde event.currentTarget al click, no via ref.
      */}
      {addonContent && addonCount > 0 ? (
        <Popper
          open={addonsOpen}
          anchorEl={addonAnchor}
          placement='top-start'
          sx={{ zIndex: theme => theme.zIndex.modal + 1 }}
        >
          <ClickAwayListener onClickAway={handleAddonsClose}>
            <Paper
              elevation={6}
              sx={theme => ({
                mb: 1,
                p: 2,
                width: 380,
                maxWidth: 'calc(100vw - 32px)',
                borderRadius: `${theme.shape.customBorderRadius.md}px`,
                border: `1px solid ${theme.palette.divider}`
              })}
            >
              {addonContent}
            </Paper>
          </ClickAwayListener>
        </Popper>
      ) : null}
    </Box>
  )
}

export default QuoteSummaryDock
