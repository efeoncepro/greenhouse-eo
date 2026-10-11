import Decimal from 'decimal.js'

import type { PricingV3LineV12 } from '../calculate'
import { describeCommercialTerms, describeMarketFactor } from '../catalog/explain'
import type { composeResourceQuote } from './composition'

type Composition = ReturnType<typeof composeResourceQuote>

const D = Decimal.clone({ precision: 80 })

export const COMPOSITION_SUMMARY_VERSION = 'pricing-v3-composition-summary/1'

/** Reading precision for ratios. Rounded toward minus infinity so a displayed margin never looks better than stored. */
const RATIO_DISPLAY_DECIMALS = 6

const ratioForReading = (value: Decimal) =>
  value.toDecimalPlaces(RATIO_DISPLAY_DECIMALS, D.ROUND_FLOOR).toFixed(RATIO_DISPLAY_DECIMALS)

const unique = <T>(items: T[]) => [...new Set(items)]

/** Rows of contract 1.2.0 carry the floor of their market; rows of earlier contracts have no such key. */
const hasMarketFloor = (line: object): line is PricingV3LineV12 => 'floorNet' in line

/** Rows that differ only by period collapse into one entry, in the order the result first produced them. */
const acrossPeriods = <T extends object>(rows: { periodId: number; row: T }[]) => {
  const groups = new Map<string, T & { periodIds: number[] }>()

  for (const { periodId, row } of rows) {
    const key = JSON.stringify(row)
    const group = groups.get(key)

    if (group) group.periodIds.push(periodId)
    else groups.set(key, { ...row, periodIds: [periodId] })
  }

  return [...groups.values()]
}

/**
 * Lines the kernel reported under the margin floor of their pricing policy. The verdict is `MARGIN_BELOW_FLOOR` from
 * calculate.ts and nothing else: this only attaches the stored amounts of the flagged line so a reader can size it.
 *
 * `net`, `marginAmount` and `marginRateRoundedDown` are always the real ones, on the final net. A contract 1.2.0 row
 * also carries the kernel's `floorNet` (the smallest net that meets the floor in that market) and the gap is read
 * from it; it is never recomputed here, because under a base-market floor `minimumMargin x net` is not the floor.
 */
export function linesBelowPolicyFloor(result: Composition) {
  return result.quote.periods.flatMap(period =>
    period.result.diagnostics
      .filter(d => d.code === 'MARGIN_BELOW_FLOOR')
      .map(d => {
        const line = period.result.lines.find(l => d.fieldPath === `result.lines.${l.lineId}`)
        // A zero net is flagged by the kernel without a ratio, so there is none to show.
        const sized = line && new D(line.net).gt(0) ? line : null
        const floor = line && hasMarketFloor(line) ? line : null
        // The margin missing at the current net is `minimumMargin x net - margin` only while the floor is read on the
        // final net. On a base-market floor that figure would be the base-market margin, which is never shown.
        const onFinalNet = !floor || floor.marketPriceRatio === '1'

        return {
          periodId: period.periodId,
          lineId: line?.lineId ?? d.fieldPath.replace(/^result\.lines\./, ''),
          parentLineId: line?.parentLineId ?? d.lineId ?? null,
          kind: line?.kind ?? null,
          label: line?.label ?? null,
          minimumMargin: line?.minimumMargin ?? null,
          net: line?.net ?? null,
          marginAmount: line?.marginAmount ?? null,
          marginRateRoundedDown: sized ? ratioForReading(new D(sized.marginAmount).div(sized.net)) : null,
          // Margin missing at the current net. Tells a rounding-sized gap apart from a pricing decision.
          marginAmountShortOfFloor:
            sized && onFinalNet ? new D(sized.minimumMargin).mul(sized.net).minus(sized.marginAmount).toString() : null,
          ...(floor
            ? {
                floorNet: floor.floorNet,
                // Net missing to reach the floor of this market, at the scale the kernel formatted both amounts with.
                netShortOfFloor: new D(floor.floorNet)
                  .minus(floor.net)
                  .toFixed(floor.floorNet.split('.')[1]?.length ?? 0)
              }
            : {})
        }
      })
  )
}

/**
 * Compact reading of a composed quote for an agent: counts, groups and de-duplicates the frozen result and formats
 * ratios for reading. It decides nothing; statuses, totals, blockers and floor verdicts are the result's own.
 */
