import Decimal from 'decimal.js'

import { activeRecords, validateCatalog } from '../catalog/catalog'
import type { CatalogRecord, Diagnostic } from '../catalog/contracts'
import { calculateResolvedQuote } from '../catalog/quote'
import { resolveBrief } from '../catalog/resolve'
import type { PricingV3Input } from '../schemas'
import { compositionDemandSchema, compositionPolicySchema, eachPeriod } from './composition-contracts'
import type { CompositionPolicy } from './composition-contracts'
import { creditBudgetRequestSchema, creditCatalogSchema, planCreditBudget } from './credit-budget'

const D = Decimal.clone({ precision: 80 })

type Resource = PricingV3Input['snapshot']['resources'][number]
type PriceRecord = Extract<CatalogRecord, { kind: 'resource' }>

/** A line that uses a tool in a period: its people, and the credits it asks for when the tool is bought in credits. */
type Consumer = { lineId: string; assignees: string[]; credits: number }

/** Longest id the kernel accepts for a resource, a coverage or an allocation (`id` in schemas.ts). */
const KERNEL_ID_LENGTH = 120

type ToolPrice = CompositionPolicy['tools'][number]['prices'][number]

/**
 * What a price of a tool holds on a date: its value, or the diagnostic an allocation that names it gets, with the
 * reason. One reading for the composition, which prices with it, and for every list of the prices an allocation can
 * name (the candidates of a diagnostic, the scaffold of a demand, `resources inspect`), so none of them offers a
 * price the composition would then refuse.
 *
 * `live` are the catalog records in force on `asOf`. A price is usable when the policy states its value and that
 * value is in force, or when it reads a catalog resource that has exactly one record in force, with an amount, charged
 * by the month or by the year. `reason` is a rule, or the reason the policy itself declares for a pending price.
 */
export function readToolPrice(
  price: ToolPrice,
  live: readonly CatalogRecord[],
  asOf: string
):
  | { usable: true; value: NonNullable<ToolPrice['price']> }
  | {
      usable: false
      blocksWith:
        | 'RESOURCE_PRICE_PENDING'
        | 'CATALOG_RESOURCE_PRICE_REQUIRED'
        | 'UNSUPPORTED_TOOL_PRICE_UNIT'
        | 'RESOURCE_PRICE_NOT_EFFECTIVE'
      reason: string
    } {
  if (price.pendingReason) return { usable: false, blocksWith: 'RESOURCE_PRICE_PENDING', reason: price.pendingReason }

  let value = price.price

  if (price.catalogResourceId) {
    const candidates = live.filter(
      (r): r is PriceRecord => r.kind === 'resource' && r.value.resourceId === price.catalogResourceId
    )

    if (candidates.length !== 1 || candidates[0].value.amount === null)
      return {
        usable: false,
        blocksWith: 'CATALOG_RESOURCE_PRICE_REQUIRED',
        reason:
          'The price reads a catalog resource, and the catalog does not hold exactly one record of it in force on the date with an amount.'
      }

    const record = candidates[0]

    if (record.value.unit === 'once')
      return {
        usable: false,
        blocksWith: 'UNSUPPORTED_TOOL_PRICE_UNIT',
        reason: 'The catalog resource the price reads is charged once; a tool is priced by the month or by the year.'
      }

    value = {
      amount: record.value.amount!,
      currency: record.value.currency,
      unit: record.value.unit,
      source: record.source
    }
  }

  if (!value || !(value.source.effectiveFrom <= asOf && asOf <= value.source.effectiveUntil))
    return {
      usable: false,
      blocksWith: 'RESOURCE_PRICE_NOT_EFFECTIVE',
      reason: 'The value the policy states for the price is not in force on the date.'
    }

  return { usable: true, value }
}

