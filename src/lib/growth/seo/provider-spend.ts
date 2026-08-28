/**
 * TASK-1300 — Writer del ledger de gasto DataForSEO.
 *
 * Vive en el dominio growth y NO en `src/lib/ai/`: el cliente genérico no debe conocer una
 * tabla de `greenhouse_growth`. El cliente expone un hook (`setDataForSeoSpendRecorder`) y
 * este módulo lo llena — la dependencia apunta de growth hacia ai, nunca al revés.
 */

import 'server-only'

import {
  DATAFORSEO_SPEND_CONSUMERS,
  type DataForSeoFamily,
  type DataForSeoSpendConsumer
} from '@/lib/ai/dataforseo-families'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1696 — De qué TIPO es el dólar de la fila.
 *
 * `invoiced`: lo cobró el proveedor y lo leyó el transporte de su respuesta. Es lo único que
 * existe hoy en la tabla.
 * `estimated`: lo calculamos nosotros con una tabla de precios referencial (el caso que viene:
 * gasto de tokens LLM con presupuesto per-org). Un dólar estimado NUNCA puede entrar sin declarar
 * con qué versión de tabla se estimó — la base lo acopla por CHECK.
 *
 * Sumar los dos tipos en una sola cifra y presentarla como un número solo no produce un dato
 * degradado, produce un dato FALSO: nadie podría responder después "¿esto lo facturó el proveedor
 * o lo estimamos?". Por eso todo reader del ledger corta por esta columna en vez de agregarla.
 *
 * Vocabulario CERRADO y espejado por CHECK en la base; la paridad la sostiene un test.
 */
export const SEO_PROVIDER_SPEND_COST_BASES = ['invoiced', 'estimated'] as const

export type SeoProviderSpendCostBasis = (typeof SEO_PROVIDER_SPEND_COST_BASES)[number]

