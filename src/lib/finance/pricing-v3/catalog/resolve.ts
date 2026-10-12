import Decimal from 'decimal.js'

import { PRICING_V3_MARKET_FLOOR_BASIS, PRICING_V3_THIRD_PARTY_BILLING } from '../schemas'
import type { PricingV3AnyInput, PricingV3ContractVersion, PricingV3InputV14 } from '../schemas'
import { activeRecords, validateCatalog } from './catalog'
import { AGREED_TOTAL_BILLING_CLASSES, briefSchema } from './contracts'
import type { AGREED_TOTAL_BASES, Brief, CatalogRecord, Diagnostic } from './contracts'

const D = Decimal.clone({ precision: 80 })

type Row<K extends CatalogRecord['kind']> = Extract<CatalogRecord, { kind: K }>

// Built as the widest contract; `schemaVersion` says which one each quote declares and the kernel parses it as such.
// The keys contracts 1.3.0 and 1.4.0 added are optional in it and are set only for a quote of a contract that has them.
type KernelSnapshot = Omit<PricingV3InputV14['snapshot'], 'schemaVersion'> & { schemaVersion: PricingV3ContractVersion }
type KernelRequest = Omit<PricingV3InputV14['request'], 'schemaVersion'> & { schemaVersion: PricingV3ContractVersion }

type KitAssignment = {
  requirement: Row<'kit'>['value']['requirements'][number]
  resource: Row<'resource'> | undefined
  reason: string | undefined
}

type Adjustment = Brief['adjustments'][number]
type AgreedTotal = Extract<Adjustment, { kind: 'agreed_total' }>

const isAgreedTotal = (adjustment: Adjustment): adjustment is AgreedTotal => adjustment.kind === 'agreed_total'

/**
 * An agreed total as resolution carries it. `distribution` is null until the second pass settles it
 * (`settleAgreedTotals`): then it holds, per period and billing class, the policy net the first pass read and the
 * agreed net handed to the kernel. Those add up to `amount` to the unit: over the whole term, or within each period
 * when `per` is `period`.
 */
export type ResolvedAgreedTotal = {
  adjustmentId: string
  amount: string
  /**
   * What `amount` is the price of, as the brief declares it: the whole term (`term`) or each period (`period`).
   * Absent when the brief does not say, which is the whole term; the key exists only for a brief that declares it,
   * so every total frozen before the declaration existed keeps the keys it had.
   */
  per?: (typeof AGREED_TOTAL_BASES)[number]
  currency: string
  lineIds: string[]
  reason: string
  policyNet: string | null
  /**
   * The unit every share but the last is a multiple of, and why that one. `tax_exact`: the unit in which the
   * exclusive rate of the quote taxes a share with nothing to round, so the tax of the quote is the tax of the total.
   * `currency_precision`: the minor unit of the currency, for a quote whose tax is not resolved or does not apply.
   * `currency_precision_fallback`: the minor unit too, because the tax-exact unit is larger than the part of some
   * group; the tax of the quote may then differ from the tax of the total by a unit per period.
   */
  distributionUnit: string | null
  distributionUnitBasis: 'tax_exact' | 'currency_precision' | 'currency_precision_fallback' | null
  distribution:
    | {
        periodId: number
        billing: (typeof AGREED_TOTAL_BILLING_CLASSES)[number]
        lineIds: string[]
        policyNet: string
        agreedNet: string
      }[]
    | null
}

