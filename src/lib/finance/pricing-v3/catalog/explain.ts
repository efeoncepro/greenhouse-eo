import Decimal from 'decimal.js'

import { PRICING_V3_ENGINES } from '../schemas'
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
 * Market factor in force for a frozen quote and where its price floor is read: `floorBasis` is `base_market` only when
 * the record declares it (contract 1.2.0); null means the floor is read on the final net. The neutral factor (1, no
 * floor basis) changes nothing and is not reported: readings of quotes frozen with it keep the keys they had.
 */
export function describeMarketFactor(resolution: Quote['resolution']) {
  const market = resolution.bindings.find(b => b.purpose === 'market_factor')?.record

  if (market?.kind !== 'market_factor') return null
  if (!market.value.floorBasis && new D(market.value.factor).eq(1)) return null

  return {
    country: market.value.country,
    factor: market.value.factor,
    floorBasis: market.value.floorBasis ?? null,
    recordId: market.recordId,
    revision: market.revision,
    sourceStatus: market.source.status
  }
}

/**
 * Form of the engagement a frozen quote declares and the price ratio resolution bound for it (contract 1.3.0). Null
 * when the brief declares no form. Unlike the market factor, a ratio of 1 is reported too: the declared form is part
 * of what the quote freezes, whatever it does to the price.
 */
export function describeEngagementForm(resolution: Quote['resolution']) {
  const engagement = resolution.bindings.find(b => b.purpose === 'engagement_factor')?.record

  if (engagement?.kind !== 'engagement_factor') return null

  return {
    form: engagement.value.form,
    priceRatio: engagement.value.priceRatio,
    scope: engagement.value.offerId ? ('offer' as const) : ('general' as const),
    offerId: engagement.value.offerId ?? null,
    recordId: engagement.recordId,
    revision: engagement.revision,
    sourceStatus: engagement.source.status
  }
}

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

const IDENTITY = 'net = undiscountedPrice + uplift - discount; undiscountedPrice already includes roundingAdjustment.'

const MARKET_IDENTITY =
  ' undiscountedPrice - roundingAdjustment - marketAdjustment is the price of the base market (market factor 1).' +
  ' A row is under its floor when net < floorNet; the margin reported is always the real one, on the final net.'

// Contract 1.3.0 puts the engagement ratio on top of the market price, so one more amount is taken off to reach the
// base. The floor sentence is the same: the ratio moves the net, never `floorNet`.
const ENGAGEMENT_IDENTITY =
  ' undiscountedPrice - roundingAdjustment - engagementAdjustment is the price of the offer market at engagement' +
  ' ratio 1; less marketAdjustment it is the price of the base market (market factor 1) at that ratio.' +
  ' A row is under its floor when net < floorNet; floorNet is the one of the same row quoted without a form, and' +
  ' the margin reported is always the real one, on the final net.'

/**
 * Internal price walk per billable row, as the kernel stored it. Contract 1.1.0 rows add rounding and uplift; contract
 * 1.2.0 rows add the market adjustment and the floor of that market; contract 1.3.0 rows add the engagement
 * adjustment and the ratio of the declared form.
 */
export function explainCommercialAdjustments(result: Quote) {
  const v13 = result.periods.some(period => period.result.engineVersion === PRICING_V3_ENGINES['1.3.0'])
  const v12 = v13 || result.periods.some(period => period.result.engineVersion === PRICING_V3_ENGINES['1.2.0'])

  return {
    ...describeCommercialTerms(result.resolution),
    ...(v12 ? { marketFactor: describeMarketFactor(result.resolution) } : {}),
    ...(v13 ? { engagementForm: describeEngagementForm(result.resolution) } : {}),
    identity: v13 ? IDENTITY + ENGAGEMENT_IDENTITY : v12 ? IDENTITY + MARKET_IDENTITY : IDENTITY,
    rows: result.periods.flatMap(period =>
      period.result.lines.map(line => ({
        periodId: period.periodId,
        lineId: line.lineId,
        kind: line.kind,
        ...('marketAdjustment' in line ? { marketAdjustment: line.marketAdjustment } : {}),
        ...('engagementAdjustment' in line ? { engagementAdjustment: line.engagementAdjustment } : {}),
        undiscountedPrice: line.undiscountedPrice,
        ...('roundingAdjustment' in line ? { roundingAdjustment: line.roundingAdjustment } : {}),
        discount: line.discount,
        ...('uplift' in line ? { uplift: line.uplift } : {}),
        net: line.net,
        ...('floorNet' in line ? { marketPriceRatio: line.marketPriceRatio, floorNet: line.floorNet } : {}),
        ...('engagementPriceRatio' in line ? { engagementPriceRatio: line.engagementPriceRatio } : {})
      }))
    )
  }
}
