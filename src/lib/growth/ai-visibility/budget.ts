import 'server-only'

/**
 * TASK-1696 Slice 4 — Presupuesto en DÓLARES por organización para el grader AEO.
 *
 * Espejo de la mitad de presupuesto de `resolveSeoEntitlement`, y resolver APARTE a propósito:
 * `resolveAeoEntitlement` no gana campos de dinero. El cupo mensual de corridas y el gasto
 * acumulado son dos decisiones con ciclos de vida distintos (una se resetea contando runs, la
 * otra sumando dólares que llegan del proveedor con retraso), y el lado SEO ya demostró que el
 * gate se lee mejor cuando el gasto tiene su propio fragmento reutilizable.
 *
 * Por qué hacía falta: `resolveAeoEntitlement` cuenta RUNS y su único tope en USD es un backstop
 * global del tier `trial`. Una organización `contracted` no tiene hoy ningún gate de dinero — su
 * límite son 20 corridas/mes, y un conteo de corridas no acota dólares: 20 × el techo por run del
 * modo `full` (USD 2) son USD 40/mes/org que nadie mira.
 *
 * 🔴 LAS DOS MONEDAS NO SE MEZCLAN, Y NO ES ESTÉTICA — ES ANTI DOBLE CONTEO:
 * `estimateObservationCostUsd` devuelve, para `google_ai_overview`, el costo REAL que DataForSEO
 * cobró (lo lee de `usage.dataforseo_cost_usd`). O sea que `grader_runs.estimated_cost_usd` YA
 * contiene los mismos dólares que desde TASK-1696 entran al ledger como
 * `consumer='aeo', cost_basis='invoiced'`. Sumar el ledger y el estimado tal cual contaría ese
 * gasto DOS VECES y agotaría el presupuesto a la mitad, en silencio — exactamente la falla contra
 * la que advierte la migración fundacional del ledger (TASK-1300). Por eso `estimatedUsedUsd`
 * resta la porción DataForSEO de cada run: lo estimado queda como lo que de verdad es, el gasto
 * de los LLM propios, cuya única fuente sigue siendo el estimador.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isAeoBudgetGateEnforced, resolveAeoAllowanceConfig } from './flags'
import { resolveAeoEntitlement, type AeoTier } from './entitlement'

export interface AeoBudgetState {
  organizationId: string
  tier: AeoTier | null
  /** Tope del tier. 0 cuando la org no tiene el módulo (no hay presupuesto que gastar). */
  budgetCapUsd: number
  /** Dólares FACTURADOS por el proveedor: ledger, `consumer='aeo'`, `cost_basis='invoiced'`. */
  invoicedUsedUsd: number
  /** Dólares ESTIMADOS de los LLM propios, ya sin la porción que el ledger contabiliza. */
  estimatedUsedUsd: number
  /** Suma DECLARADA de las dos anteriores. Nunca se presenta sin su desglose. */
  budgetUsedUsd: number
  budgetRemainingUsd: number
  /** Inicio del próximo período (reset mensual), ISO. */
  periodResetAt: string
  /** Lo que HABRÍA pasado: `true` si el gate rechazaría una corrida nueva ahora mismo. */
  wouldBlock: boolean
  /** ¿El flag de enforce está prendido? Con `false`, `wouldBlock` es sólo observación. */
  enforced: boolean
}

interface BudgetUsageRow extends Record<string, unknown> {
  invoiced_usd: number
  estimated_llm_usd: number
  period_reset_at: string
}

/**
 * Consulta única: las dos monedas del período y el reset, en un solo viaje.
 *
 * ⚠️ ALCANCE DECLARADO (y es una asimetría real, no un descuido): el lado FACTURADO se agrega por
 * `(organización, día, familia, consumidor)` — el ledger no conoce corridas, así que no puede
 * separar una corrida de venta de una del cliente. Para que las dos monedas signifiquen lo mismo,
 * el lado ESTIMADO usa el mismo alcance: todo run de la organización en el mes, `smoke` excluido
 * (es ruido de plataforma, no consumo del cliente). Consecuencia consciente: una jugada de venta
 * del operador sobre un perfil de cliente cuenta en ambos lados. Si el ciclo de shadow muestra que
 * eso distorsiona el tope, la corrección es del tope o de la granularidad del ledger — no de este
 * resolver, que sería el lugar donde la asimetría se volvería invisible.
 *
 * La resta de la porción DataForSEO usa `jsonb_typeof` en vez de castear a ciegas: un `usage` con
 * el campo en string reventaría el cast y tumbaría el gate entero por un dato mal formado.
 * `GREATEST(0, …)` cubre el caso degenerado de un run cuyo estimado quedó por debajo de lo
 * facturado (redondeo, o un `usage` recortado): un consumo negativo daría presupuesto de regalo.
 */
