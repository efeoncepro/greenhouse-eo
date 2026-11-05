// HubSpot pricebook (TASK-1405) — the pure estimator.
//
// No I/O, no clock, no randomness: the same input always gives the same output, on the server and in the browser.
// Invariants it holds (fixed by tests):
//   - credits are the max across hubs, never the sum;
//   - a `not_published` datum is never replaced by a number: the line says `notPublished`;
//   - a `secondary` datum or a «from» floor is never charged as exact: it goes to `approximateUsd`;
//   - view-only licences are never charged;
//   - the output carries no fee, cost, margin or bill rate of Efeonce (`implementation: 'quote_required'`).
import { getHubSpotPricebook } from './catalog'
import type {
  HubSpotCostEstimate,
  HubSpotEstimateInput,
  HubSpotEstimateItemInput,
  HubSpotEstimateLine,
  HubSpotHubEntry,
  HubSpotPricebook,
  HubSpotTierEntry,
  PriceFact
} from './types'

export class HubSpotEstimateInputError extends Error {
  constructor(readonly code: 'UNKNOWN_HUB' | 'UNKNOWN_TIER' | 'INVALID_SEATS' | 'INVALID_MONTHS' | 'NO_ITEMS') {
    super(code)
    this.name = 'HubSpotEstimateInputError'
  }
}

const isWhole = (value: number, min: number, max: number) => Number.isInteger(value) && value >= min && value <= max

export const findHubSpotTier = (
  pricebook: HubSpotPricebook,
  hubId: string,
  tier: string
): { hub: HubSpotHubEntry; entry: HubSpotTierEntry } => {
  const hub = pricebook.hubs.find(candidate => candidate.hubId === hubId)

  if (!hub) throw new HubSpotEstimateInputError('UNKNOWN_HUB')
  const entry = hub.tiers.find(candidate => candidate.tier === tier)

  if (!entry) throw new HubSpotEstimateInputError('UNKNOWN_TIER')

  return { hub, entry }
}

type LineSeed = Omit<
  HubSpotEstimateLine,
  'monthlyUsd' | 'totalUsd' | 'unitAmountUsd' | 'evidence' | 'sourceUrl' | 'asOf'
>

/** Builds a line from a fact: exact when primary, approximate when secondary, absent when not published. */
const lineFromFact = (
  seed: LineSeed,
  fact: PriceFact<number>,
  months: number,
  approximateKind: 'from' | 'approximate' = 'approximate',
  forceApproximate = false
): HubSpotEstimateLine => {
  const span = seed.recurrence === 'monthly' ? months : 1
  const base = { ...seed, evidence: fact.evidence, sourceUrl: fact.sourceUrl, asOf: fact.asOf }
  const note = [seed.note, fact.note].filter(Boolean).join(' ') || undefined

  if (fact.value === null || fact.evidence === 'not_published')
    return { ...base, unitAmountUsd: null, monthlyUsd: null, totalUsd: null, notPublished: true, note }

  const amount = fact.value * seed.quantity

  if (fact.evidence === 'secondary' || forceApproximate)
    return {
      ...base,
      unitAmountUsd: null,
      monthlyUsd: null,
      totalUsd: null,
      approximateUsd: { kind: approximateKind, amountUsd: amount * span },
      note
    }

  return {
    ...base,
    unitAmountUsd: fact.value,
    monthlyUsd: seed.recurrence === 'monthly' ? amount : null,
    totalUsd: amount * span,
    note
  }
}

