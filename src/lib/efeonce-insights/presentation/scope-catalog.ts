/**
 * Catálogo de alcances de un informe de Insights: qué servicio o módulo cubre, con su ícono Trazo del catálogo AXIS
 * (`@efeoncepro/axis-graphic-line/icons`) y la línea de marca Efeonce que le corresponde. Quien compone el encargo
 * elige el alcance (`request.scope`) cuando el informe es de otro servicio que SEO (servicios creativos, Performance,
 * Revenue…); sin elección, se deriva de los módulos. La portada (Think) y el resto de consumers lo dibujan sin lógica
 * propia: reciben clave, etiqueta y glifo ya resueltos en la cabecera compartida.
 *
 * Un alcance nuevo = una entrada aquí + su etiqueta en `GH_INSIGHTS.scopeChips`; el test exige que el glifo exista
 * en el catálogo de AXIS (voz Trazo, la que se usa a 16 px) y que tenga etiqueta.
 */

import type { InsightModule } from '../contracts/request'
import { GH_INSIGHTS } from '@/lib/copy/insights'

/** Líneas de marca de Efeonce («La órbita»): deciden el acento cuando una superficie lo use. */
export type InsightScopeLine = 'growth' | 'brand' | 'engine' | 'voice' | 'revenue'

export const INSIGHT_SCOPE_CATALOG = {
  seo: { glyph: 'busqueda', line: 'engine' },
  aeo: { glyph: 'ia', line: 'engine' },
  ico: { glyph: 'reloj', line: 'brand' },
  creative: { glyph: 'contenido', line: 'brand' },
  design: { glyph: 'multimedia', line: 'brand' },
  content: { glyph: 'contenido', line: 'brand' },
  performance: { glyph: 'medios', line: 'voice' },
  paid_social: { glyph: 'social', line: 'voice' },
  social: { glyph: 'social', line: 'voice' },
  revenue: { glyph: 'revenue', line: 'revenue' },
  crm: { glyph: 'crm', line: 'revenue' },
  email: { glyph: 'correo', line: 'revenue' },
  automation: { glyph: 'automatizacion', line: 'revenue' },
  web: { glyph: 'web', line: 'engine' },
  analytics: { glyph: 'medicion', line: 'growth' }
} as const satisfies Record<string, { glyph: string; line: InsightScopeLine }>

export type InsightScopeKey = keyof typeof INSIGHT_SCOPE_CATALOG

export const INSIGHT_SCOPE_KEYS = Object.keys(INSIGHT_SCOPE_CATALOG) as InsightScopeKey[]

/** Máximo de chips de alcance por informe: más que eso deja de ser un alcance y pasa a ser un índice. */
export const INSIGHT_SCOPE_MAX = 4

export const isInsightScopeKey = (value: unknown): value is InsightScopeKey =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(INSIGHT_SCOPE_CATALOG, value)

export interface InsightScopeChipV1 {
  key: InsightScopeKey
  /** Etiqueta legible («Servicios creativos»). */
  label: string
  /** Glifo Trazo del catálogo AXIS («contenido»); el consumer lo resuelve a su archivo. */
  glyph: string
  line: InsightScopeLine
}

/** Chips de la portada: el alcance elegido en el encargo o, sin él, uno por módulo en su orden. */
export const scopeChipsFor = (scope: readonly InsightScopeKey[] | undefined, modules: readonly InsightModule[]): InsightScopeChipV1[] => {
  const keys = scope && scope.length > 0 ? scope : (modules as readonly InsightScopeKey[])

  return [...new Set(keys)].filter(isInsightScopeKey).map(key => ({
    key,
    label: GH_INSIGHTS.scopeChips[key] ?? key,
    glyph: INSIGHT_SCOPE_CATALOG[key].glyph,
    line: INSIGHT_SCOPE_CATALOG[key].line
  }))
}
