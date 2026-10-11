import Decimal from 'decimal.js'
import { z } from 'zod'

import { activeRecords, validateCatalog } from '../catalog/catalog'
import { briefSchema } from '../catalog/contracts'
import { PricingV3Error } from '../errors'
import { compositionDemandSchema, compositionPolicySchema } from './composition-contracts'
import { composeResourceQuote } from './composition'
import { creditCatalogSchema } from './credit-budget'
import { reviewResourcePrices } from './price-review'

const D = Decimal.clone({ precision: 80 })
const id = z.string().min(1).max(80)
const decimal = z.string().regex(/^(0|[1-9]\d{0,12})(\.\d{1,18})?$/)
const positive = decimal.refine(v => new D(v).gt(0))

export const portfolioSchema = z
  .object({
    schemaVersion: z.literal('pricing-v3-resource-portfolio/1'),
    version: id,
    mode: z.enum(['declared', 'simulation']),
    resources: z
      .array(
        z
          .object({
            periodId: z.number().int().min(1).max(60),
            toolId: id,
            priceId: id,
            quantity: positive,
            seatCapacity: z.number().int().min(1).max(10000).optional(),
            contractSeatCount: z.number().int().min(1).max(10000).optional(),
            driverUnit: id,
            totalUnits: positive,
            internalUnits: decimal,
            unallocatedUnits: decimal,
            accounts: z
              .array(z.object({ accountId: id, units: positive }).strict())
              .min(1)
              .max(1000),
            reason: z.string().min(1).max(1000)
          })
          .strict()
      )
      .min(1)
      .max(6000)
  })
  .strict()

/** Allocations describe attributable cost; they do not share credentials or reserve capacity. */
export function allocateResourcePortfolio(raw: unknown, policyRaw: unknown, catalogRaw?: unknown, asOf?: string) {
  const portfolio = portfolioSchema.parse(raw)
  const policy = compositionPolicySchema.parse(policyRaw)

  if (asOf) briefSchema.shape.quoteDate.parse(asOf)
  const live = catalogRaw && asOf ? activeRecords(validateCatalog(catalogRaw), asOf) : []
  const diagnostics: { code: string; path: string }[] = []
  const seen = new Set<string>()

  const allocations: {
    accountId: string
    allocation: z.infer<typeof compositionDemandSchema>['allocations'][number]
  }[] = []

  const reconciliation: {
    toolId: string
    periodId: number
    totalUnits: string
    clientUnits: string
    internalUnits: string
    unallocatedUnits: string
    roundingResidualShare: string
    monthlyCost: null | {
      currency: string
      full: string
      accounts: { accountId: string; cost: string }[]
      internal: string
      unallocated: string
      roundingResidual: string
    }
  }[] = []

  for (const r of portfolio.resources) {
    const key = `${r.periodId}:${r.toolId}`
    const tool = policy.tools.find(t => t.toolId === r.toolId)
    const price = tool?.prices.find(p => p.priceId === r.priceId)

    if (seen.has(key)) diagnostics.push({ code: 'DUPLICATE_PORTFOLIO_RESOURCE', path: key })
    seen.add(key)
    if (!tool || !price || tool.access === 'credits')
      diagnostics.push({ code: 'INVALID_PORTFOLIO_TOOL_PRICE', path: key })
    // A portfolio pool is a package. A seat must be attributed to its named user, not diluted over unrelated users.
    if (tool?.access === 'named' && price?.basis === 'seat')
      diagnostics.push({ code: 'NAMED_SEAT_REQUIRES_USER_ALLOCATION', path: key })
    if (new Set(r.accounts.map(a => a.accountId)).size !== r.accounts.length)
      diagnostics.push({ code: 'DUPLICATE_PORTFOLIO_ACCOUNT', path: key })
    const clients = r.accounts.reduce((s, a) => s.plus(a.units), new D(0))

    if (!clients.plus(r.internalUnits).plus(r.unallocatedUnits).eq(r.totalUnits))
      diagnostics.push({ code: 'PORTFOLIO_UNITS_NOT_RECONCILED', path: key })
    let attributed = new D(0)

    for (const a of r.accounts) {
      const serviceShare = new D(a.units).div(r.totalUnits).toDecimalPlaces(18, D.ROUND_DOWN)

      if (serviceShare.isZero()) diagnostics.push({ code: 'ALLOCATION_SHARE_BELOW_PRECISION', path: key })
      attributed = attributed.plus(serviceShare)
      allocations.push({
        accountId: a.accountId,
        allocation: {
          periodId: r.periodId,
          toolId: r.toolId,
          priceId: r.priceId,
          quantity: r.quantity,
          ...(r.seatCapacity ? { seatCapacity: r.seatCapacity } : {}),
          ...(r.contractSeatCount ? { contractSeatCount: r.contractSeatCount } : {}),
          serviceShare: serviceShare.toString(),
          driver: { unit: r.driverUnit, totalUnits: r.totalUnits, allocatedUnits: a.units },
          reason: `Portfolio ${portfolio.version} (${portfolio.mode}): ${r.reason}`
        }
      })
    }

    const internalShare = new D(r.internalUnits).div(r.totalUnits)
    const unallocatedShare = new D(r.unallocatedUnits).div(r.totalUnits)
    const reference = live.filter(v => v.kind === 'resource' && v.value.resourceId === price?.catalogResourceId)
    const record = reference.length === 1 && reference[0].kind === 'resource' ? reference[0] : null
    const value = price?.price ?? (record ? { ...record.value, source: record.source } : null)

    const usable =
      value &&
      value.amount !== null &&
      value.unit !== 'once' &&
      (!asOf || (value.source.effectiveFrom <= asOf && asOf <= value.source.effectiveUntil))

    const full = usable ? new D(value.amount!).times(r.quantity).div(value.unit === 'year' ? 12 : 1) : null

    const costs = full
      ? r.accounts.map(a => ({
          accountId: a.accountId,
          cost: full.times(new D(a.units).div(r.totalUnits).toDecimalPlaces(18, D.ROUND_DOWN)).toString()
        }))
      : []

    reconciliation.push({
      toolId: r.toolId,
      periodId: r.periodId,
      totalUnits: r.totalUnits,
      clientUnits: clients.toString(),
      internalUnits: r.internalUnits,
      unallocatedUnits: r.unallocatedUnits,
      roundingResidualShare: new D(1).minus(attributed).minus(internalShare).minus(unallocatedShare).toString(),
      monthlyCost:
        full && value
          ? {
              currency: value.currency,
              full: full.toString(),
              accounts: costs,
              internal: full.times(internalShare).toString(),
              unallocated: full.times(unallocatedShare).toString(),
              roundingResidual: full
                .minus(costs.reduce((s, a) => s.plus(a.cost), new D(0)))
                .minus(full.times(internalShare))
                .minus(full.times(unallocatedShare))
                .toString()
            }
          : null
    })
  }

  return {
    status: diagnostics.length ? 'needs_input' : 'prepared',
    binding: false,
    version: portfolio.version,
    mode: portfolio.mode,
    diagnostics,
    reconciliation,
    allocations: diagnostics.length ? [] : allocations
  }
}

