import Decimal from 'decimal.js'
import { z } from 'zod'

import { activeRecords, validateCatalog } from '../catalog/catalog'
import { COMMERCIAL_UNITS, briefSchema } from '../catalog/contracts'
import { PricingV3Error } from '../errors'
import { sourceSchema } from '../schemas'
import {
  PLANNING_SLOT_PREFIX,
  compositionDemandSchema,
  compositionPolicySchema,
  declaredOnce,
  periodsOf
} from './composition-contracts'
import { composeResourceQuote, readToolPrice } from './composition'
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
            reason: z.string().min(1).max(1000),
            // Evidence of the holding and of the units declared for it, handed as it is to every allocation the
            // portfolio yields (`allocations[].evidence` of a demand). Absent, those allocations carry none.
            evidence: sourceSchema.optional()
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

  // One allocation per resource, account and period: the portfolio is read period by period and stays that way here.
  const allocations: {
    accountId: string
    allocation: z.infer<typeof compositionDemandSchema>['allocations'][number] & { periodId: number }
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
          reason: `Portfolio ${portfolio.version} (${portfolio.mode}): ${r.reason}`,
          ...(r.evidence ? { evidence: r.evidence } : {})
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
            // The reading of the composition: `needs_input` is a price an allocation cannot name on this date.
            availability: readToolPrice(p, live, asOf).usable ? 'reference_only' : 'needs_input'
          }
        })
      }))
      .filter(matches),
    // Dates to act on, read at `asOf`. A review date never blocks; a hard validity does once it has passed, unless
    // another record in force answers for the one that ended: that one is history, listed under `superseded`.
    priceReview: {
      withinDays: review.withinDays,
      reviewDue: review.reviewDue.filter(matches),
      dueSoon: review.dueSoon.filter(matches),
      expired: review.expired.filter(matches),
      superseded: review.superseded.filter(matches)
    },
    instructions:
      'Choose profile, tasks, plan and allocations explicitly. References do not establish purchased seats or operational readiness.'
  }
}

/**
 * Generate an editable demand and questions. Never choose a plan or invent an allocation denominator.
 *
 * What the scaffold writes is what the composition reads, and nothing it would read otherwise:
 * - `work[].tasks` is left empty. The composition always applies the recipe of the profile of a line
 *   (`policy.profileTasks`) and adds `work[].tasks` to it: they are the tasks of this engagement BEYOND the recipe.
 *   Writing the recipe there would change nothing, and emptying it would not remove a task. The recipe is listed in
 *   the question of the line (`profileTasks`), and a task of it is left out only through `excludedProfileTasks`.
 * - `work[].assigneeIds` are planning slots, one per person of the line. A slot stays while nobody is assigned.
 * - The prices an allocation can name are the ones the composition would accept on the quote date (`candidates`).
 *   A price it would refuse is listed apart (`unavailablePrices`), with the diagnostic naming it gets and the reason.
 */
