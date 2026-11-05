// `pnpm pricing:v3 hubspot list|estimate` — the HubSpot list price, read from the governed pricebook (TASK-1405).
//
// The licence is a vendor list price, never an Efeonce cost: this command reads `src/lib/growth/hubspot-pricing`
// and nothing of the V3 catalog, the engine or the tool policy. What it hands to a quote is a `thirdPartyCosts[]`
// fragment of a V3 brief, `category: "licences"`, validated against the brief schema itself. By default the licence
// is `client_direct` (HubSpot invoices the client: a note of the quote that reaches no total); `reinvoiced` only
// when Efeonce buys and invoices it.
import { briefSchema } from '../../src/lib/finance/pricing-v3/catalog/contracts'
import { PricingV3Error } from '../../src/lib/finance/pricing-v3/errors'
import {
  HUBSPOT_PRICEBOOK_MAX_AGE_DAYS,
  HUBSPOT_TIERS,
  HubSpotEstimateInputError,
  estimateHubSpotCost,
  getHubSpotPricebook
} from '../../src/lib/growth/hubspot-pricing'
import type { HubSpotCostEstimate, HubSpotHubId, HubSpotTier } from '../../src/lib/growth/hubspot-pricing'

export type HubSpotCliValues = Partial<
  Record<'hub' | 'tier' | 'seats' | 'months' | 'settlement' | 'view-only' | 'contacts' | 'format', string>
> & { 'waive-onboarding'?: boolean }

export const HUBSPOT_PERMITTED = {
  list: ['hub', 'format', 'help'],
  estimate: [
    'hub',
    'tier',
    'seats',
    'months',
    'settlement',
    'view-only',
    'contacts',
    'waive-onboarding',
    'format',
    'help'
  ]
} as const

export const HUBSPOT_USAGE =
  'list [--hub id] [--format json|markdown] | estimate --hub id --tier starter|pro|enterprise --seats n [--months 12] [--view-only n] [--contacts n] [--settlement client_direct|reinvoiced] [--waive-onboarding] [--format json|markdown]'

const SETTLEMENTS = ['client_direct', 'reinvoiced'] as const

const whole = (option: string, raw: string | undefined, fallback?: number) => {
  if (raw === undefined) {
    if (fallback === undefined) throw new PricingV3Error('MISSING_ARGUMENT', { option })

    return fallback
  }

  if (!/^\d{1,6}$/.test(raw)) throw new PricingV3Error('INVALID_ARGUMENT', { option })

  return Number(raw)
}

const plusDays = (iso: string, days: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10)

const usd = (value: number | null) => (value === null ? '—' : `US$ ${value.toLocaleString('es-CL')}`)

/**
 * The `thirdPartyCosts[]` of a V3 brief for the exact lines of an estimate. A line that is not exact (not published,
 * secondary, a «from» floor) never becomes a cost: it is listed under `pending` with the reason, so the quote cannot
 * carry an invented amount. A waived onboarding fee and view-only licences are zero and are not costs either.
 */
export const thirdPartyCostsFor = (estimate: HubSpotCostEstimate, settlement: (typeof SETTLEMENTS)[number]) => {
  const months = Array.from({ length: estimate.months }, (_, index) => index + 1)
  const pricebook = getHubSpotPricebook()

  const evidence = (lineId: string) => ({
    reference: `${pricebook.pricebookId}@${pricebook.version}:${estimate.asOf}:${lineId}`,
    effectiveFrom: estimate.asOf,
    effectiveUntil: plusDays(estimate.asOf, HUBSPOT_PRICEBOOK_MAX_AGE_DAYS),
    // A list price read at the vendor, not a quote of the vendor for this engagement.
    status: 'estimated' as const
  })

  const costs: unknown[] = []
  const pending: { lineId: string; label: string; reason: string; approximateUsd?: unknown }[] = []
  const omitted: { lineId: string; reason: string }[] = []

  for (const line of estimate.lines) {
    if (line.totalUsd === 0) {
      omitted.push({ lineId: line.lineId, reason: line.kind === 'onboarding' ? 'waived' : 'not_charged' })
      continue
    }

    if (line.unitAmountUsd === null || line.totalUsd === null) {
      pending.push({
        lineId: line.lineId,
        label: line.label,
        reason: line.notPublished
          ? 'not_published'
          : line.approximateUsd?.kind === 'from'
            ? 'from_price'
            : 'secondary_evidence',
        ...(line.approximateUsd ? { approximateUsd: line.approximateUsd } : {})
      })
      continue
    }

    costs.push({
      costId: `hubspot-${line.lineId}`,
      label: `HubSpot — ${line.label}`,
      category: 'licences',
      supplier: 'HubSpot',
      settlement,
      amount: String(line.unitAmountUsd),
      currency: 'USD',
      quantity: String(line.quantity),
      periodIds: line.recurrence === 'monthly' ? months : [1],
      evidence: evidence(line.lineId)
    })
  }

  // Validated against the brief schema itself: a field the brief does not take fails here, not in a quote.
  const thirdPartyCosts = briefSchema.shape.thirdPartyCosts.parse(costs)

  return { thirdPartyCosts, pending, omitted, complete: pending.length === 0 }
}

