import Decimal from 'decimal.js'

import { PRICING_V3_MARKET_FLOOR_BASIS } from '../schemas'
import type { PricingV3AnyInput, PricingV3ContractVersion, PricingV3InputV12 } from '../schemas'
import { activeRecords, validateCatalog } from './catalog'
import { briefSchema } from './contracts'
import type { CatalogRecord, Diagnostic } from './contracts'

const D = Decimal.clone({ precision: 80 })

type Row<K extends CatalogRecord['kind']> = Extract<CatalogRecord, { kind: K }>

// Built as the widest contract; `schemaVersion` says which one each quote declares and the kernel parses it as such.
type KernelSnapshot = Omit<PricingV3InputV12['snapshot'], 'schemaVersion'> & { schemaVersion: PricingV3ContractVersion }
type KernelRequest = Omit<PricingV3InputV12['request'], 'schemaVersion'> & { schemaVersion: PricingV3ContractVersion }

type KitAssignment = {
  requirement: Row<'kit'>['value']['requirements'][number]
  resource: Row<'resource'> | undefined
  reason: string | undefined
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
  const kind = <K extends CatalogRecord['kind']>(name: K) => rows.filter(r => r.kind === name) as Row<K>[]

  const unique = <T extends CatalogRecord>(candidates: T[], path: string): T | undefined => {
    if (candidates.length !== 1) {
      diagnostics.push({
        code: candidates.length ? 'AMBIGUOUS_SELECTION' : 'MISSING_CATALOG_SELECTION',
        path,
        candidates: candidates.map(r => r.recordId)
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

  if (brief.adjustments.some(a => a.lineIds.some(id => !brief.lines.some(l => l.lineId === id))))
    diagnostics.push({ code: 'INVALID_ADJUSTMENT_LINE', path: 'adjustments' })

  const market = unique(
    kind('market_factor').filter(r => r.value.country === brief.offerMarketCountry),
    'offerMarketCountry'
  )

  if (market) bind('*', 'market_factor', market)

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

  // Contract 1.1.0 only when the frozen inputs use what 1.0.0 cannot express; everything else stays 1.0.0, so a quote
  // frozen before 1.1.0 existed resolves to the contract and digest it was signed with. Same answer for every period.
  //
  // Contract 1.2.0 only when the market factor selected for this quote declares its floor basis. It is a property of
  // the record, never of the factor's value: a catalog frozen before 1.2.0 cannot declare it and resolves as it did.
  const contract: PricingV3ContractVersion =
    market?.value.floorBasis === PRICING_V3_MARKET_FLOOR_BASIS
      ? '1.2.0'
      : applicableRules.length > 0 || brief.adjustments.length > 1 || brief.adjustments.some(a => a.kind !== 'discount')
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
    const exact = kind('profile').filter(r => r.value.profileId === line.profile)

    const profile = unique(
      (exact.length
        ? exact
        : kind('profile').filter(r =>
            [r.value.label, ...r.value.aliases].some(a => normalize(a).includes(normalize(line.profile)))
          )
      ).filter(r => !line.seniorityCode || r.value.seniorityCode === line.seniorityCode),
      `${path}.profile`
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

    const allocation = unique(
      kind('allocation').filter(
        r => r.value.policyId === line.allocationPolicyId && r.value.mode === line.allocationMode
      ),
      `${path}.allocation`
    )

    const pricing = unique(
      kind('pricing').filter(
        r =>
          r.value.profileId === profile.value.profileId &&
          r.value.tierCode === profile.value.tierCode &&
          r.value.offerId === brief.offerId &&
          r.value.engagementCode === brief.engagementCode &&
          (!line.pricingPolicyId || r.recordId === line.pricingPolicyId)
      ),
      `${path}.pricing`
    )

    const kitId = line.kitId ?? profile.value.defaultKitId

    const kit = kitId
      ? unique(
          kind('kit').filter(r => r.value.kitId === kitId),
          `${path}.kit`
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

      const resource = unique(
        kind('resource').filter(r => r.value.resourceId === (choice?.resourceId ?? candidates[0])),
        `${path}.${requirement.requirementId}`
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

      const factor = unique(
        kind('talent_factor').filter(
          r => r.value.country === s.line.talentCountry && r.value.referenceCountry === origin
        ),
        `lines.${s.line.lineId}.talentFactor`
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

  const fx: Row<'fx'>[] = []

  for (const pair of fxPairs) {
    const [from, to] = pair.split(':')

    const rate = unique(
      kind('fx').filter(r => r.value.from === from && r.value.to === to),
      `fx.${pair}`
    )

    if (rate) {
      fx.push(rate)
      bind('*', 'fx', rate)
    }
  }

  if (brief.mode === 'commercial_draft' && bindings.some(b => b.record.source.status !== 'confirmed'))
    diagnostics.push({ code: 'UNCONFIRMED_COMMERCIAL_SELECTION', path: 'bindings' })
  const chargedOnce = new Set<string>()
  const setupAgreed = brief.adjustments.filter(a => a.kind === 'agreed_net' && a.billing === 'setup')
  const landed = new Set<string>()

  for (let periodId = 1; periodId <= brief.periods; periodId++) {
    const active = selected.filter(s => s.periods.includes(periodId))

    if (!active.length) continue

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
      ...(rounding ? { priceRounding: { multiple: rounding.value.multiple, source: rounding.source } } : {})
    }

    const request: KernelRequest = {
      schemaVersion: contract,
      quoteDate: brief.quoteDate,
      offerId: brief.offerId,
      deliveryModel: 'staffing',
      engagementCode: brief.engagementCode,
      offerMarketCountry: brief.offerMarketCountry,
      outputCurrency: brief.outputCurrency,
      duration: { unit: 'month', periods: 1 },
      lines: [],
      adjustments: brief.adjustments
        .map(a => ({ ...a, lineIds: a.lineIds.filter(id => active.some(s => s.line.lineId === id)) }))
        .filter(a => a.lineIds.length),
      taxTreatment: brief.taxTreatment
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

  // Same condition the kernel names, seen across the whole term: no period has a setup row for this agreed net.
  if (selected.length === brief.lines.length)
    for (const a of setupAgreed)
      if (!landed.has(a.adjustmentId))
        diagnostics.push({ code: 'AGREED_NET_WITHOUT_BASE', path: `adjustments.${a.adjustmentId}` })

  return {
    status: diagnostics.length ? ('needs_input' as const) : ('resolved' as const),
    brief,
    catalog: { catalogId: catalog.catalogId, version: catalog.version },
    diagnostics,
    assumptions,
    bindings,
    inputs
  }
}
