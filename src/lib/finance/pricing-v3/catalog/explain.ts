import Decimal from 'decimal.js'

import type { calculateCatalogQuote } from './quote'

const D = Decimal.clone({ precision: 80 })

/** Attribution projection only; costs/prices are the already calculated kernel components. */
export function explainCostComponents(result: ReturnType<typeof calculateCatalogQuote>) {
  return result.periods.flatMap(period =>
    period.result.lines
      .filter(l => l.kind === 'monthly')
      .map(line => {
        const binding = result.resolution.bindings.find(b => b.lineId === line.parentLineId && b.record.kind === 'cost')
        const record = binding?.record
        const human = line.components.find(c => c.kind === 'human')

        const currency = result.resolution.inputs.find(p => p.periodId === period.periodId)!.input.snapshot
          .calculationCurrency

        const referenceTotal =
          record?.kind === 'cost'
            ? record.value.components.reduce((s, c) => s.plus(c.amount ?? '0'), new D(0))
            : new D(0)

        return {
          periodId: period.periodId,
          lineId: line.parentLineId,
          currency,
          human:
            record?.kind === 'cost' && human
              ? record.value.components.map(component => ({
                  coverage: component.coverage,
                  referenceAmount: component.amount,
                  referenceCurrency: record.value.currency,
                  allocatedCostBeforeLineRounding: referenceTotal.gt(0)
                    ? new D(human.cost).mul(component.amount!).div(referenceTotal).toString()
                    : '0',
                  recordId: record.recordId,
                  revision: record.revision,
                  source: record.source
                }))
              : [],
          resources: line.components
            .filter(c => c.kind !== 'human')
            .map(c => ({
              label: c.label,
              kind: c.kind,
              allocatedCostBeforeLineRounding: c.cost,
              calculatedPrice: c.price,
              assignment: c.trace
            }))
        }
      })
  )
}

type Quote = ReturnType<typeof calculateCatalogQuote>

/**
 * Commercial terms a frozen quote was resolved with: the adjustments its brief declares and the rounding rule
 * resolution bound for the output currency. A selection readout; every amount stays the kernel's.
 */
export function describeCommercialTerms(resolution: Quote['resolution']) {
  const rule = resolution.bindings.find(b => b.purpose === 'price_rounding')?.record

  return {
    commercialAdjustments: resolution.brief?.adjustments ?? [],
    priceRounding:
      rule?.kind === 'price_rounding'
        ? {
            currency: rule.value.currency,
            multiple: rule.value.multiple,
            scope: rule.value.offerId ? ('offer' as const) : ('general' as const),
            offerId: rule.value.offerId ?? null,
            recordId: rule.recordId,
            revision: rule.revision,
            sourceStatus: rule.source.status
          }
        : null
  }
}

/** Internal price walk per billable row, as the kernel stored it. Contract 1.1.0 rows add rounding and uplift. */
export function explainCommercialAdjustments(result: Quote) {
  return {
    ...describeCommercialTerms(result.resolution),
    identity: 'net = undiscountedPrice + uplift - discount; undiscountedPrice already includes roundingAdjustment.',
    rows: result.periods.flatMap(period =>
      period.result.lines.map(line => ({
        periodId: period.periodId,
        lineId: line.lineId,
        kind: line.kind,
        undiscountedPrice: line.undiscountedPrice,
        ...('roundingAdjustment' in line ? { roundingAdjustment: line.roundingAdjustment } : {}),
        discount: line.discount,
        ...('uplift' in line ? { uplift: line.uplift } : {}),
        net: line.net
      }))
    )
  }
}
