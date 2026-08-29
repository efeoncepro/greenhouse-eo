import 'server-only'

/**
 * TASK-1700 — `readSeoWorkQueue`: el reader canónico de la cola.
 *
 * Un solo contrato para los cuatro consumers (UI operador, Nexa, lane ecosystem/MCP, portal
 * cliente). La única diferencia del lado cliente es el REDACTOR de DTO — cero lógica de orden
 * o de score duplicada por consumer.
 *
 * ═══ Paginación estable por construcción: `rank_in_snapshot` ═══
 *
 * El reader sirve y pagina por `rank_in_snapshot ASC` DENTRO de un snapshot inmutable. Es un
 * entero único por snapshot, sin NULL, persistido por el materializador con su orden canónico
 * (`compareWorkQueueItems`) — así el orden servido coincide con el persistido **por
 * construcción**, no por una paridad JS↔SQL que alguien tenga que mantener sincronizada.
 * El universo no crece bajo el cursor mientras se pagina (TASK-1693): recomputar es una fila
 * nueva, jamás un `UPDATE`.
 *
 * 🔴 Por qué NO se reconstruye el orden con `(band, score, keyword)` en SQL — tres bugs
 * reales de la primera versión de este reader, todos medidos contra PG:
 *
 * 1. **Collation.** La base compara con `en_US.UTF8` (ignora el espacio: `berelex` <
 *    `berel green`) y JS con otra tabla — la paginación salteaba filas en silencio
 *    (recorría 631 de 635). Se parchó con `COLLATE "C"` + code points en JS.
 * 2. **Alias homónimo.** `priority_score::text AS priority_score` hacía que el `ORDER BY`
 *    ordenara TEXTO (`'8.8612'` antes que `'72.1405'`) — PostgreSQL resuelve el `ORDER BY`
 *    contra los nombres de SALIDA primero. Por eso el alias sigue siendo
 *    `priority_score_text`.
 * 3. **La cuarta llave invisible.** El comparador del materializador desempata la banda 2
 *    por `tieBreakImpressions` DESC — un valor que NO es columna de la tabla, así que el
 *    SQL no podía reproducirlo ni en principio: 54 de 55 items de banda 2 se servían fuera
 *    de su rank (medido en producción, snapshot de `seot-efeonce-own-brand`), y el test que
 *    comparaba el STRING del SQL contra "las tres llaves" consagraba un modelo que el
 *    comparador no seguía.
 *
 * Servir el rank persistido cierra la clase entera: cualquier llave futura del comparador
 * queda automáticamente reflejada en lo servido, porque el reader ya no reconstruye el
 * orden — lo lee.
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
import { seoProvenance, type SeoProvenance } from '../lens'
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
      /**
       * TASK-1785 — la lente ●/◑ de cada cifra del DTO, como campo y no como prosa. Es el
       * caso «◑ junto a ● en la MISMA fila»: impresiones medidas de GSC conviven con un
       * techo estimado por el modelo de CTR propio, así que la procedencia nace en LISTA
       * (jamás una lente única por resultado) y su cobertura la afirma
       * `__tests__/provenance-coverage.test.ts` hoja por hoja.
       */
      provenance: SeoProvenance[]
    }
  | { ok: false; errorCode: 'disabled' | 'target_not_found' | 'query_failed' }

/**
 * Números del DTO que NO son mediciones — ordinales, códigos de banda, parámetros de cálculo
 * y conteos. Declararlos es parte del contrato de TASK-1785: «esto es un parámetro, no una
 * cifra» es una afirmación que alguien hace a propósito, no una omisión.
 */
export const WORK_QUEUE_NOT_FIGURES: readonly string[] = [
  'snapshot.windowDays',
  'snapshot.itemCount',
  'items[].rank',
  'items[].scoreBand',
  'items[].breakdown.targetPosition',
  'items[].breakdown.windowDays',
  'originHealth[].itemCount'
]

/**
 * La procedencia del DTO de la cola, derivada — nunca declarada a mano en cada consumer.
 *
 * Dos entradas porque son DOS naturalezas en la misma fila:
 * - Lo OBSERVADO sale de `seo_gsc_daily` (●): impresiones, clics, CTR actual, posición
 *   ponderada, la muestra de la curva, páginas compitiendo y el share de la principal.
 * - Lo MODELADO sale del modelo de CTR propio (◑): el score en clics incrementales, el CTR
 *   esperado en la posición objetivo y el techo de snippet. Insumos medidos, resultado
 *   estimado — rotularlo ● porque «los números vienen de GSC» es exactamente el error que
 *   el vocabulario `own_ctr_model` existe para impedir.
 *
 * `capturedAt` es el `computedAt` del snapshot: la cola es un plan materializado y su as-of
 * honesto es el de la materialización, no el de cada insumo (que el breakdown no transporta).
 */
