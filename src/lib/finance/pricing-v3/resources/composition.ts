import Decimal from 'decimal.js'

import { activeRecords, validateCatalog } from '../catalog/catalog'
import type { CatalogRecord, Diagnostic } from '../catalog/contracts'
import { calculateResolvedQuote } from '../catalog/quote'
import { resolveBrief } from '../catalog/resolve'
import type { PricingV3Input } from '../schemas'
import { compositionDemandSchema, compositionPolicySchema } from './composition-contracts'
import { creditBudgetRequestSchema, creditCatalogSchema, planCreditBudget } from './credit-budget'

const D = Decimal.clone({ precision: 80 })

type Resource = PricingV3Input['snapshot']['resources'][number]
type PriceRecord = Extract<CatalogRecord, { kind: 'resource' }>

/** Select and attribute work resources; the existing kernel remains the only selling-price calculator. */
export function composeResourceQuote(catalogRaw: unknown, policyRaw: unknown, creditsRaw: unknown, demandRaw: unknown) {
  const catalog = validateCatalog(catalogRaw)
  const policy = compositionPolicySchema.parse(policyRaw)
  const creditCatalog = creditCatalogSchema.parse(creditsRaw)
  const demand = compositionDemandSchema.parse(demandRaw)
  const diagnostics: Diagnostic[] = []

  const issue = (code: string, path: string, detail?: string) =>
    diagnostics.push({ code, path, ...(detail ? { detail } : {}) })

  const toolIds = policy.tools.map(t => t.toolId)
  const unique = <T>(items: T[]) => new Set(items).size === items.length
  const asOf = demand.brief.quoteDate
  const live = activeRecords(catalog, asOf)
  const effective = (source: Resource['source']) => source.effectiveFrom <= asOf && asOf <= source.effectiveUntil

  if (
    !unique(toolIds) ||
    !unique(policy.commonToolIds) ||
    !unique(policy.taskCodes) ||
    !unique(policy.profileTasks.map(p => p.profileId))
  )
    issue('DUPLICATE_POLICY_RULE', 'policy')
  if (!unique(policy.tools.filter(t => t.providerId).map(t => t.providerId)))
    issue('DUPLICATE_PROVIDER_TOOL', 'policy.tools')
  if (!effective(policy.source)) issue('RESOURCE_POLICY_NOT_EFFECTIVE', 'policy.source')
  if (demand.brief.mode !== 'simulation') issue('COMPOSITION_REVIEW_ONLY', 'brief.mode')

  for (const tool of policy.tools) {
    if (!unique(tool.prices.map(p => p.priceId)) || tool.tasks.some(t => !policy.taskCodes.includes(t)))
      issue('INVALID_TOOL_RULE', tool.toolId)
    if ((tool.access === 'credits') !== Boolean(tool.providerId) || (tool.access === 'credits' && tool.prices.length))
      issue('INVALID_CREDIT_TOOL', tool.toolId)
  }

  if (
    policy.commonToolIds.some(id => !toolIds.includes(id)) ||
    policy.profileTasks.some(p => p.tasks.some(t => !policy.taskCodes.includes(t)))
  )
    issue('UNKNOWN_POLICY_REFERENCE', 'policy')
  if (
    !unique(demand.work.map(w => w.lineId)) ||
    !unique(demand.serviceToolIds) ||
    demand.work.length !== demand.brief.lines.length
  )
    issue('INVALID_WORK_LINES', 'work')

  for (const w of demand.work) {
    const line = demand.brief.lines.find(l => l.lineId === w.lineId)

    if (!line || w.assigneeIds.length !== line.headcount || !unique(w.assigneeIds))
      issue('INVALID_ASSIGNEE_SLOTS', w.lineId)
    if (!unique(w.tasks) || !unique(w.aiToolIds) || w.tasks.some(t => !policy.taskCodes.includes(t)))
      issue('UNKNOWN_OR_DUPLICATE_TASK', w.lineId)

    const excludedTasks = (w.excludedProfileTasks ?? []).map(e => e.task)

    if (!unique(excludedTasks) || excludedTasks.some(t => w.tasks.includes(t)))
      issue('CONFLICTING_PROFILE_TASK_EXCLUSION', w.lineId)
    if (w.aiToolIds.some(id => !policy.tools.some(t => t.toolId === id && t.ai))) issue('UNKNOWN_AI_TOOL', w.lineId)
    if (w.aiToolIds.length && !w.aiSelectionReason) issue('AI_SELECTION_REASON_REQUIRED', w.lineId)
    if (
      !unique(w.creditDemand.map(d => `${d.periodId}:${d.toolId}`)) ||
      w.creditDemand.some(
        d =>
          d.periodId > demand.brief.periods || !policy.tools.some(t => t.toolId === d.toolId && t.access === 'credits')
      )
    )
      issue('INVALID_CREDIT_DEMAND', w.lineId)
  }

  if (demand.serviceToolIds.some(id => !toolIds.includes(id))) issue('UNKNOWN_SERVICE_TOOL', 'serviceToolIds')
  if (
    !unique(demand.allocations.map(a => `${a.periodId}:${a.toolId}`)) ||
    !unique(demand.creditBudgets.map(a => `${a.periodId}:${a.toolId}`))
  )
    issue('DUPLICATE_RESOURCE_ALLOCATION', 'allocations')

  // Strip only tools from existing kits; salary, platform fee, assurance, operations and setup stay canonical.
  const baseCatalog = structuredClone(catalog)
  const stripped = new Map<string, string[]>()

  for (const row of baseCatalog.records) {
    if (row.kind !== 'kit') continue

    const isTool = (r: (typeof row.value.requirements)[number]) =>
      r.coverage.startsWith('tool:') ||
      r.candidateResourceIds.some(id =>
        live.some(v => v.kind === 'resource' && v.value.resourceId === id && v.value.kind === 'tool')
      )

    stripped.set(
      row.value.kitId,
      row.value.requirements.filter(isTool).map(r => r.requirementId)
    )
    row.value.requirements = row.value.requirements.filter(r => !isTool(r))
  }

  const baseBrief = structuredClone(demand.brief)

  for (const line of baseBrief.lines) {
    const profiles = live.filter(r => r.kind === 'profile' && r.value.profileId === line.profile)

    const kit =
      line.kitId ?? (profiles.length === 1 && profiles[0].kind === 'profile' ? profiles[0].value.defaultKitId : null)

    if (kit && line.choices.some(c => stripped.get(kit)?.includes(c.requirementId)))
      issue('MOVE_TOOL_CHOICES_TO_COMPOSITION', line.lineId)
    if (kit) line.choices = line.choices.filter(c => !stripped.get(kit)?.includes(c.requirementId))
  }

  const resolution = resolveBrief(baseCatalog, baseBrief)
  const selections: { periodId: number; lineId: string; toolId: string; included: boolean; reasons: string[] }[] = []

  const attributions: {
    periodId: number
    toolId: string
    priceId: string
    resource: Resource
    quantity: string
    serviceShare: string
    consumerIds: string[]
    reason: string
    driver: unknown
    fullMonthlyCost: string
    attributedMonthlyCost: string
    unallocatedMonthlyCost: string
    assignments: { lineId: string; share: string; attributedCost: string }[]
  }[] = []

  const budgets: { periodId: number; toolId: string; result: ReturnType<typeof planCreditBudget> }[] = []
  const usedAllocations = new Set<string>()
  const usedBudgets = new Set<string>()
  const usedDemand = new Set<string>()
  const usedFx = new Set<string>()
  const usedClient = new Set<string>()
  const clientCoverages = demand.clientProvidedTools ?? []

  if (!unique(clientCoverages.map(c => `${c.periodId}:${c.toolId}`)))
    issue('DUPLICATE_CLIENT_TOOL_COVERAGE', 'clientProvidedTools')

  for (const c of clientCoverages) {
    if (policy.commonToolIds.includes(c.toolId) || policy.tools.find(t => t.toolId === c.toolId)?.access === 'credits')
      issue('CLIENT_COVERAGE_NOT_ALLOWED', c.toolId)
    const start = new Date(`${asOf.slice(0, 7)}-01T00:00:00Z`)

    start.setUTCMonth(start.getUTCMonth() + c.periodId - 1)
    const end = new Date(start)

    end.setUTCMonth(end.getUTCMonth() + 1)
    end.setUTCDate(0)
    const from = c.periodId === 1 ? asOf : start.toISOString().slice(0, 10)
    const until = end.toISOString().slice(0, 10)

    if (
      c.evidence.effectiveFrom > from ||
      c.evidence.effectiveUntil < until ||
      c.evidence.status !== 'confirmed' ||
      !unique(c.lineIds)
    )
      issue('CLIENT_ACCESS_EVIDENCE_REQUIRED', c.toolId)
  }

  for (const period of resolution.inputs) {
    const { snapshot, request } = period.input
    const selected = new Map<string, { lineId: string; assignees: string[]; credits: number }[]>()

    for (const line of request.lines) {
      const w = demand.work.find(w => w.lineId === line.lineId)
      const profile = resolution.bindings.find(b => b.lineId === line.lineId && b.record.kind === 'profile')?.record

      if (profile?.kind === 'profile' && !policy.profileTasks.some(p => p.profileId === profile.value.profileId))
        issue('PROFILE_RESOURCE_RULES_REQUIRED', line.lineId)

      const profileTasks =
        profile?.kind === 'profile'
          ? (policy.profileTasks.find(p => p.profileId === profile.value.profileId)?.tasks ?? [])
          : []

      const exclusions = w?.excludedProfileTasks ?? []

      // Only a task the profile recipe actually adds can be excluded; anything else is a typo or stale demand.
      for (const e of exclusions)
        if (profile?.kind === 'profile' && !profileTasks.includes(e.task))
          issue('UNKNOWN_PROFILE_TASK_EXCLUSION', `${line.lineId}:${e.task}`)

      const tasks = [...(w?.tasks ?? []), ...profileTasks.filter(t => !exclusions.some(e => e.task === t))]

      for (const tool of policy.tools) {
        const reasons = [
          ...(policy.commonToolIds.includes(tool.toolId) ? ['common-base'] : []),
          ...tool.tasks.filter(t => tasks.includes(t)).map(t => `task:${t}`),
          ...(w?.aiToolIds.includes(tool.toolId) ? [`explicit-ai-selection:${w.aiSelectionReason}`] : []),
          ...(demand.serviceToolIds.includes(tool.toolId) ? ['explicit-service-requirement'] : [])
        ]

        selections.push({
          periodId: period.periodId,
          lineId: line.lineId,
          toolId: tool.toolId,
          included: reasons.length > 0,
          reasons: reasons.length
            ? reasons
            : [
                ...exclusions
                  .filter(e => tool.tasks.includes(e.task))
                  .map(e => `profile-task-excluded:${e.task}:${e.reason}`),
                'not-required-for-work'
              ]
        })
        if (!reasons.length) continue
        const coverage = clientCoverages.find(c => c.periodId === period.periodId && c.toolId === tool.toolId)

        if (coverage?.lineIds.includes(line.lineId)) {
          usedClient.add(`${period.periodId}:${tool.toolId}:${line.lineId}`)
          selections[selections.length - 1].reasons.push(`client-provided:${coverage.reason}`)
          continue
        }

        const d = w?.creditDemand.find(d => d.periodId === period.periodId && d.toolId === tool.toolId)

        if (d) usedDemand.add(`${line.lineId}:${d.periodId}:${d.toolId}`)
        if (tool.access === 'credits' && !d)
          issue('CREDIT_DEMAND_REQUIRED', `${period.periodId}:${line.lineId}:${tool.toolId}`)
        const users = selected.get(tool.toolId) ?? []

        users.push({ lineId: line.lineId, assignees: w?.assigneeIds ?? [], credits: d?.credits ?? 0 })
        selected.set(tool.toolId, users)
      }
    }

    for (const [toolId, consumers] of selected) {
      const tool = policy.tools.find(t => t.toolId === toolId)!
      const key = `${period.periodId}:${toolId}`
      const consumerIds = [...new Set(consumers.flatMap(c => c.assignees))].sort()
      let resource: Resource | undefined
      let quantity = '1'
      let serviceShare = '1'
      let reason = ''
      let priceId = ''
      let driver: unknown = { unit: 'provider-credit-demand', totalUnits: consumers.reduce((s, c) => s + c.credits, 0) }
      let weights: Decimal[] = []

      if (tool.access === 'credits') {
        const config = demand.creditBudgets.find(b => b.periodId === period.periodId && b.toolId === toolId)

        if (!config) {
          issue('CREDIT_BUDGET_REQUIRED', key)
          continue
        }

        usedBudgets.add(key)
        const month = new Date(`${asOf.slice(0, 7)}-01T00:00:00Z`)

        month.setUTCMonth(month.getUTCMonth() + period.periodId - 1)

        if (
          config.purchaseDate.slice(0, 7) !== month.toISOString().slice(0, 7) ||
          config.useBy.slice(0, 7) !== month.toISOString().slice(0, 7) ||
          config.purchaseDate < asOf
        ) {
          issue('CREDIT_PERIOD_WINDOW_MISMATCH', key)
          continue
        }

        const { periodId: ignoredPeriod, toolId: ignoredTool, ...fields } = config

        void ignoredPeriod
        void ignoredTool

        const parsed = creditBudgetRequestSchema.safeParse({
          ...fields,
          schemaVersion: 'pricing-v3-credit-budget/1',
          mode: 'simulation',
          accountRef: demand.brief.accountId,
          providerId: tool.providerId,
          requestedCredits: consumers.reduce((s, c) => s + c.credits, 0)
        })

        if (!parsed.success) {
          issue('INVALID_AGGREGATE_CREDIT_BUDGET', key)
          continue
        }

        const result = planCreditBudget(creditCatalog, parsed.data)

        budgets.push({ periodId: period.periodId, toolId, result })

        if (!result.breakdown) {
          result.diagnostics.forEach(d => issue(d, key))
          continue
        }

        const provider = creditCatalog.providers.find(p => p.providerId === tool.providerId)!

        resource = {
          resourceId: `composed:${toolId}`,
          label: tool.label,
          kind: 'tool',
          amount: result.breakdown.totalBudgetCost,
          currency: result.breakdown.currency,
          unit: 'month',
          scope: 'account',
          covers: [`tool:${toolId}`],
          source: {
            reference: provider.source.reference,
            effectiveFrom: asOf,
            effectiveUntil: asOf,
            status: 'estimated'
          }
        }
        priceId = creditCatalog.version
        reason =
          'Pooled provider/month budget; cost distributed by declared credit demand, including whole extra packages.'
        weights = consumers.map(c => new D(c.credits))
      } else {
        const allocation = demand.allocations.find(a => a.periodId === period.periodId && a.toolId === toolId)

        if (!allocation) {
          issue('RESOURCE_ALLOCATION_REQUIRED', key)
          continue
        }

        usedAllocations.add(key)

        const expectedShare = new D(allocation.driver.allocatedUnits)
          .div(allocation.driver.totalUnits)
          .toDecimalPlaces(18, D.ROUND_DOWN)

        if (
          new D(allocation.driver.allocatedUnits).gt(allocation.driver.totalUnits) ||
          !new D(allocation.serviceShare).eq(expectedShare)
        ) {
          issue('ALLOCATION_DRIVER_MISMATCH', key)
          continue
        }

        const price = tool.prices.find(p => p.priceId === allocation.priceId)

        if (!price) {
          issue('RESOURCE_PRICE_SELECTION_REQUIRED', key)
          continue
        }

        // A bundle is counted twice when the SAME person or line is charged the plan and a tool the plan already
        // includes. Two people on different plans of one vendor (a designer on the full suite, a community manager
        // on the light product) is the normal shape of a mixed team, not a double count.
        const holders = new Set(consumers.flatMap(c => [`line:${c.lineId}`, ...c.assignees.map(a => `person:${a}`)]))

        if (
          price.bundledToolIds?.some(id =>
            (selected.get(id) ?? []).some(
              c => holders.has(`line:${c.lineId}`) || c.assignees.some(a => holders.has(`person:${a}`))
            )
          )
        ) {
          issue('BUNDLED_TOOL_DOUBLE_COUNT', key)
          continue
        }

        if (tool.access === 'named' && !new D(allocation.quantity).isInteger()) {
          issue('WHOLE_NAMED_LICENSE_REQUIRED', key)
          continue
        }

        if (price.pendingReason) {
          issue('RESOURCE_PRICE_PENDING', key, price.pendingReason)
          continue
        }

        let value = price.price

        if (price.catalogResourceId) {
          const candidates = live.filter(
            (r): r is PriceRecord => r.kind === 'resource' && r.value.resourceId === price.catalogResourceId
          )

          if (candidates.length !== 1 || candidates[0].value.amount === null) {
            issue('CATALOG_RESOURCE_PRICE_REQUIRED', key)
            continue
          }

          const record = candidates[0]

          if (record.value.unit === 'once') {
            issue('UNSUPPORTED_TOOL_PRICE_UNIT', key)
            continue
          }

          value = {
            amount: record.value.amount!,
            currency: record.value.currency,
            unit: record.value.unit,
            source: record.source
          }
        }

        if (!value || !effective(value.source)) {
          issue('RESOURCE_PRICE_NOT_EFFECTIVE', key)
          continue
        }

        if (
          tool.access === 'named' &&
          (price.basis === 'seat'
            ? !new D(allocation.quantity).eq(consumerIds.length)
            : !allocation.seatCapacity || allocation.seatCapacity < consumerIds.length)
        ) {
          issue('INSUFFICIENT_NAMED_SEAT_CAPACITY', key)
          continue
        }

        if (
          price.minimumContractSeats &&
          (!allocation.contractSeatCount ||
            allocation.contractSeatCount < Math.max(price.minimumContractSeats, consumerIds.length))
        ) {
          issue('TEAM_CONTRACT_CAPACITY_REQUIRED', key)
          continue
        }

        if (
          price.includedSeats &&
          (!allocation.seatCapacity || allocation.seatCapacity > price.includedSeats * Number(allocation.quantity))
        ) {
          issue('PACKAGE_SEAT_CAPACITY_EXCEEDED', key)
          continue
        }

        quantity = allocation.quantity
        serviceShare = allocation.serviceShare
        driver = allocation.driver
        reason = allocation.reason
        priceId = price.priceId
        resource = {
          ...value,
          resourceId: `composed:${toolId}`,
          label: tool.label,
          kind: 'tool',
          scope: 'account',
          covers: [`tool:${toolId}`]
        }
        // A person counted across several functions contributes one seat, divided across those functions.
        weights = consumers.map(c =>
          c.assignees.reduce(
            (s, id) => s.plus(new D(1).div(consumers.filter(x => x.assignees.includes(id)).length)),
            new D(0)
          )
        )
      }

      if (!snapshot.currencies.some(c => c.code === resource.currency)) issue('RESOURCE_CURRENCY_NOT_CONFIGURED', key)

      if (resource.currency !== snapshot.calculationCurrency) {
        const matches = live.filter(
          (r): r is Extract<CatalogRecord, { kind: 'fx' }> =>
            r.kind === 'fx' &&
            demand.fxRecordIds.includes(r.recordId) &&
            r.value.from === resource.currency &&
            r.value.to === snapshot.calculationCurrency
        )

        if (matches.length !== 1) issue('RESOURCE_FX_SELECTION_REQUIRED', key)
        else {
          const previous = snapshot.fx.find(f => f.from === resource!.currency && f.to === snapshot.calculationCurrency)

          if (
            previous &&
            (previous.rate !== matches[0].value.rate || previous.source.reference !== matches[0].source.reference)
          )
            issue('RESOURCE_FX_CONFLICT', key)
          if (!previous) snapshot.fx.push({ ...matches[0].value, source: matches[0].source })
          usedFx.add(matches[0].recordId)
        }
      }

      const weightTotal = weights.reduce((s, w) => s.plus(w), new D(0))

      if (!weightTotal.gt(0)) {
        issue('RESOURCE_CONSUMERS_REQUIRED', key)
        continue
      }

      snapshot.resources.push(resource)
      let distributed = new D(0)

      const assignments = consumers.map((c, i) => {
        const share =
          i === consumers.length - 1
            ? new D(serviceShare).minus(distributed)
            : weights[i].div(weightTotal).mul(serviceShare).toDecimalPlaces(18, D.ROUND_DOWN)

        distributed = distributed.plus(share)
        const line = request.lines.find(l => l.lineId === c.lineId)!

        line.assignments.push({
          resourceId: resource!.resourceId,
          allocationId: `composed-${toolId}-${i}`,
          scope: 'account',
          scopeRef: demand.brief.accountId,
          quantity,
          share: share.toString(),
          cashTiming: resource!.unit === 'month' ? 'monthly' : 'start'
        })
        snapshot.profiles.find(p => p.profileId === line.profileId)!.requiredCoverages.push(`tool:${toolId}`)

        return {
          lineId: c.lineId,
          share: share.toString(),
          attributedCost: new D(resource!.amount)
            .mul(quantity)
            .mul(share)
            .div(resource!.unit === 'year' ? 12 : 1)
            .toString()
        }
      })

      const fullMonthlyCost = new D(resource.amount).mul(quantity).div(resource.unit === 'year' ? 12 : 1)

      attributions.push({
        periodId: period.periodId,
        toolId,
        priceId,
        resource,
        quantity,
        serviceShare,
        consumerIds,
        reason,
        driver,
        fullMonthlyCost: fullMonthlyCost.toString(),
        attributedMonthlyCost: fullMonthlyCost.mul(serviceShare).toString(),
        unallocatedMonthlyCost: fullMonthlyCost.mul(new D(1).minus(serviceShare)).toString(),
        assignments
      })
    }
  }

  for (const a of demand.allocations)
    if (!usedAllocations.has(`${a.periodId}:${a.toolId}`))
      issue('UNUSED_RESOURCE_ALLOCATION', `${a.periodId}:${a.toolId}`)
  for (const b of demand.creditBudgets)
    if (!usedBudgets.has(`${b.periodId}:${b.toolId}`)) issue('UNUSED_CREDIT_BUDGET', `${b.periodId}:${b.toolId}`)
  for (const w of demand.work)
    for (const d of w.creditDemand)
      if (!usedDemand.has(`${w.lineId}:${d.periodId}:${d.toolId}`))
        issue('UNUSED_CREDIT_DEMAND', `${w.lineId}:${d.periodId}:${d.toolId}`)
  for (const id of demand.fxRecordIds) if (!usedFx.has(id)) issue('UNUSED_FX_SELECTION', id)
  for (const c of clientCoverages)
    for (const lineId of c.lineIds)
      if (!usedClient.has(`${c.periodId}:${c.toolId}:${lineId}`))
        issue('UNUSED_CLIENT_TOOL_COVERAGE', `${c.periodId}:${c.toolId}:${lineId}`)
  resolution.diagnostics.push(...diagnostics)
  if (diagnostics.length) resolution.status = 'needs_input'
  const quote = calculateResolvedQuote(resolution)

  for (const period of quote.periods)
    if (period.result.calculationStatus !== 'calculated')
      quote.diagnostics.push(
        ...period.result.diagnostics
          .filter(d => d.severity !== 'review')
          .map(d => ({ code: d.code, path: `periods.${period.periodId}.${d.fieldPath}`, detail: d.message }))
      )

  return {
    version: 'pricing-v3-resource-composition/1',
    binding: false as const,
    commercialUnit: demand.commercialUnit,
    reviewStatus: 'requires_review' as const,
    selections,
    attributions,
    creditBudgets: budgets,
    resourceIncrementalCash: budgets
      .filter(b => b.result.breakdown)
      .map(b => ({
        periodId: b.periodId,
        toolId: b.toolId,
        amount: b.result.breakdown!.incrementalCash,
        currency: b.result.breakdown!.currency
      })),
    cashMeaning:
      'Kernel cashCommitment is attributed modeled commitment, not incremental purchase or an invoice. Incremental cash here covers only declared credit top-ups; seat procurement is not inferred.',
    quote
  }
}
