'use client'

import { type MouseEvent as ReactMouseEvent, type ReactNode, useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { alpha } from '@mui/material/styles'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import { GH_PRICING } from '@/config/greenhouse-nomenclature'
import useReducedMotion from '@/hooks/useReducedMotion'
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
  marginClassification?: 'healthy' | 'warning' | 'critical' | null
  marginPct?: number | null

  /** Target tier range, usado para tooltip del margen. */
  marginTierRange?: { min: number; opt: number; max: number; tierLabel?: string } | null

  /** Delta que los addons agregan al total, para preview en el chip. */
  addonTotalDelta?: number | null

  /** Save state indicator en la parte izquierda del dock. */
  saveState?: { kind: 'clean' | 'dirty' | 'saving' | 'saved'; changeCount?: number; lastSavedAt?: Date | null } | null

  /** Si hay un error del engine v2, se muestra como Alert inline en la parte
   * superior del dock (justo encima del bloque de totales). */
  simulationError?: string | null

  /** Mensaje contextual cuando no hay datos suficientes para mostrar totales
   * (ej. sin ítems agregados). Si está presente, reemplaza el bloque de
   * totales por una leyenda informativa. */
  emptyStateMessage?: string | null
}

const CURRENCY_LOCALE: Record<PricingOutputCurrency, string> = {
  CLP: 'es-CL',
  USD: 'en-US',
  CLF: 'es-CL',
  COP: 'es-CO',
  MXN: 'es-MX',
  PEN: 'es-PE'
}

