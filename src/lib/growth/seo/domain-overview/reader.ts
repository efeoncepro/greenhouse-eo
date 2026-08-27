/**
 * TASK-1775 — Reader canónico de la foto de dominio. ÚNICO consumo: ni la UI, ni Nexa, ni
 * MCP, ni los lanes tocan `seo_domain_overview_snapshots` directo.
 *
 * Contrato de honestidad (§5 de la arquitectura del módulo):
 *   - toda cifra viaja con `lens: 'estimated'` (◑) y su `capturedAt` — NUNCA se promedia,
 *     suma ni grafica con la lente ● de GSC;
 *   - `etv` es *estimated traffic volume* (tráfico estimado), NO dólares; el USD es
 *     `organicEstimatedTrafficCostUsd`;
 *   - sujeto sin dato devuelve `{ ok: false, reason: 'no_market_data' }` — jamás ceros
 *     fantasma. Una fila con NULLs ("preguntamos y el proveedor no conoce el sujeto") también
 *     resuelve a `no_market_data`: registrarla protege el presupuesto, no inventa una foto;
 *   - 🔴 `captured_by_organization_id` NO se selecciona: por frescura dejaría inferir qué
 *     dominios sigue otra organización. Un test lo prueba.
 */

import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import {
  normalizeOverviewDomain,
  type SeoDomainOverviewSourceEndpoint,
  type SeoDomainPositionDistribution
} from './persist'

/** Meses de trayectoria por defecto en el DTO (el caller puede pedir hasta el cap). */
export const DOMAIN_OVERVIEW_DEFAULT_HISTORY_MONTHS = 24

/** Cap del rango de trayectoria: el histórico del proveedor empieza en 2020-10 (~70 meses). */
export const DOMAIN_OVERVIEW_MAX_HISTORY_MONTHS = 72

export interface SeoDomainOverviewHistoryPoint {
  /** `YYYY-MM`. */
  month: string
  organicKeywords: number | null
  organicEtv: number | null
  paidKeywords: number | null
  paidEtv: number | null
  source: SeoDomainOverviewSourceEndpoint
}

export type ReadDomainOverviewResult =
  | { ok: false; reason: 'no_market_data' }
  | {
      ok: true
      subject: string
      /** ◑ — SIEMPRE 'estimated'; nunca 'measured'. */
      lens: 'estimated'
      /** `YYYY-MM-DD` de la captura que respalda la foto. */
      capturedAt: string
      source: SeoDomainOverviewSourceEndpoint
      locationCode: string
      languageCode: string
      /** Total de keywords del top-100 donde aparece el dominio (organic_count). */
      organicKeywords: number | null
      /** Tráfico orgánico mensual ESTIMADO (etv). No son visitas medidas ni dólares. */
      organicEtv: number | null
      /** USD/mes que costaría comprar ese tráfico en Ads. */
      organicEstimatedTrafficCostUsd: number | null
      paidKeywords: number | null
      paidEtv: number | null
      /** Sólo la puebla la foto completa; el screening la deja null. */
      positionDistribution: SeoDomainPositionDistribution | null
      momentum: { isNew: number | null; isUp: number | null; isDown: number | null; isLost: number | null } | null
      /** Trayectoria mensual ascendente (backfill histórico + fotos mensuales). */
      history: SeoDomainOverviewHistoryPoint[]
    }

type SnapshotRow = {
  domain: string
  capture_date: Date | string
  source_endpoint: SeoDomainOverviewSourceEndpoint
  organic_pos_1: number | null
  organic_pos_2_3: number | null
  organic_pos_4_10: number | null
  organic_pos_11_20: number | null
  organic_pos_21_30: number | null
  organic_pos_31_40: number | null
  organic_pos_41_50: number | null
  organic_pos_51_60: number | null
  organic_pos_61_70: number | null
  organic_pos_71_80: number | null
  organic_pos_81_90: number | null
  organic_pos_91_100: number | null
  organic_count: number | null
  organic_etv: string | null
  organic_estimated_paid_traffic_cost: string | null
  organic_is_new: number | null
  organic_is_up: number | null
  organic_is_down: number | null
  organic_is_lost: number | null
  paid_count: number | null
  paid_etv: string | null
}

const asNumber = (value: string | null): number | null => {
  if (value === null) return null

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}

const toIsoDate = (value: Date | string): string =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)

/** Prioridad por mes: la foto completa manda sobre el histórico, y éste sobre el screening. */
const SOURCE_PRIORITY: Record<SeoDomainOverviewSourceEndpoint, number> = {
  domain_rank_overview: 3,
  historical_rank_overview: 2,
  bulk_traffic_estimation: 1
}

/** Una fila con TODAS las métricas orgánicas NULL es el marcador "el proveedor no conoce el sujeto". */
const hasAnyData = (row: SnapshotRow): boolean =>
  row.organic_count !== null || row.organic_etv !== null || row.paid_count !== null || row.paid_etv !== null

/**
 * Lee la foto + trayectoria de un dominio en un mercado explícito.
 *
 * La foto es la fila MÁS RECIENTE con dato, prefiriendo la fuente más rica; se sirve aunque
 * esté vieja — el consumer la ve CON su `capturedAt` y decide, que es lo contrario de
 * esconderla y mostrar un hueco.
 */