export function scaffoldResourceDemand(catalogRaw: unknown, policyRaw: unknown, briefRaw: unknown) {
  const brief = briefSchema.parse(briefRaw)
  const discovery = inspectOperatingResources(catalogRaw, policyRaw, brief.quoteDate)
  const policy = compositionPolicySchema.parse(policyRaw)
  const live = activeRecords(validateCatalog(catalogRaw), brief.quoteDate)

  const questions: {
    code: string
    path: string
    prompt: string
    candidates?: string[]
    /** Tasks the recipe of the profile of the line already applies; never written to `work[].tasks`. */
    profileTasks?: string[]
    /** Prices of the tool an allocation cannot name on the quote date: what naming one gets, and why. */
    unavailablePrices?: { priceId: string; blocksWith: string; reason: string }[]
  }[] = []

  // The recipe of each line, by the profile the scaffold could identify. It selects tools below exactly as the
  // composition will, and it is told to the caller; the demand itself carries none of it.
  const recipes = new Map<string, string[]>()

  const work = brief.lines.map(line => {
    const candidates = discovery.profiles.filter(
      p => p.profileId === line.profile || p.aliases.includes(line.profile) || p.label === line.profile
    )

    const profile = candidates.length === 1 ? candidates[0] : null

    recipes.set(line.lineId, profile?.tasks ?? [])

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
      prompt: `The recipe of the profile (profileTasks) is applied to this line without being written in the demand. Add to tasks only the tasks of this engagement beyond the recipe, and leave it empty when there are none; to leave a task of the recipe out, declare it in excludedProfileTasks with its reason. Each assigneeId is a planning slot (${PLANNING_SLOT_PREFIX}…): keep it while nobody is assigned, which the assessment then reports, and replace it with a stable anonymous id only when a specific person is assigned. Select AI tools only if justified.`,
      profileTasks: profile?.tasks ?? []
    })

    return {
      lineId: line.lineId,
      assigneeIds: Array.from({ length: line.headcount }, (_, i) => `${PLANNING_SLOT_PREFIX}${line.lineId}-${i + 1}`),
      tasks: [],
      aiToolIds: [],
      creditDemand: []
    }
  })

  // What the offer is sold as is a fact of the catalog (its `offer` record), never a default of this scaffold: a
  // managed service scaffolded as role capacity calculates and is then presented as a team with prices. When the
  // catalog states it, the demand carries it; when it does not, or two records in force cannot be ranked, the demand
  // carries no unit (`null`, which no quote accepts) and the question says who decides.
  const offers = live.flatMap(r => (r.kind === 'offer' && r.value.offerId === brief.offerId ? [r] : []))

  const commercialUnit = offers.length === 1 ? offers[0].value.commercialUnit : null

  if (!commercialUnit)
    questions.push({
      code: 'COMMERCIAL_UNIT_REQUIRED',
      path: 'commercialUnit',
      prompt: offers.length
        ? 'The catalog holds more than one record in force for this offer, so it does not say what the offer is sold as. Resolve the catalog; until then declare the commercial unit the operator confirms.'
        : 'The catalog does not say what this offer is sold as. Declare the commercial unit the operator confirms: managed_service is sold as one fee and never as its team; role_capacity is sold line by line.',
      candidates: [...COMMERCIAL_UNITS]
    })

  // Everything but the unit is validated as a demand; the unit is the catalog's, or the question above.
  const { schemaVersion, ...declared } = compositionDemandSchema.omit({ commercialUnit: true }).parse({
    schemaVersion: 'pricing-v3-composition-demand/1',
    brief,
    work,
    serviceToolIds: [],
    allocations: [],
    creditBudgets: [],
    fxRecordIds: []
  })

  // In the place a demand declares it, so a missing unit is the second thing read in the file.
  const demand = { schemaVersion, commercialUnit, ...declared }

  const toolIds = [
    ...new Set(
      work.flatMap(w => [
        ...policy.commonToolIds,
        ...policy.tools.filter(t => t.tasks.some(task => recipes.get(w.lineId)!.includes(task))).map(t => t.toolId)
      ])
    )
  ]

  for (const toolId of toolIds) {
    const prices = (policy.tools.find(t => t.toolId === toolId)?.prices ?? []).map(price => ({
      priceId: price.priceId,
      read: readToolPrice(price, live, brief.quoteDate)
    }))

    const unavailablePrices = prices.flatMap(({ priceId, read }) =>
      read.usable ? [] : [{ priceId, blocksWith: read.blocksWith, reason: read.reason }]
    )

    questions.push({
      code: 'TOOL_PLAN_AND_ALLOCATION_REQUIRED',
      path: toolId,
      prompt:
        'Select priceId, quantity, named access/capacity and declared allocation for every active period. `candidates` are the prices an allocation can name on the quote date; a price under `unavailablePrices` blocks the quote with the diagnostic listed there. Declare identical periods once with periodIds. A named tool priced per seat accounts for every paid seat: used, shared (seatSharing) or idle (idleSeats with idleReason). Declare in `evidence` where the allocation comes from; without confirmed evidence in force the assessment reports it.',
      candidates: prices.filter(({ read }) => read.usable).map(({ priceId }) => priceId),
      ...(unavailablePrices.length ? { unavailablePrices } : {})
    })
  }

  return {
    status: 'needs_input',
    binding: false,
    demand,
    questions,
    note: commercialUnit
      ? 'Planning slots are not existing users or purchased seats. commercialUnit is the one the catalog states for this offer; confirm the service scope: there is no implicit service recipe.'
      : 'Planning slots are not existing users or purchased seats. commercialUnit is not set: the catalog does not state it for this offer, and a demand without it is not quoted. Confirm it and the service scope; no implicit service recipe.'
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
  const fromPortfolio: NonNullable<typeof portfolio>['allocations'][number]['allocation'][] = []

  for (const a of portfolio?.allocations ?? []) {
    if (a.accountId !== demand.brief.accountId) continue
    if (demand.allocations.some(x => periodsOf(x).includes(a.allocation.periodId) && x.toolId === a.allocation.toolId))
      duplicates.push({ code: 'ALLOCATION_INPUT_CONFLICT', path: a.allocation.toolId })
    else fromPortfolio.push(a.allocation)
  }

  if (duplicates.length)
    return { status: 'needs_input', binding: false, demand: null, composition: null, portfolio, questions: duplicates }

  // The demand this plan writes declares periods that are the same once (`periodIds`), after what the caller
  // declared, which stays as it was written. It is the same demand as one entry per period.
  demand.allocations.push(...declaredOnce(fromPortfolio))
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
