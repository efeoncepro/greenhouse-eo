'use client'

import { Fragment, useState, type ReactNode } from 'react'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

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

import AnimatedCounter from '@/components/greenhouse/AnimatedCounter'
import useReducedMotion from '@/hooks/useReducedMotion'
import { formatCurrency as formatGreenhouseCurrency, formatNumber as formatGreenhouseNumber } from '@/lib/format'

export type TotalsLadderCurrency = 'CLP' | 'USD' | 'CLF' | 'COP' | 'MXN' | 'PEN'

export interface TotalsLadderAddonsSegment {

  /** Número total de addons aplicados (>0 para renderizar el segmento). */
  count: number

  /** Monto aplicado al total en la moneda output. */
  amount: number

  /** Contenido del popover que se abre al click del segmento. El primitive
   *  se encarga del positioning, focus management, dismiss y a11y. */
  content: ReactNode
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
   *  como chips flotantes aparte. El primitive encapsula el popover usando
   *  Floating UI — autoUpdate + flip + shift middleware aseguran posicionamiento
   *  correcto aún si el anchor re-renderiza o se mueve. */
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
    return formatGreenhouseCurrency(amount, currency, {
  maximumFractionDigits: 0
}, locale)
  } catch {
    return `${formatGreenhouseNumber(amount, {
  maximumFractionDigits: 2
}, locale)} ${currency}`
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
 *   (botón inline + popover) cuando hay > 0 aplicados.
 * - El popover está self-contained: anchor + state + positioning + a11y viven
 *   dentro del primitive usando Floating UI (@floating-ui/react). Consumers
 *   pasan el contenido del popover como `addonsSegment.content`.
 *
 * Consumers: QuoteSummaryDock v2 (TASK-505 / TASK-507 / TASK-509). Reusable
 * para invoice dock, purchase order footer, contract summary.
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
                <AddonsSegmentButton
                  count={segment.addons.count}
                  amount={segment.addons.amount}
                  content={segment.addons.content}
                  currency={currency}
                />
              )}
            </Fragment>
          ))}
        </Stack>
      ) : null}
    </Box>
  )
}

/**
 * Inline button + popover para el segmento de addons. Encapsula Floating UI:
 * autoUpdate detecta cambios del anchor (scroll, resize, re-render) y mantiene
 * la posición correcta; flip + shift evitan que el popover se salga del
 * viewport; useDismiss gestiona escape + outside-click; FloatingFocusManager
 * maneja focus trap ligero + return focus.
 */
const AddonsSegmentButton = ({
  count,
  amount,
  content,
  currency
}: {
  count: number
  amount: number
  content: ReactNode
  currency: TotalsLadderCurrency
}) => {
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

  return (
    <>
      <Box
        component='button'
        type='button'
        ref={refs.setReference}
        {...getReferenceProps()}
        aria-label={`${count} addon${count === 1 ? '' : 's'} aplicado${count === 1 ? '' : 's'}${amount > 0 ? ` por ${formatMoney(amount, currency)}` : ''}. Abrir detalle.`}
        sx={theme => ({
          appearance: 'none',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          color: open ? theme.palette.primary.main : theme.palette.text.secondary,
          fontVariantNumeric: 'tabular-nums',
          fontSize: theme.typography.caption.fontSize,
          fontFamily: theme.typography.fontFamily,
          textDecoration: open ? 'underline' : 'none',
          textUnderlineOffset: '2px',
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
          {count} addon{count === 1 ? '' : 's'}
          {amount > 0 ? ` ${formatMoney(amount, currency)}` : ''}
        </span>
      </Box>

      {open ? (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} returnFocus>
            <Paper
              ref={refs.setFloating}
              elevation={6}
              style={floatingStyles}
              {...getFloatingProps()}
              sx={theme => ({
                width: 380,
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
              {content}
            </Paper>
          </FloatingFocusManager>
        </FloatingPortal>
      ) : null}
    </>
  )
}

export default TotalsLadder
