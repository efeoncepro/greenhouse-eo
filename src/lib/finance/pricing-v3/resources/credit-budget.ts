import Decimal from 'decimal.js'
import { z } from 'zod'

import { pricingV3RequestSchema } from '../schemas'

const id = z.string().min(1).max(120)
const credits = z.number().int().min(0).max(1000000)
const positiveCredits = credits.refine(v => v > 0)
const amountPattern = /^(0|[1-9]\d{0,12})(\.\d{1,2})?$/

const amount = z
  .string()
  .regex(amountPattern)
  .refine(v => amountPattern.test(v) && new Decimal(v).gt(0))

const date = pricingV3RequestSchema.shape.quoteDate

export const creditCatalogSchema = z
  .object({
    schemaVersion: z.literal('pricing-v3-credit-catalog/1'),
    version: id,
    mode: z.literal('review_only'),
    providers: z
      .array(
        z
          .object({
            providerId: id,
            currency: z.string().regex(/^[A-Z]{3}$/),
            subscription: z
              .object({ amount, includedCredits: positiveCredits, frequency: z.literal('month'), sourceRef: id })
              .strict(),
            extraCreditValidity: z
              .object({ unit: z.enum(['days', 'years']), value: z.number().int().min(1).max(3650) })
              .strict(),
            activeSubscriptionRequired: z.boolean().nullable(),
            extraAfterRegularCredits: z.boolean().nullable(),
            packs: z
              .array(
                z
                  .object({ packId: id, credits: positiveCredits, amount, priceBeforeDiscount: amount.nullable() })
                  .strict()
              )
              .min(1)
              .max(32),
            source: z
              .object({
                reference: id,
                observedAt: date,
                evidenceStatus: z.literal('operator_screenshot'),
                sha256: z.string().regex(/^[a-f0-9]{64}$/),
                currencyBasis: z.string().min(1),
                priceValidUntil: date.nullable(),
                taxIncluded: z.boolean().nullable(),
                repeatPurchasesVerified: z.boolean(),
                note: z.string().min(1)
              })
              .strict()
          })
          .strict()
      )
      .min(1)
      .max(30)
  })
  .strict()
  .superRefine((v, ctx) => {
    const seen = new Set<string>()

    v.providers.forEach((p, i) => {
      if (seen.has(p.providerId))
        ctx.addIssue({ code: 'custom', path: ['providers', i], message: 'Duplicate provider' })
      seen.add(p.providerId)
      if (new Set(p.packs.map(x => x.packId)).size !== p.packs.length)
        ctx.addIssue({ code: 'custom', path: ['providers', i, 'packs'], message: 'Duplicate pack' })
    })
  })

export const creditBudgetRequestSchema = z
  .object({
    schemaVersion: z.literal('pricing-v3-credit-budget/1'),
    mode: z.literal('simulation'),
    accountRef: id,
    providerId: id,
    purchaseDate: date,
    useBy: date,
    requestedCredits: credits,
    subscriptionCreditsAllocated: credits,
    subscriptionCreditsAvailable: credits,
    activeSubscription: z.boolean(),
    allowRepeatedPacks: z.boolean().default(false)
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.useBy < v.purchaseDate) ctx.addIssue({ code: 'custom', path: ['useBy'], message: 'Invalid use window' })
    if (v.subscriptionCreditsAllocated > Math.min(v.requestedCredits, v.subscriptionCreditsAvailable))
      ctx.addIssue({
        code: 'custom',
        path: ['subscriptionCreditsAllocated'],
        message: 'Allocation exceeds demand or availability'
      })
  })

export const CREDIT_BUDGET_METHOD = 'pricing-v3-credit-budget/1'

function expiry(start: string, unit: 'days' | 'years', value: number) {
  const d = new Date(`${start}T00:00:00Z`)

  if (unit === 'days') d.setUTCDate(d.getUTCDate() + value)
  else {
    const month = d.getUTCMonth()

    d.setUTCFullYear(d.getUTCFullYear() + value)
    if (d.getUTCMonth() !== month) d.setUTCDate(0)
  }

  return d.getUTCFullYear() > 9999 ? null : d.toISOString().slice(0, 10)
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)

type Pack = z.infer<typeof creditCatalogSchema>['providers'][number]['packs'][number]
type State = { cost: Decimal; count: number; quantities: number[] }

function selectPacks(packs: Pack[], deficit: number, repeat: boolean) {
  if (!deficit) return { quantities: packs.map(() => 0), cost: new Decimal(0), acquired: 0 }
  const step = packs.reduce((s, p) => gcd(s, p.credits), 0)
  const target = Math.ceil(deficit / step)
  const limit = target + Math.max(...packs.map(p => p.credits / step)) - 1

  if (limit > 100000) return null
  const states: (State | undefined)[] = Array(limit + 1)

  states[0] = { cost: new Decimal(0), count: 0, quantities: packs.map(() => 0) }

  const advance = (from: number, index: number) => {
    const prior = states[from]
    const to = from + packs[index].credits / step

    if (!prior || to > limit) return

    const candidate = {
      cost: prior.cost.plus(packs[index].amount),
      count: prior.count + 1,
      quantities: [...prior.quantities]
    }

    candidate.quantities[index]++
    const current = states[to]

    if (
      !current ||
      candidate.cost.lt(current.cost) ||
      (candidate.cost.eq(current.cost) && candidate.count < current.count)
    )
      states[to] = candidate
  }

  if (repeat) {
    for (let from = 0; from <= limit; from++) packs.forEach((_, i) => advance(from, i))
  } else {
    packs.forEach((p, i) => {
      for (let from = limit - p.credits / step; from >= 0; from--) advance(from, i)
    })
  }

  let best: { state: State; units: number } | undefined

  for (let units = target; units <= limit; units++) {
    const state = states[units]

    if (state && (!best || state.cost.lt(best.state.cost))) best = { state, units }
  }

  return best ? { ...best.state, acquired: best.units * step } : null
}

