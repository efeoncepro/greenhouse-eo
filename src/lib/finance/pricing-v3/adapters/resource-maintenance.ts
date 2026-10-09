import { z } from 'zod'

import { catalogDigest } from './catalog-local'
import { composeResourceQuote } from '../resources/composition'
import { compositionPolicySchema } from '../resources/composition-contracts'
import { creditCatalogSchema } from '../resources/credit-budget'
import { validateCatalog } from '../catalog/catalog'

export const resourceChangeSchema = z
  .object({
    schemaVersion: z.literal('pricing-v3-resource-change/1'),
    kind: z.enum(['policy', 'credits']),
    baseDigest: z.string().regex(/^[a-f0-9]{64}$/),
    reason: z.string().min(1).max(1000),
    replacement: z.unknown()
  })
  .strict()

/** Adapter-level hashes/optimistic locking; the domain still owns resource calculations. */
export function previewResourceChange(
  catalog: unknown,
  policyRaw: unknown,
  creditsRaw: unknown,
  changeRaw: unknown,
  demands: unknown[] = []
) {
  const monetaryCatalog = validateCatalog(catalog)
  const policy = compositionPolicySchema.parse(policyRaw)
  const credits = creditCatalogSchema.parse(creditsRaw)
  const change = resourceChangeSchema.parse(changeRaw)
  const base = change.kind === 'policy' ? policy : credits

  if (catalogDigest(base) !== change.baseDigest) throw new Error('RESOURCE_BASE_CONFLICT')

  const successor =
    change.kind === 'policy'
      ? compositionPolicySchema.parse(change.replacement)
      : creditCatalogSchema.parse(change.replacement)

  if (successor.version === base.version) throw new Error('RESOURCE_NEW_VERSION_REQUIRED')
  const nextPolicy = change.kind === 'policy' ? compositionPolicySchema.parse(successor) : policy
  const nextCredits = change.kind === 'credits' ? creditCatalogSchema.parse(successor) : credits

  for (const tool of nextPolicy.tools) {
    for (const price of tool.prices) {
      const previous = policy.tools
        .find(t => t.toolId === tool.toolId)
        ?.prices.find(p => p.priceId === price.priceId)?.price

      if (
        previous &&
        price.price &&
        price.price.source.status === 'confirmed' &&
        (previous.amount !== price.price.amount ||
          previous.currency !== price.price.currency ||
          previous.unit !== price.price.unit) &&
        previous.source.reference === price.price.source.reference
      )
        throw new Error('RESOURCE_SOURCE_RECONFIRMATION_REQUIRED')
    }
  }

  for (const provider of nextCredits.providers) {
    const previous = credits.providers.find(p => p.providerId === provider.providerId)

    if (
      previous &&
      catalogDigest([previous.currency, previous.subscription, previous.packs, previous.extraCreditValidity]) !==
        catalogDigest([provider.currency, provider.subscription, provider.packs, provider.extraCreditValidity]) &&
      previous.source.sha256 === provider.source.sha256 &&
      previous.source.reference === provider.source.reference
    )
      throw new Error('RESOURCE_SOURCE_RECONFIRMATION_REQUIRED')
  }

  const ids = nextPolicy.tools.map(t => t.toolId)
  const resourceIds = monetaryCatalog.records.flatMap(r => (r.kind === 'resource' ? [r.value.resourceId] : []))
  const profileIds = monetaryCatalog.records.flatMap(r => (r.kind === 'profile' ? [r.value.profileId] : []))
  const unique = (v: string[]) => new Set(v).size === v.length

  if (
    !unique(ids) ||
    !unique(nextPolicy.commonToolIds) ||
    !unique(nextPolicy.taskCodes) ||
    !unique(nextPolicy.profileTasks.map(p => p.profileId)) ||
    nextPolicy.commonToolIds.some(id => !ids.includes(id)) ||
    nextPolicy.profileTasks.some(
      p => !profileIds.includes(p.profileId) || p.tasks.some(t => !nextPolicy.taskCodes.includes(t))
    ) ||
    nextPolicy.tools.some(
      t =>
        !unique(t.prices.map(p => p.priceId)) ||
        t.tasks.some(task => !nextPolicy.taskCodes.includes(task)) ||
        (t.access === 'credits') !== Boolean(t.providerId) ||
        (t.access === 'credits' && t.prices.length > 0) ||
        (t.providerId && !nextCredits.providers.some(p => p.providerId === t.providerId)) ||
        t.prices.some(
          p =>
            (p.catalogResourceId && !resourceIds.includes(p.catalogResourceId)) ||
            p.bundledToolIds?.some(id => id === t.toolId || !ids.includes(id))
        )
    )
  )
    throw new Error('INVALID_RESOURCE_POLICY_REFERENCE')
  if (!unique(nextPolicy.tools.flatMap(t => (t.providerId ? [t.providerId] : []))))
    throw new Error('INVALID_RESOURCE_POLICY_REFERENCE')

  const semantic = {
    contextDigests: {
      catalog: catalogDigest(monetaryCatalog),
      policy: catalogDigest(policy),
      credits: catalogDigest(credits)
    },
    baseDigest: change.baseDigest,
    kind: change.kind,
    reason: change.reason,
    successor,
    impacts: demands.map(demand => ({
      before: composeResourceQuote(catalog, policy, credits, demand),
      after: composeResourceQuote(catalog, nextPolicy, nextCredits, demand)
    })),
    binding: false,
    status: 'review_only'
  }

  return { previewDigest: catalogDigest(semantic), ...semantic }
}

export function applyResourceChange(
  catalog: unknown,
  policy: unknown,
  credits: unknown,
  change: unknown,
  confirmation: string,
  demands: unknown[] = []
) {
  const preview = previewResourceChange(catalog, policy, credits, change, demands)

  if (confirmation !== preview.previewDigest) throw new Error('RESOURCE_PREVIEW_CONFLICT')

  return preview
}