export const buildWorkQueueProvenance = (computedAt: string | null): SeoProvenance[] =>
  computedAt === null
    ? []
    : [
        seoProvenance({
          section:
            'items[].breakdown.{impressions,clicks,currentCtr,weightedPosition,curveSampleImpressions,curveSampleClicks,competingPages,mainPageShare}',
          source: 'gsc',
          capturedAt: computedAt
        }),
        seoProvenance({
          section: 'items[].{priorityScore}',
          source: 'own_ctr_model',
          capturedAt: computedAt
        }),
        seoProvenance({
          section: 'items[].breakdown.{expectedCtrAtTarget,incrementalClicks,snippetCeilingClicks}',
          source: 'own_ctr_model',
          capturedAt: computedAt
        })
      ]

export interface ReadSeoWorkQueueOptions {
  origins?: readonly SeoWorkQueueOrigin[]
  limit?: number
  cursor?: string | null
  env?: NodeJS.ProcessEnv
}

const MAX_LIMIT = 200
const DEFAULT_LIMIT = 50

/**
 * Cursor opaco del keyset: el `rank_in_snapshot` del último item servido. Se codifica en
 * base64url para que ningún consumer lo construya a mano — un cursor fabricado saltearía
 * filas en silencio.
 *
 * Un cursor del formato viejo (`band|score|keyword`) o corrupto decodifica a `null` y la
 * lectura arranca desde la primera página: los cursors son efímeros por diseño (viven lo
 * que vive una sesión de paginado sobre un snapshot inmutable), así que reiniciar es el
 * comportamiento honesto, no un fallo.
 */
const encodeCursor = (item: SeoWorkQueueItemView): string =>
  Buffer.from(`r${item.rank}`, 'utf8').toString('base64url')

const decodeCursor = (cursor: string): { rank: number } | null => {
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8')

    if (!decoded.startsWith('r')) return null

    const rank = Number(decoded.slice(1))

    return Number.isInteger(rank) && rank >= 0 ? { rank } : null
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
        nextCursor: null,
        provenance: []
      }
    }

    const cursor = options.cursor ? decodeCursor(options.cursor) : null
    const origins = options.origins && options.origins.length > 0 ? [...options.origins] : null

    /*
     * Keyset sobre `rank_in_snapshot`: entero único por snapshot, sin NULL, persistido por
     * el materializador con el orden canónico completo (incluido el desempate de banda 2
     * por impresiones, que NO es columna y por eso un ORDER BY reconstruido no puede
     * reproducirlo — ver el docstring del módulo). El filtro por `origins` no rompe el
     * keyset: filtrar un orden total lo deja total.
     */
    const rows = await runGreenhousePostgresQuery<ItemRow>(
      `SELECT item_id, rank_in_snapshot, origin, normalized_keyword, target_url, recommended_verb,
              score_basis, score_band,
              -- El alias NO puede llamarse priority_score: PostgreSQL resuelve un ORDER BY
              -- contra los nombres de SALIDA primero, así que un alias homonimo ordenaria
              -- como TEXTO ('8.8612' antes que '72.1405') si alguien reintroduce esa llave.
              priority_score::text AS priority_score_text,
              score_breakdown_json, evidence_ref, source_score_version
         FROM greenhouse_growth.seo_work_queue_items
        WHERE snapshot_id = $1
          AND ($2::text[] IS NULL OR origin = ANY($2::text[]))
          AND ($3::int IS NULL OR rank_in_snapshot > $3::int)
        ORDER BY rank_in_snapshot ASC
        LIMIT $4::int`,
      [snapshot.snapshot_id, origins, cursor?.rank ?? null, limit + 1]
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
      nextCursor: hasMore && items.length > 0 ? encodeCursor(items[items.length - 1]!) : null,
      provenance: buildWorkQueueProvenance(computedAt)
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_work_queue_reader' },
      extra: { seoTargetId }
    })

    return { ok: false, errorCode: 'query_failed' }
  }
}