export function planCreditBudget(catalogRaw: unknown, requestRaw: unknown) {
  const catalog = creditCatalogSchema.parse(catalogRaw)
  const request = creditBudgetRequestSchema.parse(requestRaw)
  const provider = catalog.providers.find(p => p.providerId === request.providerId)
  const diagnostics: string[] = []
  const extra = request.requestedCredits - request.subscriptionCreditsAllocated

  if (!provider) diagnostics.push('PROVIDER_NOT_FOUND')
  if (provider && request.subscriptionCreditsAvailable > provider.subscription.includedCredits)
    diagnostics.push('SUBSCRIPTION_AVAILABILITY_EXCEEDS_PACKAGE')
  if (
    provider &&
    !request.activeSubscription &&
    (provider.activeSubscriptionRequired || request.subscriptionCreditsAllocated > 0)
  )
    diagnostics.push('ACTIVE_SUBSCRIPTION_REQUIRED')
  if (request.subscriptionCreditsAllocated > 0 && request.purchaseDate.slice(0, 7) !== request.useBy.slice(0, 7))
    diagnostics.push('SUBSCRIPTION_WINDOW_REQUIRES_REVIEW')
  if (provider && request.purchaseDate < provider.source.observedAt)
    diagnostics.push('PRICE_NOT_OBSERVED_AT_PURCHASE_DATE')
  if (extra && provider?.source.priceValidUntil && request.purchaseDate > provider.source.priceValidUntil)
    diagnostics.push('TOPUP_PRICE_EXPIRED')

  const expiresAt = provider
    ? expiry(request.purchaseDate, provider.extraCreditValidity.unit, provider.extraCreditValidity.value)
    : null

  // End date is exclusive: budget use must occur strictly before the expiry anniversary.
  if (extra && expiresAt && request.useBy >= expiresAt) diagnostics.push('EXTRA_CREDITS_EXPIRE_BEFORE_USE')
  if (extra && provider && !expiresAt) diagnostics.push('EXPIRY_DATE_NOT_REPRESENTABLE')
  const sorted = provider ? [...provider.packs].sort((a, b) => a.packId.localeCompare(b.packId)) : []
  const selected = provider && !diagnostics.length ? selectPacks(sorted, extra, request.allowRepeatedPacks) : null

  if (provider && !diagnostics.length && !selected) diagnostics.push('PACK_CAPACITY_OR_PLANNER_LIMIT')

  const base = {
    methodVersion: CREDIT_BUDGET_METHOD,
    binding: false as const,
    reviewStatus: 'requires_review' as const,
    catalog,
    request,
    diagnostics,
    assumptions: [
      'Snapshot prices/promotions, taxes, subscription terms and access need revalidation before commitment.',
      'Declared available credits are a planning input, not a live balance or concurrent reservation.',
      'Client funds full incremental package cost; remaining credits do not reduce cash or presume future sales.',
      ...(request.allowRepeatedPacks ? ['Repeat purchase of the same pack is an explicit simulation assumption.'] : [])
    ]
  }

  if (!provider || !selected || diagnostics.length)
    return { ...base, calculationStatus: 'needs_input' as const, breakdown: null }
  const money = (d: Decimal) => d.toFixed(2, Decimal.ROUND_HALF_UP)

  const allocated = new Decimal(provider.subscription.amount)
    .mul(request.subscriptionCreditsAllocated)
    .div(provider.subscription.includedCredits)

  return {
    ...base,
    calculationStatus: 'calculated' as const,
    breakdown: {
      currency: provider.currency,
      subscription: {
        monthlyPackageCost: provider.subscription.amount,
        includedCredits: provider.subscription.includedCredits,
        allocatedCredits: request.subscriptionCreditsAllocated,
        declaredAvailableBefore: request.subscriptionCreditsAvailable,
        declaredAvailableAfter: request.subscriptionCreditsAvailable - request.subscriptionCreditsAllocated,
        attributedCost: money(allocated),
        newCash: '0.00',
        note: 'Existing subscription is already funded; full fee remains a company cost. No incremental cash for this allocation.'
      },
      extra: {
        requestedCredits: extra,
        purchasedCredits: selected.acquired,
        remainingCredits: selected.acquired - extra,
        expiresAt: extra ? expiresAt : null,
        validityEndExclusive: true,
        packages: sorted.flatMap((p, i) =>
          selected.quantities[i]
            ? [
                {
                  packId: p.packId,
                  quantity: selected.quantities[i],
                  creditsEach: p.credits,
                  priceEach: p.amount,
                  cash: money(new Decimal(p.amount).mul(selected.quantities[i]))
                }
              ]
            : []
        ),
        purchaseCost: money(selected.cost),
        newCash: money(selected.cost),
        costAssignedToClient: money(selected.cost)
      },
      totalBudgetCost: money(allocated.plus(selected.cost)),
      incrementalCash: money(selected.cost),
      sourceRefs: [provider.subscription.sourceRef, provider.source.reference]
    }
  }
}
