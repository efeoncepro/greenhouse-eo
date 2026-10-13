import { catalogDigest } from './catalog-local'
import { composeResourceQuote } from '../resources/composition'
import { compositionDemandSchema, compositionPolicySchema } from '../resources/composition-contracts'
import { creditCatalogSchema } from '../resources/credit-budget'
import { validateCatalog } from '../catalog/catalog'
import { explainCommercialAdjustments, explainCostComponents } from '../catalog/explain'
import { PricingV3Error } from '../errors'

export const COMPOSITION_VERSION = 'pricing-v3-resource-composition/1'

export function runResourceComposition(
  catalog: unknown,
  policy: unknown,
  credits: unknown,
  demand: unknown,
  createdAt = new Date().toISOString()
) {
  const inputs = {
    catalog: validateCatalog(catalog),
    policy: compositionPolicySchema.parse(policy),
    credits: creditCatalogSchema.parse(credits),
    demand: compositionDemandSchema.parse(demand)
  }

  const semantic = {
    version: COMPOSITION_VERSION,
    ...inputs,
    result: composeResourceQuote(inputs.catalog, inputs.policy, inputs.credits, inputs.demand)
  }

  const replayDigest = catalogDigest(semantic)

  return {
    artifactVersion: COMPOSITION_VERSION,
    calculationId: `composition-${replayDigest.slice(0, 24)}`,
    replayDigest,
    semantic,
    execution: { createdAt }
  }
}

export function replayResourceComposition(raw: unknown) {
  const artifact = raw as ReturnType<typeof runResourceComposition>

  if (
    artifact?.artifactVersion !== COMPOSITION_VERSION ||
    artifact.semantic?.version !== COMPOSITION_VERSION ||
    catalogDigest(artifact.semantic) !== artifact.replayDigest
  )
    throw new PricingV3Error('REPLAY_MISMATCH')
  const s = artifact.semantic
  const replay = runResourceComposition(s.catalog, s.policy, s.credits, s.demand, artifact.execution?.createdAt)

  if (replay.replayDigest !== artifact.replayDigest || replay.calculationId !== artifact.calculationId)
    throw new PricingV3Error('REPLAY_MISMATCH')

  return replay
}

export function explainResourceComposition(raw: unknown) {
  const artifact = replayResourceComposition(raw)
  const result = artifact.semantic.result

  return {
    calculationId: artifact.calculationId,
    ...result,
    costBreakdown: explainCostComponents(result.quote),
    commercialAdjustments: explainCommercialAdjustments(result.quote),
    maintenance: 'Frozen policy, demand and catalogs. New prices require a new composition.',
    inventoryStatus: 'Declared simulation; no live assignment or reservation.'
  }
}
