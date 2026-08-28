/**
 * TASK-1300 — Sanity live del ledger de gasto contra PG real.
 *
 * Gate TASK-893: el UPSERT con incrementos atómicos, el CHECK del allowlist y la agregación
 * del mes se ejercitan contra PostgreSQL. Un mock confirmaría la intención del TS, no que el
 * SQL acumule en vez de pisar.
 *
 * ⚠️ POR QUÉ USA UNA CONEXIÓN FIJADA Y NO `runGreenhousePostgresQuery` + BEGIN/ROLLBACK:
 * ese helper toma una conexión del pool POR LLAMADA, así que un `BEGIN` no cubre las
 * llamadas siguientes — pueden salir por otra conexión, no ver los datos de la transacción
 * y (peor) dejar escrituras fuera del rollback. Se descubrió acá: un `SAVEPOINT` reventó con
 * `25P01 CheckTransactionBlock`. Por eso todo corre dentro de `withGreenhousePostgresTransaction`,
 * que sí fija el cliente, y se aborta al final para garantizar cero residuo.
 *
 * Consecuencia: se ejercita el SQL EXPORTADO por el módulo (no una copia), porque las
 * funciones TS usan el pool por dentro y no podrían ver esta transacción.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-seo-provider-spend.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

/** Sentinel para forzar el ROLLBACK del helper, que en el camino feliz haría COMMIT. */
const ROLLBACK_SENTINEL = 'sanity-rollback'

const main = async () => {
  const { withGreenhousePostgresTransaction, runGreenhousePostgresQuery } = await import(
    '@/lib/postgres/client'
  )

  const { SEO_PROVIDER_SPEND_UPSERT_SQL, buildSeoProviderSpendMonthlySumSql } = await import(
    '@/lib/growth/seo/provider-spend'
  )

  const org = (
    await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id FROM greenhouse_core.organizations LIMIT 1`
    )
  )[0]

  if (!org) {
    console.error('No hay organizaciones: no se puede ejercitar el ledger.')
    process.exit(1)
  }

  const checks: Array<[string, boolean]> = []

  try {
    await withGreenhousePostgresTransaction(async client => {
      const orgId = org.organization_id

      // 1. Tres llamadas de la MISMA familia/día acumulan en una sola fila.
      // TASK-1696 — el UPSERT productivo declara consumidor y base de costo.
      await client.query(SEO_PROVIDER_SPEND_UPSERT_SQL, [orgId, 'labs', 0.01, 'seo', 'invoiced', null])
      await client.query(SEO_PROVIDER_SPEND_UPSERT_SQL, [orgId, 'labs', 0.02, 'seo', 'invoiced', null])
      await client.query(SEO_PROVIDER_SPEND_UPSERT_SQL, [orgId, 'labs', 0.005, 'seo', 'invoiced', null])

      const labs = (
        await client.query<{ call_count: number; provider_cost_usd: string }>(
          `SELECT call_count, provider_cost_usd::text AS provider_cost_usd
             FROM greenhouse_growth.seo_provider_spend_daily
            WHERE organization_id = $1 AND family = 'labs' AND spend_date = CURRENT_DATE`,
          [orgId]
        )
      ).rows[0]

      checks.push(['3 llamadas -> 1 sola fila (UNIQUE de idempotencia)', labs !== undefined])
      checks.push(['call_count acumula a 3 en vez de pisarse', Number(labs?.call_count) === 3])
      checks.push([
        'provider_cost_usd suma 0.035 exacto (NUMERIC, sin deriva de float)',
        Number(labs?.provider_cost_usd) === 0.035
      ])

      // 2. Otra familia el mismo día NO comparte fila: el grano por familia es real.
      await client.query(SEO_PROVIDER_SPEND_UPSERT_SQL, [orgId, 'backlinks', 0.02, 'seo', 'invoiced', null])

      const perFamily = (
        await client.query<{ family: string; cost: string }>(
          `SELECT family, SUM(provider_cost_usd)::text AS cost
             FROM greenhouse_growth.seo_provider_spend_daily
            WHERE organization_id = $1 AND spend_date = CURRENT_DATE
            GROUP BY family ORDER BY family`,
          [orgId]
        )
      ).rows

      checks.push(['el gasto queda separado por familia', perFamily.length === 2])

      // 3. El CHECK de la base rechaza una familia fuera del allowlist.
      // Va en un SAVEPOINT: en PostgreSQL un statement fallido ABORTA la transacción entera
      // y todo lo posterior quedaría inutilizable.
      await client.query('SAVEPOINT familia_invalida')

      try {
        await client.query(
          `INSERT INTO greenhouse_growth.seo_provider_spend_daily
             (organization_id, family, spend_date, call_count, provider_cost_usd, consumer, cost_basis)
           VALUES ($1, 'keywords_data', CURRENT_DATE, 1, 0.01, 'seo', 'invoiced')`,
          [orgId]
        )
        await client.query('RELEASE SAVEPOINT familia_invalida')
        checks.push(['el CHECK rechaza una familia fuera del allowlist', false])
      } catch {
        await client.query('ROLLBACK TO SAVEPOINT familia_invalida')
        checks.push(['el CHECK rechaza una familia fuera del allowlist', true])
      }

      // 4. El fragmento que consume el gate de presupuesto ve el total del mes.
      const spend = (
        await client.query<{ spend: string }>(
          `SELECT ${buildSeoProviderSpendMonthlySumSql('$1')}::text AS spend`,
          [orgId]
        )
      ).rows[0]

      checks.push([
        'el fragmento del gate suma 0.055 (fuente única, sin doble conteo)',
        Number(spend?.spend) === 0.055
      ])

      console.log(`gasto del mes leído por el gate: USD ${spend?.spend}`)
      console.log(`desglose: ${perFamily.map(row => `${row.family}=${row.cost}`).join(', ')}`)

      // Aborta SIEMPRE: el helper haría COMMIT en el camino feliz y esto es una prueba.
      throw new Error(ROLLBACK_SENTINEL)
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK_SENTINEL) throw error
  }

  let failures = 0

  for (const [label, passed] of checks) {
    console.log(`${passed ? '✓' : '✗'} ${label}`)
    if (!passed) failures += 1
  }

  // ⚠️ TASK-1696 — el residuo se mide SOBRE LA ORGANIZACIÓN Y EL DÍA que este script tocó, no
  // sobre la tabla entera: el ledger ya tiene gasto productivo real (el cron diario de rank
  // capture escribe todos los días). Un `COUNT(*) = 0` global fallaría por dato legítimo y
  // enseñaría a ignorar el check.
  const residue = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT COUNT(*)::text AS n
       FROM greenhouse_growth.seo_provider_spend_daily
      WHERE organization_id = $1
        AND spend_date = CURRENT_DATE
        AND family IN ('labs', 'backlinks')`,
    [org.organization_id]
  )

  const clean = residue[0]?.n === '0'

  checks.push(['cero residuo tras el rollback', clean])
  console.log(`${clean ? '✓' : '✗'} cero residuo tras el rollback (${residue[0]?.n} filas de prueba)`)

  if (!clean) failures += 1

  if (failures > 0) {
    console.error(`\nFAIL — ${failures} verificación(es) fallaron.`)
    process.exit(1)
  }

  console.log('\nOK — el ledger acumula, el allowlist se defiende en la base y el gate lee el total.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