const itemLines = (
  pricebook: HubSpotPricebook,
  item: HubSpotEstimateItemInput,
  months: number,
  waiveOnboarding: boolean
): { lines: HubSpotEstimateLine[]; credits: number | null; onboarding: PriceFact<number> } => {
  const { hub, entry } = findHubSpotTier(pricebook, item.hubId, item.tier)

  if (!isWhole(item.seats, 1, 10000)) throw new HubSpotEstimateInputError('INVALID_SEATS')
  const viewOnly = item.viewOnlySeats ?? 0

  if (!isWhole(viewOnly, 0, 100000)) throw new HubSpotEstimateInputError('INVALID_SEATS')

  const prefix = `${hub.hubId}-${entry.tier}`
  const tierLabel = `${hub.label} ${entry.tier === 'pro' ? 'Professional' : entry.tier === 'enterprise' ? 'Enterprise' : 'Starter'}`
  const lines: HubSpotEstimateLine[] = []

  if (entry.unit === 'per_seat') {
    lines.push(
      lineFromFact(
        {
          lineId: `${prefix}-licences`,
          hubId: hub.hubId,
          tier: entry.tier,
          kind: 'licence',
          label: `${tierLabel}, licencia`,
          recurrence: 'monthly',
          quantity: item.seats
        },
        entry.price,
        months
      )
    )
  } else {
    lines.push(
      lineFromFact(
        {
          lineId: `${prefix}-account`,
          hubId: hub.hubId,
          tier: entry.tier,
          kind: 'licence',
          label: `${tierLabel}, cuenta`,
          recurrence: 'monthly',
          quantity: 1
        },
        entry.price,
        months
      )
    )
    const included = entry.includedSeats

    if (included?.value === null || included === undefined) {
      if (item.seats > 1)
        lines.push({
          lineId: `${prefix}-additional-seats`,
          hubId: hub.hubId,
          tier: entry.tier,
          kind: 'additional_seats',
          label: `${tierLabel}, licencias adicionales`,
          recurrence: 'monthly',
          quantity: item.seats,
          unitAmountUsd: null,
          monthlyUsd: null,
          totalUsd: null,
          notPublished: true,
          evidence: 'not_published',
          sourceUrl: included?.sourceUrl ?? hub.sourceUrl,
          asOf: included?.asOf ?? pricebook.asOf,
          note: 'HubSpot no dice cuántas licencias incluye este plan: confirme con HubSpot cuántas hay que comprar aparte.'
        })
    } else if (item.seats > included.value && entry.additionalSeatFrom) {
      lines.push(
        lineFromFact(
          {
            lineId: `${prefix}-additional-seats`,
            hubId: hub.hubId,
            tier: entry.tier,
            kind: 'additional_seats',
            label: `${tierLabel}, licencias adicionales`,
            recurrence: 'monthly',
            quantity: item.seats - included.value,
            note: `Incluye ${included.value}; HubSpot publica las adicionales «a partir de», no el precio exacto.`
          },
          entry.additionalSeatFrom,
          months,
          'from',
          true
        )
      )
    }
  }

  if (viewOnly > 0) {
    const rule = pricebook.seatRules.find(candidate => candidate.seatType === 'view_only')

    lines.push({
      lineId: `${prefix}-view-only`,
      hubId: hub.hubId,
      tier: entry.tier,
      kind: 'view_only_seats',
      label: `${tierLabel}, licencias de solo lectura`,
      recurrence: 'monthly',
      quantity: viewOnly,
      unitAmountUsd: 0,
      monthlyUsd: 0,
      totalUsd: 0,
      evidence: rule?.free.evidence ?? 'secondary',
      sourceUrl: rule?.free.sourceUrl ?? null,
      asOf: rule?.free.asOf ?? pricebook.asOf,
      note: 'Las licencias de solo lectura no se cobran.'
    })
  }

  if (item.marketingContacts !== undefined) {
    const includedContacts = entry.includedMarketingContacts?.value ?? null

    if (includedContacts === null || item.marketingContacts > includedContacts)
      lines.push({
        lineId: `${prefix}-marketing-contacts`,
        hubId: hub.hubId,
        tier: entry.tier,
        kind: 'marketing_contacts',
        label: `${tierLabel}, contactos de marketing adicionales`,
        recurrence: 'monthly',
        quantity: item.marketingContacts - (includedContacts ?? 0),
        unitAmountUsd: null,
        monthlyUsd: null,
        totalUsd: null,
        notPublished: true,
        evidence: 'not_published',
        sourceUrl: pricebook.contactBands.sourceUrl,
        asOf: pricebook.contactBands.asOf,
        note:
          includedContacts === null
            ? 'Este plan no publica contactos de marketing incluidos.'
            : `Incluye ${includedContacts} contactos; ${pricebook.contactBands.note ?? ''}`.trim()
      })
  }

  const onboardingSeed: LineSeed = {
    lineId: `${prefix}-onboarding`,
    hubId: hub.hubId,
    tier: entry.tier,
    kind: 'onboarding',
    label: `${tierLabel}, tarifa de incorporación obligatoria`,
    recurrence: 'once',
    quantity: 1
  }

  if (waiveOnboarding)
    lines.push({
      ...onboardingSeed,
      unitAmountUsd: 0,
      monthlyUsd: null,
      totalUsd: 0,
      evidence: pricebook.onboardingWaiver.evidence,
      sourceUrl: pricebook.onboardingWaiver.sourceUrl,
      asOf: pricebook.onboardingWaiver.asOf,
      note: 'Eliminada porque implementa un Solutions Partner certificado; confirmarlo por escrito con HubSpot en cada negocio.'
    })
  else lines.push(lineFromFact(onboardingSeed, entry.onboardingFee, months))

  return { lines, credits: entry.includedCredits.value, onboarding: entry.onboardingFee }
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

export const estimateHubSpotCost = (
  input: HubSpotEstimateInput,
  pricebook: HubSpotPricebook = getHubSpotPricebook()
): HubSpotCostEstimate => {
  if (input.items.length === 0) throw new HubSpotEstimateInputError('NO_ITEMS')
  const months = input.months ?? 12

  if (!isWhole(months, 1, 60)) throw new HubSpotEstimateInputError('INVALID_MONTHS')
  const waive = input.waiveOnboarding === true
  const parts = input.items.map(item => itemLines(pricebook, item, months, waive))
  const lines = parts.flatMap(part => part.lines)

  const notExact = lines.filter(line => line.totalUsd === null)
  const monthlyLines = lines.filter(line => line.recurrence === 'monthly')
  const monthlyExact = monthlyLines.every(line => line.monthlyUsd !== null)

  const fees = parts.map(part => part.onboarding)
  const feesKnown = fees.every(fee => fee.value !== null)

  return {
    pricebookVersion: pricebook.version,
    asOf: pricebook.asOf,
    currency: pricebook.currency,
    months,
    lines,
    totals: {
      monthlyUsd: monthlyExact ? sum(monthlyLines.map(line => line.monthlyUsd ?? 0)) : null,
      yearOneUsd: notExact.length === 0 ? sum(lines.map(line => line.totalUsd ?? 0)) : null,
      exactPartYearOneUsd: sum(lines.map(line => line.totalUsd ?? 0)),
      notExactLineIds: notExact.map(line => line.lineId)
    },
    credits: {
      // Credits are not pooled across hubs: the account gets the largest allowance of the tiers it holds.
      includedPerMonth: Math.max(0, ...parts.map(part => part.credits ?? 0)),
      rule: 'max_across_hubs',
      note: 'Los créditos de HubSpot no se suman entre productos: la cuenta recibe el mayor de los incluidos.'
    },
    waiver: {
      applied: waive,
      onboardingFeeUsd: feesKnown ? sum(fees.map(fee => fee.value ?? 0)) : null,
      approximate: fees.some(fee => fee.evidence !== 'primary'),
      note: waive
        ? 'La tarifa de incorporación no se cobra porque implementa un Solutions Partner certificado; confirmarlo por escrito con HubSpot.'
        : 'Sin waiver: la tarifa de incorporación obligatoria se suma al año 1.'
    },
    disclaimer: `Estimado no vinculante. Precios de lista de HubSpot en USD, sin impuestos, leídos el ${pricebook.asOf}.`,
    implementation: 'quote_required'
  }
}
