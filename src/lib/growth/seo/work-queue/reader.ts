import 'server-only'

/**
 * TASK-1700 — `readSeoWorkQueue`: el reader canónico de la cola.
 *
 * Un solo contrato para los cuatro consumers (UI operador, Nexa, lane ecosystem/MCP, portal
 * cliente). La única diferencia del lado cliente es el REDACTOR de DTO — cero lógica de orden
 * o de score duplicada por consumer.
 *
 * ═══ Paginación estable por construcción ═══
 *
 * El keyset va sobre `(score_band, priority_score, normalized_keyword COLLATE "C")` DENTRO de
 * un snapshot inmutable.
 *
 * 🔴 El `COLLATE "C"` NO es decorativo. La base corre con `en_US.UTF8`, que **ignora el
 * espacio** al comparar (`berelex` < `berel green`, porque compara `berelgreen`), mientras
 * `localeCompare` de JS los ordena al revés. El materializador ordena en JS y este reader
 * pagina en SQL: con collations distintas la paginación **saltea filas en silencio** —
 * medido contra PG real, recorría 631 de 635. `COLLATE "C"` es orden de bytes, que JS
 * reproduce exactamente con una comparación de code points. Eso resuelve de raíz el problema declarado en `TASK-1693`: el universo no crece
 * bajo el cursor mientras se pagina, porque el snapshot no cambia — recomputar es una fila
 * nueva, jamás un `UPDATE`. `normalized_keyword` como desempate final es lo que lo vuelve
 * determinista incluso con scores empatados.
 *
 * ═══ 🔴 El alias del score no puede llamarse como la columna ═══
 *
 * `priority_score::text AS priority_score` parece inofensivo y **rompe el orden completo**:
 * PostgreSQL resuelve el `ORDER BY` contra los nombres de SALIDA antes que contra los de la
 * tabla, así que el `ORDER BY priority_score DESC` pasaba a ordenar el TEXTO — `'8.8612'`
 * antes que `'72.1405'`, porque `'8' > '7'`. La cola servía un orden que no era el
 * persistido, y ningún test lo veía: con scores de un solo dígito o todos NULL el bug es
 * invisible. Lo destapó paginar una corrida real de punta a punta. Por eso el alias es
 * `priority_score_text`.
 *
 * ═══ Frescura ═══
 *
 * `staleness` es del CONTRATO, no de la UI: `fresh` | `stale` (pasó `expires_at`) | `absent`
 * (nunca se materializó). Un operador trabajando sobre un plan vencido sin saberlo es el modo
 * de falla que la señal `growth.seo.work_queue.stale_snapshot` vigila, y el reader es quien lo
 * declara.
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { isSeoModuleEnabled, isSeoWorkQueueEnabled } from '../flags'
import {
  type SeoWorkQueueOrigin,
  type SeoWorkQueueOriginHealth,
  type SeoWorkQueueScoreBand,
  type SeoWorkQueueScoreBasis,
  type SeoWorkQueueScoreBreakdown,
  type SeoWorkQueueStaleness,
  type SeoWorkQueueVerb
} from './contracts'

export interface SeoWorkQueueItemView {
  itemId: string
  rank: number
  origin: SeoWorkQueueOrigin
  keyword: string
  targetUrl: string | null
  recommendedVerb: SeoWorkQueueVerb
  scoreBasis: SeoWorkQueueScoreBasis
  scoreBand: SeoWorkQueueScoreBand
  /** Clics incrementales estimados. `null` en bandas 2 y 3 — jamás un 0 de relleno. */
  priorityScore: number | null
  breakdown: SeoWorkQueueScoreBreakdown
  evidenceRef: string
  sourceScoreVersion: string | null
}

export interface SeoWorkQueueSnapshotView {
  snapshotId: string
  organizationId: string
  seoTargetId: string
  priorityScoreVersion: string
  windowDays: number
  itemCount: number
  computedAt: string
  expiresAt: string
}

