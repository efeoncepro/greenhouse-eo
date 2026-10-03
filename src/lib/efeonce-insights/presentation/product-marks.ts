/**
 * Marcas de producto de Efeonce dentro de un informe de Insights (línea gráfica «La órbita», submarcas SEO/AEO,
 * aprobadas 2026-09-29). Regla de la línea: el lockup oficial acompaña a Efeonce y NUNCA firma; va UNO por sección y
 * sólo donde la sección habla de esa pieza; reemplaza la etiqueta de la sección, nunca se suma a ella.
 *
 *  - `sv360`: el sistema completo de visibilidad en búsqueda → capítulo de visibilidad orgánica.
 *  - `aeo`: la capacidad de visibilidad en respuestas de IA → capítulo de motores de respuesta.
 *  - `aeo_assessment`: el diagnóstico que mide → la fuente de los hechos AEO (texto en `GH_INSIGHTS.sources`).
 *  - `ai_visibility_report`: el entregable del diagnóstico → reservado para enlazarlo cuando exista el vínculo.
 *  - `insights`: la edición mensual → la portada del informe (ya presente en Think).
 *
 * El consumer resuelve la clave a su archivo (`<clave>-lockup-<variante>.svg` de `@efeoncepro/axis-brand-assets`,
 * exportado con `pnpm insights:think-icons`); nunca arma el lockup ni elige la marca por su cuenta.
 */

import type { InsightModule } from '../contracts/request'
import { GH_INSIGHTS } from '@/lib/copy/insights'

export const INSIGHT_PRODUCT_MARK_KEYS = ['sv360', 'aeo', 'aeo_assessment', 'ai_visibility_report', 'insights'] as const

export type InsightProductMarkKey = (typeof INSIGHT_PRODUCT_MARK_KEYS)[number]

/** Archivo del lockup en `@efeoncepro/axis-brand-assets` (sin variante): `aeo_assessment` → `aeo-assessment`. */
export const productMarkFileStem = (key: InsightProductMarkKey): string => key.replace(/_/g, '-')

const CHAPTER_MARK: Partial<Record<InsightModule, InsightProductMarkKey>> = {
  seo: 'sv360',
  aeo: 'aeo'
}

export interface InsightProductMarkV1 {
  key: InsightProductMarkKey
  /** Nombre accesible (alt del lockup). */
  label: string
}

/** Marca de producto que encabeza un capítulo, si el módulo tiene una. */
export const chapterProductMark = (module: InsightModule): InsightProductMarkV1 | null => {
  const key = CHAPTER_MARK[module]

  return key ? { key, label: GH_INSIGHTS.productMarks[key] ?? key } : null
}
