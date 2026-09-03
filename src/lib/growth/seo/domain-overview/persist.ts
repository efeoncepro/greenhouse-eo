/**
 * TASK-1775 — Writer canónico del hecho de dominio (`seo_domain_overview_snapshots`).
 *
 * La ÚNICA forma de escribir la tabla. Tres productores comparten este writer (patrón
 * multi-productor de `seo_keyword_market_data`, TASK-1661):
 *   1. `domain_rank_overview` — la foto mensual completa (capture.ts);
 *   2. `historical_rank_overview` — el backfill de una sola vez por sujeto (history-backfill.ts);
 *   3. `bulk_traffic_estimation` — el screening de cartera (traffic-estimation.ts).
 *
 * Contrato del hecho:
 * - append-only con `ON CONFLICT ... DO NOTHING` (el trigger de la tabla prohíbe UPDATE/DELETE);
 * - una fila con NULLs ES un hecho ("preguntamos y el proveedor no conoce el sujeto") — sin esa
 *   fila el pre-check de frescura re-compraría el sujeto en cada corrida, para siempre;
 * - el costo del proveedor es por BATCH: se atribuye a la PRIMERA fila escrita y las demás
 *   quedan en 0, para que la suma de `provider_cost` no multiplique el gasto;
 * - `captured_by_organization_id` es atribución de quién pagó, NUNCA aislamiento de tenant, y
 *   NUNCA sale en un DTO client-facing (el reader no lo selecciona; un test lo prueba).
 */

import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import type { EtvMethodologyVersion } from '../etv-methodology/contracts'
import type { PersistedEtvMethodology } from '../etv-methodology/persisted'

/** Endpoints autorizados a escribir esta tabla (espeja el CHECK de la migración). */
export type SeoDomainOverviewSourceEndpoint =
  | 'domain_rank_overview'
  | 'historical_rank_overview'
  | 'bulk_traffic_estimation'

/**
 * Ventana de frescura. El proveedor refresca sus bases Labs en ciclos ~mensuales (SERPs
 * 30–90 días, métricas de keyword mensuales); re-comprar la foto del mismo dominio dentro del
 * ciclo paga de nuevo por el mismo número. Es el pre-check que protege el presupuesto.
 */
export const DOMAIN_OVERVIEW_FRESHNESS_DAYS = 30

/** Distribución de posiciones del top-100 (cuántas keywords ranquea en cada banda). */
export interface SeoDomainPositionDistribution {
  pos1: number | null
  pos2_3: number | null
  pos4_10: number | null
  pos11_20: number | null
  pos21_30: number | null
  pos31_40: number | null
  pos41_50: number | null
  pos51_60: number | null
  pos61_70: number | null
  pos71_80: number | null
  pos81_90: number | null
  pos91_100: number | null
}

export const EMPTY_POSITION_DISTRIBUTION: SeoDomainPositionDistribution = {
  pos1: null,
  pos2_3: null,
  pos4_10: null,
  pos11_20: null,
  pos21_30: null,
  pos31_40: null,
  pos41_50: null,
  pos51_60: null,
  pos61_70: null,
  pos71_80: null,
  pos81_90: null,
  pos91_100: null
}

/**
 * Métricas de un lado (orgánico o pago) del snapshot.
 *
 * ⚠️ `etv` es *estimated traffic volume* — TRÁFICO mensual estimado (CTR × volumen de cada
 * keyword ranqueada), lente ◑. NO son dólares y NUNCA se rotula "visitas". El USD es
 * `estimatedPaidTrafficCostUsd` (lo que costaría comprar ese tráfico en Ads).
 */
export interface SeoDomainSideMetrics {
  positions: SeoDomainPositionDistribution
  count: number | null
  etv: number | null
  estimatedPaidTrafficCostUsd: number | null
  isNew: number | null
  isUp: number | null
  isDown: number | null
  isLost: number | null
}