const formatMoney = (amount: number | null, currency: PricingOutputCurrency): string => {
  if (amount === null || Number.isNaN(amount)) return '—'

  const locale = CURRENCY_LOCALE[currency] ?? 'es-CL'

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(amount)
  } catch {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount)} ${currency}`
  }
}

const MARGIN_META: Record<
  NonNullable<QuoteSummaryDockProps['marginClassification']>,
  { label: string; color: 'success' | 'warning' | 'error'; icon: string }
> = {
  healthy: { label: 'Margen saludable', color: 'success', icon: 'tabler-circle-check' },
  warning: { label: 'Margen en atención', color: 'warning', icon: 'tabler-alert-circle' },
  critical: { label: 'Margen crítico', color: 'error', icon: 'tabler-alert-triangle' }
}

/**
 * Row 4 del patron Command Bar: dock flotante sticky-bottom con Subtotal,
 * Factor, IVA, Total (AnimatedCounter), chip de addons con popover,
 * y CTAs primary/secondary. En mobile colapsa a una barra compacta.
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
  addonTotalDelta,
  saveState,
  simulationError,
  emptyStateMessage
}: QuoteSummaryDockProps) => {
  const prefersReduced = useReducedMotion()

  // Anchor capturado desde el evento click, no via ref. El Popper queda atado
  // al elemento DOM real y sobrevive re-renders. Si usáramos ref.current, en
  // el primer click ref puede ser null (orden de ejecución) y el Popper caería
  // al top-left del viewport.
  const [addonAnchor, setAddonAnchor] = useState<HTMLElement | null>(null)
  const addonsOpen = addonAnchor !== null

  const handleAddonsToggle = (event: ReactMouseEvent<HTMLElement>) =>
    setAddonAnchor(prev => (prev ? null : event.currentTarget))

  const handleAddonsClose = () => setAddonAnchor(null)

  // Guarda la diferencia clave del "before/after" para re-animar counter sólo cuando el valor cambia material
  const lastTotalRef = useRef<number | null>(null)

  useEffect(() => {
    if (total !== null) lastTotalRef.current = total
  }, [total])

  const marginMeta = marginClassification ? MARGIN_META[marginClassification] : null

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

      {saveState ? (
        <Stack direction='row' spacing={0.75} alignItems='center' sx={{ mb: 1 }} aria-live='polite'>
          <Box
            component='span'
            sx={theme => ({
              width: 6,
              height: 6,
              borderRadius: '50%',
              flexShrink: 0,
              backgroundColor:
                saveState.kind === 'saving'
                  ? theme.palette.info.main
                  : saveState.kind === 'dirty'
                    ? theme.palette.warning.main
                    : saveState.kind === 'saved'
                      ? theme.palette.success.main
                      : theme.palette.action.disabled
            })}
            aria-hidden='true'
          />
          <Typography variant='caption' color='text.secondary'>
            {saveState.kind === 'saving'
              ? 'Guardando…'
              : saveState.kind === 'dirty'
                ? saveState.changeCount && saveState.changeCount > 0
                  ? `Sin guardar · ${saveState.changeCount} cambio${saveState.changeCount === 1 ? '' : 's'}`
                  : 'Sin guardar'
                : saveState.kind === 'saved'
                  ? saveState.lastSavedAt
                    ? `Guardado · ${formatRelativeTime(saveState.lastSavedAt)}`
                    : 'Guardado'
                  : 'Sin cambios'}
          </Typography>
        </Stack>
      ) : null}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent='space-between'
        useFlexGap
      >
        {/* Bloque de totales — si empty, muestra leyenda en lugar de "—/—" */}
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
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1.5, sm: 3 }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          useFlexGap
        >
          <SummaryBlock
            label={GH_PRICING.summaryDock.subtotalLabel}
            value={loading ? null : formatMoney(subtotal, currency)}
          />
          {factor !== null && factor !== undefined && factor !== 1 ? (
            <SummaryBlock
              label={GH_PRICING.summaryDock.factorLabel}
              value={loading ? null : `×${factor.toFixed(2)}`}
              variant='muted'
            />
          ) : null}
          {ivaAmount !== null && ivaAmount !== undefined ? (
            <SummaryBlock
              label={GH_PRICING.summaryDock.ivaLabel}
              value={loading ? null : formatMoney(ivaAmount, currency)}
              variant='muted'
            />
          ) : null}
          <Box>
            <Typography
              variant='caption'
              color='text.secondary'
              sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', lineHeight: 1 }}
            >
              {GH_PRICING.summaryDock.totalLabel}
            </Typography>
            <Typography
              component='span'
              variant='h5'
              sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, lineHeight: 1.1, color: 'primary.main' }}
              aria-label={`${GH_PRICING.summaryDock.totalLabel} ${formatMoney(total, currency)}`}
            >
              {loading ? (
                <Skeleton variant='text' width={140} height={32} sx={{ display: 'inline-block' }} />
              ) : total === null ? (
                '—'
              ) : prefersReduced ? (
                formatMoney(total, currency)
              ) : (
                <AnimatedCounter value={total} format='currency' currency={currency} duration={0.4} />
              )}
            </Typography>
          </Box>

          {marginMeta && marginPct !== null && marginPct !== undefined && !loading ? (
            <Tooltip
              title={
                marginTierRange
                  ? `${marginMeta.label} · ${(marginPct * 100).toFixed(1)}%. Target ${(marginTierRange.min * 100).toFixed(0)}–${(marginTierRange.max * 100).toFixed(0)}%${marginTierRange.tierLabel ? ` (${marginTierRange.tierLabel})` : ''}.`
                  : `${marginMeta.label}: ${(marginPct * 100).toFixed(1)}%`
              }
              arrow
              placement='top'
              disableInteractive
            >
              <Box
                sx={theme => ({
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 1,
                  backgroundColor: alpha(theme.palette[marginMeta.color].main, 0.12),
                  color: theme.palette[marginMeta.color].main,
                  border: `1px solid ${alpha(theme.palette[marginMeta.color].main, 0.24)}`,
                  cursor: 'help'
                })}
                aria-label={`${marginMeta.label}: ${(marginPct * 100).toFixed(1)}%`}
              >
                <i className={marginMeta.icon} aria-hidden='true' style={{ fontSize: 14 }} />
                <Typography variant='caption' sx={{ fontWeight: 600 }}>
                  {(marginPct * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Tooltip>
          ) : null}
        </Stack>
        )}

        {/* Bloque de acciones */}
        <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
          {addonContent && addonCount > 0 ? (
            <>
              <Box
                component='button'
                type='button'
                onClick={handleAddonsToggle}
                aria-expanded={addonsOpen}
                aria-haspopup='dialog'
                aria-label={
                  addonCount > 0 ? GH_PRICING.summaryDock.addonsChip(addonCount) : GH_PRICING.summaryDock.addonsChipEmpty
                }
                sx={theme => ({
                  appearance: 'none',
                  border: `1px solid ${theme.palette.divider}`,
                  backgroundColor: addonCount > 0
                    ? alpha(theme.palette.primary.main, 0.08)
                    : 'transparent',
                  color: addonCount > 0 ? theme.palette.primary.main : theme.palette.text.secondary,
                  borderRadius: 999,
                  px: 1.5,
                  py: 0.75,
                  minHeight: 36,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  cursor: 'pointer',
                  transition: theme.transitions.create(['background-color', 'border-color']),
                  '&:hover': { borderColor: theme.palette.primary.main },
                  '&:focus-visible': {
                    outline: `2px solid ${theme.palette.primary.main}`,
                    outlineOffset: 2
                  },
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
                })}
              >
                <Badge
                  badgeContent={addonCount}
                  color='primary'
                  invisible={addonCount === 0}
                  sx={{ '& .MuiBadge-badge': { fontSize: 10, height: 16, minWidth: 16 } }}
                >
                  <i className='tabler-sparkles' aria-hidden='true' style={{ fontSize: 16 }} />
                </Badge>
                <Typography variant='caption' sx={{ fontWeight: 500 }}>
                  {addonCount > 0
                    ? GH_PRICING.summaryDock.addonsChip(addonCount)
                    : GH_PRICING.summaryDock.addonsChipEmpty}
                </Typography>
                {addonTotalDelta !== null && addonTotalDelta !== undefined && addonTotalDelta > 0 ? (
                  <Typography
                    variant='caption'
                    sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', ml: 0.5 }}
                  >
                    +{formatMoney(addonTotalDelta, currency)}
                  </Typography>
                ) : null}
              </Box>
              <Popper
                open={addonsOpen}
                anchorEl={addonAnchor}
                placement='top-end'
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
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`
                    })}
                  >
                    {addonContent}
                  </Paper>
                </ClickAwayListener>
              </Popper>
            </>
          ) : null}

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
              primaryCtaIcon ? <i className={primaryCtaIcon} aria-hidden='true' /> : undefined
            }
            sx={{ minHeight: 44, fontWeight: 600 }}
          >
            {primaryCtaLoading ? GH_PRICING.summaryDock.loadingLabel : primaryCtaLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>
  )
}

const SummaryBlock = ({
  label,
  value,
  variant = 'normal'
}: {
  label: string
  value: string | null
  variant?: 'normal' | 'muted'
}) => (
  <Box>
    <Typography
      variant='caption'
      color='text.secondary'
      sx={{ textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', lineHeight: 1 }}
    >
      {label}
    </Typography>
    {value === null ? (
      <Skeleton variant='text' width={90} height={24} />
    ) : (
      <Typography
        variant='body1'
        sx={{
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
          lineHeight: 1.2,
          color: variant === 'muted' ? 'text.secondary' : 'text.primary'
        }}
      >
        {value}
      </Typography>
    )}
  </Box>
)

const formatRelativeTime = (date: Date): string => {
  const now = Date.now()
  const delta = Math.max(0, now - date.getTime())
  const seconds = Math.floor(delta / 1000)

  if (seconds < 5) return 'ahora'
  if (seconds < 60) return `hace ${seconds}s`
  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) return `hace ${minutes}m`
  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `hace ${hours}h`

  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

export default QuoteSummaryDock
