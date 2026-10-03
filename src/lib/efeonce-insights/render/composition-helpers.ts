/**
 * TASK-1847 — piezas de composición comunes al deck y al informe A4: rechazo por longitud (nunca
 * recorte), reparto por capacidad declarada y lectura de los límites del plan. Cada mapper decide sólo
 * en qué slot de su plantilla cae cada pieza.
 */

import { paginateFlow, type FlowBlock } from '@/lib/artifact-composer/pure'
import { GH_INSIGHTS } from '@/lib/copy/insights'

import { InsightsRenderRejectedError } from '../errors'

/** Un texto que excede el molde RECHAZA el render con causa: recortarlo amputaría una afirmación. */
export const rejectIfLonger = (value: string, max: number, field: string): string => {
  if (value.length > max) {
    throw new InsightsRenderRejectedError(
      `El campo "${field}" mide ${value.length} caracteres y el molde admite ${max}. ` +
        'No se recorta: un documento que ampute una afirmación deja de ser auditable.'
    )
  }

  return value
}

/** Divide un flujo en páginas usando la capacidad declarada del molde como unidad (primitivo del motor). */
export const chunkByCapacity = <T>(items: readonly T[], capacity: number, idOf: (item: T, i: number) => string, heightOf: (item: T) => number = () => 1): T[][] => {
  if (items.length === 0) return []

  // TASK-1962 — `heightOf` cuenta cuántas líneas ocupa un ítem: una fila con etiqueta larga ocupa dos y una página de
  // 16 filas con varias así se desbordaba (tabla de IA de Berel, 2026-10-02: «page-17 no cabe en su lienzo»).
  const blocks: FlowBlock[] = items.map((item, i) => ({ blockId: idOf(item, i), heightPx: heightOf(item) }))
  const pages = paginateFlow(blocks, { contentHeightPx: capacity, guardPx: 0 })
  const byId = new Map(blocks.map((b, i) => [b.blockId, items[i]!]))

  return pages.map(page => page.blockIds.map(id => byId.get(id)!))
}

export interface LimitEntry {
  subject: string
  cause: string
}

/**
 * Límites del plan (`«sujeto: causa.»`) → filas de la página de cierre. El cierre es obligatorio aunque
 * no haya límites: declarar que no los hay también informa. El caso vacío NO pasa por el parser — no
 * tiene ese formato, y forzarlo metía la frase entera en el sujeto.
 */
export const limitEntriesOf = (limits: readonly string[]): LimitEntry[] =>
  limits.length > 0
    ? limits.map(line => {
        const separator = line.indexOf(':')

        if (separator === -1) return { subject: GH_INSIGHTS.document.limitNote, cause: line.trim().replace(/\.$/, '') }

        return {
          subject: line.slice(0, separator).trim(),
          cause: line.slice(separator + 1).trim().replace(/\.$/, '') || GH_INSIGHTS.document.limitNoCause
        }
      })
    : [{ subject: GH_INSIGHTS.document.limitsNoneSubject, cause: GH_INSIGHTS.document.limitsNoneCause }]
