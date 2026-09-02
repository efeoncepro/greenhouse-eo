/**
 * TASK-1776 — Sanity del SQL embebido contra PG REAL (gate TASK-893). Ejercita writer
 * (unnest de pares + ON CONFLICT + JSONB), pre-check de frescura por (kind, sujeto), reader
 * (NUMERIC→number, top_keywords JSONB), lectura de concentración, el CHECK expandido de
 * `seo_keyword_market_data` (source ranked_keywords) y la query del signal.
 *
 * Uso (proxy Cloud SQL arriba en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1776-url-visibility.ts
 *
 * ⚠️ Deja filas sintéticas (`task-1776-sanity.invalid`, provider_cost 0) en tablas
 * append-only — dominio inválido por RFC 2606; re-corridas del mismo día no duplican.
 */

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '../../src/lib/postgres/client'
import { persistKeywordMarketData } from '../../src/lib/growth/seo/keyword-market-data'
import {
  buildNullVisibilitySnapshot,
  loadFreshVisibilitySubjects,
  persistUrlVisibilitySnapshots
} from '../../src/lib/growth/seo/url-visibility/persist'
import { buildEtvMethodologyRequest } from '../../src/lib/growth/seo/etv-methodology'
import { toPersistedEtvMethodology } from '../../src/lib/growth/seo/etv-methodology/persisted'
import { readUrlVisibility, readVisibilityConcentration } from '../../src/lib/growth/seo/url-visibility/reader'
import { getSeoUrlVisibilityStalenessSignal } from '../../src/lib/reliability/queries/seo-url-visibility-staleness'

const DOMAIN = 'task-1776-sanity.invalid'
const LOCATION = '2152'
const LANGUAGE = 'es'

const fail = (message: string): never => {
  console.error(`[sanity] FALLÓ: ${message}`)
  process.exit(1)
}

// TASK-1805 — todo writer exige la identidad metodológica; la sanity usa la de la policy (legacy explícito).
const ETV_STAMP = toPersistedEtvMethodology(buildEtvMethodologyRequest({ endpoint: '/v3/dataforseo_labs/google/ranked_keywords/live', env: {} as NodeJS.ProcessEnv }))