export const EMPTY_SIDE_METRICS: SeoDomainSideMetrics = {
  positions: EMPTY_POSITION_DISTRIBUTION,
  count: null,
  etv: null,
  estimatedPaidTrafficCostUsd: null,
  isNew: null,
  isUp: null,
  isDown: null,
  isLost: null
}

export interface SeoDomainOverviewSnapshotInput {
  normalizedDomain: string
  domain: string
  locationCode: string
  languageCode: string
  /** `null` = hoy (CURRENT_DATE en PG). El backfill histórico pasa el primer día del mes. */
  captureDate: string | null
  sourceEndpoint: SeoDomainOverviewSourceEndpoint
  organic: SeoDomainSideMetrics
  paid: Pick<SeoDomainSideMetrics, 'count' | 'etv' | 'estimatedPaidTrafficCostUsd'>
  /**
   * TASK-1805 — fórmula ETV solicitada al proveedor para ESTA fila. Requerido: un productor sin
   * metodología no compila. `estimated_paid_traffic_cost` hereda la misma (ETV × CPC).
   */
  etvMethodology: PersistedEtvMethodology
}

/**
 * Normalización canónica del sujeto dominio: lowercase, sin esquema, sin path y sin `www.`.
 * Espeja el `normalizeDomain` del rank capture (TASK-1303) — misma regla, mismo resultado.
 */
export const normalizeOverviewDomain = (raw: string): string => {
  let value = raw.trim().toLowerCase()

  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
  value = value.split('/')[0] ?? value
  value = value.replace(/^www\./, '')

  return value
}

/** Fila con TODAS las métricas NULL: el hecho "preguntamos y el proveedor no tiene el sujeto". */
export const buildNullSnapshot = (input: {
  domain: string
  locationCode: string
  languageCode: string
  captureDate: string | null
  sourceEndpoint: SeoDomainOverviewSourceEndpoint
  etvMethodology: PersistedEtvMethodology
}): SeoDomainOverviewSnapshotInput => ({
  normalizedDomain: normalizeOverviewDomain(input.domain),
  domain: input.domain,
  locationCode: input.locationCode,
  languageCode: input.languageCode,
  captureDate: input.captureDate,
  sourceEndpoint: input.sourceEndpoint,
  organic: EMPTY_SIDE_METRICS,
  paid: { count: null, etv: null, estimatedPaidTrafficCostUsd: null },
  etvMethodology: input.etvMethodology
})

/**
 * Persiste snapshots de dominio. El costo del batch se atribuye a la PRIMERA fila; el
 * presupuesto real vive en `seo_provider_spend_daily` (lo escribe el transporte, jamás acá).
 */
