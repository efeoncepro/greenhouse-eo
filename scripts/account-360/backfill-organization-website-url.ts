import 'server-only'

/**
 * TASK-1285 — Backfill idempotente de `greenhouse_core.organizations.website_url` desde el
 * raw layer `greenhouse_crm.companies.website_url` (de HubSpot domain/website).
 *
 * El sitio del cliente vivía sólo en el raw layer; la promoción crm→core nunca lo subía a la
 * org canónica. Este backfill llena el gap para las orgs existentes — SÓLO donde la org está
 * en NULL (nunca pisa un valor ya presente / human-edited) — usando el MISMO `normalizeWebsiteUrl`
 * que los writers (sin drift de formato). Idempotente: re-correrlo no cambia nada nuevo.
 *
 * DRY-RUN por defecto. `--apply` ejecuta los UPDATE.
 *
 * Uso:
 *   set -a && source .env.local && set +a
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/account-360/backfill-organization-website-url.ts          # dry-run
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/account-360/backfill-organization-website-url.ts --apply  # aplica
 */

import { normalizeWebsiteUrl } from '@/lib/account-360/normalize-website-url'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

const APPLY = process.argv.includes('--apply')

interface CandidateRow extends Record<string, unknown> {
  organization_id: string
  organization_name: string
  crm_website_url: string | null
}

const main = async (): Promise<void> => {
  const rows = await runGreenhousePostgresQuery<CandidateRow>(
    `SELECT o.organization_id, o.organization_name, c.website_url AS crm_website_url
       FROM greenhouse_core.organizations o
       JOIN greenhouse_crm.companies c ON c.hubspot_company_id = o.hubspot_company_id
      WHERE o.active = TRUE
        AND (o.website_url IS NULL OR o.website_url = '')
        AND c.website_url IS NOT NULL
      ORDER BY o.organization_name`
  )

  const planned: Array<{ id: string; name: string; normalized: string }> = []
  const junk: Array<{ name: string; raw: string }> = []

  for (const r of rows) {
    const normalized = normalizeWebsiteUrl(r.crm_website_url)

    if (normalized) {
      planned.push({ id: r.organization_id, name: r.organization_name, normalized })
    } else {
      junk.push({ name: r.organization_name, raw: r.crm_website_url ?? '' })
    }
  }

  console.log(`Backfill organizations.website_url — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Candidatos (org null + crm presente): ${rows.length}`)
  console.log(`  → normalizables: ${planned.length}`)
  console.log(`  → descartados (web cruda inválida): ${junk.length}`)
  planned.slice(0, 25).forEach(p => console.log(`    + ${p.name}: ${p.normalized}`))
  if (planned.length > 25) console.log(`    … (+${planned.length - 25} más)`)
  junk.slice(0, 10).forEach(j => console.log(`    - ${j.name}: "${j.raw}" → null`))

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply.')

    return
  }

  let updated = 0

  for (const p of planned) {
    // Guard idempotente en el propio UPDATE: sólo escribe si sigue NULL/vacío.
    const result = await runGreenhousePostgresQuery(
      `UPDATE greenhouse_core.organizations
          SET website_url = $2, updated_at = NOW()
        WHERE organization_id = $1
          AND (website_url IS NULL OR website_url = '')
        RETURNING organization_id`,
      [p.id, p.normalized]
    )

    if (result.length > 0) updated += 1
  }

  console.log(`\nAPPLY completo: ${updated} orgs backfilleadas.`)
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('FAIL:', err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
