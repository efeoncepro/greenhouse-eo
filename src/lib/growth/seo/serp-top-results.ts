/**
 * TASK-1699 — El top-N del SERP que YA se paga: parser hermano + writer append-only.
 *
 * `parseSerpRankObservation` (rank-capture.ts) recorre la respuesta SERP comprada, se queda
 * con NUESTRA fila y descarta ~19 de 20. `parseSerpTopResults` es su HERMANO — dos lecturas
 * de la MISMA respuesta, no una refactorización: el parser original no cambia de firma ni de
 * comportamiento, y este devuelve una fila por item del SERP con su ranura absoluta.
 *
 * ═══ La decisión que da forma al archivo ═══
 *
 * 🔴 **La ranura es `rank_absolute`, nunca `rank_group`.** `rank_group` es la posición dentro
 * del bloque de su tipo y SE REPITE entre bloques (un orgánico #3 y un video #3 comparten
 * rank_group=3, con rank_absolute distinto). Como clave de fila, `rank_group` colisiona — y
 * con `ON CONFLICT DO NOTHING` la colisión no da error: DESCARTA la segunda fila en
 * silencio. Se guardan las dos posiciones; la clave es la absoluta.
 *
 * ═══ Costo marginal CERO ═══
 *
 * Este módulo NO llama al proveedor. Consume la respuesta que el rank capture ya trajo y
 * pagó. Si el diff de una futura edición toca `buildSerpTask` (depth, flags), está fuera de
 * contrato — hay test de no-regresión que lo afirma.
 *
 * Se persisten TODOS los `item_type` (Open Question resuelta con la propuesta de la spec):
 * el costo ya se pagó y filtrar hoy es decidir por el consumidor de mañana. El tope por
 * keyword acota respuestas anómalas del proveedor, no el contrato.
 */

import 'server-only'

import { extractHost, isOwnDomain, normalizeDomain } from './rank-capture'

/**
 * Tope de filas por keyword y corrida. `depth 20` trae ~20 items orgánicos; AI Overview,
 * PAA y features empujan `rank_absolute` un poco más allá. 30 cubre el SERP real con
 * holgura y frena una respuesta anómala que quiera inflar la tabla.
 */
export const SERP_TOP_RESULTS_MAX_ROWS_PER_KEYWORD = 30

/**
 * Cap defensivo del título (Open Question 2: se guarda completo, sin CHECK en DB — los
 * títulos reales del SERP rara vez pasan 70 chars; esto sólo acota una anomalía).
 */
const MAX_TITLE_LENGTH = 2048

export interface SerpTopResultRow {
  /** La RANURA del SERP completo — única a lo largo de todos los bloques. */
  rankAbsolute: number
  /** Posición dentro del bloque de su tipo (la "posición orgánica" cuando aplica). */
  rankGroup: number | null
  /** organic | ai_overview | people_also_ask | video | local_pack | … (del proveedor). */
  itemType: string
  resultDomain: string | null
  resultUrl: string | null
  resultTitle: string | null
  isOwnDomain: boolean
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null

const asPositiveInt = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.trunc(value) : null

/**
 * Parser PURO del top-N: recorre `tasks[] → result[] → items[]` (misma forma que
 * `parseSerpRankObservation`) y devuelve una fila por item con `rank_absolute` presente.
 *
 * - **Ausencia ≠ vacío**: si el SERP trajo menos filas, se devuelven las que vinieron;
 *   jamás se rellena ni se inventa una fila cero.
 * - Un item sin `rank_absolute` no tiene ranura → no es persistible (no se adivina).
 * - Dedupe por ranura (primera gana): una respuesta anómala con la misma ranura dos veces
 *   no puede producir un INSERT que el `DO NOTHING` resolvería en silencio.
 */
export const parseSerpTopResults = (tasks: unknown[], rootDomain: string): SerpTopResultRow[] => {
  const root = normalizeDomain(rootDomain)
  const bySlot = new Map<number, SerpTopResultRow>()

  for (const task of tasks) {
    const taskRecord = asRecord(task)
    const results = Array.isArray(taskRecord?.result) ? taskRecord.result : []

    for (const result of results) {
      const resultRecord = asRecord(result)
      const items = Array.isArray(resultRecord?.items) ? resultRecord.items : []

      for (const item of items) {
        const itemRecord = asRecord(item)

        if (!itemRecord) continue

        const rankAbsolute = asPositiveInt(itemRecord.rank_absolute)

        if (rankAbsolute === null || bySlot.has(rankAbsolute)) continue

        const itemUrl = typeof itemRecord.url === 'string' && itemRecord.url ? itemRecord.url : null

        const resultDomain =
          typeof itemRecord.domain === 'string' && itemRecord.domain.trim() !== ''
            ? normalizeDomain(itemRecord.domain)
            : itemUrl
              ? extractHost(itemUrl)
              : null

        const rawTitle = typeof itemRecord.title === 'string' && itemRecord.title ? itemRecord.title : null

        bySlot.set(rankAbsolute, {
          rankAbsolute,
          rankGroup: asPositiveInt(itemRecord.rank_group),
          itemType: typeof itemRecord.type === 'string' && itemRecord.type ? itemRecord.type : 'unknown',
          resultDomain,
          resultUrl: itemUrl,
          resultTitle: rawTitle ? rawTitle.slice(0, MAX_TITLE_LENGTH) : null,
          isOwnDomain: resultDomain !== null && isOwnDomain(resultDomain, root)
        })
      }
    }
  }

  return [...bySlot.values()]
    .sort((a, b) => a.rankAbsolute - b.rankAbsolute)
    .slice(0, SERP_TOP_RESULTS_MAX_ROWS_PER_KEYWORD)
}

/** Cliente transaccional mínimo — evita atar el módulo al tipo `PoolClient` de `pg`. */
export interface SerpTopResultsClient {
  query: <T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ) => Promise<{ rows: T[]; rowCount: number | null }>
}

