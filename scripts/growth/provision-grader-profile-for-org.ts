import 'server-only'

/**
 * TASK-1277/TASK-1286 rollout — Provisión idempotente del `grader_profile` enlazado a una org.
 *
 * DRY-RUN por defecto. `--apply` inserta. `--org <organization_id>` (default: Grupo Berel).
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/provision-grader-profile-for-org.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/provision-grader-profile-for-org.ts --apply
 */

import {
  provisionGraderProfileForOrganization,
  ProvisionGraderProfileError
} from '@/lib/growth/ai-visibility/provision-profile'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const APPLY = process.argv.includes('--apply')
const orgArgIdx = process.argv.indexOf('--org')

const ORG_ID =
  orgArgIdx >= 0 ? process.argv[orgArgIdx + 1] : 'org-32333527-02a8-487b-819e-6f76a761777d' // Grupo Berel

interface OrgPreviewRow extends Record<string, unknown> {
  organization_id: string
  organization_name: string
  website_url: string | null
  country: string | null
  industry: string | null
}

const previewOrg = async (): Promise<OrgPreviewRow | null> => {
  const rows = await runGreenhousePostgresQuery<OrgPreviewRow>(
    `SELECT organization_id, organization_name, website_url, country, industry
       FROM greenhouse_core.organizations
      WHERE organization_id = $1 AND active = TRUE`,
    [ORG_ID]
  )

  return rows[0] ?? null
}

const main = async (): Promise<void> => {
  const org = await previewOrg()

  if (!org) {
    console.error(`Org ${ORG_ID} no encontrada o inactiva.`)
    process.exit(1)
  }

  console.log(`Provisión grader_profile — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Org: ${org.organization_name} (${org.organization_id})`)
  console.log(`  website_url: ${org.website_url ?? '(null)'}`)
  console.log(`  country: ${org.country ?? '(null)'} · industry: ${org.industry ?? '(null)'}`)

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply.')

    return
  }

  const result = await provisionGraderProfileForOrganization(ORG_ID)

  if (result.idempotent) {
    console.log(`\nYa existe un grader_profile activo enlazado (${result.publicId ?? result.profileId}).`)

    return
  }

  console.log(`\nAPPLY completo: grader_profile creado ${result.publicId ?? result.profileId}.`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    if (err instanceof ProvisionGraderProfileError && err.code === 'website_required') {
      console.error('\nLa org no tiene website_url canónica. Corre el backfill TASK-1285 primero.')
      process.exit(1)
    }

    console.error('FAIL:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