export function summarizeComposition(result: Composition, identity: { calculationId: string; replayDigest?: string }) {
  const { quote } = result
  const periodDiagnostics = quote.periods.flatMap(p => p.result.diagnostics.map(d => ({ periodId: p.periodId, d })))

  const reviewSignals = unique(periodDiagnostics.map(({ d }) => `${d.code}\n${d.severity}`)).map(key => {
    const [code, severity] = key.split('\n')
    const rows = periodDiagnostics.filter(({ d }) => d.code === code && d.severity === severity)

    return {
      code,
      severity,
      count: rows.length,
      periodIds: unique(rows.map(r => r.periodId)),
      lineIds: unique(rows.flatMap(r => (r.d.lineId ? [r.d.lineId] : []))),
      paths: unique(rows.map(r => r.d.fieldPath))
    }
  })

  const floorLines = linesBelowPolicyFloor(result)
  const marketFactor = describeMarketFactor(quote.resolution)

  const selection = (s: Composition['selections'][number]) => ({
    lineId: s.lineId,
    toolId: s.toolId,
    reasons: s.reasons
  })

  const included = result.selections.filter(s => s.included)

  const excluded = result.selections.filter(
    s => !s.included && s.reasons.some(r => r.startsWith('profile-task-excluded:'))
  )

  const clientProvided = included.filter(s => s.reasons.some(r => r.startsWith('client-provided:')))

  return {
    schemaVersion: COMPOSITION_SUMMARY_VERSION,
    version: result.version,
    binding: false as const,
    commercialUnit: result.commercialUnit,
    calculationId: identity.calculationId,
    ...(identity.replayDigest ? { replayDigest: identity.replayDigest } : {}),
    calculationStatus: quote.calculationStatus,
    reviewStatus: result.reviewStatus,
    quoteReviewStatus: quote.reviewStatus,
    // Contract the kernel calculated with: 1.1.0 only when the demand or the catalog uses agreed nets or rounding;
    // 1.2.0 only when the market factor of the quote declares its floor on the base market.
    engineVersion: quote.periods[0]?.result.engineVersion ?? null,
    // 1.1.0 totals add `roundingAdjustment` (already inside `undiscountedPrice`) and `uplift`; 1.2.0 totals add
    // `marketAdjustment` (price with the market factor minus price of the base market, also inside it).
    totals: quote.totals,
    // Adjustments as the frozen demand declares them and the rounding rule in force for the output currency.
    ...describeCommercialTerms(quote.resolution),
    // Present only for a market factor that changes something (not 1, or with a declared floor basis).
    ...(marketFactor ? { marketFactor } : {}),
    // `totals.marginRate` keeps the exact stored ratio; this is the same ratio at reading precision. It is the real
    // margin of the final net in every contract, never a base-market equivalent.
    marginRateRoundedDown: quote.totals?.marginRate ? ratioForReading(new D(quote.totals.marginRate)) : null,
    // Blockers: complete and in the result's order. A non-empty list is why `totals` is null.
    diagnostics: quote.diagnostics,
    assumptions: quote.resolution.assumptions,
    periods: quote.periods.map(p => ({
      periodId: p.periodId,
      calculationStatus: p.result.calculationStatus,
      totals: p.result.totals
    })),
    // Every kernel diagnostic of every period, one entry per code and severity. Review signals never block totals.
    reviewSignals,
    marginFloor: {
      source: 'kernel:MARGIN_BELOW_FLOOR',
      flaggedLinePeriods: floorLines.length,
      lines: acrossPeriods(floorLines.map(({ periodId, ...row }) => ({ periodId, row })))
    },
    toolSelections: {
      counts: {
        rows: result.selections.length,
        included: included.length,
        clientProvided: clientProvided.length,
        explicitlyExcluded: excluded.length,
        notRequiredForWork: result.selections.length - included.length - excluded.length
      },
      included: acrossPeriods(included.map(s => ({ periodId: s.periodId, row: selection(s) }))),
      // Subset of `included` that the client covers, so it carries no attributed cost.
      clientProvided: acrossPeriods(clientProvided.map(s => ({ periodId: s.periodId, row: selection(s) }))),
      explicitlyExcluded: acrossPeriods(excluded.map(s => ({ periodId: s.periodId, row: selection(s) })))
    },
    attributions: acrossPeriods(
      result.attributions.map(a => ({
        periodId: a.periodId,
        row: {
          toolId: a.toolId,
          priceId: a.priceId,
          currency: a.resource.currency,
          unit: a.resource.unit,
          sourceStatus: a.resource.source.status,
          quantity: a.quantity,
          serviceShare: a.serviceShare,
          fullMonthlyCost: a.fullMonthlyCost,
          attributedMonthlyCost: a.attributedMonthlyCost,
          unallocatedMonthlyCost: a.unallocatedMonthlyCost,
          consumerCount: a.consumerIds.length,
          lineIds: a.assignments.map(x => x.lineId)
        }
      }))
    ),
    creditBudgets: acrossPeriods(
      result.creditBudgets.map(b => ({
        periodId: b.periodId,
        row: {
          toolId: b.toolId,
          calculationStatus: b.result.calculationStatus,
          diagnostics: b.result.diagnostics,
          requestedCredits: b.result.request.requestedCredits,
          currency: b.result.breakdown?.currency ?? null,
          extraCreditsPurchased: b.result.breakdown?.extra.purchasedCredits ?? null,
          totalBudgetCost: b.result.breakdown?.totalBudgetCost ?? null,
          incrementalCash: b.result.breakdown?.incrementalCash ?? null
        }
      }))
    ),
    // Attributed cost is not new cash: these two lists and `cashMeaning` are what separates them.
    resourceIncrementalCash: acrossPeriods(
      result.resourceIncrementalCash.map(({ periodId, ...row }) => ({ periodId, row }))
    ),
    cashLedger: acrossPeriods(quote.cashLedger.map(({ periodId, ...row }) => ({ periodId, row }))),
    cashMeaning: result.cashMeaning,
    fullDetail:
      'Derived from the frozen composition artifact. Every selection row, attribution assignment, kernel line with its cost components, per-period diagnostic and credit plan lives in that file under semantic.result.'
  }
}
