/**
 * TASK-1300 — Sanity live del ledger de gasto contra PG real.
 *
 * Gate TASK-893: el UPSERT con incrementos atómicos y la lectura del mes se ejercitan contra
 * PostgreSQL, NUNCA sólo con mocks — un mock confirmaría la intención del TS, no que el SQL
 * acumule en vez de pisar.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-seo-provider-spend.ts
 *
 * Todo corre dentro de una transacción con ROLLBACK: cero residuo.
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

  const { recordSeoProviderSpend, readSeoProviderSpendByFamily } = await import(
    '@/lib/growth/seo/provider-spend'
  )

  const { resolveSeoEntitlement } = await import('@/lib/growth/seo/entitlement')

  const org = (
    await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id FROM greenhouse_core.organizations LIMIT 1`
    )
  )[0]

  if (!org) {
    console.error('No hay organizaciones: no se puede ejercitar el ledger.')
    process.exit(1)
  }

  await runGreenhousePostgresQuery('BEGIN')

  const checks: Array<[string, boolean]> = []

  // El veredicto se evalúa DESPUÉS del finally: un `process.exit` dentro del try se saltaría
  // el ROLLBACK y dejaría residuo en la base justo cuando algo salió mal.
  let failures = 0

  try {
    // 1. Tres llamadas de la MISMA familia/día acumulan en una sola fila.
    await recordSeoProviderSpend({ organizationId: org.organization_id, family: 'labs', cost: 0.01 })
    await recordSeoProviderSpend({ organizationId: org.organization_id, family: 'labs', cost: 0.02 })
    await recordSeoProviderSpend({ organizationId: org.organization_id, family: 'labs', cost: 0.005 })

    const labs = (
      await runGreenhousePostgresQuery<{ call_count: number; provider_cost_usd: string }>(
        `SELECT call_count, provider_cost_usd::text
           FROM greenhouse_growth.seo_provider_spend_daily
          WHERE organization_id = $1 AND family = 'labs' AND spend_date = CURRENT_DATE`,
        [org.organization_id]
      )
    )[0]

    checks.push(['3 llamadas -> 1 fila (UNIQUE de idempotencia)', labs !== undefined])
    checks.push(['call_count acumula a 3, no se pisa', Number(labs?.call_count) === 3])
    checks.push([
      'provider_cost_usd suma 0.035 exacto (NUMERIC, sin deriva float)',
      Number(labs?.provider_cost_usd) === 0.035
    ])

    // 2. Otra familia el mismo día NO comparte fila: el grano por familia es real.
    await recordSeoProviderSpend({ organizationId: org.organization_id, family: 'backlinks', cost: 0.02 })

    const families = await readSeoProviderSpendByFamily(org.organization_id)

    checks.push(['el gasto queda separado por familia', families.length === 2])
    checks.push([
      'la lectura por familia devuelve los totales correctos',
      families.find(f => f.family === 'labs')?.costUsd === 0.035 &&
        families.find(f => f.family === 'backlinks')?.callCount === 1
    ])

    // 3. Un costo no positivo no crea fila fantasma.
    await recordSeoProviderSpend({ organizationId: org.organization_id, family: 'domain', cost: 0 })

    const domainRows = await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_provider_spend_daily
        WHERE organization_id = $1 AND family = 'domain'`,
      [org.organization_id]
    )

    checks.push(['costo 0 no crea fila de gasto cero', domainRows[0]?.n === '0'])

    // 4. El CHECK de la base rechaza una familia fuera del allowlist.
    //
    // ⚠️ Va dentro de un SAVEPOINT: en PostgreSQL un statement que falla ABORTA la
    // transacción entera, y todo lo que siguiera se ejecutaría fuera de ella (viendo la base
    // sin los datos de prueba). Sin el savepoint, este check "aprobado" envenenaba los
    // siguientes y producía un falso negativo.
    await runGreenhousePostgresQuery('SAVEPOINT familia_invalida')

    try {
      await runGreenhousePostgresQuery(
        `INSERT INTO greenhouse_growth.seo_provider_spend_daily
           (organization_id, family, spend_date, call_count, provider_cost_usd)
         VALUES ($1, 'keywords_data', CURRENT_DATE, 1, 0.01)`,
        [org.organization_id]
      )
      await runGreenhousePostgresQuery('RELEASE SAVEPOINT familia_invalida')
      checks.push(['el CHECK rechaza una familia desconocida', false])
    } catch {
      await runGreenhousePostgresQuery('ROLLBACK TO SAVEPOINT familia_invalida')
      checks.push(['el CHECK rechaza una familia desconocida', true])
    }

    // 5. El gate de presupuesto LEE este ledger (fuente única, sin doble conteo).
    // Sonda previa con el MISMO SQL que usa el resolver, para distinguir un problema del
    // producto de un artefacto del pool de conexiones en esta transacción de prueba.
    const probe = await runGreenhousePostgresQuery<{ spend: string }>(
      `SELECT COALESCE((SELECT SUM(sp.provider_cost_usd)
          FROM greenhouse_growth.seo_provider_spend_daily sp
         WHERE sp.organization_id = $1
           AND sp.spend_date >= date_trunc('month', CURRENT_DATE)::date), 0)::text AS spend`,
      [org.organization_id]
    )

    console.log(`sonda del SQL del resolver: ${probe[0]?.spend}`)

    const entitlement = await resolveSeoEntitlement(org.organization_id)

    checks.push([
      'enforceSeoRunEntitlement lee el ledger como fuente de gasto',
      Math.abs(entitlement.budgetUsedUsd - 0.055) < 0.000001
    ])

    for (const [label, passed] of checks) {
      console.log(`${passed ? '✓' : '✗'} ${label}`)
      if (!passed) failures += 1
    }

    console.log(`\ngasto leído por el gate: USD ${entitlement.budgetUsedUsd}`)
    console.log(`desglose: ${families.map(f => `${f.family}=${f.costUsd}`).join(', ')}`)
  } finally {
    await runGreenhousePostgresQuery('ROLLBACK')

    const residue = await runGreenhousePostgresQuery<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM greenhouse_growth.seo_provider_spend_daily`
    )

    console.log(`residuo tras rollback: ${residue[0]?.n ?? '?'} filas`)
  }

  if (failures > 0) {
    console.error(`\nFAIL — ${failures} verificación(es) fallaron.`)
    process.exit(1)
  }

  console.log('\nOK — el ledger acumula y el gate lo lee, contra PG real.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
