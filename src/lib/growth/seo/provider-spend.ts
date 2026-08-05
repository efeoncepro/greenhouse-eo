/**
 * TASK-1300 — Writer del ledger de gasto DataForSEO.
 *
 * Vive en el dominio growth y NO en `src/lib/ai/`: el cliente genérico no debe conocer una
 * tabla de `greenhouse_growth`. El cliente expone un hook (`setDataForSeoSpendRecorder`) y
 * este módulo lo llena — la dependencia apunta de growth hacia ai, nunca al revés.
 */

import 'server-only'

import { type DataForSeoFamily } from '@/lib/ai/dataforseo-families'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface RecordSeoProviderSpendInput {
  organizationId: string
  family: DataForSeoFamily
  cost: number
}

/**
 * Acumula una llamada cobrada en la fila del día.
 *
 * ⚠️ INCREMENTOS ATÓMICOS EN SQL, no read-modify-write. Con varios crons corriendo en
 * paralelo (y el ops-worker puede escalar a varias instancias), leer el total en TS y
 * escribirlo de vuelta perdería llamadas silenciosamente: dos procesos leerían el mismo
 * valor y el segundo pisaría al primero. `col = col + EXCLUDED.col` deja que PostgreSQL
 * serialice el incremento sobre la fila bloqueada por el `ON CONFLICT`.
 *
 * El costo se ignora si no es un número finito positivo: una llamada sin costo declarado no
 * debe crear una fila de gasto cero que después alguien lea como "se llamó y salió gratis".
 */
/**
 * SQL del UPSERT, exportado para que el sanity live (`_sanity-seo-provider-spend.ts`) ejercite
 * EXACTAMENTE el mismo statement contra PostgreSQL. Sin esto, el script tendría su propia
 * copia y podría quedar verde mientras el SQL productivo deriva.
 */
export const SEO_PROVIDER_SPEND_UPSERT_SQL = `INSERT INTO greenhouse_growth.seo_provider_spend_daily
       (organization_id, family, spend_date, call_count, provider_cost_usd)
     VALUES ($1, $2, CURRENT_DATE, 1, $3::numeric)
     ON CONFLICT (organization_id, family, spend_date)
     DO UPDATE SET
       call_count        = greenhouse_growth.seo_provider_spend_daily.call_count + 1,
       provider_cost_usd = greenhouse_growth.seo_provider_spend_daily.provider_cost_usd + EXCLUDED.provider_cost_usd,
       updated_at        = NOW()`

/**
 * Fragmento canónico del gasto del mes por organización.
 *
 * Lo consume `enforceSeoRunEntitlement` como subquery de su SELECT y el sanity live lo
 * ejercita tal cual: una sola definición del "cuánto lleva gastado esta organización".
 */
export const SEO_PROVIDER_SPEND_MONTHLY_SUM_SQL = `COALESCE((SELECT SUM(sp.provider_cost_usd)
          FROM greenhouse_growth.seo_provider_spend_daily sp
         WHERE sp.organization_id = $1
           AND sp.spend_date >= date_trunc('month', CURRENT_DATE)::date), 0)`

export const recordSeoProviderSpend = async (input: RecordSeoProviderSpendInput): Promise<void> => {
  if (!Number.isFinite(input.cost) || input.cost <= 0) return

  await runGreenhousePostgresQuery(SEO_PROVIDER_SPEND_UPSERT_SQL, [
    input.organizationId,
    input.family,
    input.cost
  ])
}

export interface SeoProviderSpendByFamily {
  family: DataForSeoFamily
  callCount: number
  costUsd: number
}

/**
 * Gasto del mes en curso por familia, para una organización.
 *
 * Read de observabilidad/atribución: el gate de presupuesto usa el total y vive en
 * `enforceSeoRunEntitlement`; esto sirve para responder "¿en qué se fue el presupuesto?".
 */
export const readSeoProviderSpendByFamily = async (
  organizationId: string
): Promise<SeoProviderSpendByFamily[]> => {
  const rows = await runGreenhousePostgresQuery<{
    family: string
    call_count: string
    cost_usd: string
  }>(
    `SELECT family,
            SUM(call_count)::text        AS call_count,
            SUM(provider_cost_usd)::text AS cost_usd
       FROM greenhouse_growth.seo_provider_spend_daily
      WHERE organization_id = $1
        AND spend_date >= date_trunc('month', CURRENT_DATE)::date
      GROUP BY family
      ORDER BY SUM(provider_cost_usd) DESC`,
    [organizationId]
  )

  return rows.map(row => ({
    family: row.family as DataForSeoFamily,
    callCount: Number(row.call_count),
    costUsd: Number(row.cost_usd)
  }))
}
