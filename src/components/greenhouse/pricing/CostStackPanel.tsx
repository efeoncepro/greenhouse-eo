'use client'

import type { ReactNode } from 'react'

import Accordion from '@mui/material/Accordion'
import AccordionDetails from '@mui/material/AccordionDetails'
import AccordionSummary from '@mui/material/AccordionSummary'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

import { GH_PRICING } from '@/config/greenhouse-nomenclature'
import { formatCurrency, formatNumber, formatPercent } from '@/lib/format'
import type { PricingOutputCurrency } from '@/lib/finance/pricing/contracts'

import MarginIndicatorBadge from './MarginIndicatorBadge'

export interface CostStackLine {
  itemId: string
  label: string
  costBase: number
  feeAmount: number
  feeType: 'percent' | 'flat'
  total: number
}

export interface CostStackTotals {
  totalCost: number
  priceToClient: number
  grossMargin: number
  marginPct: number
}

export interface CostStackTierFit {
  tierCode: string
  label: string
  marginMin: number
  marginOpt: number
  marginMax: number
}

export interface CostStackPanelProps {
  lines: CostStackLine[]
  totals: CostStackTotals
  tierFit?: CostStackTierFit
  currency: PricingOutputCurrency

  /** `quote-builder` (default): accordion collapsed. `admin-preview`: siempre expandido, sin accordion. */
  variant?: 'quote-builder' | 'admin-preview'
  defaultExpanded?: boolean
}

const formatMoney = (amount: number, currency: PricingOutputCurrency): string => {
  if (currency === 'CLF') return `${formatNumber(amount, { maximumFractionDigits: 2 })} ${currency}`

  return formatCurrency(amount, currency, { maximumFractionDigits: 0 }, currency === 'USD' ? 'en-US' : undefined)
}

const formatPct = (value: number): string =>
  formatPercent(value, { minimumFractionDigits: 1, maximumFractionDigits: 1 })

const formatFeeCell = (line: CostStackLine): string => {
  if (line.feeType === 'percent') {
    return formatPct(line.costBase > 0 ? line.feeAmount / line.costBase : 0)
  }

  return 'flat'
}

const Body = ({
  lines,
  totals,
  tierFit,
  currency
}: Pick<CostStackPanelProps, 'lines' | 'totals' | 'tierFit' | 'currency'>): ReactNode => (
  <Stack spacing={2}>
    {lines.length === 0 ? (
      <Typography variant='body2' color='text.secondary'>
        {GH_PRICING.builderEmptyLineItems}
      </Typography>
    ) : (
      <Table size='small' aria-label={GH_PRICING.costStackTitle}>
        <TableHead>
          <TableRow>
            <TableCell scope='col'>Ítem</TableCell>
            <TableCell scope='col' align='right'>
              Costo
            </TableCell>
            <TableCell scope='col' align='right'>
              Fee
            </TableCell>
            <TableCell scope='col' align='right'>
              Total
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map(line => (
            <TableRow key={line.itemId}>
              <TableCell>{line.label}</TableCell>
              <TableCell align='right'>{formatMoney(line.costBase, currency)}</TableCell>
              <TableCell align='right'>{formatFeeCell(line)}</TableCell>
              <TableCell align='right'>{formatMoney(line.total, currency)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}

    <Divider />

    <Stack spacing={1}>
      <Row label={GH_PRICING.costStackTotalCost} value={formatMoney(totals.totalCost, currency)} />
      <Row label={GH_PRICING.costStackPriceToClient} value={formatMoney(totals.priceToClient, currency)} />
      <Row
        label={GH_PRICING.costStackGrossMargin}
        value={`${formatMoney(totals.grossMargin, currency)} (${formatPct(totals.marginPct)})`}
      />
      {tierFit ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant='body2' color='text.secondary'>
            {GH_PRICING.costStackTierFit}
          </Typography>
          <Stack direction='row' spacing={1} alignItems='center'>
            <Chip size='small' label={tierFit.label} />
            <MarginIndicatorBadge
              marginPct={totals.marginPct}
              target={{ min: tierFit.marginMin, opt: tierFit.marginOpt, max: tierFit.marginMax }}
              size='sm'
            />
          </Stack>
        </Box>
      ) : null}
    </Stack>
  </Stack>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
    <Typography variant='body2' color='text.secondary'>
      {label}
    </Typography>
    <Typography variant='body2' sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
      {value}
    </Typography>
  </Box>
)

/**
 * Panel de desglose de costo interno. Gating del acceso lo hace el caller (ver
 * `canViewCostStack` en `@/lib/tenant/authorization` y sanitización del endpoint
 * `/api/finance/quotes/pricing/simulate`). Si el caller no tiene permiso, no
 * renderiza este componente en absoluto — el componente asume que la decisión
 * de visibilidad ya se tomó.
 */
const CostStackPanel = ({
  lines,
  totals,
  tierFit,
  currency,
  variant = 'quote-builder',
  defaultExpanded = false
}: CostStackPanelProps) => {
  if (variant === 'admin-preview') {
    return (
      <Box
        component='section'
        role='region'
        aria-label={GH_PRICING.costStackTitle}
        sx={theme => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          p: 3
        })}
      >
        <Typography variant='h6' sx={{ mb: 2 }}>
          {GH_PRICING.costStackTitle}
        </Typography>
        <Body lines={lines} totals={totals} tierFit={tierFit} currency={currency} />
      </Box>
    )
  }

  return (
    <Accordion
      defaultExpanded={defaultExpanded}
      disableGutters
      elevation={0}
      sx={theme => ({
        border: `1px solid ${theme.palette.divider}`,
        '&::before': { display: 'none' }
      })}
    >
      <AccordionSummary
        expandIcon={<i className='tabler-chevron-down' aria-hidden='true' />}
        aria-label={GH_PRICING.costStackTitle}
      >
        <Typography variant='subtitle2'>{GH_PRICING.costStackTitle}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Body lines={lines} totals={totals} tierFit={tierFit} currency={currency} />
      </AccordionDetails>
    </Accordion>
  )
}

export default CostStackPanel