export interface RecordSeoProviderSpendInput {
  organizationId: string
  family: DataForSeoFamily
  cost: number
  /**
   * Requerido a propósito: un caller nuevo no puede olvidarse de declarar quién gasta. Un
   * default silencioso ('seo') haría que el primer consumidor nuevo se contabilice contra el
   * presupuesto equivocado sin que nada falle — que es exactamente el modo de falla que esta
   * dimensión existe para cerrar.
   */
  consumer: DataForSeoSpendConsumer
  /** Default `invoiced`: el transporte sólo escribe dólares que el proveedor ya cobró. */
  costBasis?: SeoProviderSpendCostBasis
  /**
   * Obligatorio cuando `costBasis === 'estimated'`; prohibido cuando es `invoiced`. No es
   * convención: la base lo acopla por CHECK y rechaza la fila.
   */
  priceTableVersion?: string | null
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
       (organization_id, family, spend_date, call_count, provider_cost_usd, consumer, cost_basis, price_table_version)
     VALUES ($1, $2, CURRENT_DATE, 1, $3::numeric, $4, $5, $6)
     ON CONFLICT (organization_id, family, spend_date, consumer, cost_basis, price_table_version)
     DO UPDATE SET
       call_count        = greenhouse_growth.seo_provider_spend_daily.call_count + 1,
       provider_cost_usd = greenhouse_growth.seo_provider_spend_daily.provider_cost_usd + EXCLUDED.provider_cost_usd,
       updated_at        = NOW()`

/**
 * Fragmento canónico del gasto del mes por organización.
 *
 * Lo consume `enforceSeoRunEntitlement` como subquery de su SELECT y el sanity live lo
 * ejercita tal cual: una sola definición del "cuánto lleva gastado esta organización".
 *
 * ⚠️ Toma el placeholder por parámetro en vez de fijar `$1`. Un fragmento interpolable con
 * posición fija es un footgun: el segundo consumer que lo meta en una query donde la
 * organización sea `$2` sumaría el gasto de OTRA organización **sin que PostgreSQL falle**
 * (si el parámetro de esa posición también es `text`). El bug sería silencioso y de dinero.
 *
 * 🔴 TASK-1696 — `consumer = 'seo'` NO es un filtro opcional: es lo que hace que este fragmento
 * siga respondiendo la pregunta que dice responder. Sin él, y con la dimensión ya en la tabla,
 * el primer dólar que el grader AEO atribuya a una organización se descontaría del presupuesto
 * SEO de ESE cliente sin que nada falle — el gate empezaría a bloquear capturas por un gasto
 * que no es suyo. Por eso viaja en el MISMO commit que el `ON CONFLICT` de la clave nueva.
 * El presupuesto AEO es `resolveAeoBudget`, que lee esta misma tabla con `consumer = 'aeo'`.
 */
export const buildSeoProviderSpendMonthlySumSql = (organizationPlaceholder: string): string =>
  `COALESCE((SELECT SUM(sp.provider_cost_usd)
          FROM greenhouse_growth.seo_provider_spend_daily sp
         WHERE sp.organization_id = ${organizationPlaceholder}
           AND sp.consumer = 'seo'
           AND sp.spend_date >= date_trunc('month', CURRENT_DATE)::date), 0)`

export const recordSeoProviderSpend = async (input: RecordSeoProviderSpendInput): Promise<void> => {
  if (!Number.isFinite(input.cost) || input.cost <= 0) return

  const costBasis: SeoProviderSpendCostBasis = input.costBasis ?? 'invoiced'

  await runGreenhousePostgresQuery(SEO_PROVIDER_SPEND_UPSERT_SQL, [
    input.organizationId,
    input.family,
    input.cost,
    input.consumer,
    costBasis,
    // El acoplamiento se respeta desde acá también, no sólo en la base: un `invoiced` que
    // arrastrara una versión de tabla de precios sería rechazado por el CHECK y el transporte
    // observaría el fallo sin invalidar un resultado ya cobrado — o sea, gasto real sin
    // contabilizar. Se normaliza antes de llegar.
    costBasis === 'estimated' ? (input.priceTableVersion ?? null) : null
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
 *
 * ⚠️ TASK-1696 — Este read agrega TODOS los consumidores y TODAS las bases de costo. Sirve para
 * "cuánto le pagamos al proveedor por esta organización" (la factura), NUNCA para una pregunta
 * de presupuesto ni para una cifra que se le muestre a alguien: para eso está
 * `readSeoProviderSpendByConsumer`, que corta por consumidor y no mezcla dólares facturados con
 * estimados en un mismo número.
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

export interface SeoProviderSpendByConsumerRow {
  consumer: DataForSeoSpendConsumer
  family: DataForSeoFamily
  costBasis: SeoProviderSpendCostBasis
  callCount: number
  costUsd: number
}

export interface SeoProviderSpendByConsumerResult {
  organizationId: string
  /** Primer día del mes en curso, ISO date — la ventana que agrega este read. */
  periodStart: string
  rows: SeoProviderSpendByConsumerRow[]
  /** Total por consumidor, con las dos monedas SIEMPRE separadas. */
  totals: Array<{
    consumer: DataForSeoSpendConsumer
    invoicedUsd: number
    estimatedUsd: number
    callCount: number
  }>
}

/**
 * TASK-1696 — Atribución del gasto del mes con corte por consumidor y por base de costo.
 *
 * Reader canónico de la pregunta "¿en qué se fue la plata de esta organización, y quién la
 * gastó?". Lo consumen el lane ecosystem, su tool MCP y cualquier superficie interna; ninguna
 * pantalla ni tool suma gasto con SQL propio (Full API Parity: un primitive, muchos consumers).
 *
 * ⚠️ NUNCA colapsa `invoiced` y `estimated` en un total único. Hoy todo el ledger es facturado,
 * así que la separación se ve redundante — y es justo ahora, antes de que entre el primer dólar
 * estimado, cuando el contrato tiene que nacer separado. Un total mezclado presentado como una
 * cifra sola no es un dato degradado: es un dato falso.
 *
 * Dato comercial sensible (cuánto cuesta servir a un cliente): server-only y jamás expuesto en
 * superficie de cliente ni en el payload público del grader.
 */
export const readSeoProviderSpendByConsumer = async (
  organizationId: string
): Promise<SeoProviderSpendByConsumerResult> => {
  const rows = await runGreenhousePostgresQuery<{
    consumer: string
    family: string
    cost_basis: string
    call_count: string
    cost_usd: string
    period_start: string
  }>(
    `SELECT consumer,
            family,
            cost_basis,
            SUM(call_count)::text        AS call_count,
            SUM(provider_cost_usd)::text AS cost_usd,
            date_trunc('month', CURRENT_DATE)::date::text AS period_start
       FROM greenhouse_growth.seo_provider_spend_daily
      WHERE organization_id = $1
        AND spend_date >= date_trunc('month', CURRENT_DATE)::date
      GROUP BY consumer, family, cost_basis
      ORDER BY consumer, SUM(provider_cost_usd) DESC`,
    [organizationId]
  )

  const mapped: SeoProviderSpendByConsumerRow[] = rows.map(row => ({
    consumer: row.consumer as DataForSeoSpendConsumer,
    family: row.family as DataForSeoFamily,
    costBasis: row.cost_basis as SeoProviderSpendCostBasis,
    callCount: Number(row.call_count),
    costUsd: Number(row.cost_usd)
  }))

  // Los totales se componen en TS sobre las MISMAS filas que se devuelven: una segunda query de
  // agregación podría leer un estado distinto (el cron escribe mientras tanto) y mostrar un
  // total que no cuadra con su propio desglose.
  const totals = DATAFORSEO_SPEND_CONSUMERS.map(consumer => {
    const forConsumer = mapped.filter(row => row.consumer === consumer)

    return {
      consumer,
      invoicedUsd: forConsumer
        .filter(row => row.costBasis === 'invoiced')
        .reduce((sum, row) => sum + row.costUsd, 0),
      estimatedUsd: forConsumer
        .filter(row => row.costBasis === 'estimated')
        .reduce((sum, row) => sum + row.costUsd, 0),
      callCount: forConsumer.reduce((sum, row) => sum + row.callCount, 0)
    }
  })

  return {
    organizationId,
    periodStart:
      rows[0]?.period_start ?? new Date(new Date().setDate(1)).toISOString().slice(0, 10),
    rows: mapped,
    totals
  }
}