/** Queryable policy/catalog inventory; source classification is not an invoice or access grant. */
export function inspectOperatingResources(
  catalogRaw: unknown,
  policyRaw: unknown,
  asOf: string,
  query = '',
  creditsRaw?: unknown
) {
  briefSchema.shape.quoteDate.parse(asOf)
  const catalog = validateCatalog(catalogRaw)
  const policy = compositionPolicySchema.parse(policyRaw)
  const live = activeRecords(catalog, asOf)

  const review = reviewResourcePrices(policy, asOf, {
    catalog,
    ...(creditsRaw === undefined ? {} : { credits: creditCatalogSchema.parse(creditsRaw) })
  })

  const normalized = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()

  const matches = (v: unknown) => normalized(JSON.stringify(v)).includes(normalized(query))

  return {
    schemaVersion: 'pricing-v3-resource-discovery/1',
    binding: false,
    catalogVersion: catalog.version,
    policyVersion: policy.version,
    asOf,
    mode: policy.mode,
    policyEffective: policy.source.effectiveFrom <= asOf && asOf <= policy.source.effectiveUntil,
    platformFees: live.filter(r => r.kind === 'resource' && r.value.kind === 'platform_fee').filter(matches),
    profiles: live
      .filter(r => r.kind === 'profile')
      .map(r => {
        if (r.kind !== 'profile') throw new PricingV3Error('INVALID_PROFILE')
        const rule = policy.profileTasks.find(p => p.profileId === r.value.profileId)

        return { ...r.value, resourceRuleStatus: rule ? 'review_rule' : 'missing', tasks: rule?.tasks ?? [] }
      })
      .filter(matches),
    tools: policy.tools
      .map(t => ({
        ...t,
        common: policy.commonToolIds.includes(t.toolId),
        prices: t.prices.map(p => {
          const reference = p.catalogResourceId
            ? live.filter(r => r.kind === 'resource' && r.value.resourceId === p.catalogResourceId)
            : []

          const r = reference.length === 1 ? reference[0] : null

          return {
            ...p,
            resolved: p.price ?? (r?.kind === 'resource' ? { ...r.value, source: r.source } : null),
            availability:
              p.pendingReason ||
              (p.price && !(p.price.source.effectiveFrom <= asOf && asOf <= p.price.source.effectiveUntil)) ||
              (p.catalogResourceId && (r?.kind !== 'resource' || r.value.amount === null))
                ? 'needs_input'
                : 'reference_only'
          }
        })
      }))
      .filter(matches),
    // Dates to act on, read at `asOf`. A review date never blocks; a hard validity does once it has passed.
    priceReview: {
      withinDays: review.withinDays,
      reviewDue: review.reviewDue.filter(matches),
      dueSoon: review.dueSoon.filter(matches),
      expired: review.expired.filter(matches)
    },
    instructions:
      'Choose profile, tasks, plan and allocations explicitly. References do not establish purchased seats or operational readiness.'
  }
}

