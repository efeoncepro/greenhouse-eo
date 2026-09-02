/**
 * TASK-1775 — Sanity del SQL embebido contra PG REAL (gate TASK-893: los mocks ejercitan el
 * TS, no el SQL). Ejercita writer (COALESCE::date + ON CONFLICT), pre-check de frescura
 * (date-math DATE - DATE), reader (DISTINCT/orden/tipos NUMERIC como string) y la query del
 * signal (regexp_replace + ::int).
 *
 * Uso (proxy Cloud SQL arriba en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1775-domain-overview.ts
 *
 * ⚠️ Deja UNA fila sintética (`task-1775-sanity.invalid`, provider_cost 0) en la tabla
 * append-only — dominio inválido por RFC 2606, jamás referenciado por un target; re-corridas
 * del mismo día no duplican (ON CONFLICT DO NOTHING).
 */

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

import { closeGreenhousePostgres, runGreenhousePostgresQuery } from '../../src/lib/postgres/client'
import {
  buildNullSnapshot,
  loadFreshOverviewDomains,
  persistDomainOverviewSnapshots
} from '../../src/lib/growth/seo/domain-overview/persist'
import { buildEtvMethodologyRequest } from '../../src/lib/growth/seo/etv-methodology'
import { toPersistedEtvMethodology } from '../../src/lib/growth/seo/etv-methodology/persisted'
import { readDomainOverview } from '../../src/lib/growth/seo/domain-overview/reader'
import { getSeoDomainOverviewStalenessSignal } from '../../src/lib/reliability/queries/seo-domain-overview-staleness'

const SANITY_DOMAIN = 'task-1775-sanity.invalid'
const LOCATION = '2152'
const LANGUAGE = 'es'

const fail = (message: string): never => {
  console.error(`[sanity] FALLÓ: ${message}`)
  process.exit(1)
}

// TASK-1805 — todo writer exige la identidad metodológica; la sanity usa la de la policy (legacy explícito).
const ETV_STAMP = toPersistedEtvMethodology(buildEtvMethodologyRequest({ endpoint: '/v3/dataforseo_labs/google/domain_rank_overview/live', env: {} as NodeJS.ProcessEnv }))

const main = async () => {
  const orgs = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT organization_id FROM greenhouse_core.organizations ORDER BY organization_id LIMIT 1`
  )

  const organizationId = orgs[0]?.organization_id

  if (!organizationId) return fail('no hay organizaciones en la base')

  // 1. Writer: fila completa + fila NULL (COALESCE($5::date, CURRENT_DATE) + ON CONFLICT).
  const { rowsWritten } = await persistDomainOverviewSnapshots({
    snapshots: [
      {
        ...buildNullSnapshot({
          domain: SANITY_DOMAIN,
          locationCode: LOCATION,
          languageCode: LANGUAGE,
          captureDate: null,
          sourceEndpoint: 'domain_rank_overview',
          etvMethodology: ETV_STAMP
        }),
        organic: {
          positions: {
            pos1: 1,
            pos2_3: 2,
            pos4_10: 3,
            pos11_20: null,
            pos21_30: null,
            pos31_40: null,
            pos41_50: null,
            pos51_60: null,
            pos61_70: null,
            pos71_80: null,
            pos81_90: null,
            pos91_100: null
          },
          count: 6,
          etv: 123.45,
          estimatedPaidTrafficCostUsd: 67.89,
          isNew: 1,
          isUp: 2,
          isDown: 0,
          isLost: 0
        }
      },
      buildNullSnapshot({
        domain: SANITY_DOMAIN,
        locationCode: LOCATION,
        languageCode: LANGUAGE,
        captureDate: '2024-03-01',
        sourceEndpoint: 'historical_rank_overview',
        etvMethodology: ETV_STAMP
      })
    ],
    capturedByOrganizationId: organizationId,
    providerCostUsd: 0
  })

  console.log(`[sanity] writer OK — ${rowsWritten} filas (idempotente por ON CONFLICT)`)

  // 2. Pre-check de frescura (DATE - DATE = integer; filtro por source_endpoint).
  const fresh = await loadFreshOverviewDomains({
    normalizedDomains: [SANITY_DOMAIN],
    locationCode: LOCATION,
    languageCode: LANGUAGE,
    sourceEndpoints: ['domain_rank_overview'],
    etvMethodologyVersion: ETV_STAMP.version
  })

  if (!fresh.has(SANITY_DOMAIN)) return fail('el pre-check de frescura no ve la fila recién escrita')

  const freshHistoricalOnly = await loadFreshOverviewDomains({
    normalizedDomains: [SANITY_DOMAIN],
    locationCode: LOCATION,
    languageCode: LANGUAGE,
    sourceEndpoints: ['bulk_traffic_estimation'],
    etvMethodologyVersion: ETV_STAMP.version
  })

  if (freshHistoricalOnly.has(SANITY_DOMAIN)) {
    return fail('el filtro por source_endpoint no está acotando (una foto contó como screening)')
  }

  console.log('[sanity] pre-check de frescura OK — date-math y filtro por endpoint correctos')

  // 3. Reader: tipos NUMERIC llegan como string y se proyectan a number; historia por mes.
  const overview = await readDomainOverview({
    subject: SANITY_DOMAIN,
    locationCode: LOCATION,
    languageCode: LANGUAGE
  })

  if (!overview.ok) return fail(`reader devolvió ${overview.reason}`)
  if (overview.lens !== 'estimated') return fail('lens debe ser estimated')

  if (overview.organicEtv === null || Math.abs(overview.organicEtv - 123.45) > 0.001) {
    return fail(`organicEtv proyectado mal: ${String(overview.organicEtv)}`)
  }

  if (JSON.stringify(overview).includes('captured_by')) return fail('el DTO filtró captured_by')

  console.log(
    `[sanity] reader OK — foto ${overview.capturedAt} (${overview.source}), ` +
      `${overview.history.length} punto(s) de historia`
  )

  // 4. Query del signal (regexp_replace + LEFT JOIN + ::int) contra PG real.
  const signal = await getSeoDomainOverviewStalenessSignal()

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
