/**
 * TASK-1696 — Sanity live de la dimensión de consumidor contra PG real.
 *
 * Ejercita el `SEO_PROVIDER_SPEND_UPSERT_SQL` PRODUCTIVO (el exportado, no una copia) y el
 * fragmento canónico del presupuesto SEO contra PostgreSQL. Lo que un mock no puede probar:
 *   1. que dos consumidores el mismo día sobre la misma familia dejen DOS filas, no un total
 *      mezclado — o sea que la UNIQUE de 4 columnas y el `ON CONFLICT` estén de acuerdo;
 *   2. que el fragmento del gate SEO NO vea el dólar del grader;
 *   3. que el CHECK acoplado rechace las dos mentiras posibles sobre `cost_basis`.
 *
 * ⚠️ COMMIT + LIMPIEZA EN `try/finally`, no BEGIN/ROLLBACK cross-pool. `runGreenhousePostgresQuery`
 * toma una conexión del pool POR LLAMADA: un `BEGIN` no cubre las llamadas siguientes (pueden
 * salir por otra conexión, no ver los datos de la transacción y dejar escrituras fuera del
 * rollback; un SAVEPOINT revienta con `25P01`). Acá se escribe de verdad y se borra al final —
 * por eso el borrado está acotado a la organización, el día y las familias de prueba.
 *
 * ⚠️ El ledger es productivo: el cron `ops-seo-rank-capture` escribe todos los días. Este script
 * usa la familia `onpage` (que el cron no toca) y limpia sólo lo que él insertó.
 *
 * Uso (proxy en 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-provider-spend-consumer.ts
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const TEST_FAMILY = 'onpage'

const main = async () => {
  const { runGreenhousePostgresQuery } = await import('@/lib/postgres/client')

  const { SEO_PROVIDER_SPEND_UPSERT_SQL, buildSeoProviderSpendMonthlySumSql, readSeoProviderSpendByConsumer } =
    await import('@/lib/growth/seo/provider-spend')

  // Organización SIN gasto hoy en la familia de prueba: el aserto del gate compara totales y una
  // fila preexistente lo volvería no determinista.
  const org = (
    await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT o.organization_id
         FROM greenhouse_core.organizations o
        WHERE NOT EXISTS (
                SELECT 1 FROM greenhouse_growth.seo_provider_spend_daily sp
                 WHERE sp.organization_id = o.organization_id
                   AND sp.spend_date >= date_trunc('month', CURRENT_DATE)::date)
        ORDER BY o.organization_id
        LIMIT 1`
    )
  )[0]

  if (!org) {
    console.error('No hay organización sin gasto este mes: el aserto del gate no sería determinista.')
    process.exit(1)
  }

  const orgId = org.organization_id
  const checks: Array<[string, boolean]> = []

  try {
    // 1. Dos llamadas SEO + una AEO, misma familia y mismo día.
    await runGreenhousePostgresQuery(SEO_PROVIDER_SPEND_UPSERT_SQL, [orgId, TEST_FAMILY, 0.02, 'seo', 'invoiced', null])
    await runGreenhousePostgresQuery(SEO_PROVIDER_SPEND_UPSERT_SQL, [orgId, TEST_FAMILY, 0.03, 'seo', 'invoiced', null])
    await runGreenhousePostgresQuery(SEO_PROVIDER_SPEND_UPSERT_SQL, [orgId, TEST_FAMILY, 0.07, 'aeo', 'invoiced', null])

    const rows = await runGreenhousePostgresQuery<{ consumer: string; call_count: number; cost: string }>(
      `SELECT consumer, call_count, provider_cost_usd::text AS cost
         FROM greenhouse_growth.seo_provider_spend_daily
        WHERE organization_id = $1 AND family = $2 AND spend_date = CURRENT_DATE
        ORDER BY consumer`,
      [orgId, TEST_FAMILY]
    )

    checks.push(['dos consumidores el mismo día = DOS filas, no un total mezclado', rows.length === 2])
    checks.push([
      'el consumidor SEO acumuló 2 llamadas / USD 0.05 (el UPSERT sigue acumulando)',
      rows.find(row => row.consumer === 'seo')?.call_count === 2 &&
        Number(rows.find(row => row.consumer === 'seo')?.cost) === 0.05
    ])
    checks.push([
      'el consumidor AEO quedó aparte con USD 0.07',
      Number(rows.find(row => row.consumer === 'aeo')?.cost) === 0.07
    ])

    // 2. 🔴 El gate SEO NO ve el dólar del grader. Es el aserto que justifica que el filtro y el
    //    ON CONFLICT viajen en el mismo commit.
    const gate = (
      await runGreenhousePostgresQuery<{ spend: string }>(
        `SELECT ${buildSeoProviderSpendMonthlySumSql('$1')}::text AS spend`,
        [orgId]
      )
    )[0]

    checks.push([
      'el fragmento del gate SEO suma 0.05 y NO el 0.07 del grader',
      Number(gate?.spend) === 0.05
    ])

    // 3. El reader de atribución separa consumidores y bases de costo sin mezclarlas.
    const attribution = await readSeoProviderSpendByConsumer(orgId)
    const aeoTotal = attribution.totals.find(total => total.consumer === 'aeo')
    const seoTotal = attribution.totals.find(total => total.consumer === 'seo')

    checks.push([
      'readSeoProviderSpendByConsumer reporta las dos monedas por separado',
      seoTotal?.invoicedUsd === 0.05 &&
        seoTotal?.estimatedUsd === 0 &&
        aeoTotal?.invoicedUsd === 0.07 &&
        aeoTotal?.estimatedUsd === 0
    ])

    // 4. El CHECK acoplado rechaza las DOS mentiras.
    const rejects = async (label: string, params: unknown[]): Promise<void> => {
      try {
        await runGreenhousePostgresQuery(SEO_PROVIDER_SPEND_UPSERT_SQL, params)
        checks.push([label, false])
      } catch {
        checks.push([label, true])
      }
    }

    await rejects("el CHECK rechaza 'estimated' sin versión de tabla de precios", [
      orgId,
      TEST_FAMILY,
      0.01,
      'seo',
      'estimated',
      null
    ])
    await rejects("el CHECK rechaza 'invoiced' con una versión inventada", [
      orgId,
      TEST_FAMILY,
      0.01,
      'seo',
      'invoiced',
      'precios-v1'
    ])
    await rejects('el CHECK rechaza un consumidor fuera del vocabulario', [
      orgId,
      TEST_FAMILY,
      0.01,
      'llm',
      'invoiced',
      null
    ])

    // 5. Un dólar estimado CON su versión sí entra, y queda separado del facturado.
    await runGreenhousePostgresQuery(SEO_PROVIDER_SPEND_UPSERT_SQL, [
      orgId,
      TEST_FAMILY,
      0.11,
      'aeo',
      'estimated',
      'sanity-price-table-v0'
    ])

    const withEstimated = await readSeoProviderSpendByConsumer(orgId)
    const aeoWithEstimated = withEstimated.totals.find(total => total.consumer === 'aeo')

    checks.push([
      'un dólar estimado entra con su versión y NO se suma al facturado',
      aeoWithEstimated?.invoicedUsd === 0.07 && aeoWithEstimated?.estimatedUsd === 0.11
    ])
  } finally {
    await runGreenhousePostgresQuery(
      `DELETE FROM greenhouse_growth.seo_provider_spend_daily
        WHERE organization_id = $1 AND family = $2 AND spend_date = CURRENT_DATE`,
      [orgId, TEST_FAMILY]
    )
  }

  const residue = await runGreenhousePostgresQuery<{ n: string }>(
    `SELECT COUNT(*)::text AS n
       FROM greenhouse_growth.seo_provider_spend_daily
      WHERE organization_id = $1 AND family = $2 AND spend_date = CURRENT_DATE`,
    [orgId, TEST_FAMILY]
  )

  checks.push(['cero residuo tras la limpieza', residue[0]?.n === '0'])

  let failures = 0

  for (const [label, passed] of checks) {
    console.log(`${passed ? '✓' : '✗'} ${label}`)
    if (!passed) failures += 1
  }

  if (failures > 0) {
    console.error(`\nFAIL — ${failures} verificación(es) fallaron.`)
    process.exit(1)
  }

  console.log('\nOK — el ledger separa consumidores, el gate SEO ignora el gasto AEO y la base defiende el acoplamiento.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
