import 'server-only'

import { query } from '@/lib/db'
import { resolveAeoAllowanceConfig } from '@/lib/growth/ai-visibility/flags'
import { resolveSeoAllowanceConfig } from '@/lib/growth/seo/entitlement'
import { captureWithDomain } from '@/lib/observability/capture'
import type { ReliabilitySignal } from '@/types/reliability'

/**
 * TASK-1696 — Aviso ANTES de que el gate empiece a rechazar (`seo.provider.cost_over_budget`).
 * Steady = 0.
 *
 * 🔴 ESTA SEÑAL LA CITABAN NUEVE TASKS COMO MITIGACIÓN Y NO EXISTÍA. Aparece en la columna de
 * mitigación de la tabla de riesgos de TASK-1300, 1301, 1302, 1303, 1304, 1308, 1309, 1651 y 1664
 * —ocho de ellas ya cerradas— siempre contra el mismo riesgo, que es el #1 del módulo: «costo
 * DataForSEO desbocado». La atribución era circular: 1300 decía que la materializaba 1303, 1301
 * también, 1304 igual, y 1303 decía que sus datos «alimentan» la señal de 1300/1301. Cada una
 * cerró apuntando a la otra. TASK-1664 llegó a detectarlo por escrito y aun así volvió a citarla.
 *
 * Matiz que evita sobredimensionarla: el control DURO sí existe — `enforceSeoRunEntitlement`
 * bloquea antes de gastar. Lo que faltaba es la DETECCIÓN TEMPRANA, y por eso entra como señal y
 * no como gate: hasta hoy el sobregiro sólo se manifestaba como corridas que empezaban a fallar
 * con `budget_exhausted`, sin aviso previo y sin forma de anticiparlo.
 *
 * Entra en TASK-1696 y no en una task propia porque NECESITA la dimensión de consumidor: una
 * alarma que sólo viera el gasto `seo` sub-reportaría exactamente el gasto del grader que esta
 * task acaba de atribuir.
 *
 * Umbrales declarados como constantes nombradas acá, no enterrados en la query: el aviso llega al
 * 80% del tope y el error al 100%, que es el punto donde el gate ya está rechazando.
 */
export const SEO_PROVIDER_COST_OVER_BUDGET_SIGNAL_ID = 'seo.provider.cost_over_budget'

/** Proporción del tope a partir de la cual se avisa. Antes de rechazar, no después. */
const WARNING_RATIO = 0.8

/** Proporción a partir de la cual el gate ya estaría rechazando corridas. */
const ERROR_RATIO = 1

/**
 * Gasto del mes por organización y consumidor, con el tier de cada módulo.
 *
 * ⚠️ Sólo dólares FACTURADOS: son los únicos que el gate consume hoy. Mezclar acá los estimados
 * inflaría el consumo con una cifra de otra naturaleza — el desglose por base de costo existe
 * justamente para no hacer eso.
 */
const QUERY_SQL = `
  SELECT sp.organization_id,
         sp.consumer,
         SUM(sp.provider_cost_usd)::float8 AS spend_usd,
         MAX(o.organization_name)          AS organization_name,
         MAX(ma.metadata_json ->> 'seo_tier') AS seo_tier,
         MAX(ma.metadata_json ->> 'aeo_tier') AS aeo_tier
    FROM greenhouse_growth.seo_provider_spend_daily sp
    JOIN greenhouse_core.organizations o ON o.organization_id = sp.organization_id
    LEFT JOIN greenhouse_client_portal.module_assignments ma
           ON ma.organization_id = sp.organization_id
          AND ma.effective_to IS NULL
          AND ma.status IN ('active', 'pilot')
          AND ma.module_key = CASE WHEN sp.consumer = 'aeo' THEN 'ai_visibility_v1' ELSE 'seo_v2' END
   WHERE sp.cost_basis = 'invoiced'
     AND sp.spend_date >= date_trunc('month', CURRENT_DATE)::date
   GROUP BY sp.organization_id, sp.consumer
`