const main = async () => {
  const orgs = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT organization_id FROM greenhouse_core.organizations ORDER BY organization_id LIMIT 1`
  )

  const organizationId = orgs[0]?.organization_id

  if (!organizationId) return fail('no hay organizaciones en la base')

  // 1. Writer: fila de sujeto url con métricas + JSONB, y fila-marcador de dominio.
  const base = buildNullVisibilitySnapshot({
    subjectKind: 'url',
    normalizedSubject: `${DOMAIN}/guia`,
    rawSubject: `https://${DOMAIN}/guia`,
    locationCode: LOCATION,
    languageCode: LANGUAGE,
    sourceEndpoint: 'ranked_keywords',
    etvMethodology: ETV_STAMP
  })

  const { rowsWritten } = await persistUrlVisibilitySnapshots({
    snapshots: [
      {
        ...base,
        organic: {
          ...base.organic,
          positions: { ...base.organic.positions, pos1: 1, pos4_10: 5 },
          count: 6,
          etv: 123.45,
          estimatedPaidTrafficCostUsd: 67.89
        },
        totalRankedKeywords: 6,
        topKeywords: [{ keyword: 'sanity kw', position: 4, url: `https://${DOMAIN}/guia`, searchVolume: 90, etv: 9 }]
      },
      buildNullVisibilitySnapshot({
        subjectKind: 'domain',
        normalizedSubject: DOMAIN,
        rawSubject: DOMAIN,
        locationCode: LOCATION,
        languageCode: LANGUAGE,
        sourceEndpoint: 'relevant_pages',
        etvMethodology: ETV_STAMP
      })
    ],
    capturedByOrganizationId: organizationId,
    providerCostUsd: 0
  })

  console.log(`[sanity] writer OK — ${rowsWritten} filas`)

  // 2. Pre-check de frescura por (kind, sujeto) con filtro por source.
  const fresh = await loadFreshVisibilitySubjects({
    subjects: [
      { kind: 'url', normalized: `${DOMAIN}/guia` },
      { kind: 'domain', normalized: DOMAIN }
    ],
    locationCode: LOCATION,
    languageCode: LANGUAGE,
    sourceEndpoints: ['ranked_keywords'],
    etvMethodologyVersion: ETV_STAMP.version
  })

  if (!fresh.has(`url:${DOMAIN}/guia`)) return fail('el pre-check no ve la fila url recién escrita')
  if (fresh.has(`domain:${DOMAIN}`)) return fail('el filtro por source no acota (relevant_pages contó como ranked_keywords)')

  console.log('[sanity] pre-check de frescura OK — pares (kind, sujeto) + filtro por source correctos')

  // 3. Reader por sujeto: NUMERIC como string→number, JSONB de top_keywords.
  const visibility = await readUrlVisibility({
    subject: `${DOMAIN}/guia`,
    kind: 'url',
    locationCode: LOCATION,
    languageCode: LANGUAGE
  })

  if (!visibility.ok) return fail(`reader devolvió ${visibility.reason}`)

  if (visibility.organicEtv === null || Math.abs(visibility.organicEtv - 123.45) > 0.001) {
    return fail(`organicEtv proyectado mal: ${String(visibility.organicEtv)}`)
  }

  if (!visibility.topKeywords || visibility.topKeywords[0]?.keyword !== 'sanity kw') {
    return fail('top_keywords JSONB no se proyectó')
  }

  if (JSON.stringify(visibility).includes('captured_by')) return fail('el DTO filtró captured_by')

  console.log(`[sanity] reader OK — foto ${visibility.capturedAt} (${visibility.source}), universo ${visibility.totalRankedKeywords}`)

  // 4. Concentración: LIKE por host + DISTINCT ON.
  const concentration = await readVisibilityConcentration({
    domain: DOMAIN,
    kind: 'url',
    locationCode: LOCATION,
    languageCode: LANGUAGE
  })

  if (!concentration.ok) return fail(`concentración devolvió ${concentration.reason}`)
  if (concentration.items[0]?.subject !== `${DOMAIN}/guia`) return fail('la concentración no listó la página')

  console.log(`[sanity] concentración OK — ${concentration.items.length} página(s)`)

  // 5. CHECK expandido del mercado: una fila con source ranked_keywords debe INSERTAR.
  await persistKeywordMarketData({
    data: [
      {
        normalizedKeyword: 'task-1776 sanity kw',
        keyword: 'task-1776 sanity kw',
        locationCode: LOCATION,
        languageCode: LANGUAGE,
        searchVolume: 90,
        keywordDifficulty: null,
        competition: null,
        competitionLevel: null,
        cpcUsd: null,
        searchIntent: null,
        searchIntentProbability: null,
        coreKeyword: null,
        providerLastUpdatedAt: null,
        avgPageRank: null,
        avgMainDomainRank: null,
        avgBacklinks: null,
        avgReferringDomains: null
      }
    ],
    sourceEndpoint: 'ranked_keywords',
    capturedByOrganizationId: organizationId,
    providerCostUsd: 0
  })

  console.log('[sanity] CHECK expandido OK — source ranked_keywords aceptado por seo_keyword_market_data')

  // 6. Query del signal contra PG real.
  const signal = await getSeoUrlVisibilityStalenessSignal()

  if (signal.severity === 'unknown') return fail(`signal en unknown: ${signal.summary}`)

  console.log(`[sanity] signal OK — severity=${signal.severity}: ${signal.summary}`)
  console.log('[sanity] TODO OK')
}

main()
  .catch(error => {
    console.error('[sanity] FALLÓ:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeGreenhousePostgres()
  })