const estimateMarkdown = (estimate: HubSpotCostEstimate) =>
  [
    `| Línea | Cantidad | Mensual | Total ${estimate.months} meses | Evidencia | Nota |`,
    '| --- | --- | --- | --- | --- | --- |',
    ...estimate.lines.map(line => {
      const approximate = line.approximateUsd
        ? `${line.approximateUsd.kind === 'from' ? 'desde' : 'aprox.'} ${usd(line.approximateUsd.amountUsd)}`
        : ''

      return `| ${line.label} | ${line.quantity} | ${usd(line.monthlyUsd)} | ${line.totalUsd === null ? approximate || (line.notPublished ? 'no publicado' : '—') : usd(line.totalUsd)} | ${line.evidence} | ${line.note ?? ''} |`
    }),
    '',
    `Mensual exacto: ${usd(estimate.totals.monthlyUsd)} · Año 1 exacto: ${usd(estimate.totals.yearOneUsd)} · Parte exacta del año 1: ${usd(estimate.totals.exactPartYearOneUsd)}`,
    `Créditos incluidos al mes: ${estimate.credits.includedPerMonth} (${estimate.credits.note})`,
    estimate.disclaimer,
    ''
  ].join('\n')

export const runHubSpotCommand = (subcommand: string | undefined, values: HubSpotCliValues) => {
  const pricebook = getHubSpotPricebook()
  const format = values.format ?? 'json'

  if (!['json', 'markdown'].includes(format))
    throw new PricingV3Error('INVALID_ARGUMENT', { option: 'format', allowed: ['json', 'markdown'] })

  if (subcommand === 'list') {
    const hubs = pricebook.hubs.filter(hub => !values.hub || hub.hubId === values.hub)

    if (values.hub && hubs.length === 0)
      throw new PricingV3Error('INVALID_ARGUMENT', { option: 'hub', allowed: pricebook.hubs.map(hub => hub.hubId) })

    const rows = hubs.flatMap(hub =>
      hub.tiers.map(entry => ({
        hubId: hub.hubId,
        label: hub.label,
        tier: entry.tier,
        unit: entry.unit,
        priceUsd: entry.price.value,
        evidence: entry.price.evidence,
        includedSeats: entry.includedSeats?.value ?? null,
        additionalSeatFromUsd: entry.additionalSeatFrom?.value ?? null,
        includedMarketingContacts: entry.includedMarketingContacts?.value ?? null,
        includedCredits: entry.includedCredits.value,
        onboardingFeeUsd: entry.onboardingFee.value,
        onboardingEvidence: entry.onboardingFee.evidence,
        sourceUrl: hub.sourceUrl
      }))
    )

    if (format === 'markdown') {
      const lines = [
        `Pricebook HubSpot ${pricebook.version}, leído el ${pricebook.asOf} (USD, sin impuestos).`,
        '',
        '| Producto | Plan | Cobro | Precio | Evidencia | Licencias incluidas | Adicional desde | Contactos | Créditos | Onboarding |',
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
        ...rows.map(
          row =>
            `| ${row.label} | ${row.tier} | ${row.unit === 'per_seat' ? 'por licencia/mes' : 'por cuenta/mes'} | ${usd(row.priceUsd)} | ${row.evidence} | ${row.includedSeats ?? '—'} | ${usd(row.additionalSeatFromUsd)} | ${row.includedMarketingContacts ?? '—'} | ${row.includedCredits ?? '—'} | ${row.onboardingFeeUsd === null ? 'no publicado' : `${usd(row.onboardingFeeUsd)} (${row.onboardingEvidence})`} |`
        ),
        ''
      ]

      return { text: lines.join('\n'), exitCode: 0 }
    }

    return {
      text: `${JSON.stringify(
        {
          pricebook: {
            id: pricebook.pricebookId,
            version: pricebook.version,
            asOf: pricebook.asOf,
            currency: pricebook.currency
          },
          taxNote: pricebook.taxNote,
          rows,
          ...(values.hub ? {} : { addOns: pricebook.addOns, onboardingWaiver: pricebook.onboardingWaiver }),
          binding: false
        },
        null,
        2
      )}\n`,
      exitCode: 0
    }
  }

  if (subcommand === 'estimate') {
    if (!values.hub) throw new PricingV3Error('MISSING_ARGUMENT', { option: 'hub' })
    if (!values.tier) throw new PricingV3Error('MISSING_ARGUMENT', { option: 'tier' })
    if (!HUBSPOT_TIERS.includes(values.tier as HubSpotTier))
      throw new PricingV3Error('INVALID_ARGUMENT', { option: 'tier', allowed: HUBSPOT_TIERS })
    const settlement = (values.settlement ?? 'client_direct') as (typeof SETTLEMENTS)[number]

    if (!SETTLEMENTS.includes(settlement))
      throw new PricingV3Error('INVALID_ARGUMENT', { option: 'settlement', allowed: SETTLEMENTS })

    let estimate: HubSpotCostEstimate

    try {
      estimate = estimateHubSpotCost(
        {
          items: [
            {
              hubId: values.hub as HubSpotHubId,
              tier: values.tier as HubSpotTier,
              seats: whole('seats', values.seats),
              viewOnlySeats: whole('view-only', values['view-only'], 0),
              ...(values.contacts !== undefined ? { marketingContacts: whole('contacts', values.contacts) } : {})
            }
          ],
          months: whole('months', values.months, 12),
          waiveOnboarding: values['waive-onboarding'] === true
        },
        pricebook
      )
    } catch (error) {
      if (!(error instanceof HubSpotEstimateInputError)) throw error

      const option = {
        UNKNOWN_HUB: 'hub',
        UNKNOWN_TIER: 'tier',
        INVALID_SEATS: 'seats',
        INVALID_MONTHS: 'months',
        NO_ITEMS: 'hub'
      }[error.code]

      throw new PricingV3Error(
        'INVALID_ARGUMENT',
        error.code === 'UNKNOWN_HUB' ? { option, allowed: pricebook.hubs.map(hub => hub.hubId) } : { option }
      )
    }

    const fragment = thirdPartyCostsFor(estimate, settlement)

    // Exit 2: some line could not become a cost (not published, secondary or a «from» floor) and a person has to
    // resolve it before the quote carries it.
    const exitCode = fragment.complete ? 0 : 2

    if (format === 'markdown') return { text: estimateMarkdown(estimate), exitCode }

    return {
      text: `${JSON.stringify(
        {
          estimate,
          brief: {
            thirdPartyCosts: fragment.thirdPartyCosts,
            pending: fragment.pending,
            omitted: fragment.omitted,
            complete: fragment.complete,
            note: '`thirdPartyCosts` goes into the V3 brief as is. Its `periodIds` must be periods of the brief term. `client_direct` freezes it as a note that reaches no total; `reinvoiced` makes it a row priced by the `third_party_policy` of `licences`.'
          },
          binding: false
        },
        null,
        2
      )}\n`,
      exitCode
    }
  }

  throw new PricingV3Error('INVALID_ARGUMENT', { option: 'subcommand', allowed: ['list', 'estimate'] })
}