export const readDomainOverview = async (input: {
  subject: string
  locationCode: string
  languageCode: string
  historyMonths?: number
}): Promise<ReadDomainOverviewResult> => {
  const normalized = normalizeOverviewDomain(input.subject)

  if (!normalized) return { ok: false, reason: 'no_market_data' }

  const historyMonths = Math.min(
    Math.max(1, input.historyMonths ?? DOMAIN_OVERVIEW_DEFAULT_HISTORY_MONTHS),
    DOMAIN_OVERVIEW_MAX_HISTORY_MONTHS
  )

  // 🔴 SIN captured_by_organization_id: no viaja al servidor de lanes ni por accidente.
  const rows = await runGreenhousePostgresQuery<SnapshotRow>(
    `SELECT domain, capture_date, source_endpoint,
            organic_pos_1, organic_pos_2_3, organic_pos_4_10, organic_pos_11_20,
            organic_pos_21_30, organic_pos_31_40, organic_pos_41_50, organic_pos_51_60,
            organic_pos_61_70, organic_pos_71_80, organic_pos_81_90, organic_pos_91_100,
            organic_count, organic_etv, organic_estimated_paid_traffic_cost,
            organic_is_new, organic_is_up, organic_is_down, organic_is_lost,
            paid_count, paid_etv
       FROM greenhouse_growth.seo_domain_overview_snapshots
      WHERE normalized_domain = $1
        AND location_code = $2
        AND language_code = $3
      ORDER BY capture_date DESC
      LIMIT $4`,
    [normalized, input.locationCode, input.languageCode, DOMAIN_OVERVIEW_MAX_HISTORY_MONTHS * 2]
  )

  const withData = rows.filter(hasAnyData)

  if (withData.length === 0) return { ok: false, reason: 'no_market_data' }

  // Foto: la más reciente; a igual fecha (o mismo mes con más de una fuente) gana la más rica.
  const photo = [...withData].sort((a, b) => {
    const dateDiff = toIsoDate(b.capture_date).localeCompare(toIsoDate(a.capture_date))

    if (dateDiff !== 0) return dateDiff

    return SOURCE_PRIORITY[b.source_endpoint] - SOURCE_PRIORITY[a.source_endpoint]
  })[0]

  // Trayectoria: un punto por mes (gana la fuente más rica dentro del mes), ascendente.
  const byMonth = new Map<string, SnapshotRow>()

  for (const row of withData) {
    const month = toIsoDate(row.capture_date).slice(0, 7)
    const current = byMonth.get(month)

    if (!current || SOURCE_PRIORITY[row.source_endpoint] > SOURCE_PRIORITY[current.source_endpoint]) {
      byMonth.set(month, row)
    }
  }

  const history: SeoDomainOverviewHistoryPoint[] = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-historyMonths)
    .map(([month, row]) => ({
      month,
      organicKeywords: row.organic_count,
      organicEtv: asNumber(row.organic_etv),
      paidKeywords: row.paid_count,
      paidEtv: asNumber(row.paid_etv),
      source: row.source_endpoint
    }))

  const hasPositions =
    photo.source_endpoint !== 'bulk_traffic_estimation' &&
    (photo.organic_pos_1 !== null || photo.organic_pos_4_10 !== null || photo.organic_pos_11_20 !== null)

  return {
    ok: true,
    subject: normalized,
    lens: 'estimated',
    capturedAt: toIsoDate(photo.capture_date),
    source: photo.source_endpoint,
    locationCode: input.locationCode,
    languageCode: input.languageCode,
    organicKeywords: photo.organic_count,
    organicEtv: asNumber(photo.organic_etv),
    organicEstimatedTrafficCostUsd: asNumber(photo.organic_estimated_paid_traffic_cost),
    paidKeywords: photo.paid_count,
    paidEtv: asNumber(photo.paid_etv),
    positionDistribution: hasPositions
      ? {
          pos1: photo.organic_pos_1,
          pos2_3: photo.organic_pos_2_3,
          pos4_10: photo.organic_pos_4_10,
          pos11_20: photo.organic_pos_11_20,
          pos21_30: photo.organic_pos_21_30,
          pos31_40: photo.organic_pos_31_40,
          pos41_50: photo.organic_pos_41_50,
          pos51_60: photo.organic_pos_51_60,
          pos61_70: photo.organic_pos_61_70,
          pos71_80: photo.organic_pos_71_80,
          pos81_90: photo.organic_pos_81_90,
          pos91_100: photo.organic_pos_91_100
        }
      : null,
    momentum:
      photo.source_endpoint === 'domain_rank_overview'
        ? {
            isNew: photo.organic_is_new,
            isUp: photo.organic_is_up,
            isDown: photo.organic_is_down,
            isLost: photo.organic_is_lost
          }
        : null,
    history
  }
}

/**
 * Variante por target: resuelve el mercado (país + idioma) desde el propio target en vez de
 * confiar en lo que mande el caller, y usa el dominio del target como sujeto por defecto.
 * El sujeto explícito sirve para mirar un competidor con la MISMA lente y el MISMO mercado.
 */
export const readDomainOverviewForTarget = async (
  seoTargetId: string,
  options: { subject?: string; historyMonths?: number } = {}
): Promise<(ReadDomainOverviewResult & { locationCode?: string; languageCode?: string }) | null> => {
  const rows = await runGreenhousePostgresQuery<{
    root_domain: string
    location_code: string
    language_code: string
  }>(
    `SELECT root_domain, location_code, language_code
       FROM greenhouse_growth.seo_targets
      WHERE seo_target_id = $1
        AND status = 'active'`,
    [seoTargetId]
  )

  const target = rows[0]

  if (!target) return null

  return readDomainOverview({
    subject: options.subject ?? target.root_domain,
    locationCode: target.location_code,
    languageCode: target.language_code,
    historyMonths: options.historyMonths
  })
}
