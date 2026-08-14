/**
 * TASK-1661 — Sanity live de `seo_keyword_market_data` contra PG real.
 *
 * Verifica los invariantes que los mocks NO pueden probar, porque viven en la base:
 *   1. la tabla, su UNIQUE, su trigger append-only y sus GRANTs existen de verdad;
 *   2. un refetch el MISMO día no duplica (idempotencia por keyword+mercado+fecha);
 *   3. un refetch en OTRO día AGREGA una captura (el histórico de volumen es la señal);
 *   4. UPDATE y DELETE están bloqueados por el trigger — sobrescribir destruiría ese histórico;
 *   5. `search_volume` acepta NULL y RECHAZA valores negativos ("no consultado" != "cero").
 *
 * Uso (proxy en 127.0.0.1:15432 — `pnpm pg:connect` lo levanta):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/_sanity-task-1661-market-data.ts
 *
 * ⚠️ POR QUÉ NO LIMPIA CON `DELETE` COMO OTROS SANITY DEL REPO:
 * la tabla es append-only y su trigger bloquea DELETE, así que las filas de prueba NO se pueden
 * borrar. La única salida segura es una transacción que aborta, y tiene que ser sobre una
 * CONEXIÓN FIJADA: `runGreenhousePostgresQuery` toma una conexión del pool por llamada, así que
 * un `BEGIN` suelto no cubre lo que sigue y las escrituras quedarían permanentes pese al
 * `ROLLBACK` (hallazgo TASK-1300; un `SAVEPOINT` revienta con 25P01 y lo demuestra).
 */
import { config } from 'dotenv'

config({ path: '.env.local' })
process.env.GREENHOUSE_POSTGRES_HOST = '127.0.0.1'
process.env.GREENHOUSE_POSTGRES_PORT = '15432'
process.env.GREENHOUSE_POSTGRES_SSL = 'false'
delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
process.env.GREENHOUSE_POSTGRES_USER = process.env.GREENHOUSE_POSTGRES_OPS_USER
process.env.GREENHOUSE_POSTGRES_PASSWORD = process.env.GREENHOUSE_POSTGRES_OPS_PASSWORD

const ROLLBACK_SENTINEL = 'sanity-rollback'
const TABLE = 'greenhouse_growth.seo_keyword_market_data'

