'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Paper from '@mui/material/Paper'
import Popper from '@mui/material/Popper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
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

  /** Si hay un error del engine v2, se muestra como Alert inline en la parte
   * superior del dock (justo encima del bloque de totales). */
  simulationError?: string | null
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
  simulationError
}: QuoteSummaryDockProps) => {
  const prefersReduced = useReducedMotion()
  const addonChipRef = useRef<HTMLDivElement | null>(null)
  const [addonsOpen, setAddonsOpen] = useState(false)

  const handleAddonsToggle = () => setAddonsOpen(prev => !prev)
  const handleAddonsClose = () => setAddonsOpen(false)

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

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent='space-between'
        useFlexGap
      >
        {/* Bloque de totales */}
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
          {factor !== null && factor !== undefined ? (
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
                border: `1px solid ${alpha(theme.palette[marginMeta.color].main, 0.24)}`
              })}
              aria-label={`${marginMeta.label}: ${(marginPct * 100).toFixed(1)}%`}
            >
              <i className={marginMeta.icon} aria-hidden='true' style={{ fontSize: 14 }} />
              <Typography variant='caption' sx={{ fontWeight: 600 }}>
                {(marginPct * 100).toFixed(1)}%
              </Typography>
            </Box>
          ) : null}
        </Stack>

        {/* Bloque de acciones */}
        <Stack direction='row' spacing={1.5} alignItems='center' flexWrap='wrap' useFlexGap>
          {addonContent ? (
            <>
              <Box
                ref={addonChipRef}
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
              </Box>
              <Popper
                open={addonsOpen}
                anchorEl={addonChipRef.current}
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

export default QuoteSummaryDock
