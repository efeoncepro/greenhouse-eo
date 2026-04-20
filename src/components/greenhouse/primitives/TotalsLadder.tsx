'use client'

import { Fragment, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import useReducedMotion from '@/hooks/useReducedMotion'

export type TotalsLadderCurrency = 'CLP' | 'USD' | 'CLF' | 'COP' | 'MXN' | 'PEN'

export interface TotalsLadderAddonsSegment {

  /** Número total de addons aplicados (>0 para renderizar el segmento). */
  count: number

  /** Monto aplicado al total en la moneda output. */
  amount: number

  /** Handler del click — abre típicamente un popover con el detalle. */
  onClick: (event: ReactMouseEvent<HTMLElement>) => void

  /** Reflejo del popover state para a11y. */
  ariaExpanded?: boolean
}

export interface TotalsLadderProps {
  subtotal: number | null
  factor?: number | null
  ivaAmount?: number | null
  total: number | null
  currency: TotalsLadderCurrency
  loading?: boolean

  /** Copy override para el label del total. Default: "Total {currency}". */
  totalLabel?: string

  /** Segmento interactivo de addons inline en la ladder. Patrón enterprise
   *  (Notion/Linear/Stripe): acciones contextuales viven con sus datos, no
   *  como chips flotantes aparte. Cuando count > 0, renderiza como botón
   *  inline con hover/focus states y abre el popover al click. */
  addonsSegment?: TotalsLadderAddonsSegment | null
}

const CURRENCY_LOCALE: Record<TotalsLadderCurrency, string> = {
  CLP: 'es-CL',
  USD: 'en-US',
  CLF: 'es-CL',
  COP: 'es-CO',
  MXN: 'es-MX',
  PEN: 'es-PE'
}

const formatMoney = (amount: number | null, currency: TotalsLadderCurrency): string => {
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

const formatFactor = (factor: number) => `×${factor.toFixed(2).replace('.', ',')}`

/**
 * TotalsLadder — primitive para mostrar el total de una cotización / factura /
 * orden con adaptive density. Patrón enterprise (Stripe Billing, Ramp, Notion
 * totals row):
 *
 * - Una única métrica prominente (h4, tabular-nums, text.primary) es el anchor.
 * - Subtotal, factor, IVA y addons colapsan en un caption muted one-liner
 *   debajo **solo cuando aportan información**. Addons son interactivos
 *   (botón inline) cuando hay > 0 aplicados.
 *
 * Evita la redundancia de mostrar Subtotal y Total side-by-side con peso
 * equivalente cuando son el mismo número.
 *
 * Consumers: QuoteSummaryDock v2 (TASK-505 + TASK-507). Reusable para invoice
 * dock, purchase order footer, contract summary.
 */
const TotalsLadder = ({
  subtotal,
  factor,
  ivaAmount,
  total,
  currency,
  loading = false,
  totalLabel,
  addonsSegment
}: TotalsLadderProps) => {
  const prefersReduced = useReducedMotion()

  const resolvedTotalLabel = totalLabel ?? `Total ${currency}`

  // Ladder mostramos solo si hay al menos un ajuste que explicar
  const hasFactorAdjustment = factor !== null && factor !== undefined && factor !== 1
  const hasIvaAdjustment = ivaAmount !== null && ivaAmount !== undefined && ivaAmount !== 0
  const hasSubtotalDelta = subtotal !== null && total !== null && subtotal !== total
  const hasAddonsSegment = Boolean(addonsSegment && addonsSegment.count > 0)

  const showLadder = hasFactorAdjustment || hasIvaAdjustment || hasSubtotalDelta || hasAddonsSegment

  type Segment =
    | { kind: 'text'; key: string; text: string }
    | { kind: 'addons'; key: string; addons: TotalsLadderAddonsSegment }

  const segments: Segment[] = []

  if (subtotal !== null) {
    segments.push({ kind: 'text', key: 'subtotal', text: `Subtotal ${formatMoney(subtotal, currency)}` })
  }

  if (hasAddonsSegment && addonsSegment) {
    segments.push({ kind: 'addons', key: 'addons', addons: addonsSegment })
  }

  if (hasFactorAdjustment && factor !== null && factor !== undefined) {
    segments.push({ kind: 'text', key: 'factor', text: `Factor ${formatFactor(factor)}` })
  }

  if (hasIvaAdjustment && ivaAmount !== null && ivaAmount !== undefined) {
    segments.push({ kind: 'text', key: 'iva', text: `IVA ${formatMoney(ivaAmount, currency)}` })
  }

  const renderSeparator = (): ReactNode => (
    <Box component='span' aria-hidden='true' sx={{ mx: 0.75, color: 'text.secondary' }}>
      ·
    </Box>
  )

  return (
    <Box>
      <Typography
        component='span'
        variant='overline'
        color='text.secondary'
        sx={{ display: 'block', lineHeight: 1, letterSpacing: '0.5px' }}
      >
        {resolvedTotalLabel}
      </Typography>
      <Typography
        component='span'
        variant='h4'
        sx={{
          display: 'block',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 600,
          lineHeight: 1.15,
          color: 'text.primary',
          mt: 0.25
        }}
        aria-label={`Total ${formatMoney(total, currency)}`}
      >
        {loading ? (
          <Skeleton variant='text' width={180} height={40} sx={{ display: 'inline-block' }} />
        ) : total === null ? (
          '—'
        ) : prefersReduced ? (
          formatMoney(total, currency)
        ) : (
          <AnimatedCounter value={total} format='currency' currency={currency} duration={0.25} />
        )}
      </Typography>

      {showLadder && !loading && segments.length > 0 ? (
        <Stack
          direction='row'
          spacing={0}
          alignItems='center'
          sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.25 }}
        >
          {segments.map((segment, idx) => (
            <Fragment key={segment.key}>
              {idx > 0 ? renderSeparator() : null}
              {segment.kind === 'text' ? (
                <Typography
                  component='span'
                  variant='caption'
                  color='text.secondary'
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {segment.text}
                </Typography>
              ) : (
                <Box
                  component='button'
                  type='button'
                  onClick={segment.addons.onClick}
                  aria-expanded={segment.addons.ariaExpanded ?? undefined}
                  aria-haspopup='dialog'
                  aria-label={`${segment.addons.count} addon${segment.addons.count === 1 ? '' : 's'} aplicado${segment.addons.count === 1 ? '' : 's'} por ${formatMoney(segment.addons.amount, currency)}. Abrir detalle.`}
                  sx={theme => ({
                    appearance: 'none',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    color: theme.palette.text.secondary,
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: theme.typography.caption.fontSize,
                    fontFamily: theme.typography.fontFamily,
                    textDecoration: 'none',
                    transition: theme.transitions.create(['color', 'text-decoration-color'], {
                      duration: 150,
                      easing: 'cubic-bezier(0.2, 0, 0, 1)'
                    }),
                    '&:hover': {
                      color: theme.palette.primary.main,
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px'
                    },
                    '&:focus-visible': {
                      outline: `2px solid ${theme.palette.primary.main}`,
                      outlineOffset: 2,
                      borderRadius: `${theme.shape.customBorderRadius.xs}px`,
                      color: theme.palette.primary.main
                    },
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
                  })}
                >
                  <i className='tabler-sparkles' aria-hidden='true' style={{ fontSize: 14 }} />
                  <span>
                    {segment.addons.count} addon{segment.addons.count === 1 ? '' : 's'}
                    {segment.addons.amount > 0 ? ` ${formatMoney(segment.addons.amount, currency)}` : ''}
                  </span>
                </Box>
              )}
            </Fragment>
          ))}
        </Stack>
      ) : null}
    </Box>
  )
}

export default TotalsLadder