export type ReadSeoWorkQueueResult =
  | {
      ok: true
      snapshot: SeoWorkQueueSnapshotView | null
      items: SeoWorkQueueItemView[]
      originHealth: SeoWorkQueueOriginHealth[]
      priorityScoreVersion: string | null
      asOf: string | null
      staleness: SeoWorkQueueStaleness
      nextCursor: string | null
    }
  | { ok: false; errorCode: 'disabled' | 'target_not_found' | 'query_failed' }

export interface ReadSeoWorkQueueOptions {
  origins?: readonly SeoWorkQueueOrigin[]
  limit?: number
  cursor?: string | null
  env?: NodeJS.ProcessEnv
}

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50

/**
 * Cursor opaco del keyset: `band|score|keyword`. Se codifica en base64url para que ningún
 * consumer lo construya a mano — un cursor fabricado saltearía filas en silencio.
 */
const encodeCursor = (item: SeoWorkQueueItemView): string =>
  Buffer.from(
    `${item.scoreBand}|${item.priorityScore ?? ''}|${item.keyword}`,
    'utf8'
  ).toString('base64url')

const decodeCursor = (
  cursor: string
): { band: number; score: number | null; keyword: string } | null => {
  try {
    const [rawBand, rawScore, ...rest] = Buffer.from(cursor, 'base64url').toString('utf8').split('|')
    const band = Number(rawBand)

    if (!Number.isInteger(band) || rest.length === 0) return null

    return {
      band,
      score: rawScore === '' || rawScore === undefined ? null : Number(rawScore),
      keyword: rest.join('|')
    }
  } catch {
    return null
  }
}

interface ItemRow extends Record<string, unknown> {
  item_id: string
  rank_in_snapshot: number
  origin: string
  normalized_keyword: string
  target_url: string | null
  recommended_verb: string
  score_basis: string
  score_band: number
  priority_score_text: string | null
  score_breakdown_json: SeoWorkQueueScoreBreakdown
  evidence_ref: string
  source_score_version: string | null
}

