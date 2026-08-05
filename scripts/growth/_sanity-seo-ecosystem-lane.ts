/**
 * TASK-1645 — Sanity live del lane ecosystem SEO contra PG real (gate TASK-893).
 *
 * Ejercita los 3 payload builders con un context de binding sintético (org-scoped e
 * internal) y datos reales: asigna seo_v1 temporal a la org con ambas lentes (patrón
 * commit + try/finally — hallazgo TASK-1300), verifica anti-oracle sin entitlement,
 * target_not_configured, passthrough con quadrant real y el payload de entitlement.
 *
 * Uso: npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-seo-ecosystem-lane.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD
process.env.GROWTH_SEO_ENABLED = 'true'

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const {
    getEcosystemSeoEntitlementPayload,
    getEcosystemSeoKeywordOpportunitiesPayload,
    getEcosystemSeoVisibility360Payload
  } = await import('@/lib/api-platform/resources/ecosystem-growth-seo')

  // Org con ambas lentes (dos consultas separadas, intersección en JS — boundary).
  const aeoOrgs = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT DISTINCT p.organization_id FROM greenhouse_growth.grader_runs r
      JOIN greenhouse_growth.grader_profiles p ON p.profile_id = r.profile_id
     WHERE p.organization_id IS NOT NULL AND r.status IN ('succeeded','partial')`
  )

  const gscOrgs = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT DISTINCT organization_id FROM greenhouse_growth.seo_gsc_daily`
  )

  const gscSet = new Set(gscOrgs.map(r => r.organization_id))
  const org = aeoOrgs.map(r => r.organization_id).find(id => gscSet.has(id))

  if (!org) {
    console.log('sin org con ambas lentes — smoke abortado (no es fallo del lane)')
    process.exit(0)
  }

  const ctxOrg = { binding: { greenhouseScopeType: 'organization', organizationId: org }, consumer: { consumerId: 'sanity', sisterPlatformKey: 'sanity' } } as never
  const ctxInternal = { binding: { greenhouseScopeType: 'internal', organizationId: null }, consumer: { consumerId: 'sanity', sisterPlatformKey: 'sanity' } } as never
  const req = (q = '') => new Request(`https://sanity.local/x?${q}`)

  // 1. Sin entitlement → 404 anti-oracle
  try {
    await getEcosystemSeoVisibility360Payload({ context: ctxOrg, request: req() })
    console.log('✗ 1. esperaba 404 anti-oracle sin entitlement')
    process.exitCode = 1
  } catch (e) {
    console.log('✓ 1. sin entitlement → 404 anti-oracle:', (e as { statusCode?: number }).statusCode === 404)
  }

  // 1b. Entitlement payload SIN anti-oracle
  const ent0 = await getEcosystemSeoEntitlementPayload({ context: ctxOrg, request: req() })

  console.log('✓ 1b. entitlement payload hasModule =', ent0.data.hasModule, '(esperado false, visible)')
  if (ent0.data.hasModule !== false) process.exitCode = 1

  // 2. Con assignment → target_not_configured → luego passthrough real
  const id = 'cpma-smoke-1645-' + Date.now()

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_client_portal.module_assignments
       (assignment_id, organization_id, module_key, status, source, effective_from, metadata_json)
     VALUES ($1, $2, 'seo_v1', 'active', 'manual_admin', CURRENT_DATE, '{"seo_tier":"contracted"}'::jsonb)`,
    [id, org]
  )

  const targetId = 'seot-smoke-1645-' + Date.now()

  try {
    const noTarget = await getEcosystemSeoVisibility360Payload({ context: ctxOrg, request: req() })

    console.log('✓ 2. entitled sin target →', (noTarget.data as { errorCode?: string }).errorCode, '(esperado target_not_configured)')
    if ((noTarget.data as { errorCode?: string }).errorCode !== 'target_not_configured') process.exitCode = 1

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_growth.seo_targets (seo_target_id, organization_id, root_domain, location_code, language_code, created_by)
       VALUES ($1, $2, 'smoke-1645.cl', '2152', 'es', 'sanity-task-1645')`,
      [targetId, org]
    )

    const gap = await getEcosystemSeoVisibility360Payload({ context: ctxInternal, request: req(`organizationId=${org}`) })
    const gapData = gap.data as { ok?: boolean; domainQuadrant?: string; quadrants?: unknown[] }

    console.log(
      '✓ 3. visibility-360 (binding internal + param) → ok:', gapData.ok,
      '| domainQuadrant:', gapData.domainQuadrant, '| keywords:', Array.isArray(gapData.quadrants) ? gapData.quadrants.length : 0
    )
    if (gapData.ok !== true) process.exitCode = 1

    const opp = await getEcosystemSeoKeywordOpportunitiesPayload({ context: ctxOrg, request: req('limit=5') })
    const oppData = opp.data as { ok?: boolean; opportunities?: unknown[] }

    console.log('✓ 4. keyword-opportunities → ok:', oppData.ok, '| items:', Array.isArray(oppData.opportunities) ? oppData.opportunities.length : 0)

    const ent = await getEcosystemSeoEntitlementPayload({ context: ctxOrg, request: req() })

    console.log('✓ 5. entitlement → tier:', ent.data.tier, '| audits restantes:', ent.data.allowanceRemaining, '| budget USD:', ent.data.budgetRemainingUsd)
    if (ent.data.tier !== 'contracted') process.exitCode = 1

    // 6. Cross-org por binding org-scoped → 404
    try {
      await getEcosystemSeoVisibility360Payload({ context: ctxOrg, request: req('organizationId=org-ajena') })
      console.log('✗ 6. esperaba 404 en cross-org')
      process.exitCode = 1
    } catch (e) {
      console.log('✓ 6. cross-org con binding org-scoped → 404:', (e as { statusCode?: number }).statusCode === 404)
    }
  } finally {
    await runGreenhousePostgresQuery(`DELETE FROM greenhouse_growth.seo_targets WHERE seo_target_id = $1`, [targetId])
    await runGreenhousePostgresQuery(`DELETE FROM greenhouse_client_portal.module_assignments WHERE assignment_id = $1`, [id])
  }

  const residue = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM greenhouse_growth.seo_targets WHERE created_by = 'sanity-task-1645')::int
          + (SELECT COUNT(*) FROM greenhouse_client_portal.module_assignments WHERE assignment_id LIKE 'cpma-smoke-1645-%')::int AS n`
  )

  console.log('residuo:', residue[0].n, '(esperado 0)')
  if (residue[0].n !== 0) process.exitCode = 1
  console.log(process.exitCode === 1 ? '✗ SMOKE FALLÓ' : '✓ smoke live del lane completo')
  process.exit(process.exitCode ?? 0)
}

void main()