/** Select and attribute work resources; the existing kernel remains the only selling-price calculator. */
export function composeResourceQuote(catalogRaw: unknown, policyRaw: unknown, creditsRaw: unknown, demandRaw: unknown) {
  const catalog = validateCatalog(catalogRaw)
  const policy = compositionPolicySchema.parse(policyRaw)
  const creditCatalog = creditCatalogSchema.parse(creditsRaw)
  const demand = compositionDemandSchema.parse(demandRaw)
  const diagnostics: Diagnostic[] = []

  const issue = (code: string, path: string, detail?: string, candidates?: string[]) =>
    diagnostics.push({ code, path, ...(candidates ? { candidates } : {}), ...(detail ? { detail } : {}) })

  // Demand entries one period at a time: an entry declared once for several periods is read as one per period.
  const allocations = eachPeriod(demand.allocations)
  const seatSharing = eachPeriod(demand.seatSharing ?? [])
  const creditDemandOf = new Map(demand.work.map(w => [w, eachPeriod(w.creditDemand)]))

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
  if (!effective(policy.source))
    issue(
      'RESOURCE_POLICY_NOT_EFFECTIVE',
      'policy.source',
      asOf < policy.source.effectiveFrom
        ? `The quote date is before the first date this resource policy is in force, which is ${policy.source.effectiveFrom}.`
        : `The quote date is after the last date this resource policy is in force, which is ${policy.source.effectiveUntil}.`
    )
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
    const creditDemand = creditDemandOf.get(w)!

    if (
      !unique(creditDemand.map(d => `${d.periodId}:${d.toolId}`)) ||
      creditDemand.some(
        d =>
          d.periodId > demand.brief.periods || !policy.tools.some(t => t.toolId === d.toolId && t.access === 'credits')
      )
    )
      issue('INVALID_CREDIT_DEMAND', w.lineId)
  }

  if (demand.serviceToolIds.some(id => !toolIds.includes(id))) issue('UNKNOWN_SERVICE_TOOL', 'serviceToolIds')
  // A tool may be held under several prices in one period (a seat bought for the year and one more by the month):
  // each is a holding of its own. The same price twice in a period declares the same holding twice.
  if (
    !unique(allocations.map(a => `${a.periodId}:${a.toolId}:${a.priceId}`)) ||
    !unique(demand.creditBudgets.map(a => `${a.periodId}:${a.toolId}`))
  )
    issue('DUPLICATE_RESOURCE_ALLOCATION', 'allocations')

  const holdingsOf = new Map<string, typeof allocations>()

  for (const a of allocations) {
    const key = `${a.periodId}:${a.toolId}`
    const held = holdingsOf.get(key) ?? []

    holdingsOf.set(key, held)
    if (!held.some(h => h.priceId === a.priceId)) held.push(a)
  }

  // Identity of what the kernel is handed. A tool the demand holds under one price per period keeps the id of the
  // tool, as it always had. A tool held under several prices in some period names each holding by its price, and
  // does so in every period: the kernel then sees one resource and one coverage per holding (it adds up the shares
  // of a coverage and accepts no more than the whole), and a seat bought for the year keeps one identity over the
  // term, which is what annual continuity (quote.ts) follows.
  const heldSeveral = new Set([...holdingsOf.values()].filter(held => held.length > 1).map(held => held[0].toolId))

  const holdingRef = (toolId: string, priceId: string) => (heldSeveral.has(toolId) ? `${toolId}:${priceId}` : toolId)
  const holdingSlot = (toolId: string, priceId: string) => (heldSeveral.has(toolId) ? `${toolId}-${priceId}` : toolId)

  const holdingPath = (a: { periodId: number; toolId: string; priceId: string }) =>
    `${a.periodId}:${holdingRef(a.toolId, a.priceId)}`

  const sharingOf = new Map<string, typeof seatSharing>()

  for (const s of seatSharing) {
    const key = `${s.periodId}:${s.toolId}`

    sharingOf.set(key, [...(sharingOf.get(key) ?? []), s])
  }

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

  // What the offer is sold as is a fact of the catalog, bound by resolution when the catalog states it. A demand
  // that declares another unit would calculate all the same and then be presented as what it is not: a managed
  // service printed line by line, or a person sold as a fee. A catalog that does not say holds the demand to nothing.
  const offer = resolution.bindings.find(b => b.purpose === 'offer')?.record

  if (offer?.kind === 'offer' && offer.value.commercialUnit !== demand.commercialUnit)
    issue(
      'COMMERCIAL_UNIT_CONTRADICTS_OFFER',
      'commercialUnit',
      `The demand declares ${demand.commercialUnit} and the catalog sells this offer as ${offer.value.commercialUnit} (record ${offer.recordId}, revision ${offer.revision}).`
    )
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
    /**
     * Seats of a named tool in the period, over every holding of it: people who need one (a group that shares counts
     * once), seats paid one by one, and of those the ones declared idle. Present only when the period declares idle
     * or shared seats or holds the tool under several prices; the same on each holding of the tool in the period.
     */
    seats?: {
      needed: number
      paid: string
      idle: number
      packageCapacity?: number
      shared: { assigneeIds: string[]; reason: string }[]
    }
    /** Seats of this holding nobody uses in the period, and their part of `attributedMonthlyCost`. */
    idle?: { seats: number; reason: string; attributedMonthlyCost: string }
    /** Only when nobody uses the tool in the period: the lines the demand names to bear the cost of its seats. */
    bornByLineIds?: string[]
    /** Evidence of the allocation, as the demand declares it. Present only when it does. */
    evidence?: Resource['source']
  }[] = []

  const budgets: { periodId: number; toolId: string; result: ReturnType<typeof planCreditBudget> }[] = []
  const usedAllocations = new Set<string>()
  const usedSharing = new Set<string>()
  const usedBudgets = new Set<string>()
  const usedDemand = new Set<string>()
  const usedFx = new Set<string>()
  const usedClient = new Set<string>()
  const clientCoverages = eachPeriod(demand.clientProvidedTools ?? [])

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

    // One code for one requirement (confirmed evidence that covers the whole period, on lines named once); the
    // detail says which part of it fails, by rule and never by the dates or the reference the demand wrote.
    const failed = [
      ...(c.evidence.status !== 'confirmed' ? ['the evidence is not confirmed'] : []),
      ...(c.evidence.effectiveFrom > from
        ? [
            c.periodId === 1
              ? 'the evidence starts after the quote date, the first day period 1 has to be covered'
              : 'the evidence starts after the first day of the month of the period'
          ]
        : []),
      ...(c.evidence.effectiveUntil < until
        ? ['the evidence ends before the last day of the month of the period']
        : []),
      ...(!unique(c.lineIds) ? ['lineIds names a line more than once'] : [])
    ]

    if (failed.length) issue('CLIENT_ACCESS_EVIDENCE_REQUIRED', c.toolId, `Period ${c.periodId}: ${failed.join('; ')}.`)
  }

  for (const period of resolution.inputs) {
    const { snapshot, request } = period.input
    const selected = new Map<string, Consumer[]>()

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

        const d = (w ? creditDemandOf.get(w)! : []).find(
          d => d.periodId === period.periodId && d.toolId === tool.toolId
        )

        if (d) usedDemand.add(`${line.lineId}:${d.periodId}:${d.toolId}`)
        if (tool.access === 'credits' && !d)
          issue('CREDIT_DEMAND_REQUIRED', `${period.periodId}:${line.lineId}:${tool.toolId}`)
        const users = selected.get(tool.toolId) ?? []

        users.push({ lineId: line.lineId, assignees: w?.assigneeIds ?? [], credits: d?.credits ?? 0 })
        selected.set(tool.toolId, users)
      }
    }

    // Tools somebody uses in the period, and after them the tools nobody uses whose seats the demand declares idle:
    // a seat paid in a month in which its person does not work is still a cost of the quote, and the demand says who
    // bears it. An allocation nobody uses and that declares nothing idle stays what it was: unused.
    const idleOnly = [
      ...new Set(
        allocations
          .filter(
            a =>
              a.periodId === period.periodId &&
              !selected.has(a.toolId) &&
              (a.idleSeats !== undefined || a.bornByLineIds !== undefined)
          )
          .map(a => a.toolId)
      )
    ].filter(id => policy.tools.some(t => t.toolId === id && t.access !== 'credits'))

    for (const [toolId, consumers] of [...selected, ...idleOnly.map((id): [string, Consumer[]] => [id, []])]) {
      const tool = policy.tools.find(t => t.toolId === toolId)!
      const key = `${period.periodId}:${toolId}`
      const consumerIds = [...new Set(consumers.flatMap(c => c.assignees))].sort()
      const groups = consumers.length ? (sharingOf.get(key) ?? []) : []

      // One entry per resource handed to the kernel: the pooled credit budget of a provider, or each holding of a tool.
      const placements: {
        path: string
        slot: string
        priceId: string
        resource: Resource
        quantity: string
        serviceShare: string
        reason: string
        driver: unknown
        bearers: { lineId: string; weight: Decimal }[]
        described: Pick<(typeof attributions)[number], 'seats' | 'idle' | 'bornByLineIds' | 'evidence'>
      }[] = []

      if (groups.length) {
        usedSharing.add(key)

        if (tool.access !== 'named') {
          issue('INVALID_SEAT_SHARING', key, 'Only a tool with named seats has a seat to share.')
          continue
        }
      }

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

        placements.push({
          path: key,
          slot: toolId,
          priceId: creditCatalog.version,
          resource: {
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
          },
          quantity: '1',
          serviceShare: '1',
          reason:
            'Pooled provider/month budget; cost distributed by declared credit demand, including whole extra packages.',
          driver: { unit: 'provider-credit-demand', totalUnits: consumers.reduce((s, c) => s + c.credits, 0) },
          bearers: consumers.map(c => ({ lineId: c.lineId, weight: new D(c.credits) })),
          described: {}
        })
      } else {
        // With nobody using the tool, only the holdings that declare their seats idle are read; the rest are unused.
        const declared = (holdingsOf.get(key) ?? []).filter(
          a => consumers.length || a.idleSeats !== undefined || a.bornByLineIds !== undefined
        )

        // Prices of the tool an allocation can name: the ones that hold a value in force on the quote date, by the
        // id the policy gives them.
        const usablePrices = tool.prices.filter(p => readToolPrice(p, live, asOf).usable).map(p => p.priceId)

        if (!declared.length) {
          issue(
            'RESOURCE_ALLOCATION_REQUIRED',
            key,
            'The work of the period uses this tool and the demand declares no allocation of it: declare one for the period under one of the candidate prices.',
            usablePrices
          )
          continue
        }

        // A bundle is counted twice when the SAME person or line is charged the plan and a tool the plan already
        // includes. Two people on different plans of one vendor (a designer on the full suite, a community manager
        // on the light product) is the normal shape of a mixed team, not a double count.
        const holders = new Set(consumers.flatMap(c => [`line:${c.lineId}`, ...c.assignees.map(a => `person:${a}`)]))

        const held: {
          allocation: (typeof declared)[number]
          path: string
          price: (typeof tool.prices)[number]
          value: NonNullable<(typeof tool.prices)[number]['price']>
        }[] = []

        // Each holding is read on its own, as a single allocation always was: the first thing wrong with it is
        // reported and the tool is left out of the period. Every holding is read, so each says what is wrong with it.
        for (const allocation of declared) {
          const path = holdingPath(allocation)

          usedAllocations.add(`${key}:${allocation.priceId}`)

          const expectedShare = new D(allocation.driver.allocatedUnits)
            .div(allocation.driver.totalUnits)
            .toDecimalPlaces(18, D.ROUND_DOWN)

          if (
            new D(allocation.driver.allocatedUnits).gt(allocation.driver.totalUnits) ||
            !new D(allocation.serviceShare).eq(expectedShare)
          ) {
            issue('ALLOCATION_DRIVER_MISMATCH', path)
            continue
          }

          const price = tool.prices.find(p => p.priceId === allocation.priceId)

          if (!price) {
            issue(
              'RESOURCE_PRICE_SELECTION_REQUIRED',
              path,
              'The allocation names a price this tool does not have: name one of the candidate prices.',
              usablePrices
            )
            continue
          }

          if (
            price.bundledToolIds?.some(id =>
              (selected.get(id) ?? []).some(
                c => holders.has(`line:${c.lineId}`) || c.assignees.some(a => holders.has(`person:${a}`))
              )
            )
          ) {
            issue('BUNDLED_TOOL_DOUBLE_COUNT', path)
            continue
          }

          if (tool.access === 'named' && !new D(allocation.quantity).isInteger()) {
            issue('WHOLE_NAMED_LICENSE_REQUIRED', path)
            continue
          }

          const read = readToolPrice(price, live, asOf)

          if (!read.usable) {
            issue(read.blocksWith, path, read.reason)
            continue
          }

          const { value } = read

          // An idle seat is a seat: only a named tool sold by the seat has one to declare, and no more than it pays.
          if (
            allocation.idleSeats !== undefined &&
            (tool.access !== 'named' || price.basis !== 'seat' || new D(allocation.quantity).lt(allocation.idleSeats))
          ) {
            issue(
              'INVALID_IDLE_SEATS',
              path,
              'Idle seats are declared on a named tool priced per seat, up to the seats the entry pays.'
            )
            continue
          }

          // The kernel bounds its ids. A holding named by tool and price that would not fit says so here, by period
          // and tool, instead of reaching the kernel as an input it rejects.
          if (
            `composed:${holdingRef(toolId, price.priceId)}`.length > KERNEL_ID_LENGTH ||
            `composed-${holdingSlot(toolId, price.priceId)}-${request.lines.length}`.length > KERNEL_ID_LENGTH
          ) {
            issue(
              'RESOURCE_HOLDING_ID_TOO_LONG',
              path,
              `A tool held under several prices is named by tool and price; together they exceed ${KERNEL_ID_LENGTH} characters.`
            )
            continue
          }

          held.push({ allocation, path, price, value })
        }

        if (held.length !== declared.length) continue

        // People who share a seat count as one seat between them, and each carries that fraction of it.
        const sharedBy = new Map(groups.flatMap(g => g.assigneeIds.map(id => [id, g.assigneeIds.length] as const)))

        if (
          groups.some(g => !unique(g.assigneeIds) || g.assigneeIds.some(id => !consumerIds.includes(id))) ||
          !unique(groups.flatMap(g => g.assigneeIds))
        ) {
          issue(
            'INVALID_SEAT_SHARING',
            key,
            'Every person of a group uses the tool in the period and belongs to one group at most.'
          )
          continue
        }

        const seatPriced = held.filter(h => h.price.basis === 'seat')
        const packaged = held.filter(h => h.price.basis === 'package')
        const needed = consumerIds.filter(id => !sharedBy.has(id)).length + groups.length
        const paid = seatPriced.reduce((s, h) => s.plus(h.allocation.quantity), new D(0))
        const idle = held.reduce((s, h) => s + (h.allocation.idleSeats ?? 0), 0)
        const capacity = packaged.reduce((s, h) => s + (h.allocation.seatCapacity ?? 0), 0)
        const inUse = paid.minus(idle)

        // Seat accounting of a named tool, over every holding of it in the period. A seat paid one by one is used,
        // shared or declared idle: one short is a person without a seat, one over is a seat paid that the demand
        // does not account for. A package is capacity: it has to reach, with the seats in use, the people who need
        // one. An idle seat is nobody's, so it is never counted as capacity for somebody.
        if (tool.access === 'named') {
          // Counts only: how many people need a seat and how many seats the demand provides, never who they are.
          if (packaged.some(h => !h.allocation.seatCapacity)) {
            issue(
              'INSUFFICIENT_NAMED_SEAT_CAPACITY',
              key,
              'A holding of this tool priced as a package declares no seatCapacity, so the people it seats cannot be counted: declare how many people the package seats.'
            )
            continue
          }

          if (inUse.plus(capacity).lt(needed)) {
            issue(
              'INSUFFICIENT_NAMED_SEAT_CAPACITY',
              key,
              `${needed} seats are needed in the period (one per person who uses the tool, a group that shares a seat counted once) and the demand provides ${inUse.plus(capacity)}: ${inUse} paid one by one and in use, ${capacity} of package capacity (seatCapacity). Declare the seats that are missing.`
            )
            continue
          }

          if (inUse.gt(needed)) {
            issue(
              'UNACCOUNTED_NAMED_SEATS',
              key,
              `${paid} seats are paid, ${idle} declared idle and ${needed} needed: every paid seat is used, shared (seatSharing) or declared idle (idleSeats, with its reason).`
            )
            continue
          }
        }

        // Who bears a holding. With people using the tool, the lines that use it, by seat weight; `bornByLineIds`
        // is then a second answer to a question the use already answers. With nobody, the lines the demand names.
        const bearerIssue = held.flatMap(({ allocation, path }) => {
          const named = allocation.bornByLineIds

          if (consumers.length)
            return named
              ? [
                  {
                    code: 'IDLE_SEAT_BEARER_NOT_ALLOWED',
                    path,
                    detail:
                      'The tool has users in the period: its cost, idle seats included, goes to the lines that use it.'
                  }
                ]
              : []

          // Reached with every seat of the holding declared idle (the accounting above), or with a holding that
          // has no seat to declare: a package or a shared tool nobody uses is an unused allocation, not an idle seat.
          if (allocation.idleSeats === undefined)
            return [
              {
                code: 'IDLE_SEAT_BEARER_NOT_ALLOWED',
                path,
                detail: 'bornByLineIds bears seats declared idle on a named tool priced per seat, and nothing else.'
              }
            ]

          if (!named)
            return [
              {
                code: 'IDLE_SEAT_BEARER_REQUIRED',
                path,
                detail:
                  'Nobody uses the tool in the period: name in bornByLineIds the lines that bear the cost of its idle seats.'
              }
            ]

          return unique(named) && named.every(id => request.lines.some(l => l.lineId === id))
            ? []
            : [
                {
                  code: 'INVALID_IDLE_SEAT_BEARER',
                  path,
                  detail: 'bornByLineIds names, once each, lines of the quote that are active in the period.'
                }
              ]
        })

        if (bearerIssue.length) {
          bearerIssue.forEach(i => issue(i.code, i.path, i.detail))
          continue
        }

        // Seats a contract has to hold for this holding: what it pays one by one, or what its package has to seat.
        const contractSeats = (h: (typeof held)[number]) =>
          tool.access !== 'named'
            ? new D(consumerIds.length)
            : h.price.basis === 'seat'
              ? new D(h.allocation.quantity)
              : D.max(0, new D(needed).minus(inUse).minus(capacity - (h.allocation.seatCapacity ?? 0)))

        const capacityIssue = held.flatMap((h): { code: string; path: string; detail?: string }[] => {
          const { allocation, price, path } = h

          // The seats the contract of this price has to hold: the minimum the plan is sold with, and no fewer than
          // the seats this holding has to seat. Both are counts the policy and the demand state.
          const required = price.minimumContractSeats ? D.max(price.minimumContractSeats, contractSeats(h)) : null

          if (required && (!allocation.contractSeatCount || new D(allocation.contractSeatCount).lt(required)))
            return [
              {
                code: 'TEAM_CONTRACT_CAPACITY_REQUIRED',
                path,
                detail: `This price is sold under a contract of at least ${price.minimumContractSeats} seats (minimumContractSeats of the policy) and the holding has to seat ${contractSeats(h)} in the period: ${
                  allocation.contractSeatCount
                    ? 'the contractSeatCount the allocation declares is under that'
                    : 'the allocation declares no contractSeatCount'
                }. Declare contractSeatCount with the seats the contract holds, at least ${required}.`
              }
            ]

          if (
            price.includedSeats &&
            (!allocation.seatCapacity || allocation.seatCapacity > price.includedSeats * Number(allocation.quantity))
          )
            return [{ code: 'PACKAGE_SEAT_CAPACITY_EXCEEDED', path }]

          return []
        })

        if (capacityIssue.length) {
          capacityIssue.forEach(i => issue(i.code, i.path, i.detail))
          continue
        }

        // The cost of every holding of the tool is distributed alike, so the tool is one pool whatever it is bought
        // as. A person counted across several functions contributes one seat, divided across those functions; a
        // person who shares a seat contributes their part of it. The cost of an idle seat is in the pool.
        const users = consumers.map(c => ({
          lineId: c.lineId,
          weight: c.assignees.reduce(
            (s, id) =>
              s.plus(
                new D(1).div(new D(sharedBy.get(id) ?? 1).mul(consumers.filter(x => x.assignees.includes(id)).length))
              ),
            new D(0)
          )
        }))

        const seats =
          tool.access === 'named' && (groups.length || idle || held.length > 1)
            ? {
                needed,
                paid: paid.toString(),
                idle,
                ...(packaged.length ? { packageCapacity: capacity } : {}),
                shared: groups.map(g => ({ assigneeIds: [...g.assigneeIds].sort(), reason: g.reason }))
              }
            : undefined

        for (const { allocation, path, price, value } of held) {
          const monthly = new D(value.amount).mul(allocation.serviceShare).div(value.unit === 'year' ? 12 : 1)

          placements.push({
            path,
            slot: holdingSlot(toolId, price.priceId),
            priceId: price.priceId,
            resource: {
              ...value,
              resourceId: `composed:${holdingRef(toolId, price.priceId)}`,
              // Two holdings of one tool are told apart in every reading by what they are bought as.
              label: heldSeveral.has(toolId) ? `${tool.label} (${price.priceId})` : tool.label,
              kind: 'tool',
              scope: 'account',
              covers: [`tool:${holdingRef(toolId, price.priceId)}`]
            },
            quantity: allocation.quantity,
            serviceShare: allocation.serviceShare,
            reason: allocation.reason,
            driver: allocation.driver,
            bearers: consumers.length ? users : allocation.bornByLineIds!.map(lineId => ({ lineId, weight: new D(1) })),
            described: {
              ...(seats ? { seats } : {}),
              ...(allocation.idleSeats !== undefined
                ? {
                    idle: {
                      seats: allocation.idleSeats,
                      reason: allocation.idleReason!,
                      attributedMonthlyCost: monthly.mul(allocation.idleSeats).toString()
                    }
                  }
                : {}),
              ...(consumers.length ? {} : { bornByLineIds: [...allocation.bornByLineIds!] }),
              ...(allocation.evidence ? { evidence: allocation.evidence } : {})
            }
          })

          // The work of these lines does not need the tool; they carry a seat nobody uses, and the row says so.
          if (!consumers.length)
            for (const lineId of allocation.bornByLineIds!)
              selections
                .find(s => s.periodId === period.periodId && s.lineId === lineId && s.toolId === toolId)
                ?.reasons.push(`bears-idle-seat:${allocation.idleReason}`)
        }
      }

      for (const {
        path,
        slot,
        priceId,
        resource,
        quantity,
        serviceShare,
        reason,
        driver,
        bearers,
        described
      } of placements) {
        if (!snapshot.currencies.some(c => c.code === resource.currency))
          issue('RESOURCE_CURRENCY_NOT_CONFIGURED', path)

        if (resource.currency !== snapshot.calculationCurrency) {
          const matches = live.filter(
            (r): r is Extract<CatalogRecord, { kind: 'fx' }> =>
              r.kind === 'fx' &&
              demand.fxRecordIds.includes(r.recordId) &&
              r.value.from === resource.currency &&
              r.value.to === snapshot.calculationCurrency
          )

          if (matches.length !== 1) issue('RESOURCE_FX_SELECTION_REQUIRED', path)
          else {
            const previous = snapshot.fx.find(
              f => f.from === resource.currency && f.to === snapshot.calculationCurrency
            )

            if (
              previous &&
              (previous.rate !== matches[0].value.rate || previous.source.reference !== matches[0].source.reference)
            )
              issue('RESOURCE_FX_CONFLICT', path)
            if (!previous) snapshot.fx.push({ ...matches[0].value, source: matches[0].source })
            usedFx.add(matches[0].recordId)
          }
        }

        const weightTotal = bearers.reduce((s, b) => s.plus(b.weight), new D(0))

        if (!weightTotal.gt(0)) {
          issue('RESOURCE_CONSUMERS_REQUIRED', path)
          continue
        }

        snapshot.resources.push(resource)
        let distributed = new D(0)

        const assignments = bearers.map((b, i) => {
          const share =
            i === bearers.length - 1
              ? new D(serviceShare).minus(distributed)
              : b.weight.div(weightTotal).mul(serviceShare).toDecimalPlaces(18, D.ROUND_DOWN)

          distributed = distributed.plus(share)
          const line = request.lines.find(l => l.lineId === b.lineId)!

          line.assignments.push({
            resourceId: resource.resourceId,
            allocationId: `composed-${slot}-${i}`,
            scope: 'account',
            scopeRef: demand.brief.accountId,
            quantity,
            share: share.toString(),
            cashTiming: resource.unit === 'month' ? 'monthly' : 'start'
          })
          snapshot.profiles.find(p => p.profileId === line.profileId)!.requiredCoverages.push(resource.covers[0])

          return {
            lineId: b.lineId,
            share: share.toString(),
            attributedCost: new D(resource.amount)
              .mul(quantity)
              .mul(share)
              .div(resource.unit === 'year' ? 12 : 1)
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
          assignments,
          ...described
        })
      }
    }
  }

  // When resolution built no period at all (a quote dated before its catalog, an offer with no policy in force),
  // nothing of the demand was read: reporting each of its entries as unused would bury the cause, which resolution
  // already named, under its consequences. An entry is unused only against periods that were walked.
  const nothingResolved = resolution.inputs.length === 0

  if (!nothingResolved) {
    for (const a of allocations)
      if (!usedAllocations.has(`${a.periodId}:${a.toolId}:${a.priceId}`))
        issue('UNUSED_RESOURCE_ALLOCATION', holdingPath(a))
    for (const s of seatSharing)
      if (!usedSharing.has(`${s.periodId}:${s.toolId}`)) issue('UNUSED_SEAT_SHARING', `${s.periodId}:${s.toolId}`)
    for (const b of demand.creditBudgets)
      if (!usedBudgets.has(`${b.periodId}:${b.toolId}`)) issue('UNUSED_CREDIT_BUDGET', `${b.periodId}:${b.toolId}`)
    for (const w of demand.work)
      for (const d of creditDemandOf.get(w)!)
        if (!usedDemand.has(`${w.lineId}:${d.periodId}:${d.toolId}`))
          issue('UNUSED_CREDIT_DEMAND', `${w.lineId}:${d.periodId}:${d.toolId}`)
    for (const id of demand.fxRecordIds) if (!usedFx.has(id)) issue('UNUSED_FX_SELECTION', id)
    for (const c of clientCoverages)
      for (const lineId of c.lineIds)
        if (!usedClient.has(`${c.periodId}:${c.toolId}:${lineId}`))
          issue('UNUSED_CLIENT_TOOL_COVERAGE', `${c.periodId}:${c.toolId}:${lineId}`)
  }

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