export const readSeoWorkQueue = async (
  seoTargetId: string,
  options: ReadSeoWorkQueueOptions = {}
): Promise<ReadSeoWorkQueueResult> => {
  const env = options.env ?? process.env

  if (!isSeoModuleEnabled(env) || !isSeoWorkQueueEnabled(env)) {
    return { ok: false, errorCode: 'disabled' }
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT))

  try {
    // Tenant binding server-side: el target define la org. El reader NO acepta un
    // organizationId del request — es el anti-oracle del dominio.
    const snapshots = await runGreenhousePostgresQuery<{
      snapshot_id: string
      organization_id: string
      seo_target_id: string
      priority_score_version: string
      window_days: number
      item_count: number
      origin_health_json: SeoWorkQueueOriginHealth[]
      computed_at: Date
      expires_at: Date
    }>(
      `SELECT snapshot_id, organization_id, seo_target_id, priority_score_version, window_days,
              item_count, origin_health_json, computed_at, expires_at
         FROM greenhouse_growth.seo_work_queue_snapshots
        WHERE seo_target_id = $1
        ORDER BY computed_at DESC
        LIMIT 1`,
      [seoTargetId]
    )

    const snapshot = snapshots[0]

    if (!snapshot) {
      // `absent` NO es un error: es un target elegible cuya cola todavía no corrió. Devolver
      // `ok: false` haría que la UI mostrara una falla donde hay un estado legítimo.
      return {
        ok: true,
        snapshot: null,
        items: [],
        originHealth: [],
        priorityScoreVersion: null,
        asOf: null,
        staleness: 'absent',
        nextCursor: null
      }
    }

    const cursor = options.cursor ? decodeCursor(options.cursor) : null
    const origins = options.origins && options.origins.length > 0 ? [...options.origins] : null

    /*
     * Keyset sobre el orden canónico. El `NULLS LAST` del score y el desempate por keyword
     * tienen que ser IDÉNTICOS a los del índice y a los del materializador: si divergen, la
     * paginación saltea filas sin que nada falle.
     *
     * La comparación del cursor se escribe expandida y no como tupla `(a,b,c) > (x,y,z)`
     * porque `priority_score` es NULL en las bandas 2 y 3, y la comparación de tuplas con
     * NULL no ordena — devolvería filas al azar en el borde de página.
     */
    const rows = await runGreenhousePostgresQuery<ItemRow>(
      `SELECT item_id, rank_in_snapshot, origin, normalized_keyword, target_url, recommended_verb,
              score_basis, score_band,
              -- El alias NO puede llamarse priority_score: PostgreSQL resuelve el ORDER BY
              -- contra los nombres de SALIDA primero, así que un alias homonimo ordena la
              -- cola como TEXTO ('8.8612' antes que '72.1405'). Ver el docstring de arriba.
              priority_score::text AS priority_score_text,
              score_breakdown_json, evidence_ref, source_score_version
         FROM greenhouse_growth.seo_work_queue_items
        WHERE snapshot_id = $1
          AND ($2::text[] IS NULL OR origin = ANY($2::text[]))
          AND (
            $3::int IS NULL
            OR score_band > $3::int
            OR (
              score_band = $3::int
              AND (
                ($4::numeric IS NOT NULL AND priority_score IS NOT NULL AND priority_score < $4::numeric)
                OR ($4::numeric IS NOT NULL AND priority_score IS NULL)
                OR (
                  (($4::numeric IS NULL AND priority_score IS NULL)
                    OR ($4::numeric IS NOT NULL AND priority_score = $4::numeric))
                  AND normalized_keyword COLLATE "C" > ($5::text COLLATE "C")
                )
              )
            )
          )
        ORDER BY score_band ASC, priority_score DESC NULLS LAST, normalized_keyword COLLATE "C" ASC
        LIMIT $6::int`,
      [
        snapshot.snapshot_id,
        origins,
        cursor?.band ?? null,
        cursor?.score ?? null,
        cursor?.keyword ?? '',
        limit + 1
      ]
    )

    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows

    const items: SeoWorkQueueItemView[] = page.map(row => ({
      itemId: row.item_id,
      rank: Number(row.rank_in_snapshot),
      origin: row.origin as SeoWorkQueueOrigin,
      keyword: row.normalized_keyword,
      targetUrl: row.target_url,
      recommendedVerb: row.recommended_verb as SeoWorkQueueVerb,
      scoreBasis: row.score_basis as SeoWorkQueueScoreBasis,
      scoreBand: Number(row.score_band) as SeoWorkQueueScoreBand,
      priorityScore: row.priority_score_text === null ? null : Number(row.priority_score_text),
      breakdown: row.score_breakdown_json,
      evidenceRef: row.evidence_ref,
      sourceScoreVersion: row.source_score_version
    }))

    const computedAt = new Date(snapshot.computed_at).toISOString()
    const expiresAt = new Date(snapshot.expires_at).toISOString()

    return {
      ok: true,
      snapshot: {
        snapshotId: snapshot.snapshot_id,
        organizationId: snapshot.organization_id,
        seoTargetId: snapshot.seo_target_id,
        priorityScoreVersion: snapshot.priority_score_version,
        windowDays: Number(snapshot.window_days),
        itemCount: Number(snapshot.item_count),
        computedAt,
        expiresAt
      },
      items,
      originHealth: snapshot.origin_health_json ?? [],
      priorityScoreVersion: snapshot.priority_score_version,
      asOf: computedAt,
      staleness: new Date(expiresAt).getTime() < Date.now() ? 'stale' : 'fresh',
      nextCursor: hasMore && items.length > 0 ? encodeCursor(items[items.length - 1]!) : null
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_work_queue_reader' },
      extra: { seoTargetId }
    })

    return { ok: false, errorCode: 'query_failed' }
  }
}