export interface PersistSerpTopResultsInput {
  seoTargetId: string
  keyword: string
  engine: string
  device: string
  captureDate: string
  sourceRunId: string
  rows: readonly SerpTopResultRow[]
}

/**
 * Writer append-only del top-N. UN statement multi-fila (UNNEST) con
 * `ON CONFLICT DO NOTHING` sobre la UNIQUE por ranura — el trigger de la tabla prohíbe
 * UPDATE, así que DO NOTHING es la única resolución posible y actúa como guardia de
 * carrera (el pre-check de idempotencia del rank capture ya filtró el día capturado).
 *
 * Recibe el cliente de la transacción del caller: la fila de contexto viaja en la MISMA
 * transacción que la observación de rank de esa keyword (contrato TASK-1699) — no existe
 * un día con snapshot y sin top-N por una caída a mitad de camino.
 */
export const persistSerpTopResults = async (
  client: SerpTopResultsClient,
  input: PersistSerpTopResultsInput
): Promise<{ rowsWritten: number }> => {
  const rows = input.rows.slice(0, SERP_TOP_RESULTS_MAX_ROWS_PER_KEYWORD)

  if (rows.length === 0) return { rowsWritten: 0 }

  const result = await client.query(
    `INSERT INTO greenhouse_growth.seo_serp_top_results (
       seo_target_id, keyword, engine, device, capture_date,
       rank_absolute, rank_group, item_type, result_domain, result_url, result_title,
       is_own_domain, source_run_id
     )
     SELECT $1, $2, $3, $4, $5::date,
            u.rank_absolute, u.rank_group, u.item_type, u.result_domain, u.result_url, u.result_title,
            u.is_own_domain, $6
       FROM UNNEST(
              $7::int[], $8::int[], $9::text[], $10::text[], $11::text[], $12::text[], $13::boolean[]
            ) AS u(rank_absolute, rank_group, item_type, result_domain, result_url, result_title, is_own_domain)
     ON CONFLICT ON CONSTRAINT seo_serp_top_results_slot_unique DO NOTHING`,
    [
      input.seoTargetId,
      input.keyword,
      input.engine,
      input.device,
      input.captureDate,
      input.sourceRunId,
      rows.map(row => row.rankAbsolute),
      rows.map(row => row.rankGroup),
      rows.map(row => row.itemType),
      rows.map(row => row.resultDomain),
      rows.map(row => row.resultUrl),
      rows.map(row => row.resultTitle),
      rows.map(row => row.isOwnDomain)
    ]
  )

  return { rowsWritten: result.rowCount ?? 0 }
}
