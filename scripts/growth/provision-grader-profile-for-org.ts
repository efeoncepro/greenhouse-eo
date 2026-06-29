import 'server-only'

/**
 * TASK-1277 rollout — Provisión idempotente del `grader_profile` enlazado a una org contratada.
 *
 * El chokepoint AEO (`requestGraderRunForOrganization`) exige un `grader_profiles.organization_id`
 * enlazado; sin él la org contratada resuelve `profile_required`. Este script crea ese binding
 * DERIVANDO los datos de la organización canónica (`greenhouse_core.organizations`) — incluida la
 * `website_url` ya persistida (TASK-1285) — para no hand-tipear el dominio.
 *
 * Idempotente: si la org ya tiene un `grader_profile` activo enlazado, no hace nada.
 * DRY-RUN por defecto. `--apply` inserta. `--org <organization_id>` (default: Grupo Berel).
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/provision-grader-profile-for-org.ts          # dry-run Berel
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/provision-grader-profile-for-org.ts --apply  # aplica
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const APPLY = process.argv.includes('--apply')
const orgArgIdx = process.argv.indexOf('--org')

const ORG_ID =
  orgArgIdx >= 0 ? process.argv[orgArgIdx + 1] : 'org-32333527-02a8-487b-819e-6f76a761777d' // Grupo Berel

// country (ISO-2) → market + locale del grader. Conservador; ajustar si emerge otro país.
const MARKET_BY_COUNTRY: Record<string, { market: string; locale: string }> = {
  MX: { market: 'MX', locale: 'es-MX' },
  CL: { market: 'CL', locale: 'es-CL' },
  US: { market: 'US', locale: 'en-US' }
}

interface OrgRow extends Record<string, unknown> {
  organization_id: string
  organization_name: string
  website_url: string | null
  country: string | null
  industry: string | null
}

const main = async (): Promise<void> => {
  const orgRows = await runGreenhousePostgresQuery<OrgRow>(
    `SELECT organization_id, organization_name, website_url, country, industry
       FROM greenhouse_core.organizations
      WHERE organization_id = $1 AND active = TRUE`,
    [ORG_ID]
  )

  const org = orgRows[0]

  if (!org) {
    console.error(`Org ${ORG_ID} no encontrada o inactiva.`)
    process.exit(1)
  }

  const existing = await runGreenhousePostgresQuery(
    `SELECT profile_id FROM greenhouse_growth.grader_profiles
      WHERE organization_id = $1 AND status = 'active' LIMIT 1`,
    [ORG_ID]
  )

  console.log(`Provisión grader_profile — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Org: ${org.organization_name} (${org.organization_id})`)
  console.log(`  website_url: ${org.website_url ?? '(null)'}`)
  console.log(`  country: ${org.country ?? '(null)'} · industry: ${org.industry ?? '(null)'}`)

  if (existing.length > 0) {
    console.log(`\nYa existe un grader_profile activo enlazado (idempotente, sin cambios).`)

    return
  }

  if (!org.website_url) {
    console.error('\nLa org no tiene website_url canónica. Corré el backfill TASK-1285 primero.')
    process.exit(1)
  }

  const market = MARKET_BY_COUNTRY[(org.country ?? '').toUpperCase()] ?? { market: org.country ?? 'CL', locale: 'es' }

  console.log(`  → market=${market.market} locale=${market.locale}`)

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply.')

    return
  }

  // profile_id / public_id se generan por default/trigger en la DB (mismo patrón que findOrCreateGraderProfile).
  const inserted = await runGreenhousePostgresQuery<{ profile_id: string; public_id: string }>(
    `INSERT INTO greenhouse_growth.grader_profiles
       (brand_name, website_url, market, locale, category, competitors_declared, organization_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
     RETURNING profile_id, public_id`,
    [
      org.organization_name,
      org.website_url,
      market.market,
      market.locale,
      null,
      [],
      org.organization_id
    ]
  )

  console.log(`\nAPPLY completo: grader_profile creado ${inserted[0]?.public_id} (${inserted[0]?.profile_id}).`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
