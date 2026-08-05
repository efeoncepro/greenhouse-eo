/**
 * TASK-1305 — Sanity live de `readSeoAeoGap` contra PG real (gate TASK-893).
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-seo-aeo-gap.ts
 *
 * Patrón transaccional (hallazgo TASK-1300, 2026-08-05): NO usa BEGIN/ROLLBACK a través
 * del pool — `runGreenhousePostgresQuery` toma una conexión por llamada, así que un BEGIN
 * no cubre lo que sigue; además el reader usa el pool y no vería data no commiteada.
 * Canónico para sanity: writes COMMITEADOS + cleanup en `try/finally`.
 *
 * Elige una org que YA tenga run reportable del grader; le inserta un seo_target de
 * prueba (config, deletable), ejercita el reader (ok o degradación honesta según tenga
 * o no filas GSC) y limpia SIEMPRE.
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
  const { readSeoAeoGap } = await import('@/lib/growth/seo/gap/read-seo-aeo-gap')

  // Dos consultas SEPARADAS (espíritu del boundary): orgs con lente AEO y orgs con GSC;
  // la intersección se decide en JS.
  const aeoOrgs = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT DISTINCT p.organization_id
       FROM greenhouse_growth.grader_runs r
       JOIN greenhouse_growth.grader_profiles p ON p.profile_id = r.profile_id
      WHERE p.organization_id IS NOT NULL
        AND r.status IN ('succeeded', 'partial')`
  )

  const gscOrgs = await runGreenhousePostgresQuery<{ organization_id: string }>(
    `SELECT DISTINCT organization_id FROM greenhouse_growth.seo_gsc_daily`
  )

  const gscSet = new Set(gscOrgs.map(r => r.organization_id))
  const both = aeoOrgs.map(r => r.organization_id).find(id => gscSet.has(id))
  const onlyAeo = aeoOrgs.map(r => r.organization_id).find(id => !gscSet.has(id))

  console.log(`orgs con lente AEO: ${aeoOrgs.length} | con GSC: ${gscOrgs.length} | con ambas: ${both ? 'sí' : 'no'}`)

  // 0. target inexistente → target_not_found (no requiere data).
  const notFound = await readSeoAeoGap('seot-inexistente')

  console.log('0. target inexistente →', notFound.ok === false && notFound.errorCode, '(esperado target_not_found)')
  if (notFound.ok !== false || notFound.errorCode !== 'target_not_found') process.exitCode = 1

  const exercise = async (label: string, organizationId: string, expected: string) => {
    const targetId = 'seot-smoke-1305-' + Date.now()

    await runGreenhousePostgresQuery(
      `INSERT INTO greenhouse_growth.seo_targets
         (seo_target_id, organization_id, root_domain, location_code, language_code, created_by)
       VALUES ($1, $2, 'smoke-1305.cl', '2152', 'es', 'sanity-task-1305')`,
      [targetId, organizationId]
    )

    try {
      const r = await readSeoAeoGap(targetId)

      if (r.ok) {
        console.log(
          `${label} → ok:true | keywords=${r.seoLens.keywords.length} | aeo=${r.aeoLens.overallScore}` +
            ` | domainQuadrant=${r.domainQuadrant} | quadrants[0]=${JSON.stringify(r.quadrants[0])}`
        )
        if (expected !== 'ok') process.exitCode = 1
      } else {
        console.log(`${label} → ok:false ${r.errorCode} (esperado ${expected})`)
        if (r.errorCode !== expected) process.exitCode = 1
      }
    } finally {
      await runGreenhousePostgresQuery(
        `DELETE FROM greenhouse_growth.seo_targets WHERE seo_target_id = $1`,
        [targetId]
      )
    }
  }

  if (both) {
    await exercise('1. org con AMBAS lentes', both, 'ok')
  } else {
    console.log('1. (sin org con ambas lentes en esta instancia — se ejercita la degradación)')
  }

  if (onlyAeo) {
    await exercise('2. org solo-AEO (sin GSC)', onlyAeo, 'no_seo_data')
  }

  const anyGscOnly = gscOrgs.map(r => r.organization_id).find(id => !aeoOrgs.some(a => a.organization_id === id))

  if (anyGscOnly) {
    await exercise('3. org solo-GSC (sin grader)', anyGscOnly, 'no_aeo_data')
  }

  const residue = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM greenhouse_growth.seo_targets WHERE created_by = 'sanity-task-1305'`
  )

  console.log('targets residuales:', residue[0].n, '(esperado 0)')
  if (residue[0].n !== 0) process.exitCode = 1

  console.log(process.exitCode === 1 ? '✗ SMOKE FALLÓ' : '✓ smoke live completo')
  process.exit(process.exitCode ?? 0)
}

void main()