export function resolveBrief(catalogRaw: unknown, briefRaw: unknown) {
  const catalog = validateCatalog(catalogRaw)
  const parsed = briefSchema.safeParse(briefRaw)
  const diagnostics: Diagnostic[] = []
  const assumptions: Diagnostic[] = []
  const bindings: { lineId: string; purpose: string; record: CatalogRecord }[] = []
  const inputs: { periodId: number; input: PricingV3AnyInput }[] = []

  if (!parsed.success)
    return {
      status: 'needs_input' as const,
      diagnostics: parsed.error.issues.map(i => ({
        code: 'INVALID_BRIEF',
        path: i.path.join('.')
      })),
      assumptions,
      bindings,
      inputs
    }
  const brief = parsed.data
  const rows = activeRecords(catalog, brief.quoteDate)

  // Values that start after the quote date. They are never selected; they say why a selection found nothing.
  const startingLater = catalog.records.filter(r => !r.retiredAt && r.source.effectiveFrom > brief.quoteDate)

  const firstStart = (records: CatalogRecord[]) =>
    records
      .map(r => r.source.effectiveFrom)
      .sort()
      .at(0)

  // A quote dated before the catalog holds anything in force resolves nothing at all: every selection below would
  // report its own missing record, and none of them would be the cause. It is said once, with the date to move to.
  if (!rows.length && startingLater.length)
    return {
      status: 'needs_input' as const,
      brief,
      catalog: { catalogId: catalog.catalogId, version: catalog.version },
      diagnostics: [
        {
          code: 'QUOTE_DATE_BEFORE_CATALOG',
          path: 'quoteDate',
          detail: `The quote date is before the first date this catalog is in force, which is ${firstStart(startingLater)}: no value of it applies on the quote date.`
        }
      ],
      assumptions,
      bindings,
      inputs
    }

  const kind = <K extends CatalogRecord['kind']>(name: K) => rows.filter(r => r.kind === name) as Row<K>[]

  /** Records of a kind that start after the quote date and that a selection would have taken, had they started. */
  const later = <K extends CatalogRecord['kind']>(name: K, match: (r: Row<K>) => boolean) =>
    (startingLater.filter(r => r.kind === name) as Row<K>[]).filter(match)

  // `startsLater`: what the same selection finds among the records that start after the quote date. With nothing in
  // force and one of those, the record is not missing from the catalog: the quote is dated before it, and it says so.
  const unique = <T extends CatalogRecord>(
    candidates: T[],
    path: string,
    startsLater: CatalogRecord[] = []
  ): T | undefined => {
    if (candidates.length !== 1) {
      diagnostics.push({
        code: candidates.length ? 'AMBIGUOUS_SELECTION' : 'MISSING_CATALOG_SELECTION',
        path,
        candidates: candidates.map(r => r.recordId),
        ...(!candidates.length && startsLater.length
          ? {
              detail: `The quote date is before the first date a record for this selection is in force, which is ${firstStart(startsLater)}.`
            }
          : {})
      })

      return undefined
    }

    const row = candidates[0]

    if (row.source.status === 'pending') diagnostics.push({ code: 'PENDING_CATALOG_VALUE', path })

    return row
  }

  const bind = (lineId: string, purpose: string, record: CatalogRecord) => {
    bindings.push({ lineId, purpose, record })
  }

  const normalize = (s: string) =>
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()

  if (brief.mode === 'commercial_draft' && catalog.mode !== 'commercial_draft')
    diagnostics.push({ code: 'SIMULATION_ONLY_CATALOG', path: 'mode' })
  if (new Set(brief.lines.map(l => l.lineId)).size !== brief.lines.length)
    diagnostics.push({ code: 'DUPLICATE_LINE_ID', path: 'lines' })

  // Third-party costs of the engagement (contract 1.4.0). Only the re-invoiced ones are priced: a cost the client pays
  // to the supplier stays in the brief as a note and never reaches a kernel input, a conversion or a total.
  const thirdPartyCosts = brief.thirdPartyCosts ?? []
  const reinvoiced = thirdPartyCosts.filter(c => c.settlement === 'reinvoiced')

  // An adjustment names its rows by the id of their parent, so costs and lines share one namespace.
  if (
    new Set(thirdPartyCosts.map(c => c.costId)).size !== thirdPartyCosts.length ||
    thirdPartyCosts.some(c => brief.lines.some(l => l.lineId === c.costId))
  )
    diagnostics.push({ code: 'DUPLICATE_THIRD_PARTY_COST_ID', path: 'thirdPartyCosts' })

  // A discount and an agreed net of a team billing class name lines; an agreed net of third-party costs names
  // re-invoiced costs, the only ones that have a row. An agreed total names lines and, to bring them into the price,
  // re-invoiced costs: the two share one namespace, so an id is never both.
  if (
    brief.adjustments.some(a =>
      a.lineIds.some(id =>
        isAgreedTotal(a)
          ? !brief.lines.some(l => l.lineId === id) && !reinvoiced.some(c => c.costId === id)
          : a.kind === 'agreed_net' && a.billing === PRICING_V3_THIRD_PARTY_BILLING
            ? !reinvoiced.some(c => c.costId === id)
            : !brief.lines.some(l => l.lineId === id)
      )
    )
  )
    diagnostics.push({ code: 'INVALID_ADJUSTMENT_LINE', path: 'adjustments' })

  // An agreed total is the price of everything it names, in every period and billing class, whether its amount is
  // for the whole term or for each period: nothing else may adjust a line or a cost it names, whatever the class,
  // and it names each once. The kernel would refuse the rows that
  // overlap (`OVERLAPPING_ADJUSTMENTS`) without saying which declaration to drop; this names it.
  const agreedTotals = brief.adjustments.filter(isAgreedTotal)

  for (const total of agreedTotals) {
    const others = brief.adjustments.filter(a => a !== total)

    if (
      new Set(total.lineIds).size !== total.lineIds.length ||
      total.lineIds.some(id => others.some(a => a.lineIds.includes(id)))
    )
      diagnostics.push({
        code: 'AGREED_TOTAL_OVERLAPS_ADJUSTMENT',
        path: `adjustments.${total.adjustmentId}`,
        detail:
          'An agreed total is the price of the lines and re-invoiced costs it names, for the whole term or for each period: none of them may be named twice in it or by another adjustment (discount, agreed net or agreed total).'
      })
  }

  // The agreed nets of an agreed total are named after it (`<adjustmentId>:<billing class>`), so the ids of a brief
  // that declares one are checked here, with those names: the kernel only ever sees what a period was handed.
  if (agreedTotals.length) {
    const names = brief.adjustments.flatMap(a =>
      isAgreedTotal(a)
        ? [a.adjustmentId, ...AGREED_TOTAL_BILLING_CLASSES.map(billing => `${a.adjustmentId}:${billing}`)]
        : [a.adjustmentId]
    )

    if (new Set(names).size !== names.length) diagnostics.push({ code: 'DUPLICATE_ADJUSTMENT_ID', path: 'adjustments' })
  }

  const ofMarket = (r: Row<'market_factor'>) => r.value.country === brief.offerMarketCountry
  const market = unique(kind('market_factor').filter(ofMarket), 'offerMarketCountry', later('market_factor', ofMarket))

  if (market) bind('*', 'market_factor', market)

  // What the offer is sold as, when the catalog says so: one record per offer. A catalog that holds none for this
  // offer states nothing and binds nothing; two in force cannot be ranked and block like any other selection.
  const offers = kind('offer').filter(r => r.value.offerId === brief.offerId)
  const offer = offers.length ? unique(offers, 'offerId') : undefined

  if (offer) bind('*', 'offer', offer)

  // The pricing policy of an offer has a first date of its own. A quote dated before it would miss the policy of
  // every line, one diagnostic each, and read as if the profiles had none: it is said once, with the date.
  const ofThisOffer = (r: CatalogRecord): r is Row<'pricing'> =>
    r.kind === 'pricing' && r.value.offerId === brief.offerId && r.value.engagementCode === brief.engagementCode

  const laterPolicies = rows.some(ofThisOffer) ? [] : startingLater.filter(ofThisOffer)

  if (laterPolicies.length)
    diagnostics.push({
      code: 'QUOTE_DATE_BEFORE_OFFER_POLICY',
      path: 'offerId',
      detail: `The quote date is before the first date the pricing policy of this offer and engagement code is in force, which is ${firstStart(laterPolicies)}.`
    })

  // Commercial rounding is per output currency; the rule of the offer prevails over the general one. No rule, no
  // rounding. Two rules of the prevailing level cannot be ranked, so they block instead of picking one.
  const roundingRules = kind('price_rounding').filter(r => r.value.currency === brief.outputCurrency)
  const offerRules = roundingRules.filter(r => r.value.offerId === brief.offerId)
  const applicableRules = offerRules.length ? offerRules : roundingRules.filter(r => !r.value.offerId)
  const rounding = applicableRules.length === 1 ? applicableRules[0] : undefined

  if (applicableRules.length > 1)
    diagnostics.push({
      code: 'AMBIGUOUS_PRICE_ROUNDING',
      path: 'priceRounding',
      candidates: applicableRules.map(r => r.recordId)
    })

  if (rounding) {
    if (rounding.source.status === 'pending') diagnostics.push({ code: 'PENDING_CATALOG_VALUE', path: 'priceRounding' })
    bind('*', 'price_rounding', rounding)
  }

  // The form of the engagement is one record per form: the single source of its price ratio, whatever the pricing
  // policy. The record of the offer prevails over the general one; none in force for the declared form is a missing
  // selection and two of the prevailing level an ambiguous one, never a silent pick or an assumed ratio of 1.
  const formRecords =
    brief.engagementForm === undefined
      ? []
      : kind('engagement_factor').filter(r => r.value.form === brief.engagementForm)

  const offerForms = formRecords.filter(r => r.value.offerId === brief.offerId)

  const engagement =
    brief.engagementForm === undefined
      ? undefined
      : unique(
          offerForms.length ? offerForms : formRecords.filter(r => !r.value.offerId),
          'engagementForm',
          later('engagement_factor', r => r.value.form === brief.engagementForm)
        )

  if (engagement) bind('*', 'engagement_factor', engagement)

  // The price rule of a re-invoiced cost is the `third_party_policy` of its category: the record of the offer
  // prevails over the general one, none in force is a missing selection and two of the prevailing level an
  // ambiguous one. The brief carries the category and never a rate.
  const thirdPartyPolicies = new Map<string, Row<'third_party_policy'>>()

  for (const cost of reinvoiced) {
    const candidates = kind('third_party_policy').filter(r => r.value.category === cost.category)
    const ofOffer = candidates.filter(r => r.value.offerId === brief.offerId)

    const policy = unique(
      ofOffer.length ? ofOffer : candidates.filter(r => !r.value.offerId),
      `thirdPartyCosts.${cost.costId}.policy`,
      later('third_party_policy', r => r.value.category === cost.category)
    )

    if (policy) {
      thirdPartyPolicies.set(cost.costId, policy)
      bind(cost.costId, 'third_party_policy', policy)
    }
  }

  // The contingency reserve of the quote. A record applies when it names nothing the brief contradicts (its offer,
  // its form of engagement), and the one that names the most prevails. Two at the prevailing level cannot be ranked,
  // also when one names only the offer and the other only the form: they block instead of picking one.
  const applicableReserves = kind('contingency_reserve').filter(
    r =>
      (!r.value.offerId || r.value.offerId === brief.offerId) &&
      (!r.value.engagementForm || r.value.engagementForm === brief.engagementForm)
  )

  const specificity = (r: Row<'contingency_reserve'>) =>
    Number(Boolean(r.value.offerId)) + Number(Boolean(r.value.engagementForm))

  const prevailing = Math.max(...applicableReserves.map(specificity))
  const prevailingReserves = applicableReserves.filter(r => specificity(r) === prevailing)
  const reserve = prevailingReserves.length === 1 ? prevailingReserves[0] : undefined

  if (prevailingReserves.length > 1)
    diagnostics.push({
      code: 'AMBIGUOUS_CONTINGENCY_RESERVE',
      path: 'contingency',
      candidates: prevailingReserves.map(r => r.recordId)
    })

  if (reserve) {
    if (reserve.source.status === 'pending') diagnostics.push({ code: 'PENDING_CATALOG_VALUE', path: 'contingency' })
    bind('*', 'contingency_reserve', reserve)
  }

  // A waiver is a statement about a reserve this quote would otherwise carry. With none to waive it is a mistake in
  // the brief (another offer, another form, an earlier date), and it is named instead of ignored.
  if (brief.contingency?.kind === 'waived' && !applicableReserves.length)
    diagnostics.push({ code: 'CONTINGENCY_WAIVER_WITHOUT_RESERVE', path: 'contingency' })

  // A reserve keyed by form of engagement can only be matched against a declared form. Without one it is not
  // evaluated, and saying so is what keeps a forgotten form from silently meaning "no reserve".
  const formKeyedReserves = kind('contingency_reserve').filter(
    r => r.value.engagementForm && (!r.value.offerId || r.value.offerId === brief.offerId)
  )

  if (brief.engagementForm === undefined && formKeyedReserves.length)
    assumptions.push({
      code: 'CONTINGENCY_RESERVE_NOT_EVALUATED_WITHOUT_ENGAGEMENT_FORM',
      path: 'engagementForm',
      candidates: formKeyedReserves.map(r => r.recordId),
      detail:
        'The catalog holds a contingency reserve keyed by form of engagement for this offer and the brief declares no form: that reserve was not evaluated.'
    })

  // Contract 1.1.0 only when the frozen inputs use what 1.0.0 cannot express; everything else stays 1.0.0, so a quote
  // frozen before 1.1.0 existed resolves to the contract and digest it was signed with. Same answer for every period.
  //
  // Contract 1.2.0 only when the market factor selected for this quote declares its floor basis. It is a property of
  // the record, never of the factor's value: a catalog frozen before 1.2.0 cannot declare it and resolves as it did.
  //
  // Contract 1.3.0 only when the brief declares the form of the engagement, also when its ratio is 1: the declared
  // form is part of what the quote freezes. A brief frozen before 1.3.0 cannot declare it and resolves as it did,
  // whatever `engagement_factor` records its catalog later holds.
  //
  // Contract 1.4.0 only when the brief declares a re-invoiced third-party cost or a contingency reserve is selected
  // for the quote, also when the brief waives it: the waiver is part of what the quote freezes, like a form at ratio
  // 1. A cost the client pays directly is a note and keeps the quote on its earlier contract; so does a reserve of
  // another offer or another form. A catalog frozen before 1.4.0 holds no reserve and a brief frozen before it no
  // cost, so both resolve as they did. The sequencing that keeps this true for quotes frozen later: a
  // `contingency_reserve` record is issued only in a catalog version newer than every quote it must not reach.
  const contract: PricingV3ContractVersion =
    reinvoiced.length > 0 || reserve
      ? '1.4.0'
      : brief.engagementForm !== undefined
        ? '1.3.0'
        : market?.value.floorBasis === PRICING_V3_MARKET_FLOOR_BASIS
          ? '1.2.0'
          : applicableRules.length > 0 ||
              brief.adjustments.length > 1 ||
              brief.adjustments.some(a => a.kind !== 'discount')
            ? '1.1.0'
            : '1.0.0'

  const selected = brief.lines.flatMap(line => {
    const path = `lines.${line.lineId}`
    const periods = line.activePeriods ?? Array.from({ length: brief.periods }, (_, i) => i + 1)
    const overrides = line.dedicationByPeriod ?? []

    if (
      new Set(periods).size !== periods.length ||
      periods.some(p => p > brief.periods) ||
      new Set(overrides.map(p => p.periodId)).size !== overrides.length ||
      overrides.some(p => !periods.includes(p.periodId))
    )
      diagnostics.push({ code: 'INVALID_SCHEDULE', path })
    if (new Set(line.choices.map(c => c.requirementId)).size !== line.choices.length)
      diagnostics.push({ code: 'DUPLICATE_RESOURCE_CHOICE', path })

    // The evidence of a dedication is held to what every other evidence is: in force on the quote date, never
    // pending, and confirmed in a commercial draft. An estimate is an assumption of the quote, so it is under review.
    const evidence = line.dedicationEvidence

    if (evidence) {
      const at = `${path}.dedicationEvidence`

      if (evidence.effectiveFrom > brief.quoteDate || evidence.effectiveUntil < brief.quoteDate)
        diagnostics.push({ code: 'DEDICATION_EVIDENCE_NOT_EFFECTIVE', path: at })
      if (evidence.status === 'pending') diagnostics.push({ code: 'PENDING_DEDICATION_EVIDENCE', path: at })
      else if (evidence.status !== 'confirmed' && brief.mode === 'commercial_draft')
        diagnostics.push({ code: 'UNCONFIRMED_DEDICATION_EVIDENCE', path: at })
      else if (evidence.status === 'estimated')
        assumptions.push({
          code: 'DEDICATION_ESTIMATED',
          path: at,
          detail: 'The dedication of this line is an estimate: the cost it governs is counted as estimated.'
        })
    }

    const isProfile = (r: Row<'profile'>) => r.value.profileId === line.profile
    const exact = kind('profile').filter(isProfile)

    const profile = unique(
      (exact.length
        ? exact
        : kind('profile').filter(r =>
            [r.value.label, ...r.value.aliases].some(a => normalize(a).includes(normalize(line.profile)))
          )
      ).filter(r => !line.seniorityCode || r.value.seniorityCode === line.seniorityCode),
      `${path}.profile`,
      later('profile', isProfile)
    )

    if (!profile) return []
    bind(line.lineId, 'profile', profile)

    const costs = kind('cost').filter(
      r =>
        r.value.profileId === profile.value.profileId &&
        r.value.seniorityCode === profile.value.seniorityCode &&
        (r.value.localization?.kind !== 'specific' || r.value.localization.country === line.talentCountry)
    )

    // A localized reference wins over unknown-country history unless the caller explicitly selects another record.
    const localized = costs.filter(r => r.value.localization?.kind === 'specific')

    const cost = unique(
      line.costRecordId ? costs.filter(r => r.recordId === line.costRecordId) : localized.length ? localized : costs,
      `${path}.cost`
    )

    const isAllocation = (r: Row<'allocation'>) =>
      r.value.policyId === line.allocationPolicyId && r.value.mode === line.allocationMode

    const allocation = unique(
      kind('allocation').filter(isAllocation),
      `${path}.allocation`,
      later('allocation', isAllocation)
    )

    const isPricing = (r: Row<'pricing'>) =>
      r.value.profileId === profile.value.profileId &&
      r.value.tierCode === profile.value.tierCode &&
      r.value.offerId === brief.offerId &&
      r.value.engagementCode === brief.engagementCode &&
      (!line.pricingPolicyId || r.recordId === line.pricingPolicyId)

    // Said once for the offer above when its policy starts after the quote date; never again per line.
    const pricing = laterPolicies.length
      ? undefined
      : unique(kind('pricing').filter(isPricing), `${path}.pricing`, later('pricing', isPricing))

    const kitId = line.kitId ?? profile.value.defaultKitId

    const kit = kitId
      ? unique(
          kind('kit').filter(r => r.value.kitId === kitId),
          `${path}.kit`,
          later('kit', r => r.value.kitId === kitId)
        )
      : undefined

    if (!kit) diagnostics.push({ code: 'MISSING_KIT', path })
    if (!cost || !allocation || !pricing || !kit) return []
    for (const [purpose, r] of [
      ['cost', cost],
      ['allocation', allocation],
      ['pricing', pricing],
      ['kit', kit]
    ] as const)
      bind(line.lineId, purpose, r)

    if (!cost.value.localization) {
      if (brief.mode !== 'simulation' || !line.allowUnlocalizedCost)
        diagnostics.push({ code: 'UNLOCALIZED_COST_REQUIRES_EXPLICIT_SIMULATION', path })
      else
        assumptions.push({
          code: 'UNLOCALIZED_COST_ASSUMED_FOR_COUNTRY',
          path,
          detail: `Historical cost assumed for ${line.talentCountry}; not verified localized salary.`
        })
    }

    if (brief.mode === 'commercial_draft' && cost.value.components.some(c => c.amount === '0' && !c.zeroReason))
      diagnostics.push({ code: 'MISSING_ZERO_COMPONENT_REASON', path })
    if (cost.value.components.some(c => c.amount === null)) diagnostics.push({ code: 'MISSING_HUMAN_COMPONENT', path })
    if (line.choices.some(c => !kit.value.requirements.some(r => r.requirementId === c.requirementId)))
      diagnostics.push({ code: 'UNKNOWN_RESOURCE_REQUIREMENT', path })

    const resources = kit.value.requirements.flatMap<KitAssignment>(requirement => {
      const choice = line.choices.find(c => c.requirementId === requirement.requirementId)
      const candidates = requirement.candidateResourceIds.map(id => id.replace('{profileId}', profile.value.profileId))

      if (choice?.providedByClientReason && !requirement.allowClientProvided) {
        diagnostics.push({ code: 'UNSUPPORTED_CLIENT_COVERAGE', path: `${path}.${requirement.requirementId}` })

        return []
      }

      if (choice?.providedByClientReason)
        return [{ requirement, resource: undefined, reason: choice.providedByClientReason }]
      if (!choice && !requirement.required) return []

      if (choice?.resourceId && !candidates.includes(choice.resourceId)) {
        diagnostics.push({ code: 'INCOMPATIBLE_RESOURCE_CHOICE', path: `${path}.${requirement.requirementId}` })

        return []
      }

      if (!choice && candidates.length > 1) {
        diagnostics.push({ code: 'RESOURCE_CHOICE_REQUIRED', path: `${path}.${requirement.requirementId}`, candidates })

        return []
      }

      const isResource = (r: Row<'resource'>) => r.value.resourceId === (choice?.resourceId ?? candidates[0])

      const resource = unique(
        kind('resource').filter(isResource),
        `${path}.${requirement.requirementId}`,
        later('resource', isResource)
      )

      if (!resource) return []
      bind(line.lineId, requirement.requirementId, resource)
      if (resource.value.amount === null)
        diagnostics.push({ code: 'MISSING_RESOURCE_AMOUNT', path: `${path}.${requirement.requirementId}` })
      if (!resource.value.covers.includes(requirement.coverage))
        diagnostics.push({ code: 'INCOMPATIBLE_RESOURCE_COVERAGE', path })
      if (resource.value.scope === 'team' && !line.teamId) diagnostics.push({ code: 'MISSING_TEAM_ID', path })
      if (requirement.shareMode === 'equal_consumers' && requirement.quantityMode !== 'one')
        diagnostics.push({ code: 'INVALID_SHARED_QUANTITY_POLICY', path })
      if (requirement.shareMode === 'equal_consumers' && resource.value.scope === 'person')
        diagnostics.push({ code: 'INVALID_SHARED_RESOURCE_POLICY', path })

      return [{ requirement, resource, reason: undefined }]
    })

    return [{ line, profile, cost, allocation, pricing, kit, periods, resources }]
  })

  const talentFactors: Row<'talent_factor'>[] = []

  for (const s of selected)
    if (s.cost.value.localization?.kind === 'reference_adjusted') {
      const origin = s.cost.value.localization.referenceCountry

      const isFactor = (r: Row<'talent_factor'>) =>
        r.value.country === s.line.talentCountry && r.value.referenceCountry === origin

      const factor = unique(
        kind('talent_factor').filter(isFactor),
        `lines.${s.line.lineId}.talentFactor`,
        later('talent_factor', isFactor)
      )

      if (factor && !talentFactors.some(r => r.recordId === factor.recordId)) {
        talentFactors.push(factor)
        bind('*', 'talent_factor', factor)
      }
    }

  const fxPairs = new Set<string>()

  if (brief.outputCurrency !== catalog.calculationCurrency)
    fxPairs.add(`${catalog.calculationCurrency}:${brief.outputCurrency}`)

  for (const s of selected) {
    if (s.cost.value.currency !== catalog.calculationCurrency)
      fxPairs.add(`${s.cost.value.currency}:${catalog.calculationCurrency}`)
    for (const item of s.resources)
      if (item.resource && item.resource.value.currency !== catalog.calculationCurrency)
        fxPairs.add(`${item.resource.value.currency}:${catalog.calculationCurrency}`)
  }

  // A supplier that charges in the output currency is not converted at all (the kernel prices it at factor 1). Any
  // other currency goes through the calculation currency, so it needs its own record into it.
  for (const cost of reinvoiced)
    if (cost.currency !== brief.outputCurrency && cost.currency !== catalog.calculationCurrency)
      fxPairs.add(`${cost.currency}:${catalog.calculationCurrency}`)

  const fx: Row<'fx'>[] = []

  for (const pair of fxPairs) {
    const [from, to] = pair.split(':')

    const isRate = (r: Row<'fx'>) => r.value.from === from && r.value.to === to
    const rate = unique(kind('fx').filter(isRate), `fx.${pair}`, later('fx', isRate))

    if (rate) {
      fx.push(rate)
      bind('*', 'fx', rate)
    }
  }

  if (brief.mode === 'commercial_draft' && bindings.some(b => b.record.source.status !== 'confirmed'))
    diagnostics.push({ code: 'UNCONFIRMED_COMMERCIAL_SELECTION', path: 'bindings' })

  // The schedule of a cost is its own: the full `amount x quantity` in each period it lists. Every listed period must
  // exist in the term, and a re-invoiced cost needs a period that is quoted (one with an active line), because each
  // period is its own kernel input and a period without lines has none.
  for (const cost of thirdPartyCosts) {
    const path = `thirdPartyCosts.${cost.costId}`

    if (new Set(cost.periodIds).size !== cost.periodIds.length || cost.periodIds.some(p => p > brief.periods))
      diagnostics.push({ code: 'INVALID_THIRD_PARTY_SCHEDULE', path })
    else if (
      cost.settlement === 'reinvoiced' &&
      cost.periodIds.some(
        p =>
          !brief.lines.some(l =>
            (l.activePeriods ?? Array.from({ length: brief.periods }, (_, i) => i + 1)).includes(p)
          )
      )
    )
      diagnostics.push({ code: 'THIRD_PARTY_COST_OUTSIDE_ACTIVE_PERIOD', path })

    // A commercial draft is issued on confirmed values only; the evidence of an amount is one of them.
    if (brief.mode === 'commercial_draft' && cost.settlement === 'reinvoiced' && cost.evidence.status !== 'confirmed')
      diagnostics.push({ code: 'UNCONFIRMED_THIRD_PARTY_COST', path: `${path}.evidence` })
  }

  const chargedOnce = new Set<string>()

  // Agreed nets whose rows do not exist in every period: setup rows, and the rows of third-party costs.
  const agreedOnRows = brief.adjustments.filter(
    a => a.kind === 'agreed_net' && (a.billing === 'setup' || a.billing === PRICING_V3_THIRD_PARTY_BILLING)
  )

  const landed = new Set<string>()

  for (let periodId = 1; periodId <= brief.periods; periodId++) {
    const active = selected.filter(s => s.periods.includes(periodId))

    if (!active.length) continue

    // Each period is its own kernel input, so a cost reaches the periods it lists as a cost of period 1 of each.
    const costs = reinvoiced.filter(c => c.periodIds.includes(periodId))

    const snapshot: KernelSnapshot = {
      schemaVersion: contract,
      snapshotId: `selection-period-${periodId}`,
      version: catalog.version,
      mode: catalog.mode,
      calculationCurrency: catalog.calculationCurrency,
      countries: catalog.countries,
      currencies: catalog.currencies,
      profiles: [],
      allocationPolicies: [],
      pricingPolicies: [],
      resources: [],
      talentFactors: talentFactors.map(r => ({ ...r.value, source: r.source })),
      marketFactors: market ? [{ ...market.value, source: market.source }] : [],
      fx: fx.map(r => ({ ...r.value, source: r.source })),
      ...(rounding ? { priceRounding: { multiple: rounding.value.multiple, source: rounding.source } } : {}),
      // Only the ratio resolution selected reaches the kernel; which offer the record governs was decided above.
      ...(contract === '1.3.0' || contract === '1.4.0'
        ? {
            engagementFactors: engagement
              ? [{ form: engagement.value.form, priceRatio: engagement.value.priceRatio, source: engagement.source }]
              : []
          }
        : {}),
      // Only the rule selected for each category of this period, and the reserve selected for the quote. The label
      // of a record and the offer or form it governs stay in the bindings.
      ...(contract === '1.4.0'
        ? {
            thirdPartyPolicies: [...new Set(costs.flatMap(c => thirdPartyPolicies.get(c.costId) ?? []))].map(r => ({
              category: r.value.category,
              method: r.value.method,
              rate: r.value.rate,
              minimumMargin: r.value.minimumMargin,
              rounding: r.value.rounding,
              source: r.source
            })),
            ...(reserve
              ? { contingencyReserve: { rate: reserve.value.rate, base: reserve.value.base, source: reserve.source } }
              : {})
          }
        : {})
    }

    const request: KernelRequest = {
      schemaVersion: contract,
      quoteDate: brief.quoteDate,
      offerId: brief.offerId,
      deliveryModel: 'staffing',
      engagementCode: brief.engagementCode,
      ...(brief.engagementForm !== undefined ? { engagementForm: brief.engagementForm } : {}),
      offerMarketCountry: brief.offerMarketCountry,
      outputCurrency: brief.outputCurrency,
      duration: { unit: 'month', periods: 1 },
      lines: [],
      // An agreed total is not a kernel adjustment: the second pass hands each period the agreed nets it resolves to.
      adjustments: brief.adjustments
        .flatMap(a => (isAgreedTotal(a) ? [] : [a]))
        .map(a => ({
          ...a,
          lineIds: a.lineIds.filter(id =>
            a.kind === 'agreed_net' && a.billing === PRICING_V3_THIRD_PARTY_BILLING
              ? costs.some(c => c.costId === id)
              : active.some(s => s.line.lineId === id)
          )
        }))
        .filter(a => a.lineIds.length),
      taxTreatment: brief.taxTreatment,
      // The supplier stays in the brief: the kernel receives the amount, its currency and its evidence.
      ...(contract === '1.4.0'
        ? {
            thirdPartyCosts: costs.map(c => ({
              costId: c.costId,
              label: c.label,
              category: c.category,
              amount: c.amount,
              currency: c.currency,
              quantity: c.quantity,
              periodIds: [1],
              source: c.evidence
            })),
            ...(brief.contingency?.kind === 'waived' ? { contingencyWaiver: { reason: brief.contingency.reason } } : {})
          }
        : {})
    }

    const shared = new Map<string, { lineId: string; share: string }[]>()

    const groupKey = (s: (typeof active)[number], resource: Row<'resource'>) =>
      `${resource.value.resourceId}:${resource.value.scope}:${resource.value.scope === 'account' ? brief.accountId : s.line.teamId}`

    for (const s of active)
      for (const item of s.resources) {
        if (!item.resource || item.requirement.shareMode !== 'equal_consumers') continue
        const key = groupKey(s, item.resource)
        const users = shared.get(key) ?? []

        if (users.some(u => u.lineId === s.line.lineId)) {
          diagnostics.push({ code: 'DUPLICATE_SHARED_REQUIREMENT', path: s.line.lineId })
          continue
        }

        users.push({ lineId: s.line.lineId, share: '' })
        shared.set(key, users)
      }

    for (const users of shared.values()) {
      const portion = new D(1).div(users.length).toDecimalPlaces(18, D.ROUND_DOWN)

      users.forEach((u, i) => {
        u.share = i === users.length - 1 ? new D(1).minus(portion.mul(i)).toString() : portion.toString()
      })
    }

    const newlyCharged = new Set<string>()
    const setupLines = new Set<string>()

    for (const s of active) {
      const profileId = `selected-profile-${active.indexOf(s)}`
      const dedication = s.line.dedicationByPeriod?.find(d => d.periodId === periodId)?.dedication ?? s.line.dedication
      const covers = s.cost.value.components.map(c => c.coverage)

      snapshot.profiles.push({
        profileId,
        label: s.profile.value.label,
        seniorityCode: s.profile.value.seniorityCode,
        tierCode: s.profile.value.tierCode,
        cost: s.cost.value.components.some(c => c.amount === null)
          ? null
          : {
              amount: s.cost.value.components.reduce((sum, c) => sum.plus(c.amount!), new D(0)).toString(),
              currency: s.cost.value.currency,
              unit: 'month',
              localization: s.cost.value.localization ?? { kind: 'specific', country: s.line.talentCountry },
              covers,
              source: s.cost.value.localization ? s.cost.source : { ...s.cost.source, status: 'estimated' }
            },
        requiredCoverages: [
          ...new Set([...s.profile.value.requiredCoverages, ...s.resources.map(r => r.requirement.coverage)])
        ]
      })
      if (!snapshot.allocationPolicies.some(p => p.policyId === s.allocation.value.policyId))
        snapshot.allocationPolicies.push({ ...s.allocation.value, source: s.allocation.source })
      snapshot.pricingPolicies.push({ ...s.pricing.value, profileId, source: s.pricing.source })

      const line: KernelRequest['lines'][number] = {
        lineId: s.line.lineId,
        profileId,
        seniorityCode: s.profile.value.seniorityCode,
        talentCountry: s.line.talentCountry,
        headcount: s.line.headcount,
        dedication,
        allocationMode: s.line.allocationMode,
        allocationPolicyRef: s.allocation.value.policyId,
        assignments: [],
        notApplicable: []
      }

      for (const item of s.resources) {
        if (item.reason) {
          line.notApplicable.push({ coverage: item.requirement.coverage, reason: `Client provides: ${item.reason}` })
          continue
        }

        const resource = item.resource

        if (!resource || resource.value.amount === null) continue

        const scopeRef =
          resource.value.scope === 'person'
            ? s.line.lineId
            : resource.value.scope === 'account'
              ? brief.accountId
              : s.line.teamId!

        const onceKey = `${resource.value.resourceId}:${scopeRef}`

        if (resource.value.unit === 'once' && chargedOnce.has(onceKey)) {
          line.notApplicable.push({
            coverage: item.requirement.coverage,
            reason: 'One-time resource already charged in an earlier period.'
          })
          continue
        }

        if (!snapshot.resources.some(r => r.resourceId === resource.value.resourceId))
          snapshot.resources.push({ ...resource.value, amount: resource.value.amount, source: resource.source })

        const fte =
          dedication.unit === 'fte'
            ? new D(dedication.value)
            : new D(dedication.value).div(s.allocation.value.hoursPerFteMonth)

        const billed =
          s.line.allocationMode === 'dedicated'
            ? new D(s.allocation.value.dedicatedBilledFte)
            : D.max(fte, s.allocation.value.minimumBilledFte)

        const share =
          item.requirement.shareMode === 'equal_consumers'
            ? shared.get(groupKey(s, resource))!.find(u => u.lineId === s.line.lineId)!.share
            : item.requirement.shareMode === 'fte'
              ? billed.toDecimalPlaces(18).toString()
              : '1'

        line.assignments.push({
          resourceId: resource.value.resourceId,
          allocationId: `selected-${active.indexOf(s)}-resource-${s.resources.indexOf(item)}`,
          scope: resource.value.scope,
          scopeRef,
          quantity: item.requirement.quantityMode === 'headcount' ? String(s.line.headcount) : '1',
          share,
          cashTiming: resource.value.unit === 'month' ? 'monthly' : 'start'
        })

        if (resource.value.unit === 'once') {
          newlyCharged.add(onceKey)
          setupLines.add(s.line.lineId)
        }
      }

      request.lines.push(line)
    }

    // Each period is its own kernel input and setup rows exist only where a one-time resource is charged: an agreed
    // setup net goes to those periods alone. Anywhere else the kernel would have no row to apply it to.
    request.adjustments = request.adjustments.filter(
      a => a.kind !== 'agreed_net' || a.billing !== 'setup' || a.lineIds.some(id => setupLines.has(id))
    )
    request.adjustments.forEach(a => landed.add(a.adjustmentId))
    newlyCharged.forEach(k => chargedOnce.add(k))
    inputs.push({ periodId, input: { request, snapshot } as PricingV3AnyInput })
  }

  // Same condition the kernel names, seen across the whole term: no period has a row for this agreed net (a setup
  // row, or the row of one of the third-party costs it names).
  if (selected.length === brief.lines.length)
    for (const a of agreedOnRows)
      if (!landed.has(a.adjustmentId))
        diagnostics.push({ code: 'AGREED_NET_WITHOUT_BASE', path: `adjustments.${a.adjustmentId}` })

  // Declared here, settled by the second pass once every cost of the quote is in its inputs (`settleAgreedTotals`).
  // The key exists only for a brief that declares an agreed total: every other resolution keeps the keys it had.
  const declaredTotals: ResolvedAgreedTotal[] = agreedTotals.map(total => ({
    adjustmentId: total.adjustmentId,
    amount: total.amount,
    ...(total.per ? { per: total.per } : {}),
    currency: brief.outputCurrency,
    lineIds: total.lineIds,
    reason: total.reason,
    policyNet: null,
    distributionUnit: null,
    distributionUnitBasis: null,
    distribution: null
  }))

  const status = diagnostics.length ? ('needs_input' as const) : ('resolved' as const)
  const catalogRef = { catalogId: catalog.catalogId, version: catalog.version }

  if (declaredTotals.length)
    return {
      status,
      brief,
      catalog: catalogRef,
      diagnostics,
      assumptions,
      bindings,
      inputs,
      agreedTotals: declaredTotals
    }

  return { status, brief, catalog: catalogRef, diagnostics, assumptions, bindings, inputs }
}