type SpendRow = {
  organization_id: string
  consumer: 'seo' | 'aeo'
  spend_usd: number
  organization_name: string | null
  seo_tier: string | null
  aeo_tier: string | null
}

const VALID_TIERS = new Set(['contracted', 'trial', 'pilot'])

export const getSeoProviderCostOverBudgetSignal = async (): Promise<ReliabilitySignal> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await query<SpendRow>(QUERY_SQL)
    const seoConfig = resolveSeoAllowanceConfig()
    const aeoConfig = resolveAeoAllowanceConfig()

    const capFor = (row: SpendRow): number | null => {
      const declared = row.consumer === 'aeo' ? row.aeo_tier : row.seo_tier
      // Sin assignment vigente no hay tope que exceder: el gasto de una organización sin módulo
      // es un problema de gobierno de entitlements, no de presupuesto, y acusarlo acá llenaría la
      // señal de ruido que su dueño no puede accionar.
      const tier = declared && VALID_TIERS.has(declared) ? declared : null

      if (!tier) return null

      if (row.consumer === 'aeo') {
        return tier === 'contracted'
          ? aeoConfig.contractedMonthlyBudgetUsd
          : tier === 'pilot'
            ? aeoConfig.pilotMonthlyBudgetUsd
            : aeoConfig.trialMonthlyBudgetUsd
      }

      return tier === 'contracted'
        ? seoConfig.contractedMonthlyBudgetUsd
        : tier === 'pilot'
          ? seoConfig.pilotMonthlyBudgetUsd
          : seoConfig.trialMonthlyBudgetUsd
    }

    const evaluated = rows
      .map(row => {
        const capUsd = capFor(row)

        return capUsd && capUsd > 0 ? { ...row, capUsd, ratio: row.spend_usd / capUsd } : null
      })
      .filter((row): row is SpendRow & { capUsd: number; ratio: number } => row !== null)
      .filter(row => row.ratio >= WARNING_RATIO)
      .sort((a, b) => b.ratio - a.ratio)

    const exhausted = evaluated.filter(row => row.ratio >= ERROR_RATIO)

    const severity: 'ok' | 'warning' | 'error' =
      exhausted.length > 0 ? 'error' : evaluated.length > 0 ? 'warning' : 'ok'

    const summary =
      severity === 'error'
        ? `${exhausted.length} organización(es) agotaron su presupuesto de proveedor del mes — el gate ya está rechazando corridas.`
        : severity === 'warning'
          ? `${evaluated.length} organización(es) pasaron el ${Math.round(WARNING_RATIO * 100)}% de su presupuesto del mes. Revisar antes de que el gate empiece a rechazar.`
          : `Ninguna organización superó el ${Math.round(WARNING_RATIO * 100)}% de su presupuesto de proveedor este mes.`

    return {
      signalId: SEO_PROVIDER_COST_OVER_BUDGET_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'cost_guard',
      source: 'getSeoProviderCostOverBudgetSignal',
      label: 'Presupuesto de proveedor por organización',
      severity,
      summary,
      observedAt,
      evidence: [
        { kind: 'metric', label: 'organizaciones_sobre_umbral', value: String(evaluated.length) },
        ...evaluated.slice(0, 5).map(row => ({
          kind: 'metric' as const,
          label: `${row.organization_name ?? row.organization_id} · ${row.consumer}`,
          value: `USD ${row.spend_usd.toFixed(4)} de ${row.capUsd} (${Math.round(row.ratio * 100)}%)`
        }))
      ]
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'reliability_signal_seo_provider_cost_over_budget' }
    })

    return {
      signalId: SEO_PROVIDER_COST_OVER_BUDGET_SIGNAL_ID,
      moduleKey: 'growth',
      kind: 'cost_guard',
      source: 'getSeoProviderCostOverBudgetSignal',
      severity: 'unknown',
      label: 'Presupuesto de proveedor por organización',
      summary: 'No fue posible leer el signal. Revisa los logs.',
      observedAt,
      evidence: [
        {
          kind: 'metric',
          label: 'error',
          value: error instanceof Error ? error.message : String(error)
        }
      ]
    }
  }
}