export const persistDomainOverviewSnapshots = async (input: {
  snapshots: readonly SeoDomainOverviewSnapshotInput[]
  capturedByOrganizationId: string
  providerCostUsd: number
}): Promise<{ rowsWritten: number }> => {
  let rowsWritten = 0

  for (const snapshot of input.snapshots) {
    const rowCost = rowsWritten === 0 ? input.providerCostUsd : 0
    const positions = snapshot.organic.positions

    const inserted = await runGreenhousePostgresQuery<{ inserted: number }>(
      `INSERT INTO greenhouse_growth.seo_domain_overview_snapshots
         (normalized_domain, domain, location_code, language_code, capture_date, source_endpoint,
          organic_pos_1, organic_pos_2_3, organic_pos_4_10, organic_pos_11_20, organic_pos_21_30,
          organic_pos_31_40, organic_pos_41_50, organic_pos_51_60, organic_pos_61_70,
          organic_pos_71_80, organic_pos_81_90, organic_pos_91_100,
          organic_count, organic_etv, organic_estimated_paid_traffic_cost,
          organic_is_new, organic_is_up, organic_is_down, organic_is_lost,
          paid_count, paid_etv, paid_estimated_paid_traffic_cost,
          captured_by_organization_id, provider_cost,
          etv_methodology_version, etv_methodology_evidence, etv_requested_at, etv_policy_version, etv_historical_basis)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6,
               $7, $8, $9, $10, $11,
               $12, $13, $14, $15,
               $16, $17, $18,
               $19, $20, $21,
               $22, $23, $24, $25,
               $26, $27, $28,
               $29, $30,
               $31, $32, $33::timestamptz, $34, $35)
       ON CONFLICT ON CONSTRAINT seo_domain_overview_capture_method_unique DO NOTHING
       RETURNING 1 AS inserted`,
      [
        snapshot.normalizedDomain,
        snapshot.domain,
        snapshot.locationCode,
        snapshot.languageCode,
        snapshot.captureDate,
        snapshot.sourceEndpoint,
        positions.pos1,
        positions.pos2_3,
        positions.pos4_10,
        positions.pos11_20,
        positions.pos21_30,
        positions.pos31_40,
        positions.pos41_50,
        positions.pos51_60,
        positions.pos61_70,
        positions.pos71_80,
        positions.pos81_90,
        positions.pos91_100,
        snapshot.organic.count,
        snapshot.organic.etv,
        snapshot.organic.estimatedPaidTrafficCostUsd,
        snapshot.organic.isNew,
        snapshot.organic.isUp,
        snapshot.organic.isDown,
        snapshot.organic.isLost,
        snapshot.paid.count,
        snapshot.paid.etv,
        snapshot.paid.estimatedPaidTrafficCostUsd,
        input.capturedByOrganizationId,
        rowCost,
        snapshot.etvMethodology.version,
        snapshot.etvMethodology.evidence,
        snapshot.etvMethodology.requestedAt,
        snapshot.etvMethodology.policyVersion,
        snapshot.etvMethodology.historicalBasis
      ]
    )

    // TASK-1806 — cuenta filas INSERTADAS de verdad: con `ON CONFLICT DO NOTHING` el RETURNING vuelve vacío
    // y la fila no se cuenta (antes se contaban los intentos, y un writer podía reportar 3 escritas con 0 nuevas).
    rowsWritten += inserted.length
  }

  return { rowsWritten }
}

/**
 * Sujetos con snapshot DENTRO de la ventana de frescura para un mercado.
 *
 * `sourceEndpoints` acota qué productor cuenta como "fresco": la foto mensual exige una fila
 * de `domain_rank_overview` (una fila de screening, más pobre, NO debe ahogar la foto completa);
 * el screening acepta cualquiera (ambos llevan el mismo `etv`).
 *
 * ⚠️ `capture_date` es DATE y `CURRENT_DATE` también: la resta da `integer` directo (gate
 * TASK-893 — jamás `EXTRACT(EPOCH FROM (date - date))`).
 */
export const loadFreshOverviewDomains = async (input: {
  normalizedDomains: string[]
  locationCode: string
  languageCode: string
  sourceEndpoints: readonly SeoDomainOverviewSourceEndpoint[]
  /** TASK-1805 — la frescura es POR MÉTODO: una foto legacy no satisface una corrida improved ni viceversa. */
  etvMethodologyVersion: EtvMethodologyVersion
}): Promise<Set<string>> => {
  if (input.normalizedDomains.length === 0) return new Set()

  const rows = await runGreenhousePostgresQuery<{ normalized_domain: string }>(
    `SELECT DISTINCT normalized_domain
       FROM greenhouse_growth.seo_domain_overview_snapshots
      WHERE normalized_domain = ANY($1::text[])
        AND location_code = $2
        AND language_code = $3
        AND source_endpoint = ANY($4::text[])
        AND (CURRENT_DATE - capture_date) < $5
        AND etv_methodology_version = $6`,
    [
      input.normalizedDomains,
      input.locationCode,
      input.languageCode,
      [...input.sourceEndpoints],
      DOMAIN_OVERVIEW_FRESHNESS_DAYS,
      input.etvMethodologyVersion
    ]
  )

  return new Set(rows.map(row => row.normalized_domain))
}