const USAGE_SQL = `
  WITH month_runs AS (
    SELECT r.run_id, r.estimated_cost_usd
      FROM greenhouse_growth.grader_runs r
     WHERE r.organization_id = $1
       AND r.run_kind <> 'smoke'
       AND r.created_at >= date_trunc('month', CURRENT_DATE)
  ),
  purchased AS (
    SELECT COALESCE(SUM((o.usage->>'dataforseo_cost_usd')::numeric), 0) AS usd
      FROM greenhouse_growth.provider_observations o
      JOIN month_runs mr ON mr.run_id = o.run_id
     WHERE o.provider = 'google_ai_overview'
       AND jsonb_typeof(o.usage->'dataforseo_cost_usd') = 'number'
  )
  SELECT
    COALESCE((SELECT SUM(sp.provider_cost_usd)
                FROM greenhouse_growth.seo_provider_spend_daily sp
               WHERE sp.organization_id = $1
                 AND sp.consumer = 'aeo'
                 AND sp.cost_basis = 'invoiced'
                 AND sp.spend_date >= date_trunc('month', CURRENT_DATE)::date), 0)::float8
      AS invoiced_usd,
    GREATEST(
      0,
      COALESCE((SELECT SUM(estimated_cost_usd) FROM month_runs), 0) - (SELECT usd FROM purchased)
    )::float8 AS estimated_llm_usd,
    (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::timestamptz AS period_reset_at
`

const resolveBudgetCap = (
  tier: AeoTier,
  config: ReturnType<typeof resolveAeoAllowanceConfig>
): number => {
  if (tier === 'contracted') return config.contractedMonthlyBudgetUsd
  if (tier === 'pilot') return config.pilotMonthlyBudgetUsd

  return config.trialMonthlyBudgetUsd
}

/**
 * Resuelve el presupuesto AEO de una organización. Read-only: no incurre costo ni muta nada.
 *
 * Lo consumen el chokepoint de runs, la señal de sobregiro y los lanes programáticos — un
 * primitive, muchos consumers. Ninguna pantalla ni tool suma gasto por su cuenta.
 */
export const resolveAeoBudget = async (
  organizationId: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<AeoBudgetState> => {
  const config = resolveAeoAllowanceConfig(env)
  const entitlement = await resolveAeoEntitlement(organizationId, env)

  const rows = await runGreenhousePostgresQuery<BudgetUsageRow>(USAGE_SQL, [organizationId])

  const invoicedUsedUsd = Number(rows[0]?.invoiced_usd ?? 0)
  const estimatedUsedUsd = Number(rows[0]?.estimated_llm_usd ?? 0)
  const budgetUsedUsd = Number((invoicedUsedUsd + estimatedUsedUsd).toFixed(6))

  const periodResetAt = rows[0]?.period_reset_at
    ? new Date(rows[0].period_reset_at).toISOString()
    : entitlement.periodResetAt

  // Sin módulo no hay tope: `budgetCapUsd = 0`. Y NO se reporta `wouldBlock: true` por eso — el
  // bloqueo por falta de entitlement ya lo decide `resolveAeoEntitlement` con su propia razón
  // (`no_entitlement`), y duplicarlo acá haría que la señal de presupuesto acuse sobregiro donde
  // sólo hay una organización sin contratar.
  const budgetCapUsd = entitlement.tier ? resolveBudgetCap(entitlement.tier, config) : 0
  const budgetRemainingUsd = Number(Math.max(0, budgetCapUsd - budgetUsedUsd).toFixed(6))

  return {
    organizationId,
    tier: entitlement.tier,
    budgetCapUsd,
    invoicedUsedUsd: Number(invoicedUsedUsd.toFixed(6)),
    estimatedUsedUsd: Number(estimatedUsedUsd.toFixed(6)),
    budgetUsedUsd,
    budgetRemainingUsd,
    periodResetAt,
    wouldBlock: Boolean(entitlement.tier) && budgetRemainingUsd <= 0,
    enforced: isAeoBudgetGateEnforced(env)
  }
}
