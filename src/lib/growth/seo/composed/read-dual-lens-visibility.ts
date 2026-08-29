/**
 * TASK-1785 — La lectura que hace que componer BIEN cueste menos que componer mal.
 *
 * ═══ Por qué existe ═══
 *
 * La mezcla de lentes no ocurre dentro de una tool: ocurre cuando un agente llama DOS y
 * escribe un párrafo. Hasta hoy, presentar bien las dos lentes exigía dos llamadas y una
 * decisión; presentarlas mal exigía una llamada y ninguna. Mientras esa asimetría exista, la
 * regla pierde por economía, no por desconocimiento — y ninguna descripción de tool, por bien
 * escrita que esté, puede compensar un incentivo.
 *
 * Esta lectura invierte la asimetría: una sola llamada devuelve las dos series, ya separadas
 * y rotuladas.
 *
 * ═══ 🔴 Lo que este contrato NO tiene, y es su punto entero ═══
 *
 * **NO existe un campo combinado.** Ni promedio, ni suma, ni "consolidado", ni un índice
 * único. No es una omisión que alguien pueda completar después: el shape no tiene dónde
 * ponerlo, y hay un test que falla si aparece una clave que lo sugiera.
 *
 * La razón es que las dos magnitudes no comparten referente. La posición de Search Console es
 * un promedio ponderado por impresiones sobre usuarios REALES del propio dominio; la del SERP
 * comprado es exacta pero corresponde a una consulta que hicimos nosotros, desde una ubicación
 * que elegimos. Promediarlas produce un número sin referente presentado con la confianza de un
 * dato medido — que es peor que no tener el número.
 *
 * Componer, acá, significa PRESENTAR LAS DOS. Si alguien necesita un índice único, es una
 * decisión de producto que exige su propia ADR, no un campo más.
 *
 * ═══ Costo ═══
 *
 * Reusa los dos readers canónicos y no abre ningún camino nuevo a PostgreSQL. Se apoya en que
 * `readSeoPerformance` ya sabe servir la posición MEDIDA (`pinnedLens: 'measured'`), en vez de
 * dejarla elegir una de las dos por el fallback entre fuentes — ese fallback existe para
 * servir UNA serie, y acá hacen falta las dos.
 */

import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'

import { isSeoModuleEnabled } from '../flags'
import { type SeoProvenance, resolveSeoAsOf, seoProvenance } from '../lens'
import { readSeoPerformance } from '../performance/read-performance'
import { readRankEvolution } from '../rank-evolution-reader'
import { resolveUnambiguousSeoTarget } from '../resolve-target'

/** Un punto de una de las dos series. `position: null` = sin medición ese día, jamás 0. */
export interface DualLensPoint {
  date: string
  position: number | null
}

export interface DualLensSeries {
  keyword: string
  points: DualLensPoint[]
}

/**
 * Un lado de la lectura. Las dos lentes tienen la MISMA forma a propósito: si una tuviera
 * campos que la otra no, el consumidor tendría que tratarlas distinto y volvería a decidir
 * por su cuenta cuál "vale más".
 */
export interface DualLensSide {
  provenance: SeoProvenance
  series: DualLensSeries[]
  /** Ventana que esta lente EFECTIVAMENTE cubre. Las dos pueden diferir, y decirlo importa. */
  range: { from: string; to: string; days: number } | null
  /** Keywords pedidas sin ninguna medición en ESTA lente. Se nombran, no se omiten. */
  keywordsWithoutData: string[]
  /**
   * Por qué esta lente no pudo servirse, cuando no pudo. Es un ESTADO, no un error de la
   * lectura completa: que falte el rank comprado no invalida lo que Search Console midió.
   */
  unavailable: { reason: string } | null
}

export type ReadDualLensVisibilityResult =
  | {
      ok: true
      organizationId: string
      seoTargetId: string | null
      keywords: string[]
      requestedRangeDays: number
      /** ● Search Console: la verdad del tráfico del propio dominio. */
      measured: DualLensSide
      /** ◑ SERP comprado: la verdad del mercado, incluidos los competidores. */
      estimated: DualLensSide
      // 🔴 NO hay campo combinado. Ver el encabezado: es deliberado y es el punto de la task.
    }
  | {
      ok: false
      errorCode: 'disabled' | 'no_keywords' | 'no_data' | 'query_failed'
      status: null
    }

