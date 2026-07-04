/**
 * TASK-1268 — Growth AI Visibility · Citation source domain breakdown.
 *
 * Reducer PURO sobre `provider_observations.citations`. Expone sólo dominios
 * registrables + conteos agregados; NUNCA URLs, paths, titles ni raw provider text.
 */

import {
  type GrowthAiVisibilityCitation,
  type GrowthAiVisibilityProviderObservation,
  type GrowthAiVisibilityProviderId
} from '../contracts'
import { normalizeDomain } from '../observation'
import {
  CITATION_SOURCE_CLASSIFICATIONS,
  type CitationSourceBreakdown,
  type CitationSourceClassification,
  type CitationSourceClassificationTotals
} from './contracts'

export const CITATION_SOURCE_BREAKDOWN_TOP_N = 10

const emptyClassificationTotals = (): CitationSourceClassificationTotals =>
  Object.fromEntries(CITATION_SOURCE_CLASSIFICATIONS.map(classification => [classification, 0])) as CitationSourceClassificationTotals

const COMMON_COMPOUND_PUBLIC_SUFFIXES = new Set([
  'co.uk',
  'com.au',
  'net.au',
  'org.au',
  'com.br',
  'com.mx',
  'com.ar',
  'com.co',
  'co.nz',
  'co.jp',
  'co.kr',
  'co.za',
  'com.pe',
  'com.sg',
  'com.tr',
  'com.vn',
  'com.hk'
])

const UGC_DOMAINS = new Set([
  'reddit.com',
  'quora.com',
  'youtube.com',
  'youtu.be',
  'stackoverflow.com',
  'stackexchange.com',
  'medium.com',
  'substack.com',
  'linkedin.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'x.com',
  'twitter.com'
])

const toRegistrableDomain = (value: string | null | undefined): string | null => {
  const normalized = normalizeDomain(value)

  if (!normalized) return null

  const parts = normalized.split('.').filter(Boolean)

  if (parts.length <= 2) return normalized

  const suffix2 = parts.slice(-2).join('.')
  const suffix3 = parts.slice(-3).join('.')

  if (COMMON_COMPOUND_PUBLIC_SUFFIXES.has(suffix2)) {
    return parts.slice(-3).join('.')
  }

  if (COMMON_COMPOUND_PUBLIC_SUFFIXES.has(suffix3)) {
    return parts.slice(-4).join('.')
  }

  return suffix2
}

const buildDomainSet = (values: Array<string | null | undefined>): Set<string> =>
  new Set(values.map(toRegistrableDomain).filter((domain): domain is string => domain !== null))

const hasUgcSignal = (domain: string, citations: GrowthAiVisibilityCitation[]): boolean =>
  UGC_DOMAINS.has(domain) || citations.some(citation => citation.sourceType === 'social')

const classifyCitationDomain = (input: {
  domain: string
  citations: GrowthAiVisibilityCitation[]
  subjectDomain: string | null
  competitorDomains: Set<string>
}): CitationSourceClassification => {
  if (input.subjectDomain && input.domain === input.subjectDomain) return 'own_domain'
  if (input.competitorDomains.has(input.domain)) return 'competitor'
  if (hasUgcSignal(input.domain, input.citations)) return 'ugc'

  return 'third_party'
}

interface DomainAccumulator {
  domain: string
  count: number
  engines: Set<GrowthAiVisibilityProviderId>
  citations: GrowthAiVisibilityCitation[]
}

export const buildCitationSourceBreakdown = (input: {
  observations: GrowthAiVisibilityProviderObservation[]
  subjectDomain?: string | null
  competitorsDeclared?: string[]
  limit?: number
}): CitationSourceBreakdown => {
  const limit = Math.max(1, Math.min(25, Math.floor(input.limit ?? CITATION_SOURCE_BREAKDOWN_TOP_N)))
  const subjectDomain = toRegistrableDomain(input.subjectDomain)
  const competitorDomains = buildDomainSet(input.competitorsDeclared ?? [])
  const byDomain = new Map<string, DomainAccumulator>()
  let totalCitations = 0

  for (const observation of input.observations) {
    if (observation.status !== 'succeeded') continue

    for (const citation of observation.citations) {
      const domain = toRegistrableDomain(citation.domain) ?? toRegistrableDomain(citation.url)

      if (!domain) continue

      totalCitations += 1

      const entry = byDomain.get(domain) ?? {
        domain,
        count: 0,
        engines: new Set<GrowthAiVisibilityProviderId>(),
        citations: []
      }

      entry.count += 1
      entry.engines.add(observation.provider)
      entry.citations.push(citation)
      byDomain.set(domain, entry)
    }
  }

  const domains = [...byDomain.values()]
    .map(entry => ({
      domain: entry.domain,
      count: entry.count,
      engines: [...entry.engines].sort(),
      classification: classifyCitationDomain({
        domain: entry.domain,
        citations: entry.citations,
        subjectDomain,
        competitorDomains
      })
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      if (b.engines.length !== a.engines.length) return b.engines.length - a.engines.length

      return a.domain.localeCompare(b.domain)
    })

  const classificationTotals = emptyClassificationTotals()

  for (const domain of domains) {
    classificationTotals[domain.classification] += domain.count
  }

  return {
    domains: domains.slice(0, limit),
    totalCitations,
    uniqueDomains: byDomain.size,
    classificationTotals,
    reason: totalCitations === 0 ? 'sin_citas_evaluables' : null
  }
}

export const summarizeCitationTargets = (breakdown: CitationSourceBreakdown, limit = 3): string[] =>
  breakdown.domains
    .filter(domain => domain.classification !== 'own_domain')
    .slice(0, Math.max(1, limit))
    .map(domain => domain.domain)