const main = async () => {
  const { withGreenhousePostgresTransaction, runGreenhousePostgresQuery } = await import(
    '@/lib/postgres/client'
  )

  const checks: Array<[string, boolean]> = []

  const record = (label: string, passed: boolean) => {
    checks.push([label, passed])
    if (!passed) process.exitCode = 1
  }

  // ── Estructura (no requiere escribir nada) ────────────────────────────────

  const structure = await runGreenhousePostgresQuery<{
    has_unique: boolean
    has_trigger: boolean
    location_code_type: string
    volume_nullable: string
    runtime_can_delete: boolean
  }>(`
    SELECT
      EXISTS (SELECT 1 FROM pg_constraint
               WHERE conname = 'seo_keyword_market_data_capture_unique')            AS has_unique,
      EXISTS (SELECT 1 FROM pg_trigger
               WHERE tgname = 'trg_seo_keyword_market_data_append_only'
                 AND NOT tgisinternal)                                              AS has_trigger,
      (SELECT data_type FROM information_schema.columns
        WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_keyword_market_data'
          AND column_name = 'location_code')                                        AS location_code_type,
      (SELECT is_nullable FROM information_schema.columns
        WHERE table_schema = 'greenhouse_growth' AND table_name = 'seo_keyword_market_data'
          AND column_name = 'search_volume')                                        AS volume_nullable,
      EXISTS (SELECT 1 FROM information_schema.role_table_grants
               WHERE table_schema = 'greenhouse_growth'
                 AND table_name = 'seo_keyword_market_data'
                 AND grantee = 'greenhouse_runtime'
                 AND privilege_type = 'DELETE')                                     AS runtime_can_delete
  `)

  const s = structure[0]

  record('UNIQUE de idempotencia existe', s?.has_unique === true)
  record('trigger append-only existe', s?.has_trigger === true)
  record('location_code es TEXT (espeja seo_targets)', s?.location_code_type === 'text')
  record('search_volume es NULLABLE (NULL != 0)', s?.volume_nullable === 'YES')
  record('runtime NO tiene GRANT DELETE', s?.runtime_can_delete === false)

  const before = (
    await runGreenhousePostgresQuery<{ n: string }>(`SELECT COUNT(*)::text AS n FROM ${TABLE}`)
  )[0]?.n

  // ── Comportamiento (todo dentro de una transacción que aborta) ────────────

  const org = (
    await runGreenhousePostgresQuery<{ organization_id: string }>(
      `SELECT organization_id FROM greenhouse_core.organizations LIMIT 1`
    )
  )[0]

  if (!org) {
    console.error('No hay organizaciones: no se puede ejercitar la escritura.')
    process.exit(1)
  }

  const insert = `
    INSERT INTO ${TABLE}
      (normalized_keyword, keyword, location_code, language_code, capture_date,
       search_volume, keyword_difficulty, source_endpoint, captured_by_organization_id)
    VALUES ($1, $2, '2152', 'es', $3::date, $4, $5, 'keyword_overview', $6)
    ON CONFLICT ON CONSTRAINT seo_keyword_market_data_capture_unique DO NOTHING`

  try {
    await withGreenhousePostgresTransaction(async client => {
      const kw = `sanity-1661-${Date.now()}`

      await client.query(insert, [kw, kw, '2026-01-15', 1300, 42, org.organization_id])

      // (2) mismo día, otro valor → el ON CONFLICT lo absorbe: sigue habiendo UNA fila.
      await client.query(insert, [kw, kw, '2026-01-15', 9999, 1, org.organization_id])

      const sameDay = await client.query<{ n: string; v: string }>(
        `SELECT COUNT(*)::text AS n, MAX(search_volume)::text AS v FROM ${TABLE} WHERE normalized_keyword = $1`,
        [kw]
      )

      record('refetch el mismo día NO duplica', sameDay.rows[0]?.n === '1')
      record('refetch el mismo día NO sobrescribe el valor', sameDay.rows[0]?.v === '1300')

      // (3) otro día → captura nueva, el histórico crece.
      await client.query(insert, [kw, kw, '2026-02-15', 1500, 44, org.organization_id])

      const otherDay = await client.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM ${TABLE} WHERE normalized_keyword = $1`,
        [kw]
      )

      record('refetch en otro día AGREGA captura', otherDay.rows[0]?.n === '2')

      // (4) el trigger bloquea UPDATE y DELETE.
      let updateBlocked = false

      try {
        await client.query(`UPDATE ${TABLE} SET search_volume = 1 WHERE normalized_keyword = $1`, [kw])
      } catch {
        updateBlocked = true
      }

      record('trigger bloquea UPDATE', updateBlocked)

      let deleteBlocked = false

      try {
        await client.query(`DELETE FROM ${TABLE} WHERE normalized_keyword = $1`, [kw])
      } catch {
        deleteBlocked = true
      }

      record('trigger bloquea DELETE', deleteBlocked)

      throw new Error(ROLLBACK_SENTINEL)
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK_SENTINEL) throw error
  }

  // Un CHECK violado aborta la transacción entera, así que los casos negativos van aparte.
  for (const [label, volume] of [['search_volume negativo', -1] as const]) {
    let rejected = false

    try {
      await withGreenhousePostgresTransaction(async client => {
        await client.query(insert, [`sanity-neg-${Date.now()}`, 'x', '2026-01-15', volume, 10, org.organization_id])
        throw new Error(ROLLBACK_SENTINEL)
      })
    } catch (error) {
      rejected = !(error instanceof Error) || error.message !== ROLLBACK_SENTINEL
    }

    record(`CHECK rechaza ${label}`, rejected)
  }

  // NULL sí debe aceptarse: "no consultado".
  let nullAccepted = false

  try {
    await withGreenhousePostgresTransaction(async client => {
      await client.query(insert, [`sanity-null-${Date.now()}`, 'x', '2026-01-15', null, null, org.organization_id])
      nullAccepted = true
      throw new Error(ROLLBACK_SENTINEL)
    })
  } catch (error) {
    if (!(error instanceof Error) || error.message !== ROLLBACK_SENTINEL) throw error
  }

  record('acepta search_volume NULL ("no consultado")', nullAccepted)

  const after = (
    await runGreenhousePostgresQuery<{ n: string }>(`SELECT COUNT(*)::text AS n FROM ${TABLE}`)
  )[0]?.n

  record(`residuo cero (antes=${before} despues=${after})`, before === after)

  for (const [label, passed] of checks) console.log(`${passed ? 'OK  ' : 'FAIL'} ${label}`)
  process.exit(process.exitCode ?? 0)
}

void main()
