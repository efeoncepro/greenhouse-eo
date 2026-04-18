'use client'

import { useMemo } from 'react'

import type { PricingLineOutputV2, PricingOutputCurrency } from '@/lib/finance/pricing/contracts'

import CostStackPanel, {
  type CostStackLine,
  type CostStackPanelProps,
  type CostStackTierFit
} from '@/components/greenhouse/pricing/CostStackPanel'

export interface QuoteLineCostStackProps {

  /** Output del engine v2 para una línea individual */
  lineOutput: PricingLineOutputV2

  /** Moneda output del quote */
  outputCurrency: PricingOutputCurrency

  /** Default expanded del accordion (false por default, quote-builder variant) */
  defaultExpanded?: boolean
}

/**
 * Wrapper adapter que convierte `PricingLineOutputV2` del engine v2 en props
 * del CostStackPanel primitive. Usa la variant `quote-builder` (accordion).
 *
 * Responsabilidad del caller: solo renderizar este componente si
 * `canViewCostStack(tenant)` es true. El componente primitive asume que el
 * gating ya fue aplicado por el caller.
 */
const QuoteLineCostStack = ({ lineOutput, outputCurrency, defaultExpanded = false }: QuoteLineCostStackProps) => {
  const lines = useMemo<CostStackLine[]>(() => {
    const breakdown = lineOutput.costStack.breakdown ?? {}
    const entries = Object.entries(breakdown)

    if (entries.length === 0) {
      return [
        {
          itemId: 'cost-total',
          label: 'Costo base',
          costBase: lineOutput.costStack.totalCostUsd,
          feeAmount: 0,
          feeType: 'flat' as const,
          total: lineOutput.costStack.totalCostUsd
        }
      ]
    }

    return entries.map(([key, value]) => ({
      itemId: key,
      label: key,
      costBase: value,
      feeAmount: 0,
      feeType: 'flat' as const,
      total: value
    }))
  }, [lineOutput.costStack])

  const totals = useMemo<CostStackPanelProps['totals']>(() => {
    const totalCost = lineOutput.costStack.totalCostUsd
    const priceToClient = lineOutput.suggestedBillRate.totalBillOutputCurrency
    const grossMargin = priceToClient - totalCost

    return {
      totalCost,
      priceToClient,
      grossMargin,
      marginPct: lineOutput.effectiveMarginPct
    }
  }, [lineOutput])

  const tierFit = useMemo<CostStackTierFit | undefined>(() => {
    const compliance = lineOutput.tierCompliance

    if (!compliance.tier || compliance.marginMin === null || compliance.marginMin === undefined) return undefined
    if (compliance.marginOpt === null || compliance.marginOpt === undefined) return undefined
    if (compliance.marginMax === null || compliance.marginMax === undefined) return undefined

    return {
      tierCode: compliance.tier,
      label: compliance.tier,
      marginMin: compliance.marginMin,
      marginOpt: compliance.marginOpt,
      marginMax: compliance.marginMax
    }
  }, [lineOutput.tierCompliance])

  return (
    <CostStackPanel
      lines={lines}
      totals={totals}
      tierFit={tierFit}
      currency={outputCurrency}
      variant='quote-builder'
      defaultExpanded={defaultExpanded}
    />
  )
}

export default QuoteLineCostStack
