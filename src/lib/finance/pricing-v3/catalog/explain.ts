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