const DEFAULT_RANGE_DAYS = 90
const MAX_KEYWORDS = 25

const emptySide = (source: 'gsc' | 'dataforseo_serp', reason: string): DualLensSide => ({
  provenance: seoProvenance({ section: 'series[].points[].position', source, capturedAt: null }),
  series: [],
  range: null,
  keywordsWithoutData: [],
  unavailable: { reason }
})

export const readDualLensVisibility = async (input: {
  organizationId: string
  keywords: string[]
  rangeDays?: number
}): Promise<ReadDualLensVisibilityResult> => {
  if (!isSeoModuleEnabled()) {
    return { ok: false, errorCode: 'disabled', status: null }
  }

  const keywords = [...new Set(input.keywords.map(keyword => keyword.trim()).filter(Boolean))].slice(0, MAX_KEYWORDS)

  if (keywords.length === 0) {
    return { ok: false, errorCode: 'no_keywords', status: null }
  }

  const rangeDays = input.rangeDays ?? DEFAULT_RANGE_DAYS

  try {
    // ISSUE-153: resolución canónica del target, nunca un LIMIT 1 inline. Con más de un
    // mercado activo esto degrada a null y la lente ◑ se declara indisponible — jamás sirve
    // el país que salga primero.
    const target = await resolveUnambiguousSeoTarget(input.organizationId)
    const seoTargetId = target.target?.seoTargetId ?? null

    const [performance, rankEvolution] = await Promise.all([
      readSeoPerformance(input.organizationId, {
        mode: 'keyword',
        metric: 'position',
        items: keywords,
        rangeDays,
        // Sin esto, el reader elegiría UNA de las dos fuentes por el fallback y esta lectura
        // se quedaría sin la mitad de su razón de ser.
        pinnedLens: 'measured'
      }),
      seoTargetId ? readRankEvolution(seoTargetId, { keywords, rangeDays }) : null
    ])

    const measured: DualLensSide = performance.ok
      ? {
          provenance: seoProvenance({
            section: 'series[].points[].position',
            source: 'gsc',
            capturedAt: resolveSeoAsOf(performance.series.flatMap(s => s.points.map(point => point.date)))
          }),
          series: performance.series.map(entry => ({
            keyword: entry.item,
            points: entry.points.map(point => ({ date: point.date, position: point.value }))
          })),
          range: performance.range,
          keywordsWithoutData: performance.itemsWithoutData,
          unavailable: null
        }
      : emptySide('gsc', performance.errorCode)

    const estimated: DualLensSide = !seoTargetId
      ? emptySide(
          'dataforseo_serp',
          // Honesto sobre la causa: no es "no hay datos", es "no sabemos de qué mercado".
          'target_not_resolved'
        )
      : rankEvolution?.ok
        ? {
            provenance: seoProvenance({
              section: 'series[].points[].position',
              source: 'dataforseo_serp',
              capturedAt: resolveSeoAsOf(rankEvolution.series.flatMap(s => s.points.map(point => point.date)))
            }),
            series: rankEvolution.series.map(entry => ({
              keyword: entry.keyword,
              points: entry.points.map(point => ({ date: point.date, position: point.position }))
            })),
            range: rankEvolution.range,
            keywordsWithoutData: keywords.filter(
              keyword => !rankEvolution.series.some(entry => entry.keyword === keyword)
            ),
            unavailable: null
          }
        : emptySide('dataforseo_serp', rankEvolution?.errorCode ?? 'no_data')

    // Las DOS indisponibles no es una lectura degradada: es que no hay nada que mostrar.
    if (measured.unavailable && estimated.unavailable) {
      return { ok: false, errorCode: 'no_data', status: null }
    }

    return {
      ok: true,
      organizationId: input.organizationId,
      seoTargetId,
      keywords,
      requestedRangeDays: rangeDays,
      measured,
      estimated
    }
  } catch (error) {
    captureWithDomain(error, 'growth', {
      tags: { source: 'seo_dual_lens_visibility' },
      extra: { organizationId: input.organizationId, keywordCount: keywords.length }
    })

    return { ok: false, errorCode: 'query_failed', status: null }
  }
}
