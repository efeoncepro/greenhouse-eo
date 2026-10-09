import { createHash } from 'node:crypto'

import { stableJson } from './local-snapshot'
import { changeCatalog, validateCatalog } from '../catalog/catalog'
import { explainCostComponents } from '../catalog/explain'
import { calculateCatalogQuote, QUOTE_VERSION } from '../catalog/quote'
import { changeSetSchema } from '../catalog/contracts'

export const catalogDigest = (value: unknown) => createHash('sha256').update(stableJson(value)).digest('hex')

export function runCatalogQuote(rawCatalog: unknown, brief: unknown, createdAt = new Date().toISOString()) {
  const catalog = validateCatalog(rawCatalog)
  const result = calculateCatalogQuote(catalog, brief)
  const semantic = { version: QUOTE_VERSION, catalog, brief, result }
  const replayDigest = catalogDigest(semantic)

  return {
    artifactVersion: QUOTE_VERSION,
    calculationId: `selection-${replayDigest.slice(0, 24)}`,
    replayDigest,
    semantic,
    execution: { createdAt }
  }
}

export function replayCatalogQuote(raw: unknown) {
  const artifact = raw as ReturnType<typeof runCatalogQuote>

  if (
    artifact?.artifactVersion !== QUOTE_VERSION ||
    artifact.semantic?.version !== QUOTE_VERSION ||
    catalogDigest(artifact.semantic) !== artifact.replayDigest
  )
    throw new Error('REPLAY_MISMATCH')
  const replay = runCatalogQuote(artifact.semantic.catalog, artifact.semantic.brief, artifact.execution?.createdAt)

  if (replay.replayDigest !== artifact.replayDigest || replay.calculationId !== artifact.calculationId)
    throw new Error('REPLAY_MISMATCH')

  return replay
}

export function explainCatalogQuote(raw: unknown) {
  const quote = replayCatalogQuote(raw)
  const result = quote.semantic.result

  return {
    calculationId: quote.calculationId,
    catalog: {
      catalogId: quote.semantic.catalog.catalogId,
      version: quote.semantic.catalog.version,
      digest: catalogDigest(quote.semantic.catalog)
    },
    ...result,
    maintenance: 'Frozen catalog. New values affect only a new quote or explicit revision.',
    factorAndFxReferences: result.resolution.bindings.filter(b =>
      ['talent_factor', 'market_factor', 'fx'].includes(b.purpose)
    ),
    costBreakdown: explainCostComponents(result)
  }
}

export function previewCatalogChange(raw: unknown, changeRaw: unknown, briefs: unknown[] = []) {
  const catalog = validateCatalog(raw)
  const change = changeSetSchema.parse(changeRaw)

  if (change.baseDigest !== catalogDigest(catalog)) throw new Error('CATALOG_BASE_CONFLICT')
  const successor = changeCatalog(catalog, change)

  const impacts = briefs.map(brief => ({
    brief,
    before: calculateCatalogQuote(catalog, brief),
    after: calculateCatalogQuote(successor.catalog, brief)
  }))

  const semantic = {
    baseDigest: change.baseDigest,
    change,
    differences: successor.differences,
    dimensionChanges: successor.dimensionChanges,
    impacts,
    catalog: successor.catalog
  }

  return { previewDigest: catalogDigest(semantic), ...semantic }
}

export function applyCatalogChange(raw: unknown, changeRaw: unknown, confirmation: string, briefs: unknown[] = []) {
  const preview = previewCatalogChange(raw, changeRaw, briefs)

  if (preview.previewDigest !== confirmation) throw new Error('CATALOG_PREVIEW_CONFLICT')
  preview.catalog.audit.push({
    changeId: preview.change.changeId,
    actor: preview.change.actor,
    reason: preview.change.reason,
    baseDigest: preview.baseDigest,
    previewDigest: preview.previewDigest,
    changes: [
      ...preview.change.changes.map(change => ({
        ...change,
        before: preview.differences.find(d => d.recordId === change.recordId)?.before ?? null
      })),
      ...(preview.change.dimensions ? [{ operation: 'add_dimensions', dimensions: preview.change.dimensions }] : [])
    ]
  })

  return validateCatalog(preview.catalog)
}

export function compareCatalogQuotes(left: unknown, right: unknown) {
  const a = replayCatalogQuote(left)
  const b = replayCatalogQuote(right)
  const before = a.semantic.result.totals
  const after = b.semantic.result.totals
  const currencyMatches = Boolean(before && after && before.currency === after.currency)

  return {
    binding: false,
    calculations: [a.calculationId, b.calculationId],
    before,
    after,
    comparability: {
      currencyMatches,
      scopeMatches: stableJson(a.semantic.brief) === stableJson(b.semantic.brief),
      complete: Boolean(before && after)
    },
    catalogs: [a.semantic.catalog.version, b.semantic.catalog.version]
  }
}
