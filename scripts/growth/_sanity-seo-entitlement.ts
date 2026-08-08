/**
 * TASK-1301 — Sanity live del chokepoint SEO contra PG real (gate TASK-893: la SQL
 * embebida con COALESCE/date_trunc/JOINs se ejercita contra Postgres, no solo mocks).
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-seo-entitlement.ts
 *
 * Inserta un assignment `seo_v2` de prueba, verifica habilitación/bloqueos del
 * chokepoint y lo borra (cero residuo).
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')
  const { resolveSeoEntitlement, enforceSeoRunEntitlement } = await import('@/lib/growth/seo/entitlement')

  const ref = await runGreenhousePostgresQuery<{ source: string }>(
    `SELECT source FROM greenhouse_client_portal.module_assignments WHERE module_key='ai_visibility_v1' LIMIT 1`
  )

  const source = ref[0]?.source ?? 'operator_grant'

  const org = (
    await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id FROM greenhouse_core.organizations ORDER BY organization_id LIMIT 1`
    )
  )[0].organization_id

  let e = await resolveSeoEntitlement(org)

  console.log('1. sin assignment →', e.blockedReason, '(esperado no_entitlement)')
  if (e.blockedReason !== 'no_entitlement') process.exitCode = 1

  const id = 'cpma-smoke-1301-' + Date.now()

  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_client_portal.module_assignments
       (assignment_id, organization_id, module_key, status, source, effective_from, metadata_json)
     VALUES ($1, $2, 'seo_v2', 'active', $3, CURRENT_DATE, '{"seo_tier":"contracted"}'::jsonb)`,
    [id, org, source]
  )

  try {
    e = await resolveSeoEntitlement(org)
    const gate = await enforceSeoRunEntitlement(org, { estimatedCostUsd: 1.5 })

    console.log(
      '2. con assignment → tier', e.tier, '| audits', `${e.allowanceUsed}/${e.allowanceCap}`,
      '| budget usado $' + e.budgetUsedUsd, '| gate.allowed =', gate.allowed, '(esperado true)'
    )
    if (!gate.allowed || e.tier !== 'contracted') process.exitCode = 1

    const gateBig = await enforceSeoRunEntitlement(org, { estimatedCostUsd: 9999 })

    console.log('3. costo estimado 9999 → allowed =', gateBig.allowed, '| reason =', gateBig.blockedReason, '(esperado budget_exhausted)')
    if (gateBig.allowed || gateBig.blockedReason !== 'budget_exhausted') process.exitCode = 1
  } finally {
    // Hallazgo TASK-1300 (2026-08-05): BEGIN/ROLLBACK a través del pool NO es seguro
    // (una conexión por llamada). Patrón canónico de sanity: writes commiteados +
    // cleanup en finally para no dejar residuo aunque un assert reviente.
    await runGreenhousePostgresQuery(`DELETE FROM greenhouse_client_portal.module_assignments WHERE assignment_id = $1`, [id])
  }

  e = await resolveSeoEntitlement(org)
  console.log('4. revocado →', e.blockedReason, '(esperado no_entitlement)')
  if (e.blockedReason !== 'no_entitlement') process.exitCode = 1

  const left = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM greenhouse_client_portal.module_assignments WHERE module_key='seo_v2'`
  )

  console.log('filas seo_v2 residuales:', left[0].n, '(esperado 0)')
  console.log(process.exitCode === 1 ? '✗ SMOKE FALLÓ' : '✓ smoke E2E completo')
  process.exit(process.exitCode ?? 0)
}

void main()
