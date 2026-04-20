'use client'

import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import useReducedMotion from '@/hooks/useReducedMotion'

export type TotalsLadderCurrency = 'CLP' | 'USD' | 'CLF' | 'COP' | 'MXN' | 'PEN'

export interface TotalsLadderProps {
  subtotal: number | null
  factor?: number | null
  ivaAmount?: number | null
  total: number | null
  currency: TotalsLadderCurrency
  loading?: boolean

  /** Copy override para el label del total. Default: "Total {currency}". */
  totalLabel?: string
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
 * - Subtotal, factor y IVA colapsan en un caption muted one-liner debajo
 *   **solo cuando aportan información** (total ≠ subtotal o hay factor ≠ 1
 *   o hay IVA). Si no, el ladder se oculta y queda solo el total.
 *
 * Evita la redundancia de mostrar Subtotal y Total side-by-side con peso
 * equivalente cuando son el mismo número.
 *
 * Consumers: QuoteSummaryDock v2 (TASK-505). Reusable para invoice dock,
 * purchase order footer, contract summary.
 */
const TotalsLadder = ({
  subtotal,
  factor,
  ivaAmount,
  total,
  currency,
  loading = false,
  totalLabel
}: TotalsLadderProps) => {
  const prefersReduced = useReducedMotion()

  const resolvedTotalLabel = totalLabel ?? `Total ${currency}`

  // Ladder mostramos solo si hay al menos un ajuste que explicar
  const hasFactorAdjustment = factor !== null && factor !== undefined && factor !== 1
  const hasIvaAdjustment = ivaAmount !== null && ivaAmount !== undefined && ivaAmount !== 0
  const hasSubtotalDelta = subtotal !== null && total !== null && subtotal !== total

  const showLadder = hasFactorAdjustment || hasIvaAdjustment || hasSubtotalDelta

  const ladderSegments: string[] = []

  if (subtotal !== null) ladderSegments.push(`Subtotal ${formatMoney(subtotal, currency)}`)
  if (hasFactorAdjustment && factor !== null && factor !== undefined) ladderSegments.push(`Factor ${formatFactor(factor)}`)
  if (hasIvaAdjustment && ivaAmount !== null && ivaAmount !== undefined) ladderSegments.push(`IVA ${formatMoney(ivaAmount, currency)}`)

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

      {showLadder && !loading && ladderSegments.length > 0 ? (
        <Stack
          direction='row'
          spacing={0}
          alignItems='center'
          sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.25 }}
        >
          {ladderSegments.map((segment, idx) => (
            <Typography
              key={segment}
              component='span'
              variant='caption'
              color='text.secondary'
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {idx > 0 ? (
                <Box component='span' aria-hidden='true' sx={{ mx: 0.75 }}>
                  ·
                </Box>
              ) : null}
              {segment}
            </Typography>
          ))}
        </Stack>
      ) : null}
    </Box>
  )
}

export default TotalsLadder