/** Generate an editable demand and questions. Never choose a plan or invent an allocation denominator. */
export function scaffoldResourceDemand(catalogRaw: unknown, policyRaw: unknown, briefRaw: unknown) {
  const brief = briefSchema.parse(briefRaw)
  const discovery = inspectOperatingResources(catalogRaw, policyRaw, brief.quoteDate)
  const policy = compositionPolicySchema.parse(policyRaw)
  const questions: { code: string; path: string; prompt: string; candidates?: string[] }[] = []

  const work = brief.lines.map(line => {
    const candidates = discovery.profiles.filter(
      p => p.profileId === line.profile || p.aliases.includes(line.profile) || p.label === line.profile
    )

    const profile = candidates.length === 1 ? candidates[0] : null

    if (!profile)
      questions.push({
        code: 'PROFILE_SELECTION_REQUIRED',
        path: line.lineId,
        prompt: 'Choose the exact profile/variant.',
        candidates: candidates.map(p => p.profileId)
      })
    questions.push({
      code: 'WORK_TASKS_AND_USERS_REQUIRED',
      path: line.lineId,
      prompt:
        'Confirm work tasks and replace planning slots with stable anonymous user IDs. Select AI only if justified.'
    })

    return {
      lineId: line.lineId,
      assigneeIds: Array.from({ length: line.headcount }, (_, i) => `planned-${line.lineId}-${i + 1}`),
      tasks: profile?.tasks ?? [],
      aiToolIds: [],
      creditDemand: []
    }
  })

  const demand = compositionDemandSchema.parse({
    schemaVersion: 'pricing-v3-composition-demand/1',
    commercialUnit: 'role_capacity',
    brief,
    work,
    serviceToolIds: [],
    allocations: [],
    creditBudgets: [],
    fxRecordIds: []
  })

  const toolIds = [
    ...new Set(
      work.flatMap(w => [
        ...policy.commonToolIds,
        ...policy.tools.filter(t => t.tasks.some(task => w.tasks.includes(task))).map(t => t.toolId)
      ])
    )
  ]

  for (const toolId of toolIds)
    questions.push({
      code: 'TOOL_PLAN_AND_ALLOCATION_REQUIRED',
      path: toolId,
      prompt: 'Select priceId, quantity, named access/capacity and declared allocation for every active period.',
      candidates: policy.tools.find(t => t.toolId === toolId)?.prices.map(p => p.priceId)
    })

  return {
    status: 'needs_input',
    binding: false,
    demand,
    questions,
    note: 'Planning slots are not existing users or purchased seats. Confirm commercialUnit and service scope; no implicit service recipe.'
  }
}

export const operatingPlanSchema = z
  .object({
    schemaVersion: z.literal('pricing-v3-operating-plan/1'),
    demand: compositionDemandSchema,
    portfolio: portfolioSchema.optional()
  })
  .strict()

export function prepareOperatingPlan(catalog: unknown, policy: unknown, credits: unknown, raw: unknown) {
  const input = operatingPlanSchema.parse(raw)
  const demand = structuredClone(input.demand)

  const portfolio = input.portfolio
    ? allocateResourcePortfolio(input.portfolio, policy, catalog, demand.brief.quoteDate)
    : null

  if (portfolio?.status === 'needs_input')
    return {
      status: 'needs_input',
      binding: false,
      demand: null,
      composition: null,
      portfolio,
      questions: portfolio.diagnostics
    }
  const duplicates: { code: string; path: string }[] = []

  for (const a of portfolio?.allocations ?? []) {
    if (a.accountId !== demand.brief.accountId) continue
    if (demand.allocations.some(x => x.periodId === a.allocation.periodId && x.toolId === a.allocation.toolId))
      duplicates.push({ code: 'ALLOCATION_INPUT_CONFLICT', path: a.allocation.toolId })
    else demand.allocations.push(a.allocation)
  }

  if (duplicates.length)
    return { status: 'needs_input', binding: false, demand: null, composition: null, portfolio, questions: duplicates }
  const composition = composeResourceQuote(catalog, policy, credits, demand)

  return {
    status: composition.quote.calculationStatus,
    binding: false,
    demand,
    composition,
    portfolio,
    questions: composition.quote.diagnostics.map(d => ({
      ...d,
      prompt: d.detail ?? `Complete ${d.code} at ${d.path}; consult resources inspect and the operator evidence.`
    }))
  }
}
