/**
 * TASK-1302 — Materializador diario de Google Search Console.
 *
 * Google retiene 16 meses y muestrea; este command convierte el read-through en una
 * serie propia. Es CONSUMER del reader per-org de TASK-1282 — cero cliente GSC nuevo,
 * cero OAuth propio.
 *
 * Dos invariantes que no se pueden romper:
 *  1. HONEST DEGRADATION — si el reader degrada, NO se escribe ninguna fila. Un día sin
 *     datos y un día que falló NUNCA se ven iguales en la serie (nada de ceros fantasma).
 *  2. SIN TRUNCAMIENTO SILENCIOSO — pagina hasta agotar. Si alcanza el techo de páginas,
 *     lo reporta como `truncated: true` en vez de devolver un resultado que parece completo.
 */

import 'server-only'

import { readSearchConsoleAnalytics } from '@/lib/growth/search-console'
import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { type GscDailySnapshotResult } from './contracts'

/** Máximo que acepta la Search Analytics API en una sola llamada. */
const GSC_MAX_ROWS_PER_PAGE = 25_000

/**
 * Techo de páginas por día/org. 20 × 25k = 500k filas — muy por encima de lo que
 * produce un sitio real en un día, y a la vez un freno duro contra un loop infinito
 * si Google devolviera siempre una página llena.
 */
const DEFAULT_MAX_PAGES = 20

/** Chunk del UPSERT. Se usa UNNEST, así que el nº de parámetros es fijo (9). */
const UPSERT_CHUNK_SIZE = 5_000

interface GscRow {
  query: string
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

const upsertChunk = async (
  organizationId: string,
  siteUrl: string,
  captureDate: string,
  rows: GscRow[]
): Promise<void> => {
  if (rows.length === 0) return

  // UNNEST en vez de multi-row VALUES: el nº de parámetros no crece con las filas, así
  // que no hay riesgo de topar el límite de 65535 parámetros de PostgreSQL.
  await runGreenhousePostgresQuery(
    `INSERT INTO greenhouse_growth.seo_gsc_daily
       (organization_id, site_url, capture_date, query, page, clicks, impressions, ctr, position)
     SELECT $1, $2, $3::date, q, p, c, i, r, pos
     FROM UNNEST(
       $4::text[], $5::text[], $6::int[], $7::int[], $8::numeric[], $9::numeric[]
     ) AS t(q, p, c, i, r, pos)
     ON CONFLICT (organization_id, capture_date, query, page)
     DO UPDATE SET
       clicks          = EXCLUDED.clicks,
       impressions     = EXCLUDED.impressions,
       ctr             = EXCLUDED.ctr,
       position        = EXCLUDED.position,
       site_url        = EXCLUDED.site_url,
       materialized_at = NOW()`,
    [
      organizationId,
      siteUrl,
      captureDate,
      rows.map(row => row.query),
      rows.map(row => row.page),
      rows.map(row => row.clicks),
      rows.map(row => row.impressions),
      rows.map(row => row.ctr),
      rows.map(row => row.position)
    ]
  )
}

/**
 * Materializa un día de GSC (dimensiones query×page) para una organización.
 *
 * Idempotente por `(organization_id, capture_date, query, page)`: re-ejecutar el mismo
 * día no duplica y además CORRIGE el valor — GSC consolida sus métricas con hasta ~48h
 * de retraso, así que la primera lectura de un día es la menos exacta.
 */
export const materializeGscDailySnapshot = async (
  organizationId: string,
  captureDate: string,
  options: { maxPages?: number; rowsPerPage?: number } = {}
): Promise<GscDailySnapshotResult> => {
  const rowsPerPage = Math.min(GSC_MAX_ROWS_PER_PAGE, Math.max(1, options.rowsPerPage ?? GSC_MAX_ROWS_PER_PAGE))
  const maxPages = Math.max(1, options.maxPages ?? DEFAULT_MAX_PAGES)

  let startRow = 0
  let pagesFetched = 0
  let rowsWritten = 0
  let truncated = false
  let resolvedSiteUrl = ''

  try {
    while (pagesFetched < maxPages) {
      const result = await readSearchConsoleAnalytics(organizationId, {
        range: { startDate: captureDate, endDate: captureDate },
        dimensions: ['query', 'page'],
        rowLimit: rowsPerPage,
        startRow
      })

      // Honest degradation: cualquier fallo del reader aborta SIN escribir.
      // Las páginas ya escritas de este mismo día quedan (son datos reales y el UPSERT
      // es idempotente), pero no se inventa nada para completar el día.
      if (!result.ok) {
        if (pagesFetched === 0) {
          return { ok: false, errorCode: result.errorCode, status: result.status }
        }

        truncated = true
        break
      }

      resolvedSiteUrl = result.siteUrl
      pagesFetched += 1

      if (result.rows.length === 0) break

      const rows: GscRow[] = result.rows.map(row => ({
        query: row.keys[0] ?? '',
        page: row.keys[1] ?? '',
        clicks: Math.max(0, Math.round(row.clicks)),
        impressions: Math.max(0, Math.round(row.impressions)),
        ctr: row.ctr,
        position: row.position
      // `position > 0` es CHECK en la tabla: GSC normaliza los nulos a 0 y esa fila no
      // representa una medición real, así que se descarta en vez de romper el batch.
      })).filter(row => row.query !== '' && row.page !== '' && row.position > 0)

      for (let index = 0; index < rows.length; index += UPSERT_CHUNK_SIZE) {
        await upsertChunk(organizationId, resolvedSiteUrl, captureDate, rows.slice(index, index + UPSERT_CHUNK_SIZE))
      }

      rowsWritten += rows.length

      // Página incompleta ⇒ Google no tiene más filas para este día.
      if (result.rows.length < rowsPerPage) break

      startRow += rowsPerPage

      if (pagesFetched >= maxPages) {
        truncated = true
        break
      }
    }

    // Un día en que GSC respondió sin filas es `ok` con `rowsWritten: 0` — NO un error.
    // Es la distinción que pide el contrato: "no hubo tráfico" y "la query falló" son
    // hechos distintos y la serie tiene que poder diferenciarlos.
    return {
      ok: true,
      organizationId,
      siteUrl: resolvedSiteUrl,
      captureDate,
      rowsWritten,
      pagesFetched,
      truncated
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_gsc_daily_materializer' },
      extra: { organizationId, captureDate, pagesFetched, rowsWritten }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}
