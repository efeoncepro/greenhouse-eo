/**
 * TASK-1805 — Replay de fixtures con los PARSERS DE PRODUCCIÓN (server-side).
 *
 * El evaluador (`./evaluator`) es puro y compara snapshots ya proyectados. Este módulo cierra la
 * brecha: toma respuestas del proveedor (fixtures versionados o sintéticos, nunca llamadas nuevas)
 * y las proyecta con `parseDomainRankOverviewItem` / `parseDomainOverviewSide`, los mismos que usan
 * los writers — cero derivación paralela. Así el replay prueba parseo + comparación reales, y lo que
 * NO prueba (la exactitud de la fórmula) queda declarado en el resultado.
 *
 * La lectura de archivos vive en scripts/tests (nunca `node:fs` en un módulo de runtime).
 */

import 'server-only'

import { parseDomainOverviewSide, parseDomainRankOverviewItem, type DomainRankOverviewItemRaw } from '../domain-overview/capture'
import { normalizeOverviewDomain } from '../domain-overview/persist'
import { ETV_METHODOLOGY_POLICY_VERSION, isEtvMethodologyVersion, type EtvMethodologyVersion } from './contracts'
import { compareEtvSnapshots, type EtvComparableSnapshot, type EtvEvaluationMode, type EtvSnapshotComparison } from './evaluator'
import type { PersistedEtvMethodology } from './persisted'

export type EtvProviderFixture = {
  methodology: string
  capturedAt: string
  tasks: Array<{ status_code?: number; result?: Array<{ items?: unknown[] }> }>
}

const fixtureItems = (fixture: EtvProviderFixture): unknown[] => {
  const task = fixture.tasks[0]

  if (!task || task.status_code !== 20000) {
    throw new Error('etv_fixture_invalid: el fixture no trae un task 20000 (un fixture fallido no es evidencia)')
  }

  return task.result?.flatMap(result => result.items ?? []) ?? []
}

const fixtureMethodology = (fixture: EtvProviderFixture): EtvMethodologyVersion => {
  if (!isEtvMethodologyVersion(fixture.methodology)) {
    throw new Error(`etv_fixture_invalid: methodology fuera del vocabulario (${fixture.methodology})`)
  }

  return fixture.methodology
}

const stampFor = (fixture: EtvProviderFixture): PersistedEtvMethodology => ({
  version: fixtureMethodology(fixture),
  evidence: 'explicit_request',
  requestedAt: `${fixture.capturedAt}T00:00:00.000Z`,
  policyVersion: ETV_METHODOLOGY_POLICY_VERSION,
  historicalBasis: null
})

/** Foto de dominio: un item → snapshot comparable, con el parser productivo. */
export const projectDomainRankOverviewFixture = (
  fixture: EtvProviderFixture,
  context: { domain: string; locationCode: string; languageCode: string }
): EtvComparableSnapshot => {
  const item = fixtureItems(fixture)[0] as DomainRankOverviewItemRaw | undefined

  if (!item) throw new Error('etv_fixture_invalid: domain_rank_overview sin items')

  const snapshot = parseDomainRankOverviewItem(item, { ...context, etvMethodology: stampFor(fixture) })

  return {
    methodology: snapshot.etvMethodology.version,
    capturedAt: fixture.capturedAt,
    organicEtv: snapshot.organic.etv,
    paidEtv: snapshot.paid.etv,
    organicEstimatedTrafficCostUsd: snapshot.organic.estimatedPaidTrafficCostUsd,
    organicCount: snapshot.organic.count,
    topItems: []
  }
}

/** Relevant pages / subdomains: items ordenados por el proveedor → membresía comparable. */
export const projectConcentrationFixture = (
  fixture: EtvProviderFixture,
  kind: 'relevant_pages' | 'subdomains'
): EtvComparableSnapshot => {
  const items = fixtureItems(fixture) as Array<{
    page_address?: string | null
    subdomain?: string | null
    metrics?: Parameters<typeof parseDomainOverviewSide>[0] extends infer T ? { organic?: T | null; paid?: T | null } | null : never
  }>

  const topItems = items
    .map(item => {
      const subject = kind === 'relevant_pages' ? item.page_address : item.subdomain

      if (typeof subject !== 'string' || !subject) return null

      return {
        subject: kind === 'relevant_pages' ? subject.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^www\./, '').replace(/\/$/, '') : normalizeOverviewDomain(subject),
        etv: parseDomainOverviewSide(item.metrics?.organic ?? null).etv
      }
    })
    .filter((item): item is { subject: string; etv: number | null } => item !== null)

  const total = topItems.reduce((sum, item) => sum + (item.etv ?? 0), 0)

  return {
    methodology: fixtureMethodology(fixture),
    capturedAt: fixture.capturedAt,
    organicEtv: topItems.length > 0 ? Number(total.toFixed(2)) : null,
    paidEtv: null,
    organicEstimatedTrafficCostUsd: null,
    organicCount: topItems.length,
    topItems
  }
}

export type EtvFixtureReplay = {
  family: 'domain_rank_overview' | 'relevant_pages' | 'subdomains'
  providerCalls: 0
  comparison: EtvSnapshotComparison
  /** Lo que el replay demuestra y lo que no: nunca "improved es más exacto". */
  proves: 'technical_compatibility_only'
}

export const replayEtvFixtures = (input: {
  family: EtvFixtureReplay['family']
  legacy: EtvProviderFixture
  improved: EtvProviderFixture
  mode: EtvEvaluationMode
  context?: { domain: string; locationCode: string; languageCode: string }
}): EtvFixtureReplay => {
  const context = input.context ?? { domain: 'fixture.invalid', locationCode: '2152', languageCode: 'es' }

  const [legacy, improved] =
    input.family === 'domain_rank_overview'
      ? [projectDomainRankOverviewFixture(input.legacy, context), projectDomainRankOverviewFixture(input.improved, context)]
      : [projectConcentrationFixture(input.legacy, input.family), projectConcentrationFixture(input.improved, input.family)]

  return {
    family: input.family,
    providerCalls: 0,
    comparison: compareEtvSnapshots({ legacy, improved, mode: input.mode }),
    proves: 'technical_compatibility_only'
  }
}
